import cron from 'node-cron';
import { BillingRecord } from '../modules/billing/billing.model.js';
import { SweepRun } from '../modules/sweeps/sweeps.model.js';
import { Anomaly } from '../modules/anomalies/anomalies.model.js';
import { generateMockBillingData, generateIdleResourceRecords } from './mockDataGenerator.service.js';
import { detectAnomalies, upsertAnomalies, resolveStaleAnomalies } from './anomalyDetection.service.js';
import { generateExplanationsForNewAnomalies } from './llmExplanation.service.js';
import { generateOptimizations } from './optimization.service.js';
import { invalidatePrefix } from '../config/cache.js';

let sweepJob = null;

export function startDailySweep() {
  const schedule = process.env.CRON_SCHEDULE || '0 2 * * *';
  const timezone = process.env.CRON_TIMEZONE || 'UTC';
  
  sweepJob = cron.schedule(schedule, async () => {
    console.log('[CRON] Starting daily sweep...');
    await runSweep();
  }, {
    scheduled: true,
    timezone,
  });
  
  console.log(`[CRON] Daily sweep scheduled: ${schedule} (${timezone})`);
}

export function stopDailySweep() {
  if (sweepJob) {
    sweepJob.stop();
    sweepJob = null;
    console.log('[CRON] Daily sweep stopped');
  }
}

export async function runSweep() {
  const run = await SweepRun.create({
    startedAt: new Date(),
    status: 'RUNNING',
  });
  
  try {
    const accounts = ['acct-prod-001', 'acct-staging-002', 'acct-dev-003'];
    const providers = ['aws', 'gcp'];
    
    let allRecords = [];
    
    for (const provider of providers) {
      const records = generateMockBillingData({
        accounts,
        days: 1,
        recordsPerDay: 50,
        provider,
      });
      allRecords.push(...records);
    }
    
    for (const accountId of accounts) {
      const idleRecords = generateIdleResourceRecords(accountId, 3);
      allRecords.push(...idleRecords);
    }
    
    const inserted = await BillingRecord.insertMany(allRecords);
    run.recordsProcessed = inserted.length;
    console.log(`[SWEEP] Ingested ${inserted.length} billing records`);
    
    const recentRecords = await BillingRecord.find({
      ingestedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).lean();
    
    const anomalies = await detectAnomalies(recentRecords);
    run.anomaliesDetected = anomalies.length;
    console.log(`[SWEEP] Detected ${anomalies.length} anomalies`);
    
    const upsertResult = await upsertAnomalies(anomalies);
    run.anomaliesNew = upsertResult.new;
    console.log(`[SWEEP] New anomalies: ${upsertResult.new}, Updated: ${upsertResult.updated}`);
    
    const newAnomalies = anomalies.filter(a => 
      upsertResult.new > 0 && anomalies.indexOf(a) < upsertResult.new
    );
    if (newAnomalies.length > 0) {
      await generateExplanationsForNewAnomalies(newAnomalies);
      await generateOptimizations(newAnomalies);
    }
    
    const activeResourceKeys = recentRecords.map(r => `${r.accountId}|${r.resourceId}`);
    const resolved = await resolveStaleAnomalies(activeResourceKeys);
    run.anomaliesResolved = resolved;
    console.log(`[SWEEP] Resolved stale anomalies: ${resolved}`);
    
    invalidatePrefix('billing:summary');
    invalidatePrefix('anomalies:summary');
    invalidatePrefix('anomalies:list');
    console.log('[SWEEP] Cache invalidated');
    
    run.completedAt = new Date();
    run.status = 'COMPLETED';
    await run.save();
    
    console.log('[SWEEP] Completed successfully');
    return run;
    
  } catch (error) {
    console.error('[SWEEP] Failed:', error);
    run.completedAt = new Date();
    run.status = 'FAILED';
    run.error = error.message;
    await run.save();
    throw error;
  }
}

export async function triggerSweep() {
  const existing = await SweepRun.findOne({ status: 'RUNNING' }).lean();
  if (existing) {
    throw new Error('Sweep already running');
  }
  return runSweep();
}
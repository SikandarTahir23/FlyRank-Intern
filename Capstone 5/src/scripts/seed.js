import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import { BillingRecord } from '../modules/billing/billing.model.js';
import { Anomaly } from '../modules/anomalies/anomalies.model.js';
import { OptimizationAction } from '../modules/optimizations/optimizations.model.js';
import { SweepRun } from '../modules/sweeps/sweeps.model.js';
import { generateMockBillingData, generateIdleResourceRecords } from '../services/mockDataGenerator.service.js';
import { detectAnomalies, upsertAnomalies } from '../services/anomalyDetection.service.js';
import { generateExplanationsForNewAnomalies } from '../services/llmExplanation.service.js';
import { generateOptimizations } from '../services/optimization.service.js';

const ACCOUNTS = ['acct-prod-001', 'acct-staging-002', 'acct-dev-003'];
const PROVIDERS = ['aws', 'gcp'];

async function seed() {
  console.log('🌱 Starting database seed...');
  
  await connectDB();
  
  console.log('🧹 Clearing existing data...');
  await Promise.all([
    BillingRecord.deleteMany({}),
    Anomaly.deleteMany({}),
    OptimizationAction.deleteMany({}),
    SweepRun.deleteMany({}),
  ]);
  
  console.log('📊 Generating mock billing data (30 days)...');
  let allRecords = [];
  
  for (const provider of PROVIDERS) {
    const records = generateMockBillingData({
      accounts: ACCOUNTS,
      days: 30,
      recordsPerDay: 50,
      provider,
    });
    allRecords.push(...records);
  }
  
  for (const accountId of ACCOUNTS) {
    const idleRecords = generateIdleResourceRecords(accountId, 5);
    allRecords.push(...idleRecords);
  }
  
  console.log(`📥 Inserting ${allRecords.length} billing records...`);
  await BillingRecord.insertMany(allRecords);
  
  console.log('🔍 Running anomaly detection on recent data...');
  const recentRecords = await BillingRecord.find({
    billingPeriodStart: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  }).lean();
  
  const anomalies = await detectAnomalies(recentRecords);
  console.log(`🎯 Detected ${anomalies.length} anomalies`);
  
  const upsertResult = await upsertAnomalies(anomalies);
  console.log(`💾 Upserted: ${upsertResult.new} new, ${upsertResult.updated} updated`);
  
  const newAnomalies = anomalies.slice(0, upsertResult.new);
  if (newAnomalies.length > 0) {
    console.log('🤖 Generating LLM explanations...');
    await generateExplanationsForNewAnomalies(newAnomalies);
    
    console.log('⚙️ Generating optimization recommendations...');
    await generateOptimizations(newAnomalies);
  }
  
  const counts = await Promise.all([
    BillingRecord.countDocuments(),
    Anomaly.countDocuments(),
    OptimizationAction.countDocuments(),
  ]);
  
  console.log('\n✅ Seed complete!');
  console.log(`   Billing Records: ${counts[0]}`);
  console.log(`   Anomalies: ${counts[1]}`);
  console.log(`   Optimization Actions: ${counts[2]}`);
  
  await disconnectDB();
  process.exit(0);
}

seed().catch(async (error) => {
  console.error('❌ Seed failed:', error);
  await disconnectDB();
  process.exit(1);
});
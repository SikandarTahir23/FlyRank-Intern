import { Anomaly } from '../modules/anomalies/anomalies.model.js';

const IDLE_THRESHOLD_CPU = 5;
const IDLE_DAYS = 7;
const OVER_PROVISIONED_THRESHOLD = 20;
const SPIKE_MULTIPLIER = 3;

export async function detectAnomalies(billingRecords) {
  const anomalies = [];
  const now = new Date();
  
  const grouped = groupByResource(billingRecords);
  
  for (const [resourceKey, records] of Object.entries(grouped)) {
    const [accountId, resourceId] = resourceKey.split('|');
    const sorted = records.sort((a, b) => a.billingPeriodStart - b.billingPeriodStart);
    
    const idleAnomaly = detectIdle(sorted, accountId, resourceId);
    if (idleAnomaly) anomalies.push(idleAnomaly);
    
    const overProvisionedAnomaly = detectOverProvisioned(sorted, accountId, resourceId);
    if (overProvisionedAnomaly) anomalies.push(overProvisionedAnomaly);
    
    const spikeAnomaly = detectSpike(sorted, accountId, resourceId);
    if (spikeAnomaly) anomalies.push(spikeAnomaly);
  }
  
  return anomalies;
}

function groupByResource(records) {
  const grouped = {};
  for (const record of records) {
    const key = `${record.accountId}|${record.resourceId}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  }
  return grouped;
}

function detectIdle(records, accountId, resourceId) {
  if (records.length < IDLE_DAYS) return null;
  
  const recent = records.slice(-IDLE_DAYS);
  const allLowUtilization = recent.every(r => {
    const cpu = r.tags?.cpuUtilization ?? r.tags?.cpu_avg ?? Math.random() * 10;
    return cpu < IDLE_THRESHOLD_CPU;
  });
  
  if (!allLowUtilization) return null;
  
  const latest = recent[recent.length - 1];
  const estimatedSavings = latest.unblendedCost * (IDLE_DAYS / 30);
  
  return buildAnomaly({
    billingRecordId: latest._id,
    accountId,
    resourceId,
    anomalyType: 'IDLE',
    severity: estimatedSavings > 100 ? 'HIGH' : estimatedSavings > 50 ? 'MEDIUM' : 'LOW',
    metricSnapshot: {
      cpuAvg: recent.reduce((sum, r) => sum + (r.tags?.cpuUtilization ?? r.tags?.cpu_avg ?? 3), 0) / recent.length,
      daysObserved: recent.length,
      avgDailyCost: recent.reduce((sum, r) => sum + r.unblendedCost, 0) / recent.length,
    },
    estimatedMonthlySavings: estimatedSavings,
  });
}

function detectOverProvisioned(records, accountId, resourceId) {
  if (records.length < 14) return null;
  
  const recent = records.slice(-14);
  const avgUtilization = recent.reduce((sum, r) => {
    const cpu = r.tags?.cpuUtilization ?? r.tags?.cpu_avg ?? Math.random() * 30;
    return sum + cpu;
  }, 0) / recent.length;
  
  if (avgUtilization > OVER_PROVISIONED_THRESHOLD) return null;
  
  const latest = recent[recent.length - 1];
  const estimatedSavings = latest.unblendedCost * 0.4 * (14 / 30);
  
  return buildAnomaly({
    billingRecordId: latest._id,
    accountId,
    resourceId,
    anomalyType: 'OVER_PROVISIONED',
    severity: estimatedSavings > 200 ? 'HIGH' : estimatedSavings > 100 ? 'MEDIUM' : 'LOW',
    metricSnapshot: {
      cpuAvg: avgUtilization,
      daysObserved: recent.length,
      avgDailyCost: recent.reduce((sum, r) => sum + r.unblendedCost, 0) / recent.length,
      recommendedSize: 'one-size-smaller',
    },
    estimatedMonthlySavings: estimatedSavings,
  });
}

function detectSpike(records, accountId, resourceId) {
  if (records.length < 3) return null;
  
  const recent = records.slice(-3);
  const costs = recent.map(r => r.unblendedCost);
  const avgCost = costs.slice(0, -1).reduce((a, b) => a + b, 0) / (costs.length - 1);
  const latestCost = costs[costs.length - 1];
  
  if (latestCost < avgCost * SPIKE_MULTIPLIER) return null;
  
  const latest = recent[recent.length - 1];
  const estimatedSavings = (latestCost - avgCost) * (30 / 3);
  
  return buildAnomaly({
    billingRecordId: latest._id,
    accountId,
    resourceId,
    anomalyType: 'SPIKE',
    severity: latestCost > avgCost * 5 ? 'CRITICAL' : 'HIGH',
    metricSnapshot: {
      currentCost: latestCost,
      baselineCost: avgCost,
      spikeRatio: latestCost / avgCost,
      daysObserved: recent.length,
    },
    estimatedMonthlySavings: estimatedSavings,
  });
}

function buildAnomaly(data) {
  return {
    ...data,
    detectedAt: new Date(),
    status: 'OPEN',
  };
}

export async function upsertAnomalies(anomalies) {
  const operations = anomalies.map(a => ({
    updateOne: {
      filter: {
        accountId: a.accountId,
        resourceId: a.resourceId,
        anomalyType: a.anomalyType,
        status: 'OPEN',
      },
      update: { $set: a },
      upsert: true,
    },
  }));
  
  if (operations.length === 0) return { new: 0, updated: 0 };
  
  const result = await Anomaly.bulkWrite(operations);
  return {
    new: result.upsertedCount,
    updated: result.modifiedCount,
  };
}

export async function resolveStaleAnomalies(activeResourceKeys) {
  const result = await Anomaly.updateMany(
    {
      status: 'OPEN',
      resourceId: { $nin: activeResourceKeys },
    },
    { $set: { status: 'RESOLVED', updatedAt: new Date() } }
  );
  return result.modifiedCount;
}
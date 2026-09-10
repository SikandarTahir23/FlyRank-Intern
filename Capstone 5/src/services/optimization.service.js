import { OptimizationAction } from '../modules/optimizations/optimizations.model.js';

const ACTION_MAP = {
  IDLE: { type: 'STOP', config: { schedule: '0 22 * * *' }, risk: 'LOW', savingsFactor: 0.8 },
  OVER_PROVISIONED: { type: 'DOWNSIZE', config: { instanceType: 'one-size-smaller' }, risk: 'MEDIUM', savingsFactor: 0.4 },
  ORPHANED: { type: 'DELETE', config: {}, risk: 'HIGH', savingsFactor: 1.0 },
  SPIKE: { type: 'RIGHTSIZE', config: { action: 'investigate' }, risk: 'MEDIUM', savingsFactor: 0.3 },
};

export async function generateOptimizations(anomalies) {
  const actions = [];
  
  for (const anomaly of anomalies) {
    const mapping = ACTION_MAP[anomaly.anomalyType];
    if (!mapping) continue;
    
    const estimatedSavings = anomaly.estimatedMonthlySavings * mapping.savingsFactor;
    
    actions.push({
      anomalyId: anomaly._id,
      actionType: mapping.type,
      recommendedConfig: mapping.config,
      estimatedSavings: parseFloat(estimatedSavings.toFixed(2)),
      riskLevel: mapping.risk,
      status: 'PENDING',
    });
  }
  
  if (actions.length > 0) {
    await OptimizationAction.insertMany(actions);
  }
  
  return actions;
}

export async function approveAction(actionId, approvedBy) {
  return OptimizationAction.findByIdAndUpdate(
    actionId,
    { status: 'APPROVED', approvedBy, updatedAt: new Date() },
    { new: true }
  );
}

export async function rejectAction(actionId, reason) {
  return OptimizationAction.findByIdAndUpdate(
    actionId,
    { status: 'REJECTED', recommendedConfig: { ...reason }, updatedAt: new Date() },
    { new: true }
  );
}

export async function executeAction(actionId) {
  return OptimizationAction.findByIdAndUpdate(
    actionId,
    { status: 'EXECUTED', executedAt: new Date(), updatedAt: new Date() },
    { new: true }
  );
}
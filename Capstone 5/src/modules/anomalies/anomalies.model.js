import mongoose from 'mongoose';

const anomalySchema = new mongoose.Schema({
  billingRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingRecord', required: true },
  accountId: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  anomalyType: { 
    type: String, 
    required: true, 
    enum: ['IDLE', 'OVER_PROVISIONED', 'ORPHANED', 'SPIKE'],
    index: true 
  },
  severity: { 
    type: String, 
    required: true, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    index: true 
  },
  detectedAt: { type: Date, default: Date.now },
  metricSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
  estimatedMonthlySavings: { type: Number, required: true, default: 0 },
  status: { 
    type: String, 
    required: true, 
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'],
    default: 'OPEN',
    index: true 
  },
  llmExplanation: { type: String },
  llmGeneratedAt: { type: Date },
}, {
  timestamps: true,
});

anomalySchema.index({ accountId: 1, status: 1, detectedAt: -1 });
anomalySchema.index({ anomalyType: 1, severity: 1 });

export const Anomaly = mongoose.model('Anomaly', anomalySchema);
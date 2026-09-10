import mongoose from 'mongoose';

const optimizationActionSchema = new mongoose.Schema({
  anomalyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Anomaly', required: true, index: true },
  actionType: { 
    type: String, 
    required: true, 
    enum: ['STOP', 'DOWNSIZE', 'RIGHTSIZE', 'DELETE', 'SCHEDULE'] 
  },
  recommendedConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
  estimatedSavings: { type: Number, required: true, default: 0 },
  riskLevel: { 
    type: String, 
    required: true, 
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM' 
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['PENDING', 'APPROVED', 'EXECUTED', 'REJECTED'],
    default: 'PENDING',
    index: true 
  },
  approvedBy: { type: String },
  executedAt: { type: Date },
}, {
  timestamps: true,
});

optimizationActionSchema.index({ status: 1, createdAt: -1 });

export const OptimizationAction = mongoose.model('OptimizationAction', optimizationActionSchema);
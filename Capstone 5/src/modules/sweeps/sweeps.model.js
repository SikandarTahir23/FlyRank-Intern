import mongoose from 'mongoose';

const sweepRunSchema = new mongoose.Schema({
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  status: { 
    type: String, 
    required: true, 
    enum: ['RUNNING', 'COMPLETED', 'FAILED'],
    default: 'RUNNING' 
  },
  recordsProcessed: { type: Number, default: 0 },
  anomaliesDetected: { type: Number, default: 0 },
  anomaliesNew: { type: Number, default: 0 },
  anomaliesResolved: { type: Number, default: 0 },
  error: { type: String },
}, {
  timestamps: true,
});

sweepRunSchema.index({ startedAt: -1 });

export const SweepRun = mongoose.model('SweepRun', sweepRunSchema);
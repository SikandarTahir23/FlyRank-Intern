import mongoose from 'mongoose';

const billingRecordSchema = new mongoose.Schema({
  accountId: { type: String, required: true, index: true },
  service: { type: String, required: true },
  resourceId: { type: String, required: true },
  resourceType: { type: String, required: true },
  region: { type: String, required: true },
  usageAmount: { type: Number, required: true },
  unit: { type: String, required: true },
  unblendedCost: { type: Number, required: true },
  blendedCost: { type: Number, required: true },
  tags: { type: mongoose.Schema.Types.Mixed, default: {} },
  billingPeriodStart: { type: Date, required: true },
  billingPeriodEnd: { type: Date, required: true },
  ingestedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

billingRecordSchema.index({ accountId: 1, billingPeriodStart: -1 });
billingRecordSchema.index({ service: 1, resourceId: 1, billingPeriodStart: -1 });
billingRecordSchema.index({ ingestedAt: -1 });

export const BillingRecord = mongoose.model('BillingRecord', billingRecordSchema);
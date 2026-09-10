import express from 'express';
import { BillingRecord } from './billing.model.js';
import { getOrSet, invalidatePrefix } from '../../config/cache.js';

const router = express.Router();

const CACHE_TTL = parseInt(process.env.CACHE_TTL_BILLING_SUMMARY_MS || '3600000', 10);

router.post('/ingest', async (req, res, next) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    if (records.length === 0) {
      return res.status(400).json({ error: 'No records provided' });
    }
    
    const start = Date.now();
    const docs = records.map(r => ({
      ...r,
      ingestedAt: new Date(),
      billingPeriodStart: new Date(r.billingPeriodStart),
      billingPeriodEnd: new Date(r.billingPeriodEnd),
    }));
    
    await BillingRecord.insertMany(docs, { ordered: false });
    invalidatePrefix('billing:summary');
    
    res.json({ ingested: docs.length, durationMs: Date.now() - start });
  } catch (error) {
    next(error);
  }
});

router.get('/records', async (req, res, next) => {
  try {
    const {
      accountId,
      service,
      resourceId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;
    
    const filter = {};
    if (accountId) filter.accountId = accountId;
    if (service) filter.service = service;
    if (resourceId) filter.resourceId = resourceId;
    if (startDate || endDate) {
      filter.billingPeriodStart = {};
      if (startDate) filter.billingPeriodStart.$gte = new Date(startDate);
      if (endDate) filter.billingPeriodStart.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      BillingRecord.find(filter).sort({ billingPeriodStart: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      BillingRecord.countDocuments(filter),
    ]);
    
    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const { accountId, period } = req.query;
    const cacheKey = `billing:summary:${accountId || 'all'}:${period || 'current'}`;
    
    const summary = await getOrSet(cacheKey, CACHE_TTL, async () => {
      const match = {};
      if (accountId) match.accountId = accountId;
      if (period) {
        const start = new Date(period);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        match.billingPeriodStart = { $gte: start, $lt: end };
      }
      
      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: '$service',
            totalCost: { $sum: '$unblendedCost' },
            recordCount: { $sum: 1 },
            resources: { $addToSet: '$resourceId' },
          },
        },
        { $sort: { totalCost: -1 } },
      ];
      
      const byService = await BillingRecord.aggregate(pipeline);
      const total = byService.reduce((sum, s) => sum + s.totalCost, 0);
      
      return {
        accountId: accountId || 'all',
        period: period || new Date().toISOString().slice(0, 7),
        byService,
        total: parseFloat(total.toFixed(2)),
      };
    });
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
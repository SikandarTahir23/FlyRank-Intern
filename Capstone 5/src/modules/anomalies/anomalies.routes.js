import express from 'express';
import { Anomaly } from './anomalies.model.js';
import { getOrSet, invalidatePrefix } from '../../config/cache.js';
import { getExplanation } from '../../services/llmExplanation.service.js';

const router = express.Router();

const CACHE_TTL_SUMMARY = parseInt(process.env.CACHE_TTL_ANOMALY_SUMMARY_MS || '1800000', 10);
const CACHE_TTL_LIST = parseInt(process.env.CACHE_TTL_ANOMALY_LIST_MS || '300000', 10);

router.get('/', async (req, res, next) => {
  try {
    const {
      accountId,
      status,
      severity,
      anomalyType,
      resourceId,
      page = 1,
      limit = 50,
    } = req.query;
    
    const filter = {};
    if (accountId) filter.accountId = accountId;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (anomalyType) filter.anomalyType = anomalyType;
    if (resourceId) filter.resourceId = resourceId;
    
    const cacheKey = `anomalies:list:${JSON.stringify(filter)}`;
    
    const result = await getOrSet(cacheKey, CACHE_TTL_LIST, async () => {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [data, total] = await Promise.all([
        Anomaly.find(filter).sort({ detectedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
        Anomaly.countDocuments(filter),
      ]);
      return { data, total };
    });
    
    res.json({
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        pages: Math.ceil(result.total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (req, res, next) => {
  try {
    const { accountId } = req.query;
    const cacheKey = `anomalies:summary:${accountId || 'all'}`;
    
    const summary = await getOrSet(cacheKey, CACHE_TTL_SUMMARY, async () => {
      const match = accountId ? { accountId } : {};
      
      const [byType, bySeverity, totalOpen] = await Promise.all([
        Anomaly.aggregate([
          { $match: { ...match, status: 'OPEN' } },
          { $group: { _id: '$anomalyType', count: { $sum: 1 } } },
        ]),
        Anomaly.aggregate([
          { $match: { ...match, status: 'OPEN' } },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]),
        Anomaly.countDocuments({ ...match, status: 'OPEN' }),
      ]);
      
      return {
        byType: Object.fromEntries(byType.map(t => [t._id, t.count])),
        bySeverity: Object.fromEntries(bySeverity.map(s => [s._id, s.count])),
        totalOpen,
      };
    });
    
    res.json(summary);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const anomaly = await Anomaly.findById(req.params.id).lean();
    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    const { explanation, cached } = await getExplanation(anomaly._id);
    
    res.json({ anomaly, explanation, cached });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const anomaly = await Anomaly.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    
    if (!anomaly) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }
    
    invalidatePrefix('anomalies:summary');
    invalidatePrefix('anomalies:list');
    
    res.json({ anomaly });
  } catch (error) {
    next(error);
  }
});

export default router;
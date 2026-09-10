import express from 'express';
import { OptimizationAction } from './optimizations.model.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { status, riskLevel, anomalyId, page = 1, limit = 50 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (anomalyId) filter.anomalyId = anomalyId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      OptimizationAction.find(filter)
        .populate('anomalyId', 'anomalyType severity resourceId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      OptimizationAction.countDocuments(filter),
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

router.post('/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    if (!approvedBy) {
      return res.status(400).json({ error: 'approvedBy required' });
    }
    
    const action = await OptimizationAction.findByIdAndUpdate(
      req.params.id,
      { status: 'APPROVED', approvedBy, updatedAt: new Date() },
      { new: true }
    );
    
    if (!action) {
      return res.status(404).json({ error: 'Optimization action not found' });
    }
    
    res.json({ action });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    const action = await OptimizationAction.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'REJECTED', 
        recommendedConfig: { ...action.recommendedConfig, rejectionReason: reason },
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!action) {
      return res.status(404).json({ error: 'Optimization action not found' });
    }
    
    res.json({ action });
  } catch (error) {
    next(error);
  }
});

export default router;
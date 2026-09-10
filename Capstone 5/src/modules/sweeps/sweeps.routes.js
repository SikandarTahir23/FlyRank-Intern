import express from 'express';
import { SweepRun } from './sweeps.model.js';
import { triggerSweep } from '../../jobs/dailySweep.job.js';

const router = express.Router();

router.post('/trigger', async (req, res, next) => {
  try {
    const run = await triggerSweep();
    res.json({ sweepRunId: run._id, status: run.status });
  } catch (error) {
    if (error.message === 'Sweep already running') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [data, total] = await Promise.all([
      SweepRun.find().sort({ startedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      SweepRun.countDocuments(),
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

router.get('/:id', async (req, res, next) => {
  try {
    const run = await SweepRun.findById(req.params.id).lean();
    if (!run) {
      return res.status(404).json({ error: 'Sweep run not found' });
    }
    res.json({ sweepRun: run });
  } catch (error) {
    next(error);
  }
});

export default router;
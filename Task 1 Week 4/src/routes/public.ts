import { Router, Response } from 'express';

const router = Router();

router.get('/info', (_req, res: Response) => {
  return res.json({
    message: 'Public information endpoint',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
import { Router, Response } from 'express';
import { authGuard } from '../middleware/authGuard.js';

const router = Router();

router.get('/profile', authGuard, (req, res: Response) => {
  const { id, email, created_at, user_metadata, app_metadata } = req.user;
  
  return res.json({
    id,
    email,
    created_at,
    user_metadata,
    app_metadata,
  });
});

export default router;
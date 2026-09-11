import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.user = {
    id: user.id,
    email: user.email ?? '',
    created_at: user.created_at,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  };
  next();
};

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        created_at: string;
        user_metadata: Record<string, unknown>;
        app_metadata: Record<string, unknown>;
        [key: string]: unknown;
      };
    }
  }
}
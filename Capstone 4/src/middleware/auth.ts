import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { User, UserRole } from '@prisma/client';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  APPROVER: 3,
  ADMIN: 4,
};

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    req.user = { id: payload.userId } as User;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  const minLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r]));
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }
    
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'User not found' });
      return;
    }
    
    if (ROLE_HIERARCHY[user.role] < minLevel) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient permissions' });
      return;
    }
    
    req.user = user;
    next();
  };
}

export const requireApprover = requireRole('APPROVER', 'ADMIN');
export const requireEditor = requireRole('EDITOR', 'APPROVER', 'ADMIN');
export const requireAdmin = requireRole('ADMIN');
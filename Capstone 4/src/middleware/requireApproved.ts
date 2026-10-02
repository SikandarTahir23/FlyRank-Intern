import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
import { Variant } from '@prisma/client';
import { UnapprovedVariantError, NotFoundError } from '../utils/errors.js';

export const requireApproved = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const variant = await prisma.variant.findUnique({ where: { id: req.params.id } });
  if (!variant) throw new NotFoundError('Variant', req.params.id);
  
  if (!['APPROVED', 'SCHEDULED'].includes(variant.status)) {
    throw new UnapprovedVariantError(variant.status);
  }
  
  req.variant = variant;
  next();
};
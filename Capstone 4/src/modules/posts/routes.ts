import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma.js';
import { createPost, getPostWithVariants, getPostsByAuthor, updatePost, deletePost } from './service.js';
import { createPostSchema, updatePostSchema } from './types.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/', authenticate, async (req: Request, res: Response) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const post = await createPost(parsed.data, req.user!.id);
  res.status(201).json(post);
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const posts = await getPostsByAuthor(req.user!.id);
  res.json(posts);
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const post = await getPostWithVariants(req.params.id);
  if (!post) throw new NotFoundError('Post', req.params.id);
  if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to view this post' });
  }
  res.json(post);
});

router.patch('/:id', authenticate, async (req: Request, res: Response) => {
  const parsed = updatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })));
  }
  const post = await getPostWithVariants(req.params.id);
  if (!post) throw new NotFoundError('Post', req.params.id);
  if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to update this post' });
  }
  const updated = await updatePost(req.params.id, parsed.data);
  res.json(updated);
});

router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  const post = await getPostWithVariants(req.params.id);
  if (!post) throw new NotFoundError('Post', req.params.id);
  if (post.authorId !== req.user!.id && req.user!.role !== 'ADMIN') {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Not authorized to delete this post' });
  }
  await deletePost(req.params.id);
  res.status(204).send();
});

export default router;
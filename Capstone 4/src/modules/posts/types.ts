import { z } from 'zod';
import { Post, Variant } from '@prisma/client';

export const createPostSchema = z.object({
  title: z.string().min(1).max(500),
  sourceUrl: z.string().url().optional(),
  sourceMarkdown: z.string().optional(),
  description: z.string().max(2000).optional(),
}).refine(data => data.sourceUrl || data.sourceMarkdown, {
  message: 'Either sourceUrl or sourceMarkdown is required',
  path: ['sourceUrl'],
});

export const updatePostSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export interface PostWithVariants extends Post {
  variants: Variant[];
}
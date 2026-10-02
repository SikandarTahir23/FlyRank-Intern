import { prisma } from '../../db/prisma.js';
import { Post, User } from '@prisma/client';
import { fetchAndExtractContent } from '../../utils/fetch.js';
import { parseMarkdown, extractFirstHeading } from '../../utils/markdown.js';
import { NotFoundError } from '../../utils/errors.js';
import { CreatePostInput } from './types.js';

export async function createPost(input: CreatePostInput, authorId: string): Promise<Post> {
  let title = input.title;
  let sourceMarkdown = input.sourceMarkdown;
  let description = input.description;

  if (input.sourceUrl) {
    const extracted = await fetchAndExtractContent(input.sourceUrl);
    if (!title) title = extracted.title;
    if (!sourceMarkdown) sourceMarkdown = extracted.markdown;
    if (!description) description = extracted.description;
  }

  if (sourceMarkdown && !title) {
    title = extractFirstHeading(sourceMarkdown) || 'Untitled';
  }

  return prisma.post.create({
    data: {
      title: title || 'Untitled',
      sourceUrl: input.sourceUrl,
      sourceMarkdown,
      description,
      authorId,
    },
  });
}

export async function getPostById(id: string): Promise<Post | null> {
  return prisma.post.findUnique({ where: { id } });
}

export async function getPostWithVariants(id: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      variants: {
        include: {
          attempts: { orderBy: { createdAt: 'desc' } },
          slots: true,
        },
      },
    },
  });
}

export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  return prisma.post.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
    include: {
      variants: { select: { id: true, platform: true, status: true } },
    },
  });
}

export async function updatePost(id: string, data: Partial<Pick<Post, 'title' | 'description'>>): Promise<Post> {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Post', id);
  return prisma.post.update({ where: { id }, data });
}

export async function deletePost(id: string): Promise<void> {
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) throw new NotFoundError('Post', id);
  await prisma.post.delete({ where: { id } });
}
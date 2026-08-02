import { z } from 'zod';

export const commentDocumentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
});

export const addCommentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Comment content is required')
      .max(2000, 'Comment must be at most 2000 characters')
      .trim(),
  }),
});

export const addReplySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    commentId: z.string().min(1, 'Comment ID is required'),
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Reply content is required')
      .max(2000, 'Reply must be at most 2000 characters')
      .trim(),
  }),
});

export const commentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    commentId: z.string().min(1, 'Comment ID is required'),
  }),
});

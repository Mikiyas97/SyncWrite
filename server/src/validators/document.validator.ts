import { z } from 'zod';

export const createDocumentSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be at most 255 characters')
      .trim()
      .optional(),
  }),
});

export const renameDocumentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(255, 'Title must be at most 255 characters')
      .trim(),
  }),
});

export const documentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
});

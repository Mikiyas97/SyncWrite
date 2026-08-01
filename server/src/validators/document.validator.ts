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

export const updateContentSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    content: z.record(z.string(), z.any()),
  }),
});

export const addCollaboratorSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
  body: z.object({
    email: z.string().email('Invalid email address').trim().toLowerCase(),
    role: z.enum(['editor', 'viewer', 'commenter']),
  }),
});

export const updateCollaboratorRoleSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    userId: z.string().min(1, 'User ID is required'),
  }),
  body: z.object({
    role: z.enum(['editor', 'viewer', 'commenter']),
  }),
});

export const removeCollaboratorSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    userId: z.string().min(1, 'User ID is required'),
  }),
});

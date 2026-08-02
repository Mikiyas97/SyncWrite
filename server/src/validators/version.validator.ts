import { z } from 'zod';

export const versionDocumentIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
  }),
});

export const versionIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Document ID is required'),
    versionId: z.string().min(1, 'Version ID is required'),
  }),
});

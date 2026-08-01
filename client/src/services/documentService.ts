import api from '../api/axios';
import type { Document, DocumentListResponse } from '../types/document';

/**
 * Create a new document.
 */
export const createDocument = async (title?: string): Promise<Document> => {
  const res = await api.post('/documents', { title });
  return res.data.data.document;
};

/**
 * List all documents (owned + shared), with optional search.
 */
export const listDocuments = async (search?: string): Promise<DocumentListResponse> => {
  const params = search?.trim() ? { search: search.trim() } : {};
  const res = await api.get('/documents', { params });
  return res.data.data;
};

/**
 * Get a single document by ID.
 */
export const getDocument = async (id: string): Promise<Document> => {
  const res = await api.get(`/documents/${id}`);
  return res.data.data.document;
};

/**
 * Rename a document.
 */
export const renameDocument = async (id: string, title: string): Promise<Document> => {
  const res = await api.patch(`/documents/${id}/rename`, { title });
  return res.data.data.document;
};

/**
 * Duplicate a document.
 */
export const duplicateDocument = async (id: string): Promise<Document> => {
  const res = await api.post(`/documents/${id}/duplicate`);
  return res.data.data.document;
};

/**
 * Delete a document.
 */
export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/documents/${id}`);
};

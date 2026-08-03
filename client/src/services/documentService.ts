import api from '../api/axios';
import type { Document, DocumentListResponse } from '../types/document';
import type { User } from '../types';

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

/**
 * Toggle favorite status of a document.
 */
export const toggleFavoriteDocument = async (
  id: string
): Promise<{ isFavorite: boolean; isPinned: boolean }> => {
  const res = await api.patch(`/documents/${id}/favorite`);
  return res.data.data;
};

/**
 * Toggle pin status of a document.
 */
export const togglePinDocument = async (
  id: string
): Promise<{ isFavorite: boolean; isPinned: boolean }> => {
  const res = await api.patch(`/documents/${id}/pin`);
  return res.data.data;
};

/**
 * Update document content (Tiptap JSON).
 */
export const updateDocumentContent = async (
  id: string,
  content: Record<string, any>
): Promise<Document> => {
  const res = await api.patch(`/documents/${id}/content`, { content });
  return res.data.data.document;
};

/**
 * Add a collaborator by email.
 */
export const addCollaborator = async (
  id: string,
  email: string,
  role: 'editor' | 'viewer' | 'commenter'
): Promise<Document> => {
  const res = await api.post(`/documents/${id}/collaborators`, { email, role });
  return res.data.data.document;
};

/**
 * List collaborators for a document.
 */
export const getCollaborators = async (
  id: string
): Promise<{ owner: Document['owner']; collaborators: Document['collaborators'] }> => {
  const res = await api.get(`/documents/${id}/collaborators`);
  return res.data.data;
};

/**
 * Update a collaborator's role.
 */
export const updateCollaboratorRole = async (
  id: string,
  userId: string,
  role: 'editor' | 'viewer' | 'commenter'
): Promise<Document> => {
  const res = await api.patch(`/documents/${id}/collaborators/${userId}`, { role });
  return res.data.data.document;
};

/**
 * Remove a collaborator or leave document.
 */
export const removeCollaborator = async (id: string, userId: string): Promise<void> => {
  await api.delete(`/documents/${id}/collaborators/${userId}`);
};

/**
 * Search users by name or email for sharing autocomplete.
 */
export const searchUsers = async (query: string): Promise<Pick<User, '_id' | 'name' | 'email' | 'avatarColor'>[]> => {
  const res = await api.get('/users/search', { params: { q: query } });
  return res.data.data.users;
};

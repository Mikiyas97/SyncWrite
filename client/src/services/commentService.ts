import api from '../api/axios';
import type { Comment } from '../types/document';

/**
 * List comments for a document (top-level with populated replies).
 */
export const listComments = async (documentId: string): Promise<Comment[]> => {
  const res = await api.get(`/documents/${documentId}/comments`);
  return res.data.data.comments;
};

/**
 * Add a top-level comment.
 */
export const addComment = async (
  documentId: string,
  content: string
): Promise<Comment> => {
  const res = await api.post(`/documents/${documentId}/comments`, { content });
  return res.data.data.comment;
};

/**
 * Add a reply to a comment.
 */
export const addReply = async (
  documentId: string,
  commentId: string,
  content: string
): Promise<Comment> => {
  const res = await api.post(
    `/documents/${documentId}/comments/${commentId}/replies`,
    { content }
  );
  return res.data.data.reply;
};

/**
 * Toggle resolve status for a comment thread.
 */
export const resolveComment = async (
  documentId: string,
  commentId: string
): Promise<Comment> => {
  const res = await api.patch(
    `/documents/${documentId}/comments/${commentId}/resolve`
  );
  return res.data.data.comment;
};

/**
 * Delete a comment or reply.
 */
export const deleteComment = async (
  documentId: string,
  commentId: string
): Promise<void> => {
  await api.delete(`/documents/${documentId}/comments/${commentId}`);
};

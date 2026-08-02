import api from '../api/axios';
import type { DocumentVersion } from '../types/document';

interface ListVersionsResponse {
  versions: DocumentVersion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * List versions for a document (newest first).
 */
export const listVersions = async (
  documentId: string,
  page = 1,
  limit = 20
): Promise<ListVersionsResponse> => {
  const res = await api.get(`/documents/${documentId}/versions`, {
    params: { page, limit },
  });
  return res.data.data;
};

/**
 * Get a single version with full content.
 */
export const getVersion = async (
  documentId: string,
  versionId: string
): Promise<DocumentVersion> => {
  const res = await api.get(`/documents/${documentId}/versions/${versionId}`);
  return res.data.data.version;
};

/**
 * Create a manual version snapshot.
 */
export const createManualVersion = async (
  documentId: string
): Promise<DocumentVersion> => {
  const res = await api.post(`/documents/${documentId}/versions`);
  return res.data.data.version;
};

/**
 * Restore a previous version.
 * Returns the new restore-version and the updated document.
 */
export const restoreVersion = async (
  documentId: string,
  versionId: string
): Promise<{ version: DocumentVersion; document: any }> => {
  const res = await api.post(
    `/documents/${documentId}/versions/${versionId}/restore`
  );
  return res.data.data;
};

import api from '../api/axios';
import type { ActivityItem } from '../types/activity';

interface ListActivitiesResponse {
  activities: ActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Fetch activity history for a document.
 */
export const getDocumentActivity = async (
  documentId: string,
  page = 1,
  limit = 30
): Promise<ListActivitiesResponse> => {
  const res = await api.get(`/documents/${documentId}/activity`, {
    params: { page, limit },
  });
  return res.data.data;
};

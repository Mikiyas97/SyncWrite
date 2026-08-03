export type ActivityAction =
  | 'document_created'
  | 'document_renamed'
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'collaborator_role_updated'
  | 'collaborator_joined'
  | 'collaborator_left'
  | 'version_restored'
  | 'comment_added'
  | 'comment_replied'
  | 'comment_resolved'
  | 'comment_reopened'
  | 'comment_deleted';

export interface ActivityUser {
  _id: string;
  name: string;
  email: string;
  avatarColor?: string;
}

export interface ActivityItem {
  _id: string;
  document: string;
  user: ActivityUser;
  action: ActivityAction;
  details?: {
    targetUser?: ActivityUser | string;
    targetUserName?: string;
    oldTitle?: string;
    newTitle?: string;
    title?: string;
    role?: string;
    oldRole?: string;
    newRole?: string;
    versionNumber?: number;
    restoredVersionNumber?: number;
    commentSnippet?: string;
    commentId?: string;
    parentCommentId?: string;
    isSelfRemoval?: boolean;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ActivityResponse {
  success: boolean;
  data: {
    activities: ActivityItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

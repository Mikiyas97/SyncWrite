export type DocumentRole = 'owner' | 'editor' | 'viewer' | 'commenter';

export interface DocumentCollaborator {
  user: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
  role: DocumentRole;
}

export interface Document {
  _id: string;
  title: string;
  content: Record<string, any>;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
  collaborators: DocumentCollaborator[];
  lastOpenedBy: Array<{
    user: string;
    openedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResponse {
  owned: Document[];
  shared: Document[];
  recentlyOpened: Document[];
  total: number;
}

export type VersionSource = 'manual' | 'auto' | 'restore';

export interface DocumentVersion {
  _id: string;
  document: string;
  versionNumber: number;
  title: string;
  content?: Record<string, any>; // Only present in getVersion (excluded from list)
  createdBy: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
  source: VersionSource;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  document: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
  content: string;
  parentComment: string | null;
  isResolved: boolean;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  } | null;
  resolvedAt?: string | null;
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

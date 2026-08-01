export type DocumentRole = 'owner' | 'editor' | 'viewer';

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

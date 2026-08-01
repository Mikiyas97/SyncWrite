export type DocumentRole = 'owner' | 'editor' | 'viewer';

export interface DocumentCollaborator {
  _id: string;
  name: string;
  email: string;
  avatarColor: string;
  role: DocumentRole;
}

export interface Document {
  _id: string;
  title: string;
  owner: {
    _id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
  collaborators: DocumentCollaborator[];
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

import mongoose, { Schema, Document as MongoDoc, Types } from 'mongoose';

export type CollaboratorRole = 'editor' | 'viewer';

export interface ICollaborator {
  user: Types.ObjectId;
  role: CollaboratorRole;
}

export interface ILastOpened {
  user: Types.ObjectId;
  openedAt: Date;
}

export interface IDocument extends MongoDoc {
  title: string;
  content: Record<string, any>;
  owner: Types.ObjectId;
  collaborators: ICollaborator[];
  lastOpenedBy: ILastOpened[];
  createdAt: Date;
  updatedAt: Date;
}

const CollaboratorSchema = new Schema<ICollaborator>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['editor', 'viewer'],
      default: 'viewer',
    },
  },
  { _id: false }
);

const LastOpenedSchema = new Schema<ILastOpened>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const DocumentSchema = new Schema<IDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      default: 'Untitled Document',
    },
    content: {
      type: Schema.Types.Mixed,
      default: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      },
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    collaborators: {
      type: [CollaboratorSchema],
      default: [],
    },
    lastOpenedBy: {
      type: [LastOpenedSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for "shared with me" queries
DocumentSchema.index({ 'collaborators.user': 1 });

// Index for sorting by recent activity
DocumentSchema.index({ updatedAt: -1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);

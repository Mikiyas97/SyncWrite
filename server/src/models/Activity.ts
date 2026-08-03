import mongoose, { Schema, Document as MongoDoc, Types } from 'mongoose';

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

export interface IActivity extends MongoDoc {
  document: Types.ObjectId;
  user: Types.ObjectId;
  action: ActivityAction;
  details?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'document_created',
        'document_renamed',
        'collaborator_added',
        'collaborator_removed',
        'collaborator_role_updated',
        'collaborator_joined',
        'collaborator_left',
        'version_restored',
        'comment_added',
        'comment_replied',
        'comment_resolved',
        'comment_reopened',
        'comment_deleted',
      ],
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying activity history for a document ordered by newest first
ActivitySchema.index({ document: 1, createdAt: -1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);

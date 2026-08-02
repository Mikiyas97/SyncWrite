import mongoose, { Schema, Document as MongoDoc, Types } from 'mongoose';

export interface IComment extends MongoDoc {
  document: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  parentComment: Types.ObjectId | null;
  isResolved: boolean;
  resolvedBy: Types.ObjectId | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [2000, 'Comment must be at most 2000 characters'],
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for listing comments by document, sorted by creation time
CommentSchema.index({ document: 1, createdAt: 1 });

// Index for finding replies to a parent comment
CommentSchema.index({ parentComment: 1 });

export default mongoose.model<IComment>('Comment', CommentSchema);

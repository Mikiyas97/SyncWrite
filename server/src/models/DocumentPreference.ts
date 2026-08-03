import mongoose, { Schema, Document } from 'mongoose';

export interface IDocumentPreference extends Document {
  user: mongoose.Types.ObjectId;
  document: mongoose.Types.ObjectId;
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentPreferenceSchema = new Schema<IDocumentPreference>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user has only one preference document per document
DocumentPreferenceSchema.index({ user: 1, document: 1 }, { unique: true });

export default mongoose.model<IDocumentPreference>(
  'DocumentPreference',
  DocumentPreferenceSchema
);

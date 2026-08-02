import mongoose, { Schema, Document as MongoDoc, Types } from 'mongoose';

export type VersionSource = 'manual' | 'auto' | 'restore';

export interface IVersion extends MongoDoc {
  document: Types.ObjectId;
  versionNumber: number;
  title: string;
  content: Record<string, any>;
  createdBy: Types.ObjectId;
  source: VersionSource;
  createdAt: Date;
  updatedAt: Date;
}

const VersionSchema = new Schema<IVersion>(
  {
    document: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    source: {
      type: String,
      enum: ['manual', 'auto', 'restore'],
      required: true,
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient listing: newest versions first per document
VersionSchema.index({ document: 1, versionNumber: -1 });

/**
 * Static helper: get the next version number for a document.
 */
VersionSchema.statics.getNextVersionNumber = async function (
  documentId: Types.ObjectId | string
): Promise<number> {
  const lastVersion = await this.findOne({ document: documentId })
    .sort({ versionNumber: -1 })
    .select('versionNumber')
    .lean();
  return lastVersion ? lastVersion.versionNumber + 1 : 1;
};

export interface IVersionModel extends mongoose.Model<IVersion> {
  getNextVersionNumber(documentId: Types.ObjectId | string): Promise<number>;
}

export default mongoose.model<IVersion, IVersionModel>('DocumentVersion', VersionSchema);

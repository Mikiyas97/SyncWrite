import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Document from '../models/Document';
import Version from '../models/Version';
import { AppError } from '../utils/AppError';
import { getIO } from '../socket';
import { logger } from '../utils/logger';
import { logActivity } from '../utils/activityLogger';

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * Helper: check document access and return the document + user role info.
 */
async function getDocumentWithAccess(
  documentId: string,
  userId: string,
  next: NextFunction
): Promise<{ document: any; isOwner: boolean; isEditor: boolean; isCollaborator: boolean } | null> {
  if (!isValidObjectId(documentId)) {
    next(new AppError('Invalid document ID', 400));
    return null;
  }

  const document = await Document.findById(documentId);
  if (!document) {
    next(new AppError('Document not found', 404));
    return null;
  }

  const isOwner = document.owner.toString() === userId;
  const collaborator = document.collaborators.find(
    (c) => c.user.toString() === userId
  );
  const isCollaborator = !!collaborator;
  const isEditor = collaborator?.role === 'editor';

  if (!isOwner && !isCollaborator) {
    next(new AppError('You do not have access to this document', 403));
    return null;
  }

  return { document, isOwner, isEditor, isCollaborator };
}

/**
 * GET /api/documents/:id/versions
 * List all versions for a document (newest first).
 * Requires document access (owner or any collaborator).
 */
export const listVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const userId = req.user._id.toString();

    const access = await getDocumentWithAccess(documentId, userId, next);
    if (!access) return;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [versions, total] = await Promise.all([
      Version.find({ document: documentId })
        .sort({ versionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .select('-content') // Exclude content from list for performance
        .populate('createdBy', 'name email avatarColor')
        .lean(),
      Version.countDocuments({ document: documentId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        versions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/versions/:versionId
 * Get a single version with full content.
 * Requires document access.
 */
export const getVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const versionId = req.params.versionId as string;
    const userId = req.user._id.toString();

    const access = await getDocumentWithAccess(documentId, userId, next);
    if (!access) return;

    if (!isValidObjectId(versionId)) {
      return next(new AppError('Invalid version ID', 400));
    }

    const version = await Version.findOne({
      _id: versionId,
      document: documentId,
    })
      .populate('createdBy', 'name email avatarColor')
      .lean();

    if (!version) {
      return next(new AppError('Version not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { version },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/versions
 * Create a manual version snapshot.
 * Requires owner or editor role.
 */
export const createManualVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const userId = req.user._id.toString();

    const access = await getDocumentWithAccess(documentId, userId, next);
    if (!access) return;

    if (!access.isOwner && !access.isEditor) {
      return next(new AppError('Only the document owner or editors can create versions', 403));
    }

    const { document } = access;
    const versionNumber = await Version.getNextVersionNumber(documentId);

    const versionDoc = new Version({
      document: documentId,
      versionNumber,
      title: document.title,
      content: document.content,
      createdBy: userId,
      source: 'manual',
    });
    await versionDoc.save();

    await versionDoc.populate('createdBy', 'name email avatarColor');

    // Broadcast version:created to document room
    try {
      const io = getIO();
      io.to(`doc:${documentId}`).emit('version:created', {
        documentId,
        version: versionDoc,
      });
    } catch (sErr) {
      logger.warn('Failed to broadcast version:created event', { error: sErr });
    }

    res.status(201).json({
      success: true,
      message: 'Version created successfully',
      data: { version: versionDoc },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/versions/:versionId/restore
 * Restore a previous version.
 * Creates a new version tagged 'restore' and updates the live document.
 * Broadcasts the restored content via Socket.IO.
 * Requires owner or editor role.
 */
export const restoreVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const versionId = req.params.versionId as string;
    const userId = req.user._id.toString();

    const access = await getDocumentWithAccess(documentId, userId, next);
    if (!access) return;

    if (!access.isOwner && !access.isEditor) {
      return next(new AppError('Only the document owner or editors can restore versions', 403));
    }

    if (!isValidObjectId(versionId)) {
      return next(new AppError('Invalid version ID', 400));
    }

    const oldVersion = await Version.findOne({
      _id: versionId,
      document: documentId,
    });

    if (!oldVersion) {
      return next(new AppError('Version not found', 404));
    }

    const { document } = access;

    // Create a new version snapshot from the restored content
    const newVersionNumber = await Version.getNextVersionNumber(documentId);
    const restoredVersion = new Version({
      document: documentId,
      versionNumber: newVersionNumber,
      title: oldVersion.title,
      content: oldVersion.content,
      createdBy: userId,
      source: 'restore',
    });
    await restoredVersion.save();

    // Update the live document content and title
    document.content = oldVersion.content;
    document.title = oldVersion.title;
    await document.save();

    await restoredVersion.populate('createdBy', 'name email avatarColor');

    // Broadcast the restored content and new version snapshot to all connected users in the document room
    try {
      const io = getIO();
      const room = `doc:${documentId}`;
      io.to(room).emit('document:content', {
        content: oldVersion.content,
        userId,
      });
      io.to(room).emit('version:created', {
        documentId,
        version: restoredVersion,
      });
    } catch (socketError) {
      logger.warn('Failed to broadcast restored content via Socket.IO', { socketError });
    }

    await document.populate('owner', 'name email avatarColor');
    await document.populate('collaborators.user', 'name email avatarColor');

    logActivity(documentId, userId, 'version_restored', {
      versionNumber: oldVersion.versionNumber,
      restoredVersionNumber: newVersionNumber,
    });

    res.status(200).json({
      success: true,
      message: `Document restored to version ${oldVersion.versionNumber}`,
      data: {
        version: restoredVersion,
        document,
      },
    });
  } catch (error) {
    next(error);
  }
};

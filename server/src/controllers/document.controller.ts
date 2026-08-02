import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Document from '../models/Document';
import User from '../models/User';
import Version from '../models/Version';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { getIO } from '../socket';

const AUTO_CHECKPOINT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Helper: Validates a MongoDB ObjectId string.
 */
const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * POST /api/documents
 * Create a new document. The authenticated user becomes the owner.
 */
export const createDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;

    const document = await Document.create({
      title: title || 'Untitled Document',
      owner: req.user._id,
    });

    // Populate owner details for the response
    await document.populate('owner', 'name email avatarColor');

    res.status(201).json({
      success: true,
      message: 'Document created successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents
 * List all documents the user owns or collaborates on.
 * Query params: ?search=keyword
 */
export const listDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user._id;
    const search = req.query.search as string | undefined;

    // Base filter: user is owner OR a collaborator
    const filter: any = {
      $or: [
        { owner: userId },
        { 'collaborators.user': userId },
      ],
    };

    // Optional text search on title
    if (search && search.trim()) {
      filter.title = { $regex: search.trim(), $options: 'i' };
    }

    const documents = await Document.find(filter)
      .populate('owner', 'name email avatarColor')
      .populate('collaborators.user', 'name email avatarColor')
      .sort({ updatedAt: -1 })
      .lean();

    // Separate into categories for the client
    const owned = documents.filter(
      (doc) => doc.owner._id.toString() === userId.toString()
    );

    const shared = documents.filter(
      (doc) => doc.owner._id.toString() !== userId.toString()
    );

    // Recently opened: filter docs where this user has a lastOpenedBy entry, sort by openedAt
    const recentlyOpened = documents
      .filter((doc) =>
        doc.lastOpenedBy?.some(
          (entry: any) => entry.user.toString() === userId.toString()
        )
      )
      .sort((a, b) => {
        const aEntry = a.lastOpenedBy?.find(
          (e: any) => e.user.toString() === userId.toString()
        );
        const bEntry = b.lastOpenedBy?.find(
          (e: any) => e.user.toString() === userId.toString()
        );
        return (
          new Date(bEntry?.openedAt || 0).getTime() -
          new Date(aEntry?.openedAt || 0).getTime()
        );
      })
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        owned,
        shared,
        recentlyOpened,
        total: documents.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id
 * Get a single document. User must be owner or collaborator.
 * Also records a "lastOpened" entry for the requesting user.
 */
export const getDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id)
      .populate('owner', 'name email avatarColor')
      .populate('collaborators.user', 'name email avatarColor');

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: must be owner or collaborator
    const userId = req.user._id.toString();
    const isOwner = document.owner._id.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (c) => c.user._id.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return next(new AppError('You do not have access to this document', 403));
    }

    // Track "last opened" for this user
    const existingEntry = document.lastOpenedBy.find(
      (entry) => entry.user.toString() === userId
    );
    if (existingEntry) {
      existingEntry.openedAt = new Date();
    } else {
      document.lastOpenedBy.push({
        user: req.user._id,
        openedAt: new Date(),
      });
    }
    await document.save();

    res.status(200).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/documents/:id/rename
 * Rename a document. Owner only.
 */
export const renameDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { title } = req.body;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner only
    if (document.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the document owner can rename this document', 403));
    }

    document.title = title;
    await document.save();

    await document.populate('owner', 'name email avatarColor');
    await document.populate('collaborators.user', 'name email avatarColor');

    res.status(200).json({
      success: true,
      message: 'Document renamed successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/duplicate
 * Duplicate a document. User must be owner or collaborator.
 * Creates a new document owned by the requesting user with the same title + content.
 */
export const duplicateDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const original = await Document.findById(id);

    if (!original) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: must be owner or collaborator
    const userId = req.user._id.toString();
    const isOwner = original.owner.toString() === userId;
    const isCollaborator = original.collaborators.some(
      (c) => c.user.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return next(new AppError('You do not have access to this document', 403));
    }

    const duplicate = await Document.create({
      title: `${original.title} (Copy)`,
      content: original.content,
      owner: req.user._id,
      // Duplicates don't inherit collaborators — the new owner starts fresh
    });

    await duplicate.populate('owner', 'name email avatarColor');

    res.status(201).json({
      success: true,
      message: 'Document duplicated successfully',
      data: { document: duplicate },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id
 * Delete a document. Owner only.
 */
export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner only
    if (document.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the document owner can delete this document', 403));
    }

    await document.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/documents/:id/content
 * Update document content. Owner or collaborators with 'editor' role.
 */
export const updateContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner or editor collaborator
    const userId = req.user._id.toString();
    const isOwner = document.owner.toString() === userId;
    const isEditor = document.collaborators.some(
      (c) => c.user.toString() === userId && c.role === 'editor'
    );

    if (!isOwner && !isEditor) {
      return next(new AppError('You do not have permission to edit this document', 403));
    }

    document.content = content;
    await document.save();

    // Auto-checkpoint: create a version snapshot if the last one is older than 10 minutes
    // Runs fire-and-forget so it doesn't block the response
    (async () => {
      try {
        const lastVersion = await Version.findOne({ document: id })
          .sort({ versionNumber: -1 })
          .select('createdAt')
          .lean();

        const shouldCheckpoint =
          !lastVersion ||
          Date.now() - new Date(lastVersion.createdAt).getTime() > AUTO_CHECKPOINT_INTERVAL_MS;

        if (shouldCheckpoint) {
          const versionNumber = await Version.getNextVersionNumber(id);
          const newVersion = await Version.create({
            document: id,
            versionNumber,
            title: document.title,
            content: document.content,
            createdBy: userId,
            source: 'auto',
          });
          await newVersion.populate('createdBy', 'name email avatarColor');
          logger.info(`Auto-checkpoint created: version ${versionNumber} for document ${id}`);
          try {
            const io = getIO();
            io.to(`doc:${id}`).emit('version:created', {
              documentId: id,
              version: newVersion,
            });
          } catch (sErr) {
            logger.warn('Failed to broadcast auto-checkpoint version', { error: sErr });
          }
        }
      } catch (autoErr) {
        logger.warn('Auto-checkpoint failed (non-critical)', { error: autoErr });
      }
    })();

    await document.populate('owner', 'name email avatarColor');
    await document.populate('collaborators.user', 'name email avatarColor');

    res.status(200).json({
      success: true,
      message: 'Document content updated successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/collaborators
 * Add a collaborator by email with role ('editor' | 'viewer' | 'commenter'). Owner only.
 */
export const addCollaborator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { email, role } = req.body;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner only can add collaborators
    if (document.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the document owner can share this document', 403));
    }

    // Find target user by email
    const targetUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!targetUser) {
      return next(new AppError('User with this email was not found', 404));
    }

    // Prevent adding self (owner)
    if (targetUser._id.toString() === req.user._id.toString()) {
      return next(new AppError('You are already the owner of this document', 400));
    }

    // Check if user is already a collaborator
    const existingIndex = document.collaborators.findIndex(
      (c) => c.user.toString() === targetUser._id.toString()
    );

    if (existingIndex !== -1) {
      return next(new AppError('User is already a collaborator on this document', 400));
    }

    // Add collaborator
    document.collaborators.push({
      user: targetUser._id,
      role: role || 'viewer',
    });

    await document.save();

    await document.populate('owner', 'name email avatarColor');
    await document.populate('collaborators.user', 'name email avatarColor');

    res.status(200).json({
      success: true,
      message: 'Collaborator added successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/documents/:id/collaborators
 * List all collaborators for a document. Owner or any collaborator.
 */
export const getCollaborators = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(id)
      .populate('owner', 'name email avatarColor')
      .populate('collaborators.user', 'name email avatarColor');

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner or any collaborator
    const userId = req.user._id.toString();
    const isOwner = document.owner._id.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (c) => c.user._id.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return next(new AppError('You do not have access to this document', 403));
    }

    res.status(200).json({
      success: true,
      data: {
        owner: document.owner,
        collaborators: document.collaborators,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/documents/:id/collaborators/:userId
 * Update a collaborator's role ('editor' | 'viewer' | 'commenter'). Owner only.
 */
export const updateCollaboratorRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const targetUserId = req.params.userId as string;
    const { role } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(targetUserId)) {
      return next(new AppError('Invalid ID parameters', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    // Authorization: owner only
    if (document.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Only the document owner can change collaborator roles', 403));
    }

    const collaborator = document.collaborators.find(
      (c) => c.user.toString() === targetUserId
    );

    if (!collaborator) {
      return next(new AppError('Collaborator not found on this document', 404));
    }

    collaborator.role = role;
    await document.save();

    await document.populate('owner', 'name email avatarColor');
    await document.populate('collaborators.user', 'name email avatarColor');

    res.status(200).json({
      success: true,
      message: 'Collaborator role updated successfully',
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id/collaborators/:userId
 * Remove a collaborator from a document. Owner or the collaborator removing themselves.
 */
export const removeCollaborator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const targetUserId = req.params.userId as string;

    if (!isValidObjectId(id) || !isValidObjectId(targetUserId)) {
      return next(new AppError('Invalid ID parameters', 400));
    }

    const document = await Document.findById(id);

    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    const currentUserId = req.user._id.toString();
    const isOwner = document.owner.toString() === currentUserId;
    const isSelfRemoval = targetUserId === currentUserId;

    // Authorization: owner can remove anyone; collaborator can remove themselves
    if (!isOwner && !isSelfRemoval) {
      return next(new AppError('You do not have permission to remove this collaborator', 403));
    }

    const existingIndex = document.collaborators.findIndex(
      (c) => c.user.toString() === targetUserId
    );

    if (existingIndex === -1) {
      return next(new AppError('Collaborator not found on this document', 404));
    }

    document.collaborators.splice(existingIndex, 1);
    await document.save();

    res.status(200).json({
      success: true,
      message: isSelfRemoval ? 'You left the document' : 'Collaborator removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

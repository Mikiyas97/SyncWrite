import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Document from '../models/Document';
import { AppError } from '../utils/AppError';

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

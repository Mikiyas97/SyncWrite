import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Activity from '../models/Activity';
import Document from '../models/Document';
import { AppError } from '../utils/AppError';

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

/**
 * GET /api/documents/:id/activity
 * Get paginated activity feed for a document.
 * Requires document access (Owner or Collaborator).
 */
export const getDocumentActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const userId = req.user._id.toString();

    if (!isValidObjectId(documentId)) {
      return next(new AppError('Invalid document ID', 400));
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return next(new AppError('Document not found', 404));
    }

    const isOwner = document.owner.toString() === userId;
    const isCollaborator = document.collaborators.some(
      (c) => c.user.toString() === userId
    );

    if (!isOwner && !isCollaborator) {
      return next(new AppError('You do not have access to this document', 403));
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 30));
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find({ document: documentId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email avatarColor')
        .populate('details.targetUser', 'name email avatarColor')
        .lean(),
      Activity.countDocuments({ document: documentId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        activities,
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

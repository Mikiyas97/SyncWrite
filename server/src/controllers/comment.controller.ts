import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Document from '../models/Document';
import Comment from '../models/Comment';
import { AppError } from '../utils/AppError';
import { getIO } from '../socket';
import { logger } from '../utils/logger';
import { logActivity } from '../utils/activityLogger';

const isValidObjectId = (id: string): boolean =>
  mongoose.Types.ObjectId.isValid(id);

const broadcastCommentUpdated = (documentId: string) => {
  try {
    const io = getIO();
    io.to(`doc:${documentId}`).emit('comment:updated', { documentId });
  } catch (err) {
    logger.warn('Failed to broadcast comment:updated', { error: err });
  }
};

/**
 * Helper: verify document access and user role for comments.
 */
async function checkDocumentAccess(documentId: string, userId: string, next: NextFunction) {
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
  const role = isOwner ? 'owner' : collaborator ? collaborator.role : null;

  if (!isOwner && !isCollaborator) {
    next(new AppError('You do not have access to this document', 403));
    return null;
  }

  return { document, isOwner, role };
}

/**
 * GET /api/documents/:id/comments
 * List all comments for a document (top-level with populated replies).
 * Any authorized user (Owner, Editor, Commenter, Viewer) can list comments.
 */
export const listComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const userId = req.user._id.toString();

    const access = await checkDocumentAccess(documentId, userId, next);
    if (!access) return;

    // Fetch top-level comments
    const topLevelComments = await Comment.find({
      document: documentId,
      parentComment: null,
    })
      .populate('author', 'name email avatarColor')
      .populate('resolvedBy', 'name email avatarColor')
      .sort({ createdAt: -1 })
      .lean();

    const topLevelIds = topLevelComments.map((c) => c._id);

    // Fetch replies for these comments
    const replies = await Comment.find({
      document: documentId,
      parentComment: { $in: topLevelIds },
    })
      .populate('author', 'name email avatarColor')
      .sort({ createdAt: 1 })
      .lean();

    // Map replies into their respective top-level comment
    const commentMap = new Map<string, any>();
    topLevelComments.forEach((c: any) => {
      c.replies = [];
      commentMap.set(c._id.toString(), c);
    });

    replies.forEach((r: any) => {
      const parentId = r.parentComment.toString();
      if (commentMap.has(parentId)) {
        commentMap.get(parentId).replies.push(r);
      }
    });

    res.status(200).json({
      success: true,
      data: {
        comments: Array.from(commentMap.values()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/comments
 * Add a top-level comment.
 * Requires Owner, Editor, or Commenter role (Viewer NOT allowed).
 */
export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const userId = req.user._id.toString();
    const { content } = req.body;

    const access = await checkDocumentAccess(documentId, userId, next);
    if (!access) return;

    if (access.role === 'viewer') {
      return next(new AppError('Viewers are not allowed to add comments', 403));
    }

    const commentDoc = new Comment({
      document: documentId,
      author: userId,
      content,
      parentComment: null,
    });
    await commentDoc.save();

    await commentDoc.populate('author', 'name email avatarColor');

    broadcastCommentUpdated(documentId);

    logActivity(documentId, userId, 'comment_added', {
      commentId: commentDoc._id.toString(),
      commentSnippet: content.slice(0, 80),
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: { ...commentDoc.toObject(), replies: [] } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/documents/:id/comments/:commentId/replies
 * Add a reply to an existing comment.
 * Requires Owner, Editor, or Commenter role.
 */
export const addReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const commentId = req.params.commentId as string;
    const userId = req.user._id.toString();
    const { content } = req.body;

    const access = await checkDocumentAccess(documentId, userId, next);
    if (!access) return;

    if (access.role === 'viewer') {
      return next(new AppError('Viewers are not allowed to reply to comments', 403));
    }

    if (!isValidObjectId(commentId)) {
      return next(new AppError('Invalid comment ID', 400));
    }

    const parentComment = await Comment.findOne({
      _id: commentId,
      document: documentId,
    });

    if (!parentComment) {
      return next(new AppError('Parent comment not found', 404));
    }

    const replyDoc = new Comment({
      document: documentId,
      author: userId,
      content,
      parentComment: parentComment._id,
    });
    await replyDoc.save();

    await replyDoc.populate('author', 'name email avatarColor');

    broadcastCommentUpdated(documentId);

    logActivity(documentId, userId, 'comment_replied', {
      commentId: replyDoc._id.toString(),
      parentCommentId: commentId,
      commentSnippet: content.slice(0, 80),
    });

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      data: { reply: replyDoc },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/documents/:id/comments/:commentId/resolve
 * Resolve or unresolve a comment thread.
 * Requires Owner or Editor role.
 */
export const resolveComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const commentId = req.params.commentId as string;
    const userId = req.user._id.toString();

    const access = await checkDocumentAccess(documentId, userId, next);
    if (!access) return;

    if (access.role !== 'owner' && access.role !== 'editor') {
      return next(new AppError('Only the document owner or editors can resolve comments', 403));
    }

    if (!isValidObjectId(commentId)) {
      return next(new AppError('Invalid comment ID', 400));
    }

    const comment = await Comment.findOne({
      _id: commentId,
      document: documentId,
      parentComment: null,
    });

    if (!comment) {
      return next(new AppError('Top-level comment not found', 404));
    }

    comment.isResolved = !comment.isResolved;
    if (comment.isResolved) {
      comment.resolvedBy = new mongoose.Types.ObjectId(userId);
      comment.resolvedAt = new Date();
    } else {
      comment.resolvedBy = null;
      comment.resolvedAt = null;
    }

    await comment.save();
    await comment.populate('author', 'name email avatarColor');
    await comment.populate('resolvedBy', 'name email avatarColor');

    broadcastCommentUpdated(documentId);

    logActivity(documentId, userId, comment.isResolved ? 'comment_resolved' : 'comment_reopened', {
      commentId: comment._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: comment.isResolved ? 'Comment resolved' : 'Comment re-opened',
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/documents/:id/comments/:commentId
 * Delete a comment (or reply).
 * Rules: User can delete their own comment, OR Document Owner can delete any comment.
 * If top-level comment is deleted, also deletes all its replies.
 */
export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const documentId = req.params.id as string;
    const commentId = req.params.commentId as string;
    const userId = req.user._id.toString();

    const access = await checkDocumentAccess(documentId, userId, next);
    if (!access) return;

    if (!isValidObjectId(commentId)) {
      return next(new AppError('Invalid comment ID', 400));
    }

    const comment = await Comment.findOne({
      _id: commentId,
      document: documentId,
    });

    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }

    const isAuthor = comment.author.toString() === userId;
    const isDocumentOwner = access.isOwner;

    if (!isAuthor && !isDocumentOwner) {
      return next(new AppError('You do not have permission to delete this comment', 403));
    }

    // Delete target comment
    await comment.deleteOne();

    // If it was a top-level comment, also delete all replies
    if (!comment.parentComment) {
      await Comment.deleteMany({ parentComment: comment._id });
    }

    broadcastCommentUpdated(documentId);

    logActivity(documentId, userId, 'comment_deleted', {
      commentId: comment._id.toString(),
      isTopLevel: !comment.parentComment,
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

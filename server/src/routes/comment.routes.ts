import { Router } from 'express';
import {
  listComments,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
} from '../controllers/comment.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  commentDocumentIdSchema,
  addCommentSchema,
  addReplySchema,
  commentIdSchema,
} from '../validators/comment.validator';

const router = Router({ mergeParams: true });

// All comment routes require authentication
router.use(protect);

// List all comments for a document
router.get('/', validate(commentDocumentIdSchema), listComments);

// Create a top-level comment
router.post('/', validate(addCommentSchema), addComment);

// Reply to a comment
router.post('/:commentId/replies', validate(addReplySchema), addReply);

// Resolve / unresolve a comment thread
router.patch('/:commentId/resolve', validate(commentIdSchema), resolveComment);

// Delete a comment or reply
router.delete('/:commentId', validate(commentIdSchema), deleteComment);

export default router;

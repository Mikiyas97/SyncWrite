import { Router } from 'express';
import { getDocumentActivity } from '../controllers/activity.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { documentIdParamSchema } from '../validators/document.validator';

const router = Router({ mergeParams: true });

// All activity routes require authentication
router.use(protect);

// Get activity feed for a document
router.get('/', validate(documentIdParamSchema), getDocumentActivity);

export default router;

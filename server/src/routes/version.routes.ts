import { Router } from 'express';
import {
  listVersions,
  getVersion,
  createManualVersion,
  restoreVersion,
} from '../controllers/version.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  versionDocumentIdSchema,
  versionIdSchema,
} from '../validators/version.validator';

const router = Router({ mergeParams: true });

// All version routes require authentication
router.use(protect);

// List versions for a document
router.get('/', validate(versionDocumentIdSchema), listVersions);

// Create a manual version snapshot
router.post('/', validate(versionDocumentIdSchema), createManualVersion);

// Get a specific version with full content
router.get('/:versionId', validate(versionIdSchema), getVersion);

// Restore a previous version
router.post('/:versionId/restore', validate(versionIdSchema), restoreVersion);

export default router;

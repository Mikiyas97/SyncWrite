import { Router } from 'express';
import {
  createDocument,
  listDocuments,
  getDocument,
  renameDocument,
  duplicateDocument,
  deleteDocument,
} from '../controllers/document.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDocumentSchema,
  renameDocumentSchema,
  documentIdParamSchema,
} from '../validators/document.validator';

const router = Router();

// All document routes require authentication
router.use(protect);

router.post('/', validate(createDocumentSchema), createDocument);
router.get('/', listDocuments);
router.get('/:id', validate(documentIdParamSchema), getDocument);
router.patch('/:id/rename', validate(renameDocumentSchema), renameDocument);
router.post('/:id/duplicate', validate(documentIdParamSchema), duplicateDocument);
router.delete('/:id', validate(documentIdParamSchema), deleteDocument);

export default router;

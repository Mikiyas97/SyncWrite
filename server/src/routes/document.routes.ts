import { Router } from 'express';
import {
  createDocument,
  listDocuments,
  getDocument,
  renameDocument,
  duplicateDocument,
  deleteDocument,
  updateContent,
  addCollaborator,
  getCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
} from '../controllers/document.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDocumentSchema,
  renameDocumentSchema,
  documentIdParamSchema,
  updateContentSchema,
  addCollaboratorSchema,
  updateCollaboratorRoleSchema,
  removeCollaboratorSchema,
} from '../validators/document.validator';

const router = Router();

// All document routes require authentication
router.use(protect);

router.post('/', validate(createDocumentSchema), createDocument);
router.get('/', listDocuments);
router.get('/:id', validate(documentIdParamSchema), getDocument);
router.patch('/:id/rename', validate(renameDocumentSchema), renameDocument);
router.post('/:id/duplicate', validate(documentIdParamSchema), duplicateDocument);
router.patch('/:id/content', validate(updateContentSchema), updateContent);
router.delete('/:id', validate(documentIdParamSchema), deleteDocument);

// Collaborator sharing routes
router.post('/:id/collaborators', validate(addCollaboratorSchema), addCollaborator);
router.get('/:id/collaborators', validate(documentIdParamSchema), getCollaborators);
router.patch('/:id/collaborators/:userId', validate(updateCollaboratorRoleSchema), updateCollaboratorRole);
router.delete('/:id/collaborators/:userId', validate(removeCollaboratorSchema), removeCollaborator);

export default router;

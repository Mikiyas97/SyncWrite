import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller';
import { protect } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

router.get('/search', searchUsers);

export default router;

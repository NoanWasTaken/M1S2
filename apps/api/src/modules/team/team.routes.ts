import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getMembers, postMember, deleteMember } from './team.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/members', getMembers);
router.post('/members', postMember);
router.delete('/members/:id', deleteMember);

export default router;
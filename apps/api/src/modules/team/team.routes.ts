import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import {
    getMembers,
    postInvitation,
    getInvitations,
    deleteInvitation,
    deleteMember,
} from './team.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/members', getMembers);

router.post('/invitations', denyMembers, postInvitation);
router.get('/invitations', denyMembers, getInvitations);
router.delete('/invitations/:id', denyMembers, deleteInvitation);
router.delete('/members/:id', denyMembers, deleteMember);

export default router;
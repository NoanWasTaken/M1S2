import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import { getShareLink, createShareLink, revokeShareLink } from './share.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/:appId',    getShareLink);
router.post('/',         denyMembers, createShareLink);
router.delete('/:appId', denyMembers, revokeShareLink);

export default router;

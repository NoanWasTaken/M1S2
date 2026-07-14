import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import { getAlertThreshold, upsertAlertThreshold, deleteAlertThreshold } from './alert.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/:appId',    getAlertThreshold);
router.put('/:appId',    denyMembers, upsertAlertThreshold);
router.delete('/:appId', denyMembers, deleteAlertThreshold);

export default router;

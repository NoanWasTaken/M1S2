import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import {
    deleteFunnel,
    deleteTag,
    getFunnels,
    getTags,
    patchFunnelComment,
    patchTagComment,
    postFunnel,
    postTag,
} from './tracking.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster', 'admin'));

router.get('/applications/:applicationId/tags', getTags);
router.post('/applications/:applicationId/tags', denyMembers, postTag);
router.patch('/tags/:tagId/comment', denyMembers, patchTagComment);
router.delete('/tags/:tagId', denyMembers, deleteTag);

router.get('/applications/:applicationId/funnels', getFunnels);
router.post('/applications/:applicationId/funnels', denyMembers, postFunnel);
router.patch('/funnels/:funnelId/comment', denyMembers, patchFunnelComment);
router.delete('/funnels/:funnelId', denyMembers, deleteFunnel);

export default router;
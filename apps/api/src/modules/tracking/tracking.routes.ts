import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
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
router.post('/applications/:applicationId/tags', postTag);
router.patch('/tags/:tagId/comment', patchTagComment);
router.delete('/tags/:tagId', deleteTag);

router.get('/applications/:applicationId/funnels', getFunnels);
router.post('/applications/:applicationId/funnels', postFunnel);
router.patch('/funnels/:funnelId/comment', patchFunnelComment);
router.delete('/funnels/:funnelId', deleteFunnel);

export default router;
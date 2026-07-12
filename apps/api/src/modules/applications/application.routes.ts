import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { denyMembers } from '../../middlewares/authorize-team.js';
import { postApplication, getApplications, postApplicationSecret, deleteApplicationSecretController, putAllowedOrigins } from './application.controller.js';

const router = Router();

// Webmaster admin routes
router.use(authenticate, authorize('webmaster', 'admin'));

router.post('/', denyMembers, postApplication);
router.get('/', getApplications);

router.post('/:id/secret', denyMembers, postApplicationSecret);
router.delete('/:id/secret', denyMembers, deleteApplicationSecretController);

router.put('/:id/origins', denyMembers, putAllowedOrigins);

export default router;
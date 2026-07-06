import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { postApplication, getApplications, postApplicationSecret, deleteApplicationSecretController, putAllowedOrigins } from './application.controller.js';

const router = Router();

// Accessible to webmasters AND admins (connected)
router.use(authenticate, authorize('webmaster', 'admin'));

router.post('/', postApplication);
router.get('/', getApplications);

router.post('/:id/secret', postApplicationSecret);
router.delete('/:id/secret', deleteApplicationSecretController);

router.put('/:id/origins', putAllowedOrigins);

export default router;
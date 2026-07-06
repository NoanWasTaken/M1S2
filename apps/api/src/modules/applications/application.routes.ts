import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { postApplication, getApplications } from './application.controller.js';

const router = Router();

// Accessible to webmasters AND admins (connected)
router.use(authenticate, authorize('webmaster', 'admin'));

router.post('/', postApplication);
router.get('/', getApplications);

export default router;
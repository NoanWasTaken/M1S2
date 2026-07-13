import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getMyCompany } from './company.controller.js';

const router = Router();
router.use(authenticate, authorize('webmaster', 'admin'));
router.get('/', getMyCompany);
export default router;
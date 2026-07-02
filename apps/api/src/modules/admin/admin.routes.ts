import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getCompanies, postValidateCompany, postRejectCompany, postImpersonate } from './admin.controller.js';

const router = Router();

// All admin routes require: being authenticated AND being admin
router.use(authenticate, authorize('admin'));

router.get('/companies', getCompanies);
router.post('/companies/:id/validate', postValidateCompany);
router.post('/companies/:id/reject', postRejectCompany);
router.post('/impersonate/:id', postImpersonate);

export default router;
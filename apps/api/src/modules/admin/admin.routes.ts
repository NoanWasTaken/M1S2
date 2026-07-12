import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
    getCompanies,
    getCompany,
    getUsers,
    getPendingCount,
    postValidateCompany,
    postRejectCompany,
    postImpersonate,
    postStopImpersonate,
    getStats,
} from './admin.controller.js';

const router = Router();

router.post('/stop-impersonate', authenticate, postStopImpersonate);

router.use(authenticate, authorize('admin'));

router.get('/stats', getStats);

router.get('/companies', getCompanies);
router.get('/companies/pending-count', getPendingCount);
router.get('/companies/:id', getCompany);
router.post('/companies/:id/validate', postValidateCompany);
router.post('/companies/:id/reject', postRejectCompany);

router.get('/users', getUsers);
router.post('/impersonate/:id', postImpersonate);

export default router;
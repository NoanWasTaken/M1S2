import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
    getCompanies,
    getCompany,
    getCompanyKbis,
    getUsers,
    getPendingCount,
    postValidateCompany,
    postRejectCompany,
    activateUserController,
    rejectUserController,
    deleteUserController,
    permanentlyDeleteUserController,
    deleteCompanyController,
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
router.get('/companies/:id/kbis', getCompanyKbis);
router.get('/companies/:id', getCompany);
router.post('/companies/:id/validate', postValidateCompany);
router.post('/companies/:id/reject', postRejectCompany);
router.delete('/companies/:id', deleteCompanyController);

router.get('/users', getUsers);
router.post('/impersonate/:id', postImpersonate);
router.post('/users/:id/activate', activateUserController);
router.post('/users/:id/reject', rejectUserController);
router.delete('/users/:id', deleteUserController);
router.delete('/users/:id/permanent', permanentlyDeleteUserController);

export default router;
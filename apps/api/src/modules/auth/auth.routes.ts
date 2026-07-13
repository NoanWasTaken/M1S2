import { Router } from 'express';
import { forgotPassword, login, logout, me, refresh, register, resetPasswordController, getInvitation, postAcceptInvitation, getVerifyEmail } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.get('/invitation/:token', getInvitation);
router.post('/accept-invitation', postAcceptInvitation);
router.get('/verify-email', getVerifyEmail);

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPasswordController);

export default router;  
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, login, logout, me, refresh, register, resetPasswordController, getInvitation, postAcceptInvitation, getVerifyEmail } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

const registerLimiter = rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const refreshLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false });
const resetPasswordLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.get('/invitation/:token', getInvitation);
router.post('/accept-invitation', postAcceptInvitation);
router.get('/verify-email', getVerifyEmail);

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPasswordController);

export default router;  
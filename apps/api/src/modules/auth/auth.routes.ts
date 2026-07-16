import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { forgotPassword, login, logout, me, refresh, register, resetPasswordController, getInvitation, postAcceptInvitation, getVerifyEmail, uploadKbis } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { assertPdfMagic, handleKbisUploadErrors, kbisUpload } from './kbis-upload.js';
import { AppError } from '../../utils/app-error.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const registerLimiter = rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const refreshLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 1000, limit: 3, standardHeaders: true, legacyHeaders: false });
const resetPasswordLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const kbisUploadLimiter = rateLimit({ windowMs: 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });

router.get('/invitation/:token', getInvitation);
router.post('/accept-invitation', postAcceptInvitation);
router.get('/verify-email', getVerifyEmail);

router.post(
  '/kbis',
  kbisUploadLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    kbisUpload(req, res, (err) => {
      if (err) {
        handleKbisUploadErrors(err, req, res, next);
        return;
      }
      next();
    });
  },
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'missing_file', 'KBIS PDF file is required.');
      assertPdfMagic(req.file.path);
      next();
    } catch (err) {
      next(err);
    }
  },
  uploadKbis,
);

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPasswordController);

export default router;  
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateApp } from '../../middlewares/authenticate-app.js';
import { postBrowserEvents } from './ingestion.controller.js';

const router = Router();

// At most 120 requests per minute and per IP on ingestion
const ingestionLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/browser', ingestionLimiter, authenticateApp, postBrowserEvents);

export default router;
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateApp } from '../../middlewares/authenticate-app.js';
import { postBrowserEvents, postServerEvents } from './ingestion.controller.js';
import { authenticateServer } from '../../middlewares/authenticate-server.js';

const router = Router();

const ingestionLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.header('x-app-id') || req.ip || 'unknown',
});

router.post('/browser', ingestionLimiter, authenticateApp, postBrowserEvents);
router.post('/server', ingestionLimiter, authenticateServer, postServerEvents);

export default router;
import { Router } from 'express';
import { sseStream } from './sse.controller.js';
import { getGlobe } from './globe.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = Router();
router.get('/stream', sseStream);
router.get('/globe', authenticate, getGlobe);

export default router;
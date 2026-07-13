import { Router } from 'express';
import { sseStream } from './sse.controller.js';

const router = Router();
router.get('/stream', sseStream);

export default router;
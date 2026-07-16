import { Router } from 'express';
import { getPublicDashboard } from './public.controller.js';

const router = Router();

router.get('/dashboard/:token', getPublicDashboard);

export default router;

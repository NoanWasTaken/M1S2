import { Router } from 'express';
import { overview } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.get('/overview', authenticate, overview);

export default router;

import { Router } from 'express';
import { getWidgetsHandler, upsertWidgetsHandler } from './widget.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.get('/widgets', authenticate, getWidgetsHandler);
router.put('/widgets', authenticate, upsertWidgetsHandler);

export default router;

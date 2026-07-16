import { Router } from 'express';
import { getWidgetsHandler, upsertWidgetsHandler } from './widget.controller.js';
import { getWidgetDataHandler } from './dashboard.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { denyMembers } from '../../middlewares/authorize-team.js';

const router = Router();

router.get('/widgets', authenticate, getWidgetsHandler);
router.put('/widgets', authenticate, denyMembers, upsertWidgetsHandler);
router.get('/widget/:widgetId/data', authenticate, getWidgetDataHandler);

export default router;

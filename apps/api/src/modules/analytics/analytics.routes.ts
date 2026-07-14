import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getPages, getEvents, getTimeseriesController } from './analytics.controller.js';
import { exportPages, exportEvents } from './export.controller.js';
import { getFunnelStats } from './funnel.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/pages', getPages);
router.get('/events', getEvents);
router.get('/timeseries', getTimeseriesController);

router.get('/pages/export', exportPages);
router.get('/events/export', exportEvents);

router.get('/funnels/:funnelId', getFunnelStats);

export default router;
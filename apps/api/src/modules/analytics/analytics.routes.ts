import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getPages, getEvents, getTimeseriesController } from './analytics.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster'));

router.get('/pages', getPages);
router.get('/events', getEvents);
router.get('/timeseries', getTimeseriesController);

export default router;
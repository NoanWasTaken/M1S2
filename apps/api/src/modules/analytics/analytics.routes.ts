import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { postKpiQuery, postTimeSeriesQuery } from './analytics.controller.js';

const router = Router();

router.use(authenticate, authorize('webmaster', 'admin'));
router.post('/kpi', postKpiQuery);
router.post('/timeseries', postTimeSeriesQuery);

export default router;
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import authRouter from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import adminRouter from './modules/admin/admin.routes.js';
import applicationRouter from './modules/applications/application.routes.js';
import teamRouter from './modules/team/team.routes.js';
import ingestionRouter from './modules/ingestion/ingestion.routes.js';
import trackingRouter from './modules/tracking/tracking.routes.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import widgetRouter from './modules/dashboard/widget.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';
import companyRouter from './modules/company/company.routes.js';
import conversationsRouter from './modules/conversations/conversations.routes.js';
import cookieParser from 'cookie-parser';
import sseRouter from './realtime/sse.route.js';
import { startHeartbeat } from './realtime/sse-registry.js';
import alertRouter from './modules/alerts/alert.routes.js';

const dashboardOrigins = new Set([env.corsOrigin, ...env.corsExtraOrigins]);

function dashboardCorsOrigin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true);
    return;
  }

  callback(null, dashboardOrigins.has(origin));
}

async function start() {
  await connectToDatabase(env.mongoUri);

  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(express.json());
  app.use(cookieParser());

  const ingestionCors = cors({ origin: true, methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'x-app-id'] });
  const ingestionHelmet = helmet({ crossOriginResourcePolicy: false });
  app.use('/api/v1/ingestion', ingestionHelmet, ingestionCors, ingestionRouter);

  app.use(cors({ origin: dashboardCorsOrigin, credentials: true }));

  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/applications', applicationRouter);
  app.use('/api/v1/team', teamRouter);
  app.use('/api/v1/tracking', trackingRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/dashboard', widgetRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/company', companyRouter);
  app.use('/api/v1/realtime', sseRouter);
  app.use('/api/v1/conversations', conversationsRouter);
  app.use('/api/v1/alerts', alertRouter);

  app.use(errorHandler);

  startHeartbeat();

  app.listen(env.port);
}

start();
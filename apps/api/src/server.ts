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
import cookieParser from 'cookie-parser'; // for parse cookies

async function start() {
  await connectToDatabase(env.mongoUri);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use('/api/v1/applications', applicationRouter);
  app.use('/api/v1/team', teamRouter);

  app.use('/api/v1/ingestion', ingestionRouter);
  app.use('/api/v1/tracking', trackingRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  // ALWAYS AFTER the routes
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
  });
}

start();

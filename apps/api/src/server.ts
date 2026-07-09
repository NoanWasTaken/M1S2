import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import authRouter from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error-handler.js';
import adminRouter from './modules/admin/admin.routes.js';
import applicationRouter from './modules/applications/application.routes.js';
import teamRouter from './modules/team/team.routes.js';
import cookieParser from 'cookie-parser';
import { initGateway } from './realtime/gateway.js';

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

  // ALWAYS AFTER the routes
  app.use(errorHandler);

  // Wrap Express in a raw HTTP server so Socket.IO can share the same port
  const httpServer = createServer(app);
  await initGateway(httpServer);

  httpServer.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
  });
}

start();
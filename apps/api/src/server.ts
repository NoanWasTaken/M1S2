import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';
import authRouter from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error-handler.js';
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

  // ALWAYS AFTER the routes
  app.use(errorHandler);

  app.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
  });
}

start();
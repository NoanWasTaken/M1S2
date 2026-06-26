import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { connectToDatabase } from './config/db.js';

async function start() {
  await connectToDatabase(env.mongoUri);

  const app = express();

  app.use(helmet()); // add security headers
  app.use(cors({ origin: env.corsOrigin, credentials: true })); // allow dashboard to access the API
  app.use(express.json()); // allow reading JSON sent in requests

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(env.port, () => {
    console.log(`API ready on http://localhost:${env.port}`);
  });
}

start();
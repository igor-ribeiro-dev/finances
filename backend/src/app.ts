import express from 'express';
import { healthRouter } from './routes/health';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/health', healthRouter);
  return app;
}

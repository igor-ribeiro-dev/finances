import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health';
import { authRouter } from './api/auth/auth.router';
import { familyGroupRouter } from './api/family-group/family-group.router';

export function createApp(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  app.use('/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/groups', familyGroupRouter);

  return app;
}

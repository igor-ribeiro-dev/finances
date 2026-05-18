import express from 'express';
import cookieParser from 'cookie-parser';
import { healthRouter } from './routes/health';
import { authRouter } from './api/auth/auth.router';
import { familyGroupRouter } from './api/family-group/family-group.router';

export function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  const allowedOrigin = process.env['FRONTEND_URL'] ?? 'http://localhost:5173';
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use('/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/groups', familyGroupRouter);

  return app;
}

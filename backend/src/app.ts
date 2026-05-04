import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import path from 'node:path';
import type pino from 'pino';
import type { AppContainer } from './config/container.js';
import type { Env } from './config/env.js';
import { problemDetailsHandler } from './middleware/problem-details.js';
import { requestLogger } from './middleware/request-logger.js';
import { createAdminRouter } from './modules/admin/admin.routes.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { healthRouter } from './modules/health/health.routes.js';
import { createGardensRouter } from './modules/gardens/gardens.routes.js';
import { createPlantProfilesRouter } from './modules/plant-profiles/plant-profile.routes.js';
import { createUsersRouter } from './modules/users/users.routes.js';

export function createApp(env: Env, logger: pino.Logger, container: AppContainer) {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  if (env.NODE_ENV !== 'production') {
    app.use(cors({ origin: true, credentials: true }));
  }

  app.use(cookieParser());
  app.use(express.json());
  app.use(requestLogger(logger));

  app.use('/health', healthRouter);

  const api = Router();
  api.use('/auth', createAuthRouter(env, container));
  api.use('/admin', createAdminRouter(env, container));
  api.use('/users', createUsersRouter(env, container));
  api.use('/gardens', createGardensRouter(env, container));
  api.use('/plant-profiles', createPlantProfilesRouter(env, container));
  app.use('/api/v1', api);

  if (env.NODE_ENV === 'production') {
    const publicDir = path.join(process.cwd(), '..', 'public');
    app.use(express.static(publicDir));
    app.get('*', (_req, res, next) => {
      res.sendFile(path.join(publicDir, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(problemDetailsHandler);

  return app;
}

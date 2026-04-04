import express from 'express';
import path from 'node:path';
import type pino from 'pino';
import { healthRouter } from './modules/health/health.routes.js';
import { problemDetailsHandler } from './middleware/problem-details.js';
import { requestLogger } from './middleware/request-logger.js';
import type { Env } from './config/env.js';

export function createApp(env: Env, logger: pino.Logger) {
  const app = express();

  app.use(express.json());
  app.use(requestLogger(logger));

  app.use('/health', healthRouter);

  if (env.NODE_ENV === 'production') {
    // Docker runs `node dist/server.js` with cwd = backend/; static assets live in ../public
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

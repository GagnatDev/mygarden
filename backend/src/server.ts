import 'dotenv/config';
import http from 'node:http';
import mongoose from 'mongoose';
import pino from 'pino';
import { createApp } from './app.js';
import { buildContainer } from './config/container.js';
import { loadEnv } from './config/env.js';

async function main() {
  const env = loadEnv();
  const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  });

  await mongoose.connect(env.MONGODB_URI);
  logger.info('connected to MongoDB');

  const container = buildContainer(env, { logger });
  const app = createApp(env, logger, container);
  const server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server listening');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

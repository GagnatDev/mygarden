import 'dotenv/config';
import http from 'node:http';
import pino from 'pino';
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';

const env = loadEnv();
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
});
const app = createApp(env, logger);
const server = http.createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});

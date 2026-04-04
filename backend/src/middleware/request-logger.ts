import type { RequestHandler } from 'express';
import type pino from 'pino';

export function requestLogger(logger: pino.Logger): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info({
        method: req.method,
        url: req.originalUrl ?? req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}

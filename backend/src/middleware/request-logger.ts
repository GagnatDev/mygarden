import type { RequestHandler } from 'express';
import type pino from 'pino';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Bounds for a client-supplied request id. Kept permissive enough to accept
 * UUIDs, nanoids, and similar tokens, while rejecting empty or oversized
 * values and anything with characters unsafe to echo back in a header.
 */
const MIN_REQUEST_ID_LENGTH = 8;
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function isValidRequestId(value: string): boolean {
  return (
    value.length >= MIN_REQUEST_ID_LENGTH &&
    value.length <= MAX_REQUEST_ID_LENGTH &&
    REQUEST_ID_PATTERN.test(value)
  );
}

/**
 * Resolves a request id, preferring a valid client-supplied `X-Request-Id`
 * header and falling back to a freshly generated UUID.
 */
export function resolveRequestId(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw !== undefined && isValidRequestId(raw)) {
    return raw;
  }
  return randomUUID();
}

export function requestLogger(logger: pino.Logger): RequestHandler {
  return (req, res, next) => {
    const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
    req.id = requestId;
    req.log = logger.child({ requestId });

    // Echo the id back so it is visible in browser devtools and can be quoted
    // in support tickets.
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    res.on('finish', () => {
      req.log.info({
        method: req.method,
        url: req.originalUrl ?? req.url,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  };
}

import type { ErrorRequestHandler } from 'express';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly title?: string,
    public readonly type?: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const problemDetailsHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const title =
    err instanceof HttpError ? (err.title ?? err.message) : 'Internal Server Error';
  const type =
    err instanceof HttpError
      ? (err.type ?? 'about:blank')
      : 'https://httpstatus.es/500';
  const detail =
    err instanceof HttpError
      ? err.message
      : status >= 500
        ? 'An unexpected error occurred.'
        : err.message;

  res.status(status).type('application/problem+json').json({
    type,
    title,
    status,
    detail,
  });
};

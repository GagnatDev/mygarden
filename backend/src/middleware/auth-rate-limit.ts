import rateLimit, { type RateLimitExceededEventHandler } from 'express-rate-limit';
import type { Response } from 'express';
import type { Env } from '../config/env.js';

function sendRateLimitProblemDetails(res: Response): void {
  res.status(429).type('application/problem+json').json({
    type: 'about:blank',
    title: 'Too Many Requests',
    status: 429,
    detail: 'Too many requests. Please try again later.',
  });
}

const rateLimit429Handler: RateLimitExceededEventHandler = (_req, res) => {
  sendRateLimitProblemDetails(res);
};

export function resolveAuthRateLimitConfig(env: Env) {
  const isTest = env.NODE_ENV === 'test';
  const windowMs = env.AUTH_RATE_LIMIT_WINDOW_MS ?? (isTest ? 60_000 : 15 * 60 * 1000);
  const testFallback = 10_000;
  return {
    windowMs,
    registerLimit: env.AUTH_RATE_LIMIT_REGISTER_MAX ?? (isTest ? testFallback : 30),
    loginLimit: env.AUTH_RATE_LIMIT_LOGIN_MAX ?? (isTest ? testFallback : 20),
    refreshLimit: env.AUTH_RATE_LIMIT_REFRESH_MAX ?? (isTest ? testFallback : 60),
    logoutLimit: env.AUTH_RATE_LIMIT_LOGOUT_MAX ?? (isTest ? testFallback : 100),
  };
}

export function createAuthRateLimiters(env: Env) {
  const cfg = resolveAuthRateLimitConfig(env);
  const base = {
    windowMs: cfg.windowMs,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    handler: rateLimit429Handler,
  } as const;

  return {
    register: rateLimit({ ...base, limit: cfg.registerLimit }),
    login: rateLimit({ ...base, limit: cfg.loginLimit }),
    refresh: rateLimit({ ...base, limit: cfg.refreshLimit }),
    logout: rateLimit({ ...base, limit: cfg.logoutLimit }),
  };
}

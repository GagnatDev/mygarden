import type { RequestHandler } from 'express';
import type { Env } from '../../config/env.js';
import type { AuthUser } from '../../domain/user.js';
import { HttpError } from '../../middleware/problem-details.js';
import { AuthService } from './auth.service.js';

export function requireAccessAuth(_env: Env, authService: AuthService): RequestHandler {
  return (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) {
        throw new HttpError(401, 'Missing access token', 'Unauthorized');
      }
      const token = header.slice('Bearer '.length).trim();
      if (!token) {
        throw new HttpError(401, 'Missing access token', 'Unauthorized');
      }
      const payload = authService.verifyAccessToken(token);
      const auth: AuthUser = { id: payload.sub, email: payload.email };
      req.auth = auth;
      next();
    } catch (e) {
      if (e instanceof HttpError) {
        next(e);
        return;
      }
      next(new HttpError(401, 'Invalid or expired access token', 'Unauthorized'));
    }
  };
}

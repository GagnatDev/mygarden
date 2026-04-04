import type { RequestHandler } from 'express';
import type { Env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { HttpError } from '../../middleware/problem-details.js';
import type { IUserRepository } from '../../repositories/interfaces/user.repository.interface.js';

export function requireAppOwner(env: Env, users: IUserRepository): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, 'Unauthorized', 'Unauthorized');
    }

    const user = await users.findById(auth.id);
    if (!user) {
      throw new HttpError(401, 'User not found', 'Unauthorized');
    }

    let isOwner = false;
    if (env.ADMIN_EMAIL) {
      isOwner = user.email.toLowerCase() === env.ADMIN_EMAIL;
    } else {
      const oldest = await users.findOldestUser();
      isOwner = oldest !== null && oldest.id === user.id;
    }

    if (!isOwner) {
      throw new HttpError(403, 'Only the app owner may manage the allowlist', 'Forbidden');
    }

    next();
  });
}

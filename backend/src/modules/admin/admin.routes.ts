import { Router } from 'express';
import type { Env } from '../../config/env.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { publicAllowedEmail } from '../auth/auth.service.js';
import { requireAccessAuth } from '../auth/auth.middleware.js';
import type { AppContainer } from '../../config/container.js';
import { HttpError } from '../../middleware/problem-details.js';
import { createAllowedEmailBodySchema } from './admin.validation.js';
import { requireAppOwner } from './admin.middleware.js';

export function createAdminRouter(env: Env, c: AppContainer): Router {
  const r = Router();

  r.use(requireAccessAuth(env, c.authService));
  r.use(requireAppOwner(env, c.userRepo));

  r.get(
    '/allowed-emails',
    asyncHandler(async (_req, res) => {
      const list = await c.allowedEmailRepo.list();
      res.json({ data: list.map(publicAllowedEmail) });
    }),
  );

  r.post(
    '/allowed-emails',
    asyncHandler(async (req, res) => {
      const parsed = createAllowedEmailBodySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new HttpError(400, 'Invalid request body', 'Bad Request');
      }
      const email = parsed.data.email.toLowerCase().trim();
      const existing = await c.allowedEmailRepo.findByEmail(email);
      if (existing) {
        throw new HttpError(409, 'This email is already on the allowlist', 'Conflict');
      }
      const auth = req.auth!;
      const created = await c.allowedEmailRepo.create({
        email,
        addedBy: auth.id,
      });
      res.status(201).json(publicAllowedEmail(created));
    }),
  );

  r.delete(
    '/allowed-emails/:id',
    asyncHandler(async (req, res) => {
      const raw = req.params.id;
      const id = Array.isArray(raw) ? raw[0] : raw;
      if (!id) {
        throw new HttpError(400, 'Missing id', 'Bad Request');
      }
      const ok = await c.allowedEmailRepo.deleteById(id);
      if (!ok) {
        throw new HttpError(404, 'Allowlist entry not found', 'Not Found');
      }
      res.status(204).send();
    }),
  );

  return r;
}

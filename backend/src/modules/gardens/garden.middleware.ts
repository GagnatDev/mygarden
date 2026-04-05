import type { RequestHandler } from 'express';
import type { AppContainer } from '../../config/container.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { paramString } from '../../lib/route-params.js';
import { HttpError } from '../../middleware/problem-details.js';

export function requireGardenMember(c: AppContainer): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const gardenId = paramString(req.params.gardenId, 'garden id');
    const membership = await c.membershipRepo.findByUserAndGarden(req.auth!.id, gardenId);
    if (!membership) {
      throw new HttpError(403, 'You are not a member of this garden', 'Forbidden');
    }
    req.gardenMembership = membership;
    next();
  });
}

import type { GardenMembership } from '../domain/garden-membership.js';
import type { AuthUser } from '../domain/user.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      gardenMembership?: GardenMembership;
    }
  }
}

export {};

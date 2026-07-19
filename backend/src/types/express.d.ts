import type pino from 'pino';
import type { GardenMembership } from '../domain/garden-membership.js';
import type { AuthUser } from '../domain/user.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
      gardenMembership?: GardenMembership;
      /** Correlation id for the request, echoed as the `X-Request-Id` header. */
      id: string;
      /** Request-scoped pino logger with the `requestId` already bound. */
      log: pino.Logger;
    }
  }
}

export {};

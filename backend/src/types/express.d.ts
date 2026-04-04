import type { AuthUser } from '../domain/user.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export {};

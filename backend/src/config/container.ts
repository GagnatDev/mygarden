import { AuthService } from '../modules/auth/auth.service.js';
import type { IAllowedEmailRepository } from '../repositories/interfaces/allowed-email.repository.interface.js';
import type { IUserRepository } from '../repositories/interfaces/user.repository.interface.js';
import { AllowedEmailRepositoryMongo } from '../repositories/mongodb/allowed-email.repository.mongodb.js';
import { UserRepositoryMongo } from '../repositories/mongodb/user.repository.mongodb.js';
import type { Env } from './env.js';

export interface AppContainer {
  env: Env;
  userRepo: IUserRepository;
  allowedEmailRepo: IAllowedEmailRepository;
  authService: AuthService;
}

export function buildContainer(env: Env): AppContainer {
  const userRepo = new UserRepositoryMongo();
  const allowedEmailRepo = new AllowedEmailRepositoryMongo();
  const authService = new AuthService(env, userRepo, allowedEmailRepo);
  return { env, userRepo, allowedEmailRepo, authService };
}

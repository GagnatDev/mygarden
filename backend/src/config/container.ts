import { AuthService } from '../modules/auth/auth.service.js';
import { AreaService } from '../modules/areas/area.service.js';
import { GardenService } from '../modules/gardens/garden.service.js';
import { SeasonService } from '../modules/seasons/season.service.js';
import type { IAllowedEmailRepository } from '../repositories/interfaces/allowed-email.repository.interface.js';
import type { IAreaRepository } from '../repositories/interfaces/area.repository.interface.js';
import type { IGardenMembershipRepository } from '../repositories/interfaces/garden-membership.repository.interface.js';
import type { IGardenRepository } from '../repositories/interfaces/garden.repository.interface.js';
import type { IUserRepository } from '../repositories/interfaces/user.repository.interface.js';
import type { ISeasonRepository } from '../repositories/interfaces/season.repository.interface.js';
import { AllowedEmailRepositoryMongo } from '../repositories/mongodb/allowed-email.repository.mongodb.js';
import { AreaRepositoryMongo } from '../repositories/mongodb/area.repository.mongodb.js';
import { GardenMembershipRepositoryMongo } from '../repositories/mongodb/garden-membership.repository.mongodb.js';
import { GardenRepositoryMongo } from '../repositories/mongodb/garden.repository.mongodb.js';
import { UserRepositoryMongo } from '../repositories/mongodb/user.repository.mongodb.js';
import { SeasonRepositoryMongo } from '../repositories/mongodb/season.repository.mongodb.js';
import type { Env } from './env.js';

export interface AppContainer {
  env: Env;
  userRepo: IUserRepository;
  allowedEmailRepo: IAllowedEmailRepository;
  gardenRepo: IGardenRepository;
  membershipRepo: IGardenMembershipRepository;
  areaRepo: IAreaRepository;
  seasonRepo: ISeasonRepository;
  authService: AuthService;
  gardenService: GardenService;
  areaService: AreaService;
  seasonService: SeasonService;
}

export function buildContainer(env: Env): AppContainer {
  const userRepo = new UserRepositoryMongo();
  const allowedEmailRepo = new AllowedEmailRepositoryMongo();
  const gardenRepo = new GardenRepositoryMongo();
  const membershipRepo = new GardenMembershipRepositoryMongo();
  const areaRepo = new AreaRepositoryMongo();
  const seasonRepo = new SeasonRepositoryMongo();
  const authService = new AuthService(env, userRepo, allowedEmailRepo);
  const gardenService = new GardenService(gardenRepo, membershipRepo, seasonRepo, areaRepo);
  const areaService = new AreaService(areaRepo, gardenRepo);
  const seasonService = new SeasonService(seasonRepo);
  return {
    env,
    userRepo,
    allowedEmailRepo,
    gardenRepo,
    membershipRepo,
    areaRepo,
    seasonRepo,
    authService,
    gardenService,
    areaService,
    seasonService,
  };
}

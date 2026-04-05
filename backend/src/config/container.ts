import { ActivityLogService } from '../modules/activity-logs/activity-log.service.js';
import { AreaService } from '../modules/areas/area.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { GardenService } from '../modules/gardens/garden.service.js';
import { PlantProfileService } from '../modules/plant-profiles/plant-profile.service.js';
import { PlantingService } from '../modules/plantings/planting.service.js';
import { SeasonService } from '../modules/seasons/season.service.js';
import { TaskService } from '../modules/tasks/task.service.js';
import type { IActivityLogRepository } from '../repositories/interfaces/activity-log.repository.interface.js';
import type { IAllowedEmailRepository } from '../repositories/interfaces/allowed-email.repository.interface.js';
import type { IAreaRepository } from '../repositories/interfaces/area.repository.interface.js';
import type { IGardenMembershipRepository } from '../repositories/interfaces/garden-membership.repository.interface.js';
import type { IGardenRepository } from '../repositories/interfaces/garden.repository.interface.js';
import type { IPlantProfileRepository } from '../repositories/interfaces/plant-profile.repository.interface.js';
import type { IPlantingRepository } from '../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../repositories/interfaces/season.repository.interface.js';
import type { ITaskRepository } from '../repositories/interfaces/task.repository.interface.js';
import type { IUserRepository } from '../repositories/interfaces/user.repository.interface.js';
import { ActivityLogRepositoryMongo } from '../repositories/mongodb/activity-log.repository.mongodb.js';
import { AllowedEmailRepositoryMongo } from '../repositories/mongodb/allowed-email.repository.mongodb.js';
import { AreaRepositoryMongo } from '../repositories/mongodb/area.repository.mongodb.js';
import { GardenMembershipRepositoryMongo } from '../repositories/mongodb/garden-membership.repository.mongodb.js';
import { GardenRepositoryMongo } from '../repositories/mongodb/garden.repository.mongodb.js';
import { PlantProfileRepositoryMongo } from '../repositories/mongodb/plant-profile.repository.mongodb.js';
import { PlantingRepositoryMongo } from '../repositories/mongodb/planting.repository.mongodb.js';
import { SeasonRepositoryMongo } from '../repositories/mongodb/season.repository.mongodb.js';
import { TaskRepositoryMongo } from '../repositories/mongodb/task.repository.mongodb.js';
import { UserRepositoryMongo } from '../repositories/mongodb/user.repository.mongodb.js';
import type { Env } from './env.js';

export interface AppContainer {
  env: Env;
  userRepo: IUserRepository;
  allowedEmailRepo: IAllowedEmailRepository;
  gardenRepo: IGardenRepository;
  membershipRepo: IGardenMembershipRepository;
  areaRepo: IAreaRepository;
  seasonRepo: ISeasonRepository;
  plantProfileRepo: IPlantProfileRepository;
  plantingRepo: IPlantingRepository;
  taskRepo: ITaskRepository;
  activityLogRepo: IActivityLogRepository;
  authService: AuthService;
  gardenService: GardenService;
  areaService: AreaService;
  seasonService: SeasonService;
  plantProfileService: PlantProfileService;
  plantingService: PlantingService;
  taskService: TaskService;
  activityLogService: ActivityLogService;
}

export function buildContainer(env: Env): AppContainer {
  const userRepo = new UserRepositoryMongo();
  const allowedEmailRepo = new AllowedEmailRepositoryMongo();
  const gardenRepo = new GardenRepositoryMongo();
  const membershipRepo = new GardenMembershipRepositoryMongo();
  const areaRepo = new AreaRepositoryMongo();
  const seasonRepo = new SeasonRepositoryMongo();
  const plantProfileRepo = new PlantProfileRepositoryMongo();
  const plantingRepo = new PlantingRepositoryMongo();
  const taskRepo = new TaskRepositoryMongo();
  const activityLogRepo = new ActivityLogRepositoryMongo();
  const authService = new AuthService(env, userRepo, allowedEmailRepo);
  const gardenService = new GardenService(
    gardenRepo,
    membershipRepo,
    seasonRepo,
    areaRepo,
    plantingRepo,
    taskRepo,
    activityLogRepo,
  );
  const areaService = new AreaService(areaRepo, gardenRepo);
  const seasonService = new SeasonService(seasonRepo);
  const plantProfileService = new PlantProfileService(plantProfileRepo);
  const plantingService = new PlantingService(
    plantingRepo,
    seasonRepo,
    areaRepo,
    plantProfileRepo,
    taskRepo,
  );
  const taskService = new TaskService(taskRepo, seasonRepo, activityLogRepo);
  const activityLogService = new ActivityLogService(activityLogRepo, seasonRepo, plantingRepo, areaRepo);
  return {
    env,
    userRepo,
    allowedEmailRepo,
    gardenRepo,
    membershipRepo,
    areaRepo,
    seasonRepo,
    plantProfileRepo,
    plantingRepo,
    taskRepo,
    activityLogRepo,
    authService,
    gardenService,
    areaService,
    seasonService,
    plantProfileService,
    plantingService,
    taskService,
    activityLogService,
  };
}

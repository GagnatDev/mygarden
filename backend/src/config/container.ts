import { ActivityLogService } from '../modules/activity-logs/activity-log.service.js';
import { AreaBackgroundService } from '../modules/areas/area-background.service.js';
import { AreaService } from '../modules/areas/area.service.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { ElementService } from '../modules/elements/element.service.js';
import { GardenService } from '../modules/gardens/garden.service.js';
import { NoteService } from '../modules/notes/note.service.js';
import { PlantProfileImageService } from '../modules/plant-profiles/plant-profile-image.service.js';
import { PlantProfileService } from '../modules/plant-profiles/plant-profile.service.js';
import { PlantingService } from '../modules/plantings/planting.service.js';
import { SeasonService } from '../modules/seasons/season.service.js';
import { TaskService } from '../modules/tasks/task.service.js';
import type { IActivityLogRepository } from '../repositories/interfaces/activity-log.repository.interface.js';
import type { INoteRepository } from '../repositories/interfaces/note.repository.interface.js';
import type { IAllowedEmailRepository } from '../repositories/interfaces/allowed-email.repository.interface.js';
import type { IAreaRepository } from '../repositories/interfaces/area.repository.interface.js';
import type { IElementRepository } from '../repositories/interfaces/element.repository.interface.js';
import type { IGardenMembershipRepository } from '../repositories/interfaces/garden-membership.repository.interface.js';
import type { IGardenRepository } from '../repositories/interfaces/garden.repository.interface.js';
import type { IPlantProfileRepository } from '../repositories/interfaces/plant-profile.repository.interface.js';
import type { IPlantingRepository } from '../repositories/interfaces/planting.repository.interface.js';
import type { ISeasonRepository } from '../repositories/interfaces/season.repository.interface.js';
import type { ITaskRepository } from '../repositories/interfaces/task.repository.interface.js';
import type { IUserRepository } from '../repositories/interfaces/user.repository.interface.js';
import { ActivityLogRepositoryMongo } from '../repositories/mongodb/activity-log.repository.mongodb.js';
import { NoteRepositoryMongo } from '../repositories/mongodb/note.repository.mongodb.js';
import { AllowedEmailRepositoryMongo } from '../repositories/mongodb/allowed-email.repository.mongodb.js';
import { AreaRepositoryMongo } from '../repositories/mongodb/area.repository.mongodb.js';
import { ElementRepositoryMongo } from '../repositories/mongodb/element.repository.mongodb.js';
import { GardenMembershipRepositoryMongo } from '../repositories/mongodb/garden-membership.repository.mongodb.js';
import { GardenRepositoryMongo } from '../repositories/mongodb/garden.repository.mongodb.js';
import { PlantProfileRepositoryMongo } from '../repositories/mongodb/plant-profile.repository.mongodb.js';
import { PlantingRepositoryMongo } from '../repositories/mongodb/planting.repository.mongodb.js';
import { SeasonRepositoryMongo } from '../repositories/mongodb/season.repository.mongodb.js';
import { TaskRepositoryMongo } from '../repositories/mongodb/task.repository.mongodb.js';
import { UserRepositoryMongo } from '../repositories/mongodb/user.repository.mongodb.js';
import pino from 'pino';
import { createFileStorageFromEnv } from './object-storage.js';
import type { Env } from './env.js';
import type { IFileStorageService } from '../services/file-storage/file-storage.interface.js';

export interface ContainerBuildOptions {
  fileStorage?: IFileStorageService;
  logger?: pino.Logger;
}

export interface AppContainer {
  env: Env;
  userRepo: IUserRepository;
  allowedEmailRepo: IAllowedEmailRepository;
  gardenRepo: IGardenRepository;
  membershipRepo: IGardenMembershipRepository;
  areaRepo: IAreaRepository;
  elementRepo: IElementRepository;
  seasonRepo: ISeasonRepository;
  plantProfileRepo: IPlantProfileRepository;
  plantingRepo: IPlantingRepository;
  taskRepo: ITaskRepository;
  activityLogRepo: IActivityLogRepository;
  noteRepo: INoteRepository;
  authService: AuthService;
  areaBackgroundService: AreaBackgroundService;
  gardenService: GardenService;
  areaService: AreaService;
  elementService: ElementService;
  seasonService: SeasonService;
  plantProfileService: PlantProfileService;
  plantProfileImageService: PlantProfileImageService;
  plantingService: PlantingService;
  taskService: TaskService;
  activityLogService: ActivityLogService;
  noteService: NoteService;
}

export function buildContainer(env: Env, options?: ContainerBuildOptions): AppContainer {
  const fileStorage = options?.fileStorage ?? createFileStorageFromEnv(env);
  const log = options?.logger ?? pino({ level: 'silent' });
  const userRepo = new UserRepositoryMongo();
  const allowedEmailRepo = new AllowedEmailRepositoryMongo();
  const gardenRepo = new GardenRepositoryMongo();
  const membershipRepo = new GardenMembershipRepositoryMongo();
  const areaRepo = new AreaRepositoryMongo();
  const elementRepo = new ElementRepositoryMongo();
  const seasonRepo = new SeasonRepositoryMongo();
  const plantProfileRepo = new PlantProfileRepositoryMongo();
  const plantingRepo = new PlantingRepositoryMongo();
  const taskRepo = new TaskRepositoryMongo();
  const activityLogRepo = new ActivityLogRepositoryMongo();
  const noteRepo = new NoteRepositoryMongo();
  const authService = new AuthService(env, userRepo, allowedEmailRepo);
  const areaBackgroundService = new AreaBackgroundService(areaRepo, fileStorage, log);
  const gardenService = new GardenService(
    gardenRepo,
    membershipRepo,
    seasonRepo,
    areaRepo,
    elementRepo,
    plantingRepo,
    taskRepo,
    activityLogRepo,
    noteRepo,
    fileStorage,
  );
  const areaService = new AreaService(areaRepo, gardenRepo, elementRepo, fileStorage);
  const elementService = new ElementService(elementRepo, areaRepo);
  const seasonService = new SeasonService(
    seasonRepo,
    plantingRepo,
    activityLogRepo,
    noteRepo,
    areaRepo,
    elementRepo,
  );
  const plantProfileService = new PlantProfileService(plantProfileRepo, fileStorage);
  const plantProfileImageService = new PlantProfileImageService(plantProfileRepo, fileStorage);
  const plantingService = new PlantingService(
    plantingRepo,
    seasonRepo,
    elementRepo,
    areaRepo,
    plantProfileRepo,
    taskRepo,
  );
  const taskService = new TaskService(taskRepo, seasonRepo, activityLogRepo, areaRepo, elementRepo);
  const activityLogService = new ActivityLogService(
    activityLogRepo,
    seasonRepo,
    plantingRepo,
    elementRepo,
    areaRepo,
  );
  const noteService = new NoteService(noteRepo, seasonRepo, plantingRepo, elementRepo, areaRepo);
  return {
    env,
    userRepo,
    allowedEmailRepo,
    gardenRepo,
    membershipRepo,
    areaRepo,
    elementRepo,
    seasonRepo,
    plantProfileRepo,
    plantingRepo,
    taskRepo,
    activityLogRepo,
    noteRepo,
    authService,
    areaBackgroundService,
    gardenService,
    areaService,
    elementService,
    seasonService,
    plantProfileService,
    plantProfileImageService,
    plantingService,
    taskService,
    activityLogService,
    noteService,
  };
}

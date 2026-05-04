import type { Planting } from '../../domain/planting.js';
import type { TaskAutoKind } from '../../domain/task.js';
import type {
  CreateTaskInput,
  ITaskRepository,
} from '../../repositories/interfaces/task.repository.interface.js';

function pushTask(
  out: CreateTaskInput[],
  params: {
    gardenId: string;
    seasonId: string;
    plantingId: string;
    elementId: string | null;
    plantName: string;
    title: string;
    dueDate: Date;
    autoKind: TaskAutoKind;
  },
) {
  out.push({
    gardenId: params.gardenId,
    seasonId: params.seasonId,
    plantingId: params.plantingId,
    areaId: null,
    elementId: params.elementId,
    plantName: params.plantName,
    title: params.title,
    dueDate: params.dueDate,
    source: 'auto',
    status: 'pending',
    autoKind: params.autoKind,
  });
}

export async function replaceAutoTasksForPlanting(
  taskRepo: ITaskRepository,
  planting: Planting,
): Promise<void> {
  await taskRepo.deleteAutoTasksByPlantingId(planting.id);
  const inputs: CreateTaskInput[] = [];
  const { plantName, id, gardenId, seasonId, elementId } = planting;

  if (planting.sowingMethod === 'indoor') {
    if (planting.indoorSowDate) {
      pushTask(inputs, {
        gardenId,
        seasonId,
        plantingId: id,
        elementId,
        plantName,
        title: `Sow ${plantName} indoors`,
        dueDate: planting.indoorSowDate,
        autoKind: 'sow_indoor',
      });
    }
    if (planting.transplantDate) {
      pushTask(inputs, {
        gardenId,
        seasonId,
        plantingId: id,
        elementId,
        plantName,
        title: `Transplant ${plantName}`,
        dueDate: planting.transplantDate,
        autoKind: 'transplant',
      });
    }
  } else {
    if (planting.outdoorSowDate) {
      pushTask(inputs, {
        gardenId,
        seasonId,
        plantingId: id,
        elementId,
        plantName,
        title: `Sow ${plantName} outdoors`,
        dueDate: planting.outdoorSowDate,
        autoKind: 'sow_outdoor',
      });
    }
  }

  if (planting.harvestWindowStart) {
    pushTask(inputs, {
      gardenId,
      seasonId,
      plantingId: id,
      elementId,
      plantName,
      title: `Start harvesting ${plantName}`,
      dueDate: planting.harvestWindowStart,
      autoKind: 'harvest_start',
    });
  }

  for (const input of inputs) {
    await taskRepo.create(input);
  }
}

export async function removeAllTasksForPlanting(
  taskRepo: ITaskRepository,
  plantingId: string,
): Promise<void> {
  await taskRepo.deleteAllTasksByPlantingId(plantingId);
}

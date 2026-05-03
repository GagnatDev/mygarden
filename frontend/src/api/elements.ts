import { apiFetch, readProblemDetails } from './client';

export type ElementType =
  | 'raised_bed'
  | 'open_bed'
  | 'tree_zone'
  | 'path'
  | 'lawn'
  | 'other';

export type ElementShape =
  | { kind: 'rectangle' }
  | { kind: 'polygon'; vertices: Array<{ x: number; y: number }> }
  | { kind: 'path'; d: string };

export interface Element {
  id: string;
  areaId: string;
  name: string;
  type: ElementType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  shape?: ElementShape;
  createdAt: string;
  updatedAt: string;
}

async function throwUnlessOk(res: Response): Promise<void> {
  if (!res.ok) {
    const detail = await readProblemDetails(res);
    throw new Error(detail ?? res.statusText);
  }
}

export async function listElements(gardenId: string, areaId: string): Promise<Element[]> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/elements`);
  await throwUnlessOk(res);
  return (await res.json()) as Element[];
}

export async function createElement(
  gardenId: string,
  areaId: string,
  body: {
    name: string;
    type: ElementType;
    color: string;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
    shape?: ElementShape;
  },
): Promise<Element> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/elements`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Element;
}

export async function patchElement(
  gardenId: string,
  areaId: string,
  elementId: string,
  patch: Partial<{
    name: string;
    type: ElementType;
    color: string;
    gridX: number;
    gridY: number;
    gridWidth: number;
    gridHeight: number;
    shape: ElementShape;
  }>,
): Promise<Element> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  await throwUnlessOk(res);
  return (await res.json()) as Element;
}

export async function deleteElement(gardenId: string, areaId: string, elementId: string): Promise<void> {
  const res = await apiFetch(`/gardens/${gardenId}/areas/${areaId}/elements/${elementId}`, {
    method: 'DELETE',
  });
  await throwUnlessOk(res);
}

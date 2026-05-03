export interface Garden {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicGarden(g: Garden) {
  return {
    id: g.id,
    name: g.name,
    createdBy: g.createdBy,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

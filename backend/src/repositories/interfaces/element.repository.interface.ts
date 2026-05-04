import type { Element, ElementShape, ElementType } from '../../domain/element.js';
import type { WithMongoSession } from '../mongo-session.js';

export interface CreateElementInput {
  areaId: string;
  name: string;
  type: ElementType;
  color: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  shape?: ElementShape;
}

export interface IElementRepository {
  create(input: CreateElementInput): Promise<Element>;
  findById(id: string): Promise<Element | null>;
  findByAreaId(areaId: string): Promise<Element[]>;
  findByAreaIds(areaIds: string[]): Promise<Element[]>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Element,
        'name' | 'type' | 'color' | 'gridX' | 'gridY' | 'gridWidth' | 'gridHeight' | 'shape'
      >
    >,
  ): Promise<Element | null>;
  delete(id: string): Promise<boolean>;
  deleteByAreaId(areaId: string, options?: WithMongoSession): Promise<number>;
}

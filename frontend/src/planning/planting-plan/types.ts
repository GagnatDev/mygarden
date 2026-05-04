import type { Element } from '../../api/elements';

export type ElementWithArea = Element & { areaTitle: string };

export type PlanMode = 'outdoor' | 'indoor';

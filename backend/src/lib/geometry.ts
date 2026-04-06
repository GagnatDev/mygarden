export interface Point {
  x: number;
  y: number;
}

export function polygonBoundingBox(poly: readonly Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  if (poly.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = poly[0]!.x;
  let minY = poly[0]!.y;
  let maxX = poly[0]!.x;
  let maxY = poly[0]!.y;
  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function perp(v: Point): Point {
  return { x: -v.y, y: v.x };
}

function project(poly: readonly Point[], axis: Point): { min: number; max: number } {
  let min = dot(poly[0]!, axis);
  let max = min;
  for (let i = 1; i < poly.length; i++) {
    const p = dot(poly[i]!, axis);
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return { min, max };
}

function intervalsOverlap(a: { min: number; max: number }, b: { min: number; max: number }): boolean {
  return !(a.max < b.min || b.max < a.min);
}

/**
 * Polygon overlap test using Separating Axis Theorem (SAT).
 * Treats touching edges/vertices as overlapping.
 */
export function polygonsOverlap(a: readonly Point[], b: readonly Point[]): boolean {
  if (a.length < 3 || b.length < 3) return false;
  const polys: Array<readonly Point[]> = [a, b];

  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i]!;
      const p2 = poly[(i + 1) % poly.length]!;
      const edge = sub(p2, p1);
      const axis = perp(edge);
      const pa = project(a, axis);
      const pb = project(b, axis);
      if (!intervalsOverlap(pa, pb)) return false;
    }
  }
  return true;
}


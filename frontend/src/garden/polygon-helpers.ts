/** Grid-space vertices (cell coordinates, may be fractional). */
export type GridPoint = { x: number; y: number };

export function polygonPointsPx(vertices: readonly GridPoint[], cell: number): string {
  return vertices.map((p) => `${p.x * cell},${p.y * cell}`).join(' ');
}

/** Bounding box in integer grid cells (matches backend inference). */
export function polygonVerticesToGridBBox(vertices: readonly GridPoint[]): {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
} | null {
  if (vertices.length < 3) return null;
  let minX = vertices[0]!.x;
  let minY = vertices[0]!.y;
  let maxX = vertices[0]!.x;
  let maxY = vertices[0]!.y;
  for (const p of vertices) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const gridX = Math.floor(minX);
  const gridY = Math.floor(minY);
  const gridWidth = Math.max(1, Math.ceil(maxX) - gridX);
  const gridHeight = Math.max(1, Math.ceil(maxY) - gridY);
  return { gridX, gridY, gridWidth, gridHeight };
}

/** Geometric centroid in grid coordinates (for label placement). */
export function polygonCentroidGrid(vertices: readonly GridPoint[]): GridPoint {
  if (vertices.length === 0) return { x: 0, y: 0 };
  if (vertices.length === 1) return { ...vertices[0]! };
  let a = 0;
  let cx = 0;
  let cy = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const p0 = vertices[i]!;
    const p1 = vertices[(i + 1) % n]!;
    const cross = p0.x * p1.y - p1.x * p0.y;
    a += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    const sx = vertices.reduce((s, p) => s + p.x, 0) / n;
    const sy = vertices.reduce((s, p) => s + p.y, 0) / n;
    return { x: sx, y: sy };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}

export function translateVertices(
  vertices: readonly GridPoint[],
  dx: number,
  dy: number,
): GridPoint[] {
  return vertices.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

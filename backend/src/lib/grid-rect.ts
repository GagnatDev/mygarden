export interface GridRect {
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
}

export function gridRectsOverlap(a: GridRect, b: GridRect): boolean {
  const ax2 = a.gridX + a.gridWidth;
  const ay2 = a.gridY + a.gridHeight;
  const bx2 = b.gridX + b.gridWidth;
  const by2 = b.gridY + b.gridHeight;
  return !(ax2 <= b.gridX || a.gridX >= bx2 || ay2 <= b.gridY || a.gridY >= by2);
}

export function rectWithinGarden(r: GridRect, gardenWidth: number, gardenHeight: number): boolean {
  if (r.gridX < 0 || r.gridY < 0) return false;
  if (r.gridWidth < 1 || r.gridHeight < 1) return false;
  return r.gridX + r.gridWidth <= gardenWidth && r.gridY + r.gridHeight <= gardenHeight;
}

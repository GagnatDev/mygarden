import type { GardenTask } from '../api/tasks';

export function utcDayKey(iso: string): string {
  const x = new Date(iso);
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
}

export function taskVisualStatus(t: GardenTask, todayKey: string): 'done' | 'overdue' | 'pending' {
  if (t.status === 'done') return 'done';
  const due = utcDayKey(t.dueDate);
  if (due < todayKey) return 'overdue';
  return 'pending';
}

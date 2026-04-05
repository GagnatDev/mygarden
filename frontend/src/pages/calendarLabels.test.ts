import { describe, expect, it } from 'vitest';
import { getWeekdayShortLabels } from './CalendarPage';

describe('getWeekdayShortLabels', () => {
  it('lists Monday first and matches Intl for nb-NO', () => {
    const labels = getWeekdayShortLabels('nb-NO');
    const mon = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, 1)),
    );
    expect(labels[0]).toBe(mon);
    expect(labels).toHaveLength(7);
  });

  it('lists Monday first and matches Intl for en-GB', () => {
    const labels = getWeekdayShortLabels('en-GB');
    const mon = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, 1)),
    );
    expect(labels[0]).toBe(mon);
  });
});

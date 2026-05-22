/** Monday-first weekday labels (short) for the calendar header. */
export function getWeekdayShortLabels(locale: string): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d);
  });
}

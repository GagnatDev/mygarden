const COMPACT_DURATION = /^(\d+)([smhd])$/i;

/**
 * Compact duration strings for JWT `expiresIn` and refresh-cookie maxAge parsing:
 * non-negative integer + unit suffix (seconds, minutes, hours, days).
 */
export function isCompactDuration(expiresIn: string): boolean {
  const m = COMPACT_DURATION.exec(expiresIn.trim());
  return Boolean(m?.[1] && m[2]);
}

/** Milliseconds for a valid compact string; otherwise `null`. */
export function compactDurationToMs(expiresIn: string): number | null {
  const m = COMPACT_DURATION.exec(expiresIn.trim());
  if (!m?.[1] || !m[2]) return null;
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult =
    u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 24 * 3_600_000;
  return n * mult;
}

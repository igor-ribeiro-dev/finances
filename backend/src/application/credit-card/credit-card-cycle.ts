/**
 * Closing-day cycle helper (FR-001a). The closing day is informational/grouping
 * only — it never drives settlement (that is the snapshot rule, FR-009). This
 * derives the date on which the currently-open fatura closes, so the per-card
 * view and tracker summary can label "fatura fechando em DD/MM" and group the
 * month's purchases into the upcoming fatura.
 *
 * All math is on civil calendar dates (UTC, no timezone). When the closing day
 * does not exist in a month (e.g. 31 in February), the last day of that month
 * is used.
 */
function clampDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)));
}

/**
 * Returns the next closing date on/after `ref` for a card with `closingDay`.
 * If today's day is <= closingDay, the cycle closes this month; otherwise next.
 */
export function currentCycleClose(closingDay: number, ref: Date = new Date()): Date {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const thisMonthClose = clampDay(y, m, closingDay);
  if (ref.getUTCDate() <= thisMonthClose.getUTCDate()) {
    return thisMonthClose;
  }
  return clampDay(y, m + 1, closingDay);
}

/** ISO `YYYY-MM-DD` of the current cycle close (for serializers). */
export function currentCycleCloseIso(closingDay: number, ref: Date = new Date()): string {
  return currentCycleClose(closingDay, ref).toISOString().slice(0, 10);
}

/**
 * Small time-arithmetic helpers for attendance. Times are "HH:mm" strings; we
 * convert to minutes-since-midnight, handle shifts that cross midnight, and
 * round hours to 2dp. Kept dependency-free so it can run on client + server.
 */

/** Parse "HH:mm" into minutes since midnight, or null if malformed. */
export function parseHHMM(value?: string | null): number | null {
  if (!value) return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Round to 2 decimal places without floating-point drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Span in minutes between two "HH:mm" times. If end <= start the window is
 * assumed to cross midnight, so 24h is added (night shifts).
 */
export function spanMinutes(start?: string | null, end?: string | null): number {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  if (s === null || e === null) return 0;
  const raw = e - s;
  return raw > 0 ? raw : raw + 24 * 60;
}

export type WorkedResult = { workedHours: number; overtimeHours: number };

/**
 * Compute net worked hours (after break) and overtime (anything beyond the
 * shift's scheduled net hours). All inputs are "HH:mm"; break is in minutes.
 */
export function computeWorked(opts: {
  inTime?: string | null;
  outTime?: string | null;
  shiftStart?: string | null;
  shiftEnd?: string | null;
  breakMinutes?: number;
}): WorkedResult {
  const grossMin = spanMinutes(opts.inTime, opts.outTime);
  if (grossMin <= 0) return { workedHours: 0, overtimeHours: 0 };

  const breakMin = Math.max(0, opts.breakMinutes ?? 0);
  const netMin = Math.max(0, grossMin - breakMin);
  const workedHours = round2(netMin / 60);

  // Overtime = worked beyond the shift's scheduled net span (if a shift is set).
  const shiftGross = spanMinutes(opts.shiftStart, opts.shiftEnd);
  if (shiftGross <= 0) return { workedHours, overtimeHours: 0 };
  const shiftNet = Math.max(0, shiftGross - breakMin);
  const overtimeMin = Math.max(0, netMin - shiftNet);
  return { workedHours, overtimeHours: round2(overtimeMin / 60) };
}

// Goal analysis calculations. Pure functions only, for easy testing and reuse.

export type GoalStatus = "reached" | "overdue" | "on-track";

/**
 * Months remaining from now until the target date (includes the current month, rounds up partial months). Returns at least 1.
 * e.g. today=2026-04-19, targetDate=2026-12-31 → 9
 *      today=2026-04-19, targetDate=2026-04-30 → 1
 */
export function monthsUntil(
  targetDate: string,
  now: Date = new Date(),
): number {
  const target = parseIsoDate(targetDate);
  if (!target) return 1;
  const diff =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());
  return Math.max(1, diff + 1);
}

/**
 * Amount that must be saved each month to reach the goal. If already reached (result <= 0), the caller omits the display.
 */
export function requiredMonthlySavings(
  targetAmount: number,
  currentTotal: number,
  monthsRemaining: number,
): number {
  if (monthsRemaining <= 0) return 0;
  return Math.ceil((targetAmount - currentTotal) / monthsRemaining);
}

/**
 * Progress percentage. Clamped to 0~100. Returns 0 if the target amount is 0 or less.
 */
export function progressPct(
  currentTotal: number,
  targetAmount: number,
): number {
  if (targetAmount <= 0) return 0;
  const pct = (currentTotal / targetAmount) * 100;
  if (pct <= 0) return 0;
  if (pct >= 100) return 100;
  return pct;
}

/**
 * Goal status. reached if achieved, overdue if the target date passed without achieving it, otherwise on-track.
 */
export function statusOf(
  targetAmount: number,
  currentTotal: number,
  targetDate: string,
  now: Date = new Date(),
): GoalStatus {
  if (targetAmount > 0 && currentTotal >= targetAmount) return "reached";
  const target = parseIsoDate(targetDate);
  if (target && target.getTime() < startOfDay(now).getTime()) return "overdue";
  return "on-track";
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return new Date(year, month - 1, day);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

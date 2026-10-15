// Helpers for six-digit year_month integers (e.g. 202606). Shared by expense month navigation and validation.

export function isValidYearMonth(value: number): boolean {
  if (!Number.isInteger(value)) return false;
  if (value < 190001 || value > 999912) return false;
  const month = value % 100;
  return month >= 1 && month <= 12;
}

// The ledger follows Korean calendar days on both server (UTC) and client: without an
// explicit zone, 00:00-09:00 KST on the 1st still reads as last month on the server.
const APP_TIME_ZONE = "Asia/Seoul";
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function currentYearMonth(): number {
  return yearMonthOfDate(todayDateString());
}

export function prevYearMonth(yearMonth: number): number {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  return month === 1 ? (year - 1) * 100 + 12 : yearMonth - 1;
}

export function nextYearMonth(yearMonth: number): number {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  return month === 12 ? (year + 1) * 100 + 1 : yearMonth + 1;
}

// Returns the 1st of the month as "YYYY-MM-DD". Used as the default date for expense input.
export function firstDayOf(yearMonth: number): string {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Returns today's date in the app time zone (KST) as "YYYY-MM-DD".
export function todayDateString(): string {
  // en-CA formats as YYYY-MM-DD.
  return dateFormatter.format(new Date());
}

// Validates that a "YYYY-MM-DD" string is a real calendar date.
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

// "YYYY-MM-DD" → six-digit year_month integer.
export function yearMonthOfDate(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return year * 100 + month;
}

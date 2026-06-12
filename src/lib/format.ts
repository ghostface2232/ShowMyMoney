// Currency/year-month format helpers used across the UI. Provides ko-KR KRW notation and "26_3월" format.

const currencyFormatter = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0,
});

export function formatKRW(amount: number): string {
  return currencyFormatter.format(amount);
}

export function formatYearMonth(yearMonth: number): string {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  const yy = String(year).slice(-2);
  return `${yy}_${month}월`;
}

// Long form for page-level titles, e.g. "2026년 6월". Table columns keep the compact "26_6월" form.
export function formatYearMonthLong(yearMonth: number): string {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  return `${year}년 ${month}월`;
}

// "YYYY-MM-DD" → "6월 12일 (목)". Day header label for the expense list.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function formatDayLabel(spentOn: string): string {
  const [year, month, day] = spentOn.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return spentOn;
  return `${month}월 ${day}일 (${WEEKDAYS[date.getDay()]})`;
}

// Compact currency notation for tight spaces like chart axes. Compresses into man/eok (10K/100M) units and omits the won unit.
export function formatKRWCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 10_000) return String(Math.round(amount));
  if (abs < 100_000_000) return `${Math.round(amount / 10_000)}만`;
  const eok = amount / 100_000_000;
  if (Math.abs(eok) >= 10) return `${Math.round(eok)}억`;
  const rounded = Math.round(eok * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0$/, "")}억`;
}

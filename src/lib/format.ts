// Currency/year-month format helpers used across the UI. Provides ko-KR KRW notation and "26년 3월" format.

// Korean consumer-finance convention (Toss, 뱅크샐러드): "1,234,567원" with the
// native 원 suffix instead of the ₩ symbol. Zero renders explicitly as "0원".
const numberFormatter = new Intl.NumberFormat("ko-KR", {
  maximumFractionDigits: 0,
});

export function formatKRW(amount: number): string {
  return `${numberFormatter.format(amount)}원`;
}

export function formatYearMonth(yearMonth: number): string {
  const year = Math.floor(yearMonth / 100);
  const month = yearMonth % 100;
  const yy = String(year).slice(-2);
  return `${yy}년 ${month}월`;
}

// Long form for page-level titles, e.g. "2026년 6월". Table columns keep the compact "26년 6월" form.
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
// Rounds the magnitude first (so ±values are symmetric) and re-buckets after rounding
// (99,995,000 → "1억", not "10000만").
export function formatKRWCompact(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.round(Math.abs(amount));
  if (abs < 10_000) return `${sign}${abs}`;
  const man = Math.round(abs / 10_000);
  if (man < 10_000) return `${sign}${man}만`;
  const eok = abs / 100_000_000;
  if (eok >= 10) return `${sign}${Math.round(eok)}억`;
  const rounded = Math.round(eok * 10) / 10;
  return `${sign}${rounded.toFixed(1).replace(/\.0$/, "")}억`;
}

// Amount text fields keep raw digits in state and display them grouped ("1,250,000") as
// the user types, the way banking apps do. 13 digits stays well inside safe integers.
const AMOUNT_MAX_DIGITS = 13;

export function amountDigits(text: string): string {
  return text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, AMOUNT_MAX_DIGITS);
}

export function formatAmountInput(digits: string): string {
  return digits === "" ? "" : numberFormatter.format(Number(digits));
}

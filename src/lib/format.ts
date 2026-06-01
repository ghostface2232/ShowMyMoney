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

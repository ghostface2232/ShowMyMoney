// UI 전반에서 사용하는 통화/년월 포맷 헬퍼. ko-KR KRW 표기와 "26_3월" 형식을 제공.

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

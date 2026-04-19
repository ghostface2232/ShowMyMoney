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

// 차트 축 등 좁은 공간에 쓰는 통화 단축 표기. 만/억 단위로 압축하며 원 단위는 생략한다.
export function formatKRWCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 10_000) return String(Math.round(amount));
  if (abs < 100_000_000) return `${Math.round(amount / 10_000)}만`;
  const eok = amount / 100_000_000;
  if (Math.abs(eok) >= 10) return `${Math.round(eok)}억`;
  const rounded = Math.round(eok * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0$/, "")}억`;
}

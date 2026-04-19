// 목표 분석 계산 로직. 순수 함수만 포함하여 테스트와 재사용이 쉽게 한다.

export type GoalStatus = "reached" | "overdue" | "on-track";

/**
 * 지금부터 목표일까지 남은 개월 수(현재 달 포함, 부분 월은 올림). 최소 1을 반환한다.
 * 예) today=2026-04-19, targetDate=2026-12-31 → 9
 *     today=2026-04-19, targetDate=2026-04-30 → 1
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
 * 목표까지 매월 추가로 적립해야 하는 금액. 이미 달성한 상태(결과 <= 0)면 호출측에서 표기를 생략한다.
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
 * 달성률. 0~100으로 clamp한다. 목표 금액이 0 이하면 0을 반환.
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
 * 목표 상태. 달성했으면 reached, 목표일이 지났는데 미달성이면 overdue, 그 외 on-track.
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

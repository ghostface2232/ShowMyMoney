// 전역 모션 상수. 스프링/이징/지속시간을 한 곳에서 관리해 앱 전체의 애니메이션 리듬을 통일한다.
import type { Transition } from "motion/react";

// 기본 스프링. 버튼이나 작은 요소에 쓴다. 반응은 빠르지만 과한 바운스가 없다.
export const SPRING_DEFAULT: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
};

// Luma의 차분한 리듬에 맞춘 부드러운 스프링. 리스트·카드·모달 내 레이아웃 변화에 사용한다.
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 32,
};

// 레이아웃 공유(FLIP) 전용. 약간의 mass로 정착 전 미세한 여운을 남긴다.
export const SPRING_LAYOUT: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

// cubic-bezier 큐빅 ease-out. 페이지 전환, 숫자 카운트, fade+y에 쓰인다.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// 대칭 ease-in-out. 양방향 컨트롤(예: 입력 토글)에 쓰인다.
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION_FAST = 0.18;
export const DURATION_BASE = 0.28;
export const DURATION_SLOW = 0.4;

// 숫자 카운트 애니메이션 지속시간(ms). 300-500ms 범위의 중앙값.
export const COUNT_UP_DURATION_MS = 420;

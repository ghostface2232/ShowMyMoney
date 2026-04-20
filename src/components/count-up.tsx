// 숫자 카운트 애니메이션. requestAnimationFrame 기반으로 300~500ms 동안 큐빅 ease-out으로 이전 값에서 새 값으로 이어간다.
"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { COUNT_UP_DURATION_MS } from "@/lib/motion";

type Props = {
  value: number;
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
};

export function CountUp({
  value,
  format,
  durationMs = COUNT_UP_DURATION_MS,
  className,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [animatedValue, setAnimatedValue] = useState(value);
  // 현재 화면에 보이는 값. 애니메이션이 중간에 끊기고 새 값이 들어와도 끊김 없이 이어가기 위해 매 프레임 갱신한다.
  const currentRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // 모션 끄기 상태에서는 rAF를 돌리지 않고 즉시 동기화한다.
      // animatedValue까지 맞춰 두지 않으면 사용자가 reducedMotion을 해제한 직후
      // 다음 값 변경 전까지 stale한 수치가 그대로 보인다. 같은 값을 setState하면
      // React가 bail-out해서 cascading render는 일어나지 않는다.
      currentRef.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimatedValue(value);
      return;
    }

    const from = currentRef.current;
    if (from === value) return;

    const start = performance.now();
    const delta = value - from;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + delta * eased;
      currentRef.current = next;
      setAnimatedValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = value;
        setAnimatedValue(value);
        rafRef.current = null;
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, durationMs, reducedMotion]);

  return (
    <span className={className}>{format(Math.round(animatedValue))}</span>
  );
}

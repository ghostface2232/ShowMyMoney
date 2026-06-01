// Number count-up animation. Uses requestAnimationFrame to transition from the previous value to the new value over 300-500ms with a cubic ease-out.
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
  // The value currently shown on screen. Updated every frame so the animation continues seamlessly even when interrupted by a new value.
  const currentRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion) {
      // When motion is disabled, sync immediately instead of running rAF.
      // If animatedValue isn't kept in sync, a stale number would remain visible right after
      // the user turns off reducedMotion until the next value change. Calling setState with the
      // same value lets React bail out, so no cascading render occurs.
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

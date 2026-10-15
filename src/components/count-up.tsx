// Number count-up animation. Uses requestAnimationFrame to transition from the previous value to the new value over 300-500ms with a cubic ease-out.
// Frames are written straight to the text node: a count-up across several summary cards would
// otherwise cost one React render per card per frame, right when an edit is being committed.
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
  // Server-rendered/hydrated text. React never updates it afterwards; the effect owns the DOM.
  const [initialText] = useState(() => format(Math.round(value)));
  const nodeRef = useRef<HTMLSpanElement>(null);
  // The value currently shown on screen. Updated every frame so the animation continues seamlessly even when interrupted by a new value.
  const currentRef = useRef(value);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const paint = (next: number) => {
      node.textContent = format(Math.round(next));
    };

    const from = currentRef.current;
    if (reducedMotion || from === value) {
      currentRef.current = value;
      paint(value);
      return;
    }

    const start = performance.now();
    const delta = value - from;
    let frame = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t < 1 ? from + delta * eased : value;
      currentRef.current = next;
      paint(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reducedMotion, format]);

  return (
    <span ref={nodeRef} className={className}>
      {initialText}
    </span>
  );
}

// 루트 레이아웃 아래에서 pathname 변화를 감지해 content를 fade + slight y offset으로 전환하는 얇은 래퍼.
"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DURATION_BASE, EASE_OUT } from "@/lib/motion";

type Props = { children: ReactNode };

export function MotionShell({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={reducedMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: DURATION_BASE, ease: EASE_OUT }
        }
        style={{ willChange: "transform, opacity" }}
        className="flex flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

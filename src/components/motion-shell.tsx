// Animates route content on pathname changes. Tab routes slide horizontally in the
// direction of travel (swipe feel); other transitions fall back to fade + slight y offset.
// Also marks the first client navigation so entry animations only play on initial load.
"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { markClientNavigation } from "@/lib/app-navigation";
import { DURATION_BASE, EASE_OUT } from "@/lib/motion";

type Props = { children: ReactNode };

// Order of the bottom tab bar routes; determines the slide direction.
function tabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/expenses")) return 1;
  return -1;
}

const variants = {
  enter: (direction: number) =>
    direction === 0
      ? { opacity: 0, x: 0, y: 6 }
      : { opacity: 0, x: 48 * direction, y: 0 },
  center: { opacity: 1, x: 0, y: 0 },
  exit: (direction: number) =>
    direction === 0
      ? { opacity: 0, x: 0, y: -4 }
      : { opacity: 0, x: -48 * direction, y: 0 },
};

export function MotionShell({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  // "Adjust state during render" pattern: the direction must be known before the new
  // child mounts, and AnimatePresence forwards the latest `custom` to the exiting child.
  const [tracked, setTracked] = useState({ pathname, direction: 0 });
  if (tracked.pathname !== pathname) {
    const from = tabIndex(tracked.pathname);
    const to = tabIndex(pathname);
    markClientNavigation();
    setTracked({
      pathname,
      direction:
        from !== -1 && to !== -1 && from !== to ? (to > from ? 1 : -1) : 0,
    });
  }
  const direction = tracked.direction;

  return (
    <AnimatePresence mode="popLayout" initial={false} custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
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

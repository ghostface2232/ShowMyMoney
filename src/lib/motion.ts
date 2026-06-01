// Global motion constants. Manages springs/easings/durations in one place to unify the animation rhythm across the app.
import type { Transition } from "motion/react";

// Default spring. Used for buttons and small elements. Fast response without excessive bounce.
export const SPRING_DEFAULT: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
};

// Soft spring matched to Luma's calm rhythm. Used for layout changes within lists, cards, and modals.
export const SPRING_SOFT: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 32,
};

// For shared layout (FLIP) only. A bit of mass leaves a subtle trailing effect before settling.
export const SPRING_LAYOUT: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 34,
  mass: 0.9,
};

// cubic-bezier ease-out. Used for page transitions, number counts, and fade+y.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// Symmetric ease-in-out. Used for bidirectional controls (e.g. input toggles).
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION_FAST = 0.18;
export const DURATION_BASE = 0.28;
export const DURATION_SLOW = 0.4;

// Number count-up animation duration (ms). Midpoint of the 300-500ms range.
export const COUNT_UP_DURATION_MS = 420;

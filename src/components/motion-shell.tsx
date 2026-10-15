// Animates route content on pathname changes. Tab routes shift slightly in the direction
// of travel with a crossfade; other transitions fade with a slight y offset; Reduce Motion
// gets a plain crossfade.
// Outgoing and incoming pages share one grid cell; the outgoing page keeps rendering its own
// frozen route tree (instead of a second copy of the new page) and stays visually pinned
// while the scroll container jumps to the incoming tab's remembered offset. The slide is a
// `transform` string so Motion runs it as a compositor (WAAPI) animation that a busy main
// thread mounting the next page cannot stall. Also marks the first client navigation so
// entry animations only play on initial load.
"use client";

import { usePathname } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  usePresenceData,
  useReducedMotion,
} from "motion/react";

import { markClientNavigation } from "@/lib/app-navigation";
import { DURATION_BASE, DURATION_FAST, EASE_OUT } from "@/lib/motion";
import {
  getScrollContainer,
  getScrollPosition,
  rememberScrollPosition,
} from "@/lib/scroll-memory";

// useLayoutEffect warns during SSR; the effect only matters in the browser anyway.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Props = { children: ReactNode };

type Transit = {
  // -1 / 1 for tab travel, 0 for any other route change.
  direction: number;
  // Incoming minus outgoing scroll offset; the outgoing page is shifted by this much so
  // it does not jump when the shared scroll container switches to the incoming offset.
  scrollShift: number;
};

// Order of the bottom tab bar routes; determines the slide direction.
function tabIndex(pathname: string): number {
  if (pathname === "/") return 0;
  if (pathname.startsWith("/expenses")) return 1;
  return -1;
}

// Tab switches are frequent, so the slide stays short (HIG: keep motion for frequent
// interactions minimal): a small shift in the direction of travel plus a crossfade.
const TAB_SHIFT = 20;

const variants = {
  enter: ({ direction }: Transit) =>
    direction === 0
      ? { opacity: 0, transform: "translateY(6px)" }
      : { opacity: 0, transform: `translateX(${TAB_SHIFT * direction}px)` },
  // Settle on a real `none`: a lingering identity transform would keep the whole page a
  // stacking context / containing block between transitions.
  center: { opacity: 1, transform: "none", transitionEnd: { transform: "none" } },
  exit: ({ direction }: Transit) =>
    direction === 0
      ? { opacity: 0, transform: "translateY(-4px)" }
      : { opacity: 0, transform: `translateX(${-TAB_SHIFT * direction}px)` },
};

// Reduce Motion: HIG asks to replace x/y movement with fades rather than drop feedback.
const reducedVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export function MotionShell({ children }: Props) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  // "Adjust state during render" pattern: the transit must be known before the new
  // child mounts, and AnimatePresence forwards the latest `custom` to the exiting child.
  const [tracked, setTracked] = useState<{ pathname: string; transit: Transit }>(
    { pathname, transit: { direction: 0, scrollShift: 0 } },
  );
  if (tracked.pathname !== pathname) {
    const from = tabIndex(tracked.pathname);
    const to = tabIndex(pathname);
    markClientNavigation();
    setTracked({
      pathname,
      transit: {
        direction:
          from !== -1 && to !== -1 && from !== to ? (to > from ? 1 : -1) : 0,
        scrollShift:
          getScrollPosition(pathname) - getScrollPosition(tracked.pathname),
      },
    });
  }
  const transit = tracked.transit;

  // Which page scroll events belong to. Switched before the restore below, so the
  // scroll event that restore fires can never be filed under the outgoing page.
  const scrollOwnerRef = useRef(pathname);

  // Tab links navigate with scroll={false}; restore the target tab's own scroll
  // offset before paint so the switch keeps each tab's position like a native app.
  useIsomorphicLayoutEffect(() => {
    scrollOwnerRef.current = pathname;
    getScrollContainer()?.scrollTo(0, getScrollPosition(pathname));
  }, [pathname]);

  // Keep the current tab's offset up to date so any navigation (tab bar, back
  // gesture, programmatic push) knows where the outgoing page was.
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;
    const onScroll = () =>
      rememberScrollPosition(scrollOwnerRef.current, container.scrollTop);
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="grid flex-1 grid-cols-1">
      <AnimatePresence initial={false} custom={transit}>
        <motion.div
          key={pathname}
          custom={transit}
          variants={reducedMotion ? reducedVariants : variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            duration: reducedMotion ? DURATION_FAST : DURATION_BASE,
            ease: EASE_OUT,
          }}
          className="col-start-1 row-start-1 flex min-w-0 flex-col"
        >
          <RoutePage>{children}</RoutePage>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Next's layout router renders whatever segment the *current* router context points at,
// so without freezing, the exiting copy would re-render as a second instance of the new
// page. While present it follows the live context; once exiting it keeps the last one.
function RoutePage({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent();
  const transit = usePresenceData() as Transit | undefined;
  const context = useContext(LayoutRouterContext);

  const [frozenContext, setFrozenContext] = useState(context);
  if (isPresent && frozenContext !== context) setFrozenContext(context);

  // Captured once when the exit starts; later navigations must not move a leaving page.
  const [exitShift, setExitShift] = useState<number | null>(null);
  if (!isPresent && exitShift === null) {
    setExitShift(transit?.scrollShift ?? 0);
  } else if (isPresent && exitShift !== null) {
    setExitShift(null);
  }

  return (
    <LayoutRouterContext.Provider value={isPresent ? context : frozenContext}>
      <div
        inert={!isPresent}
        className="relative flex flex-1 flex-col"
        // Safari 27 enables scroll anchoring; a leaving page must never be picked as the
        // anchor, or removing it would nudge the incoming tab's restored offset.
        style={
          isPresent ? undefined : { top: exitShift ?? 0, overflowAnchor: "none" }
        }
      >
        {children}
      </div>
    </LayoutRouterContext.Provider>
  );
}

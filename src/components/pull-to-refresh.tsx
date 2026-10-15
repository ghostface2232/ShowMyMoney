// Pull-to-refresh and refresh-on-resume for the home-screen app, which has no reload button.
// Pulling the scroll container past its top (iOS rubber band, so scrollTop goes negative)
// and releasing beyond the threshold re-fetches server data; so does returning to the app
// after a while. Either way, changes made on another device show up without a relaunch.
"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useTransition } from "react";
import { RotateCw } from "lucide-react";

import { getScrollContainer } from "@/lib/scroll-memory";
import { cn } from "@/lib/utils";

// Overscroll distance (px) that arms a refresh on release.
const PULL_THRESHOLD = 72;
// Coming back to the app after this long refreshes automatically.
const RESUME_REFRESH_AFTER_MS = 60_000;

export function PullToRefresh() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = getScrollContainer();
    const indicator = indicatorRef.current;
    if (!container || !indicator) return;

    const refresh = () => startRefresh(() => router.refresh());

    let touching = false;
    let armed = false;

    const paint = (progress: number) => {
      indicator.style.opacity = String(progress);
      const scale = 0.7 + 0.3 * progress;
      indicator.style.transform = `translate3d(-50%, ${progress * 8}px, 0) scale(${scale}) rotate(${progress * 240}deg)`;
      if (armed) indicator.dataset.armed = "";
      else delete indicator.dataset.armed;
    };

    // Written straight to the DOM: this runs on every scroll frame of the bounce.
    const track = () => {
      const pull = Math.max(0, -container.scrollTop);
      if (touching) armed = pull >= PULL_THRESHOLD;
      paint(Math.min(1, pull / PULL_THRESHOLD));
    };

    const onTouchStart = () => {
      touching = true;
      armed = false;
    };
    const onTouchEnd = () => {
      touching = false;
      if (!armed) return;
      armed = false;
      // Hand the indicator over to the data-refreshing styles; once the refresh lands it
      // falls back to this resting (hidden) pose.
      paint(0);
      refresh();
    };

    let hiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > RESUME_REFRESH_AFTER_MS) {
        hiddenAt = 0;
        // Silent, like a native app syncing on launch: no spinner for a refresh the
        // user didn't ask for.
        startTransition(() => router.refresh());
      }
    };

    container.addEventListener("scroll", track, { passive: true });
    container.addEventListener("touchmove", track, { passive: true });
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      container.removeEventListener("scroll", track);
      container.removeEventListener("touchmove", track);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router]);

  return (
    // Fixed (not inside the scroll content) so it sits in the gap the bouncing header leaves.
    <div
      ref={indicatorRef}
      aria-hidden
      data-refreshing={refreshing ? "" : undefined}
      className={cn(
        "pointer-events-none fixed top-[calc(env(safe-area-inset-top)+0.75rem)] left-1/2 z-30 grid size-9 place-items-center rounded-full bg-card text-muted-foreground opacity-0 shadow-sm ring-1 ring-foreground/5",
        "transition-colors duration-150 data-armed:text-primary",
        "data-refreshing:text-primary data-refreshing:opacity-100! data-refreshing:[transform:translate3d(-50%,8px,0)]!",
      )}
      style={{ transform: "translate3d(-50%, 0, 0) scale(0.7)" }}
    >
      <RotateCw
        className={cn("size-4", refreshing && "animate-spin")}
        strokeWidth={2.4}
      />
    </div>
  );
}

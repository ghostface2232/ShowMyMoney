// iOS navigation chrome around the app-shell scroll container. Once the large header title
// scrolls away, a compact title bar fades in over a scroll edge effect (HIG: large titles
// collapse to a standard title; floating controls sit on a soft blur, not a solid bar).
// Tapping it scrolls back to the top, standing in for the status-bar tap that can't reach
// an inner scroll container. A matching bottom edge keeps content legible under the
// floating tab bar.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { APP_HEADER_ID, getScrollContainer } from "@/lib/scroll-memory";
import { cn } from "@/lib/utils";

// Compact bar height (UIKit standard navigation bar).
const BAR_HEIGHT = 44;

function titleFor(pathname: string): string {
  return pathname.startsWith("/expenses") ? "지출" : "자산";
}

export function ScrollEdgeChrome() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const container = getScrollContainer();
    const header = document.getElementById(APP_HEADER_ID);
    if (!container || !header) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry.isIntersecting),
      // The header counts as gone once it has slid fully under the compact bar.
      { root: container, rootMargin: `-${BAR_HEIGHT}px 0px 0px 0px` },
    );
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        data-slot="scroll-edge-top"
        aria-hidden={!collapsed}
        className={cn(
          "fixed inset-x-0 top-0 z-30 transition-opacity duration-200 ease-out",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Scroll edge effect: a blur that fades out downward instead of a hard-edged bar. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[calc(env(safe-area-inset-top)+4.25rem)] bg-background/70 backdrop-blur-xl backdrop-saturate-150 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
        />
        <button
          type="button"
          tabIndex={collapsed ? 0 : -1}
          onClick={() =>
            getScrollContainer()?.scrollTo({ top: 0, behavior: "smooth" })
          }
          aria-label={`${titleFor(pathname)} 맨 위로 이동`}
          className="relative mx-auto flex w-full max-w-7xl items-center justify-center px-16 pt-[env(safe-area-inset-top)] text-[17px] font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          style={{ height: `calc(env(safe-area-inset-top) + ${BAR_HEIGHT}px)` }}
        >
          {titleFor(pathname)}
        </button>
      </div>
      <div
        aria-hidden
        data-slot="scroll-edge-bottom"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(max(env(safe-area-inset-bottom),1rem)+4.5rem)]"
        style={{
          background:
            "linear-gradient(to top, oklch(from var(--background) l c h / 0.85), oklch(from var(--background) l c h / 0))",
        }}
      />
    </>
  );
}

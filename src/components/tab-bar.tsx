// Floating pill-shaped bottom tab bar (iOS style) for switching between the asset and expense pages.
// Rendered in the root layout OUTSIDE MotionShell: its animated transform would otherwise
// become the containing block for position: fixed, pinning the bar to page content instead of the viewport.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ReceiptText, Wallet, type LucideIcon } from "lucide-react";

import { getScrollContainer, saveScrollPosition } from "@/lib/scroll-memory";
import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/", label: "자산", icon: Wallet },
  { href: "/expenses", label: "지출", icon: ReceiptText },
];

// Routes without the tab bar: auth screens and the offline fallback (tabs can't load offline).
const HIDDEN_ROUTES = ["/login", "/signup", "/~offline"];

function tabHrefOf(pathname: string): string {
  return pathname.startsWith("/expenses") ? "/expenses" : "/";
}

export function TabBar() {
  const pathname = usePathname();
  // The tapped tab lights up immediately instead of waiting for the route to commit.
  // Cleared as soon as the pathname moves (or the tap turns out to be a no-op).
  const [pending, setPending] = useState<{ href: string; from: string } | null>(
    null,
  );
  if (pending && pending.from !== pathname) setPending(null);

  if (HIDDEN_ROUTES.some((route) => pathname.startsWith(route))) return null;

  const activeHref = pending?.href ?? tabHrefOf(pathname);
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.href === activeHref),
  );

  return (
    <nav
      aria-label="페이지 전환"
      data-slot="tab-bar"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      {/* Translucent glass: low-alpha fill + heavy backdrop blur/saturation so content
          scrolling underneath stays visible through the bar (iOS tab bar feel).
          Equal grid columns let the indicator move with pure CSS: a compositor-driven
          transform transition keeps gliding even while the next page mounts. */}
      <div className="pointer-events-auto relative grid grid-cols-2 gap-1.5 rounded-full border border-border/50 bg-background/30 p-2 shadow-lg shadow-black/10 backdrop-blur-md backdrop-saturate-150">
        <span
          aria-hidden
          className="absolute top-2 bottom-2 left-2 w-[calc((100%-1.375rem)/2)] rounded-full bg-primary transition-transform duration-[380ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
          style={{
            transform: `translateX(calc(${activeIndex} * (100% + 0.375rem)))`,
          }}
        />
        {TABS.map((tab) => {
          const active = tab.href === activeHref;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              // Full prefetch (data included, not just the loading boundary) so the
              // other tab is already in the router cache before the first switch.
              prefetch={true}
              // Scroll is handled by scroll-memory: each tab keeps its own offset
              // instead of jumping to the top on every switch.
              scroll={false}
              onClick={(event) => {
                // iOS convention: tapping the selected tab scrolls its content to the top.
                // (The status-bar tap can't reach the app-shell scroll container.)
                if (active) {
                  event.preventDefault();
                  getScrollContainer()?.scrollTo({ top: 0, behavior: "smooth" });
                  return;
                }
                saveScrollPosition(pathname);
                const plainClick =
                  event.button === 0 &&
                  !event.metaKey &&
                  !event.ctrlKey &&
                  !event.shiftKey &&
                  !event.altKey;
                if (plainClick) {
                  setPending({ href: tab.href, from: pathname });
                }
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-medium",
                "transition-[color,scale] duration-200 ease-out active:scale-[0.96]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className="relative size-5.5"
                strokeWidth={active ? 2.4 : 2}
                aria-hidden
              />
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

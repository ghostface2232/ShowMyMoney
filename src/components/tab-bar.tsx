// Floating pill-shaped bottom tab bar (iOS style) for switching between the asset and expense pages.
// Rendered in the root layout OUTSIDE MotionShell: its animated transform/will-change would otherwise
// become the containing block for position: fixed, pinning the bar to page content instead of the viewport.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ReceiptText, Wallet, type LucideIcon } from "lucide-react";

import { SPRING_DEFAULT } from "@/lib/motion";
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

const AUTH_ROUTES = ["/login", "/signup"];

export function TabBar() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  if (AUTH_ROUTES.some((route) => pathname.startsWith(route))) return null;

  return (
    <nav
      aria-label="페이지 전환"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      {/* Translucent glass: low-alpha fill + heavy backdrop blur/saturation so content
          scrolling underneath stays visible through the bar (iOS tab bar feel). */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/50 bg-background/50 p-2 shadow-lg shadow-black/10 backdrop-blur-2xl backdrop-saturate-150">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              // Full prefetch (data included, not just the loading boundary) so the
              // other tab is already in the router cache before the first switch.
              prefetch={true}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-7 py-3.5 text-base font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  layoutId="tab-bar-pill"
                  transition={reducedMotion ? { duration: 0 } : SPRING_DEFAULT}
                  className="absolute inset-0 rounded-full bg-primary"
                  style={{ willChange: "transform" }}
                />
              ) : null}
              <Icon className="relative size-6" aria-hidden />
              <span className="relative">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

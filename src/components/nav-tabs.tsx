// Asset/expense page switcher tabs in the header. The active pill shares a layoutId for a smooth slide.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { SPRING_DEFAULT } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "자산" },
  { href: "/expenses", label: "지출" },
] as const;

export function NavTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <nav
      aria-label="페이지 전환"
      className={cn("flex rounded-full bg-muted p-1", className)}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex-1 rounded-full px-4 py-1 text-center text-sm font-medium transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                aria-hidden
                layoutId="nav-tab-pill"
                transition={reducedMotion ? { duration: 0 } : SPRING_DEFAULT}
                className="absolute inset-0 rounded-full bg-background shadow-sm"
                style={{ willChange: "transform" }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

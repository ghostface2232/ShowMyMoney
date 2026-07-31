// Segmented control for the expense view scope (all / per member / shared).
// A dedicated filter control, separate from the summary cards which are display-only.
// The active thumb slides between segments via a shared layout animation.
"use client";

import { motion, useReducedMotion } from "motion/react";

import { SCOPE_ALL, SCOPE_SHARED } from "@/lib/expense-scope";
import { SPRING_DEFAULT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/db";

type Segment = {
  key: string;
  label: string;
  dotColor?: string;
};

type Props = {
  members: Member[];
  scope: string;
  onScopeChange: (scope: string) => void;
};

export function ExpenseScopeSegments({ members, scope, onScopeChange }: Props) {
  const reducedMotion = useReducedMotion();

  const segments: Segment[] = [
    { key: SCOPE_ALL, label: "전체" },
    ...members.map((member) => ({
      key: member.id,
      label: member.name,
      dotColor: `var(--${member.color})`,
    })),
    {
      key: SCOPE_SHARED,
      label: "공용",
      dotColor: "var(--muted-foreground)",
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="지출 범위 선택"
      className="flex w-full rounded-full bg-muted/70 p-1"
    >
      {segments.map((segment) => {
        const active = scope === segment.key;
        return (
          <button
            key={segment.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onScopeChange(segment.key)}
            className={cn(
              "relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 py-2 text-[13px] font-medium",
              "transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {active ? (
              <motion.span
                aria-hidden
                layoutId="expense-scope-thumb"
                transition={reducedMotion ? { duration: 0 } : SPRING_DEFAULT}
                className="absolute inset-0 rounded-full bg-card shadow-xs ring-1 ring-foreground/5"
                style={{ willChange: "transform" }}
              />
            ) : null}
            {segment.dotColor ? (
              <span
                aria-hidden
                className="relative inline-block size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.dotColor }}
              />
            ) : null}
            <span className="relative truncate">{segment.label}</span>
          </button>
        );
      })}
    </div>
  );
}

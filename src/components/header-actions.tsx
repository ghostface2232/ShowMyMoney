// Right side of the persistent header. Both action sets (asset and expense tools) stay
// mounted in the same grid cell and only swap opacity, so the header height never
// changes between tabs — a height jump here would shift the whole page mid-transition.
"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

import { ExpenseManagementDialog } from "@/components/expense-management-dialog";
import { GoalDialog } from "@/components/goal-dialog";
import { MonthManagementButton } from "@/components/month-management-button";
import { DURATION_FAST, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ExpenseCategory, Goal, Member } from "@/types/db";

type Props = {
  snapshots: Array<{ id: string; year_month: number }>;
  goals: Goal[];
  currentTotalAssets: number;
  hasSnapshot: boolean;
  members: Member[];
  categories: ExpenseCategory[];
};

export function HeaderActions({
  snapshots,
  goals,
  currentTotalAssets,
  hasSnapshot,
  members,
  categories,
}: Props) {
  const pathname = usePathname();
  const isExpenses = pathname.startsWith("/expenses");

  return (
    <div className="grid shrink-0 justify-items-end">
      <ActionSet active={!isExpenses}>
        <MonthManagementButton snapshots={snapshots} />
        <GoalDialog
          goals={goals}
          currentTotalAssets={currentTotalAssets}
          hasSnapshot={hasSnapshot}
        />
      </ActionSet>
      <ActionSet active={isExpenses} center>
        <ExpenseManagementDialog members={members} categories={categories} />
      </ActionSet>
    </div>
  );
}

function ActionSet({
  active,
  center,
  children,
}: {
  active: boolean;
  center?: boolean;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: DURATION_FAST, ease: EASE_OUT }
      }
      aria-hidden={!active}
      inert={!active}
      className={cn(
        "col-start-1 row-start-1 grid grid-cols-1 gap-2",
        center && "self-center",
        !active && "pointer-events-none",
      )}
    >
      {children}
    </motion.div>
  );
}

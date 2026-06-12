// Right side of the persistent header. Swaps between asset tools (month management /
// goal analysis) and expense tools (member/category management) by the active tab,
// with a quick crossfade instead of remounting the whole header.
"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { ExpenseManagementDialog } from "@/components/expense-management-dialog";
import { GoalDialog } from "@/components/goal-dialog";
import { MonthManagementButton } from "@/components/month-management-button";
import { DURATION_FAST, EASE_OUT } from "@/lib/motion";
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
  const reducedMotion = useReducedMotion();
  const isExpenses = pathname.startsWith("/expenses");

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={isExpenses ? "expenses" : "assets"}
        initial={reducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: DURATION_FAST, ease: EASE_OUT }
        }
        className="grid shrink-0 grid-cols-1 gap-2"
      >
        {isExpenses ? (
          <ExpenseManagementDialog members={members} categories={categories} />
        ) : (
          <>
            <MonthManagementButton snapshots={snapshots} />
            <GoalDialog
              goals={goals}
              currentTotalAssets={currentTotalAssets}
              hasSnapshot={hasSnapshot}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

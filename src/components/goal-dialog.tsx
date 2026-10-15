// Goal analysis Dialog. Shows the current total assets prominently at the top, and per-goal progress, required monthly savings, and status. Creates/edits via an inline form and confirms deletion with an AlertDialog.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createGoal, deleteGoal, updateGoal } from "@/actions/goals";
import { CountUp } from "@/components/count-up";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { amountDigits, formatAmountInput, formatKRW } from "@/lib/format";
import {
  monthsUntil,
  progressPct,
  requiredMonthlySavings,
  statusOf,
  type GoalStatus,
} from "@/lib/goal-math";
import { SPRING_SOFT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types/db";

type Props = {
  goals: Goal[];
  currentTotalAssets: number;
  hasSnapshot: boolean;
};

type Draft = { label: string; amount: string; date: string };

const EMPTY_DRAFT: Draft = { label: "", amount: "", date: "" };

export function GoalDialog({ goals, currentTotalAssets, hasSnapshot }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : SPRING_SOFT;

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; label: string } | null
  >(null);
  // Guard to prevent overflow-y-auto from briefly showing a scrollbar during the layout animation.
  const [isAnimating, setIsAnimating] = useState(false);

  // Re-read on every open: the header stays mounted for the app's lifetime, so a date
  // captured once would go stale across midnight or a month boundary.
  const [today, setToday] = useState(() => new Date());

  function resetForm() {
    setCreating(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function startCreating() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setCreating(true);
  }

  function startEditing(goal: Goal) {
    setCreating(false);
    setDraft({
      label: goal.label,
      amount: String(goal.target_amount),
      date: goal.target_date,
    });
    setEditingId(goal.id);
  }

  // Returns whether the goal was saved, so the sheet's ✓ knows it may close.
  async function submit(
    mode: "create" | "update",
    goalId?: string,
  ): Promise<boolean> {
    const label = draft.label.trim();
    const amount = Number(draft.amount.replace(/\D/g, ""));
    const date = draft.date;

    if (!label) {
      toast.error("라벨을 입력하세요.");
      return false;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("목표 금액은 0보다 커야 합니다.");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      toast.error("목표일을 입력하세요.");
      return false;
    }

    const result =
      mode === "create"
        ? await createGoal(label, amount, date)
        : await updateGoal(goalId!, label, amount, date);

    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    resetForm();
    startTransition(() => router.refresh());
    return true;
  }

  // The open goal form (if any) drives the sheet bar: ✓ is live only for a complete,
  // changed draft, and closing with a touched draft asks before discarding.
  const editingGoal = editingId
    ? goals.find((goal) => goal.id === editingId)
    : undefined;
  const formOpen = creating || editingGoal !== undefined;
  const formDirty = creating
    ? draft.label.trim() !== "" || draft.amount !== "" || draft.date !== ""
    : editingGoal !== undefined &&
      (draft.label.trim() !== editingGoal.label ||
        draft.amount !== String(editingGoal.target_amount) ||
        draft.date !== editingGoal.target_date);
  const formValid =
    draft.label.trim() !== "" &&
    Number(draft.amount) > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(draft.date);

  // Sheet bar ✓: commits the open goal form (staying open if it's invalid), then closes.
  async function confirm() {
    if (creating && !(await submit("create"))) return;
    if (editingId && !(await submit("update", editingId))) return;
    setOpen(false);
    resetForm();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    const result = await deleteGoal(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setToday(new Date());
          if (!next) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-26 justify-start gap-2.5 border-transparent bg-card text-foreground shadow-xs ring-1 ring-foreground/5 hover:bg-card/70 aria-expanded:bg-muted/70"
          >
            <Target className="size-4" />
            목표 분석
          </Button>
        </DialogTrigger>
        <DialogContent
          className="overflow-hidden sm:max-h-[calc(100vh-2rem)] sm:max-w-lg"
          onConfirm={() => void confirm()}
          confirmDisabled={pending || !(formOpen && formDirty && formValid)}
          discardGuard={formOpen && formDirty}
        >
          <DialogHeader>
            <DialogTitle>목표 분석</DialogTitle>
            <DialogDescription>
              현재 자산과 목표를 비교해 매월 필요한 저축액을 계산합니다.
            </DialogDescription>
          </DialogHeader>

          <motion.div
            layout
            transition={transition}
            onLayoutAnimationStart={() => setIsAnimating(true)}
            onLayoutAnimationComplete={() => setIsAnimating(false)}
            className={cn(
              "flex min-h-0 flex-col gap-5 pr-1",
              isAnimating ? "overflow-hidden" : "overflow-y-auto",
            )}
          >
            <CurrentAssetsHeader
              hasSnapshot={hasSnapshot}
              currentTotalAssets={currentTotalAssets}
            />

            <section className="flex flex-col gap-3">
              {goals.length === 0 && !creating ? (
                <EmptyGoals />
              ) : (
                <motion.ul layout transition={transition} className="flex flex-col gap-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {goals.map((goal) =>
                      editingId === goal.id ? (
                        <motion.li
                          key={goal.id}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={transition}
                          style={{ willChange: "transform, opacity" }}
                        >
                          <GoalForm
                            draft={draft}
                            setDraft={setDraft}
                            pending={pending}
                            onCancel={resetForm}
                            onSubmit={() => submit("update", goal.id)}
                            today={today}
                          />
                        </motion.li>
                      ) : (
                        <motion.li
                          key={goal.id}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={transition}
                          style={{ willChange: "transform, opacity" }}
                          className="overflow-hidden"
                        >
                          <GoalItem
                            goal={goal}
                            currentTotal={currentTotalAssets}
                            hasSnapshot={hasSnapshot}
                            pending={pending}
                            today={today}
                            onEdit={() => startEditing(goal)}
                            onDelete={() =>
                              setDeleteTarget({ id: goal.id, label: goal.label })
                            }
                          />
                        </motion.li>
                      ),
                    )}
                  </AnimatePresence>
                </motion.ul>
              )}

              <AnimatePresence initial={false} mode="popLayout">
                {creating ? (
                  <motion.div
                    key="creating"
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={transition}
                  >
                    <GoalForm
                      draft={draft}
                      setDraft={setDraft}
                      pending={pending}
                      onCancel={resetForm}
                      onSubmit={() => submit("create")}
                      today={today}
                    />
                  </motion.div>
                ) : (
                  <motion.button
                    key="add-button"
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={transition}
                    type="button"
                    onClick={startCreating}
                    disabled={pending}
                    className="inline-flex h-7 w-fit cursor-pointer items-center gap-1 self-start rounded-full px-2 text-sm text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Plus className="size-3.5" />
                    새 목표 추가
                  </motion.button>
                )}
              </AnimatePresence>
            </section>
          </motion.div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>목표 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.label}" 목표가 삭제됩니다.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CurrentAssetsHeader({
  hasSnapshot,
  currentTotalAssets,
}: {
  hasSnapshot: boolean;
  currentTotalAssets: number;
}) {
  if (!hasSnapshot) {
    return (
      <div className="squircle rounded-2xl border border-dashed bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
        월별 기록을 추가하면 달성률을 계산합니다
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">현재 총자산</span>
      <CountUp
        value={currentTotalAssets}
        format={formatKRW}
        className="font-heading text-3xl font-semibold tabular-nums"
      />
    </div>
  );
}

function EmptyGoals() {
  return (
    <div className="squircle rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
      목표가 없습니다
    </div>
  );
}

function GoalItem({
  goal,
  currentTotal,
  hasSnapshot,
  pending,
  today,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  currentTotal: number;
  hasSnapshot: boolean;
  pending: boolean;
  today: Date;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const months = monthsUntil(goal.target_date, today);
  const status = statusOf(
    goal.target_amount,
    hasSnapshot ? currentTotal : 0,
    goal.target_date,
    today,
  );
  const pct = hasSnapshot
    ? progressPct(currentTotal, goal.target_amount)
    : 0;
  const required = requiredMonthlySavings(
    goal.target_amount,
    hasSnapshot ? currentTotal : 0,
    months,
  );
  const overdue = status === "overdue";
  // Past the deadline there are no months left to spread the gap over.
  const showRequired = hasSnapshot && status === "on-track";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 squircle rounded-2xl border bg-card p-4",
        status === "overdue" && "border-destructive/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-base font-medium">{goal.label}</span>
            <StatusBadge status={status} />
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {formatKRW(goal.target_amount)} · {goal.target_date}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            disabled={pending}
            aria-label={`${goal.label} 편집`}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            disabled={pending}
            aria-label={`${goal.label} 삭제`}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <ProgressBar pct={pct} status={status} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
        <span>
          <span className="font-medium text-foreground">
            {hasSnapshot ? `${Math.round(pct)}%` : "—"}
          </span>{" "}
          달성
        </span>
        <span aria-hidden>·</span>
        {overdue ? (
          <span className="font-medium text-negative">기한 지남</span>
        ) : (
          <span>
            <span className="font-medium text-foreground">{months}</span>개월 남음
          </span>
        )}
        {showRequired ? (
          <>
            <span aria-hidden>·</span>
            <span>
              월{" "}
              <span className="font-medium text-foreground">
                {formatKRW(Math.max(0, required))}
              </span>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: GoalStatus }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          status === "reached" && "bg-positive",
          status === "overdue" && "bg-negative",
          status === "on-track" && "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, { text: string; className: string }> = {
    reached: { text: "달성", className: "bg-positive/10 text-positive" },
    overdue: {
      text: "기한 경과",
      className: "bg-negative/10 text-negative",
    },
    "on-track": {
      text: "진행 중",
      className: "bg-muted text-muted-foreground",
    },
  };
  const { text, className } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        className,
      )}
    >
      {text}
    </span>
  );
}

function GoalForm({
  draft,
  setDraft,
  pending,
  onCancel,
  onSubmit,
  today,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  pending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  today: Date;
}) {
  const datePast = draft.date !== "" && isPastDate(draft.date, today);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        onSubmit();
      }}
      className="flex flex-col gap-2 squircle rounded-2xl border bg-card p-4"
    >
      <Input
        autoFocus
        value={draft.label}
        onChange={(event) =>
          setDraft({ ...draft, label: event.target.value })
        }
        placeholder="목표 이름"
        maxLength={40}
        disabled={pending}
      />
      <Input
        inputMode="numeric"
        value={formatAmountInput(draft.amount)}
        onChange={(event) =>
          setDraft({
            ...draft,
            amount: amountDigits(event.target.value),
          })
        }
        placeholder="목표 금액"
        disabled={pending}
      />
      <Input
        type="date"
        value={draft.date}
        onChange={(event) => setDraft({ ...draft, date: event.target.value })}
        disabled={pending}
      />
      {datePast ? (
        <span className="text-[11px] text-destructive">
          지난 날짜입니다
        </span>
      ) : null}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={pending}
        >
          취소
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          저장
        </Button>
      </div>
    </form>
  );
}

function isPastDate(value: string, now: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const target = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return target.getTime() < startOfToday.getTime();
}

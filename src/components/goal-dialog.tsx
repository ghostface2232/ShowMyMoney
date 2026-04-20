// 목표 분석 Dialog. 상단에 현재 총자산을 크게 표시하고, 목표별로 달성률·필요 월 저축액·상태를 보여준다. 인라인 폼으로 생성/수정하고 AlertDialog로 삭제 확인한다.
"use client";

import { useMemo, useState, useTransition } from "react";
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
import { formatKRW } from "@/lib/format";
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

  const today = useMemo(() => new Date(), []);

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

  async function submit(mode: "create" | "update", goalId?: string) {
    const label = draft.label.trim();
    const amount = Number(draft.amount.replace(/\D/g, ""));
    const date = draft.date;

    if (!label) return toast.error("라벨을 입력하세요.");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("목표 금액은 0보다 커야 합니다.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return toast.error("목표일을 입력하세요.");

    const result =
      mode === "create"
        ? await createGoal(label, amount, date)
        : await updateGoal(goalId!, label, amount, date);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    resetForm();
    startTransition(() => router.refresh());
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
          if (!next) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-26 justify-start gap-2.5 border-transparent bg-white text-foreground hover:bg-white/70 aria-expanded:bg-white/70"
          >
            <Target className="size-4" />
            목표 분석
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>목표 분석</DialogTitle>
            <DialogDescription>
              현재 자산과 목표를 비교해 매월 필요한 저축액을 계산합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
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
          </div>
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
                ? `"${deleteTarget.label}" 목표가 삭제됩니다. 되돌릴 수 없습니다.`
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
      <div className="rounded-2xl border border-dashed bg-muted/40 px-4 py-5 text-center text-sm text-muted-foreground">
        기록이 먼저 필요합니다. 첫 달을 추가하면 목표 달성률을 계산할 수 있습니다.
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
    <div className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground">
      아직 목표가 없습니다. 첫 목표를 추가해 보세요.
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
  const showRequired = hasSnapshot && status !== "reached";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-card p-4",
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
        <span>
          <span className="font-medium text-foreground">{months}</span>개월 남음
        </span>
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
          "h-full rounded-full transition-[width] duration-300",
          status === "reached" && "bg-chart-2",
          status === "overdue" && "bg-destructive",
          status === "on-track" && "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, { text: string; className: string }> = {
    reached: { text: "달성", className: "bg-chart-2/10 text-chart-2" },
    overdue: {
      text: "기한 경과",
      className: "bg-destructive/10 text-destructive",
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
      className="flex flex-col gap-2 rounded-2xl border bg-card p-4"
    >
      <Input
        autoFocus
        value={draft.label}
        onChange={(event) =>
          setDraft({ ...draft, label: event.target.value })
        }
        placeholder="목표 이름 (예: 올해 목표)"
        maxLength={40}
        disabled={pending}
      />
      <Input
        inputMode="numeric"
        value={draft.amount}
        onChange={(event) =>
          setDraft({
            ...draft,
            amount: event.target.value.replace(/\D/g, ""),
          })
        }
        placeholder="목표 금액 (원)"
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
          지난 날짜입니다. 그대로 저장할 수 있지만 기한 경과로 표시됩니다.
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

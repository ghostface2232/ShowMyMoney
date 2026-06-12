// Expense composer (continuous entry) and edit dialog sharing the same form fields.
// Mutations are applied optimistically by the parent view, so submit handlers are synchronous.
"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Trash2 } from "lucide-react";

import { seedDefaultExpenseCategories } from "@/actions/expense-categories";
import type { ExpenseInput } from "@/actions/expenses";
import type { RunExpenseAction } from "@/components/expense-view";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SCOPE_SHARED } from "@/lib/expense-scope";
import { DURATION_FAST, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Expense, ExpenseCategory, Member } from "@/types/db";

type Draft = {
  amountText: string;
  categoryId: string | null;
  memberKey: string; // SCOPE_SHARED or a member id
  spentOn: string;
  memo: string;
};

function draftToInput(draft: Draft): ExpenseInput | null {
  const amount = Number(draft.amountText);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.spentOn)) return null;
  return {
    amount,
    categoryId: draft.categoryId,
    memberId: draft.memberKey === SCOPE_SHARED ? null : draft.memberKey,
    spentOn: draft.spentOn,
    memo: draft.memo,
  };
}

type ComposerProps = {
  categories: ExpenseCategory[];
  members: Member[];
  defaultMemberKey: string;
  defaultDate: string;
  runAction: RunExpenseAction;
  onCreate: (input: ExpenseInput) => void;
};

export function ExpenseComposer({
  categories,
  members,
  defaultMemberKey,
  defaultDate,
  runAction,
  onCreate,
}: ComposerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  function expand() {
    setDraft({
      amountText: "",
      categoryId: draft?.categoryId ?? null,
      memberKey: defaultMemberKey,
      spentOn: defaultDate,
      memo: "",
    });
    setOpen(true);
  }

  function submit() {
    if (!draft) return;
    const input = draftToInput(draft);
    if (!input) return;
    onCreate(input);
    // Keep the form open for batch receipt entry; clear only the amount and memo.
    setDraft({ ...draft, amountText: "", memo: "" });
    amountRef.current?.focus();
  }

  const canSubmit = draft !== null && draftToInput(draft) !== null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open && draft ? (
        <motion.div
          key="form"
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: DURATION_FAST, ease: EASE_OUT }
          }
        >
          <Card className="gap-4 p-4 shadow-none ring-0 sm:p-5">
            <ExpenseFields
              draft={draft}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              categories={categories}
              members={members}
              runAction={runAction}
              amountRef={amountRef}
              onSubmit={submit}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                닫기
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!canSubmit}
                onClick={submit}
              >
                <Plus className="size-4" />
                추가
              </Button>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.button
          key="trigger"
          type="button"
          onClick={expand}
          initial={reducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { duration: DURATION_FAST, ease: EASE_OUT }
          }
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed py-3 text-sm text-muted-foreground transition-colors",
            "hover:border-foreground/30 hover:text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          )}
        >
          <Plus className="size-4" />
          지출 추가
        </motion.button>
      )}
    </AnimatePresence>
  );
}

type EditDialogProps = {
  expense: Expense | null;
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  onSave: (input: ExpenseInput) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function ExpenseEditDialog({
  expense,
  categories,
  members,
  runAction,
  onSave,
  onDelete,
  onClose,
}: EditDialogProps) {
  return (
    <Dialog
      open={expense !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>지출 수정</DialogTitle>
          <DialogDescription>
            금액, 분류, 누가 쓴 지출인지 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>
        {expense ? (
          <ExpenseEditBody
            key={expense.id}
            expense={expense}
            categories={categories}
            members={members}
            runAction={runAction}
            onSave={onSave}
            onDelete={onDelete}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseEditBody({
  expense,
  categories,
  members,
  runAction,
  onSave,
  onDelete,
  onClose,
}: {
  expense: Expense;
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  onSave: (input: ExpenseInput) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    amountText: String(Number(expense.amount)),
    categoryId: expense.category_id,
    memberKey: expense.member_id ?? SCOPE_SHARED,
    spentOn: expense.spent_on,
    memo: expense.memo ?? "",
  });

  function save() {
    const input = draftToInput(draft);
    if (!input) return;
    onSave(input);
    onClose();
  }

  function remove() {
    onDelete();
    onClose();
  }

  const canSave = draftToInput(draft) !== null;

  return (
    <div className="flex flex-col gap-4">
      <ExpenseFields
        draft={draft}
        onChange={(patch) => setDraft({ ...draft, ...patch })}
        categories={categories}
        members={members}
        runAction={runAction}
        onSubmit={save}
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
          삭제
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button type="button" size="sm" disabled={!canSave} onClick={save}>
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpenseFields({
  draft,
  onChange,
  categories,
  members,
  runAction,
  amountRef,
  onSubmit,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  amountRef?: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          ref={amountRef}
          autoFocus
          inputMode="numeric"
          type="text"
          value={draft.amountText}
          onChange={(event) =>
            onChange({ amountText: event.target.value.replace(/\D/g, "") })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="금액 (원)"
          maxLength={13}
          className="flex-1 text-right tabular-nums"
        />
        <Input
          type="date"
          value={draft.spentOn}
          onChange={(event) => onChange({ spentOn: event.target.value })}
          className="w-36 shrink-0"
        />
      </div>

      <FieldGroup label="카테고리">
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={draft.categoryId === category.id}
                onClick={() =>
                  onChange({
                    categoryId:
                      draft.categoryId === category.id ? null : category.id,
                  })
                }
              >
                {category.name}
              </Chip>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              아직 카테고리가 없습니다.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runAction(() => seedDefaultExpenseCategories())}
            >
              <Plus className="size-4" />
              기본 카테고리 채우기
            </Button>
          </div>
        )}
      </FieldGroup>

      <FieldGroup label="누구">
        <div className="flex flex-wrap gap-1.5">
          <Chip
            selected={draft.memberKey === SCOPE_SHARED}
            onClick={() => onChange({ memberKey: SCOPE_SHARED })}
          >
            공용
          </Chip>
          {members.map((member) => (
            <Chip
              key={member.id}
              selected={draft.memberKey === member.id}
              onClick={() => onChange({ memberKey: member.id })}
            >
              <span
                aria-hidden
                className="inline-block size-2 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--${member.color})` }}
              />
              {member.name}
            </Chip>
          ))}
        </div>
      </FieldGroup>

      <Input
        value={draft.memo}
        onChange={(event) => onChange({ memo: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="메모 (선택)"
        maxLength={80}
      />
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="px-1 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "border-transparent bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

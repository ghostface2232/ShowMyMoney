// Expense composer (continuous entry) and edit dialog sharing the same form fields.
// Mutations are applied optimistically by the parent view, so submit handlers are synchronous.
"use client";

import { useEffect, useRef, useState } from "react";
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
import { getCategoryVisual } from "@/lib/category-visual";
import { amountDigits, formatAmountInput } from "@/lib/format";
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

  // popLayout (not "wait"): the form must mount inside the tap itself. iOS only raises the
  // keyboard for a focus() that happens during a user gesture, so an autoFocus that fires
  // after an exit animation leaves the field focused with no keyboard.
  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
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
            {/* Concentric with the capsule amount field in its corner: field radius 20
                (h-10) + 16px padding (20px on sm+). */}
            <Card className="gap-4 rounded-[2.25rem] p-4 shadow-none ring-0 sm:rounded-[2.5rem] sm:p-5">
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
              "flex w-full cursor-pointer items-center gap-3 squircle rounded-4xl bg-card p-3 text-left text-sm font-medium text-muted-foreground transition-[color,scale] duration-150 ease-out active:scale-[0.97]",
              "hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            )}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Plus className="size-[18px]" strokeWidth={2.2} />
            </span>
            지출 추가
          </motion.button>
        )}
      </AnimatePresence>
    </div>
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
  const [dirty, setDirty] = useState(false);
  const [canSave, setCanSave] = useState(false);
  // The ✓ in the sheet bar saves through the body, which owns the draft.
  const saveRef = useRef<(() => void) | null>(null);

  return (
    <Dialog
      open={expense !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onConfirm={() => saveRef.current?.()}
        // ✓ lights up only when an edit would actually be saved; untouched or invalid
        // drafts leave it neutral, and closing with edits asks before discarding (HIG).
        confirmDisabled={!(dirty && canSave)}
        confirmLabel="저장"
        discardGuard={dirty}
      >
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
            onDirtyChange={setDirty}
            onCanSaveChange={setCanSave}
            saveRef={saveRef}
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
  onDirtyChange,
  onCanSaveChange,
  saveRef,
}: {
  expense: Expense;
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  onSave: (input: ExpenseInput) => void;
  onDelete: () => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onCanSaveChange: (canSave: boolean) => void;
  saveRef: React.RefObject<(() => void) | null>;
}) {
  const [initial] = useState<Draft>(() => ({
    amountText: String(Math.round(Number(expense.amount))),
    categoryId: expense.category_id,
    memberKey: expense.member_id ?? SCOPE_SHARED,
    spentOn: expense.spent_on,
    memo: expense.memo ?? "",
  }));
  const [draft, setDraft] = useState<Draft>(initial);

  const dirty =
    draft.amountText !== initial.amountText ||
    draft.categoryId !== initial.categoryId ||
    draft.memberKey !== initial.memberKey ||
    draft.spentOn !== initial.spentOn ||
    draft.memo !== initial.memo;
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  // A closed (or replaced) editor leaves nothing to protect.
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

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
  useEffect(() => {
    onCanSaveChange(canSave);
  }, [canSave, onCanSaveChange]);
  // Keep the sheet bar's ✓ pointed at the latest draft.
  useEffect(() => {
    saveRef.current = save;
  });

  return (
    <div className="flex flex-col gap-4">
      <ExpenseFields
        draft={draft}
        onChange={(patch) => setDraft({ ...draft, ...patch })}
        categories={categories}
        members={members}
        runAction={runAction}
        onSubmit={save}
        // On phones the edit sheet opens like a native detail sheet — without throwing the
        // keyboard over it; the user taps the field they actually want to change.
        autoFocusAmount={!prefersTouch()}
      />
      {/* Cancel/save live in the sheet bar (X / ✓); delete stays as the one in-content
          action, a full-width destructive row like iOS detail sheets. */}
      <Button
        type="button"
        variant="ghost"
        onClick={remove}
        className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
        지출 삭제
      </Button>
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
  autoFocusAmount = true,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  categories: ExpenseCategory[];
  members: Member[];
  runAction: RunExpenseAction;
  amountRef?: React.RefObject<HTMLInputElement | null>;
  onSubmit: () => void;
  autoFocusAmount?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          ref={amountRef}
          autoFocus={autoFocusAmount}
          inputMode="numeric"
          type="text"
          value={formatAmountInput(draft.amountText)}
          onChange={(event) =>
            onChange({ amountText: amountDigits(event.target.value) })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="금액"
          className="h-10 flex-1 text-right text-base font-semibold tabular-nums placeholder:font-normal"
        />
        <Input
          type="date"
          value={draft.spentOn}
          onChange={(event) => onChange({ spentOn: event.target.value })}
          className="h-10 w-36 shrink-0"
        />
      </div>

      <FieldGroup label="카테고리">
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const { icon: Icon, color } = getCategoryVisual(
                category.id,
                category.name,
              );
              const selected = draft.categoryId === category.id;
              return (
                <Chip
                  key={category.id}
                  selected={selected}
                  onClick={() =>
                    onChange({
                      categoryId: selected ? null : category.id,
                    })
                  }
                >
                  <Icon
                    aria-hidden
                    className="size-3.5"
                    style={selected ? undefined : { color }}
                  />
                  {category.name}
                </Chip>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">
              카테고리가 없습니다
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
        placeholder="메모"
        enterKeyHint="done"
        maxLength={80}
      />
    </div>
  );
}

function prefersTouch(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches
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
        // Taller on touch screens so a wrapped grid of chips stays comfortably tappable.
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium pointer-coarse:px-3.5 pointer-coarse:py-2 pointer-coarse:text-[13px]",
        "transition-[background-color,color,border-color,scale] duration-150 ease-out active:scale-[0.96]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        selected
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border/70 bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

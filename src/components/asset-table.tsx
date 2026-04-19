// 월별 자산 테이블. 그룹/항목 인라인 편집, 스냅샷·엔트리 CRUD, 그룹 추가를 한 화면에서 수행한다.
"use client";

import {
  useMemo,
  useState,
  useTransition,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  renameCategory,
  renameGroup,
  type CategoryGroupWithCategories,
} from "@/actions/categories";
import type {
  DashboardData,
  SnapshotWithEntries,
} from "@/actions/dashboard";
import { deleteEntry, upsertEntry } from "@/actions/entries";
import { createSnapshot, deleteSnapshot } from "@/actions/snapshots";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { YearMonthPicker } from "@/components/year-month-picker";
import { formatKRW, formatYearMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/db";

type Props = {
  dashboard: DashboardData;
};

type ActionResult = { ok: true } | { ok: false; error: string };

type DeleteTarget =
  | { kind: "group"; id: string; name: string; categoryCount: number }
  | { kind: "category"; id: string; name: string }
  | { kind: "snapshot"; snapshot: SnapshotWithEntries };

type RunAction = (action: () => Promise<ActionResult>) => Promise<void>;

export function AssetTable({ dashboard }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);

  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 280, damping: 32 };

  const existingYearMonths = useMemo(
    () => new Set(dashboard.snapshots.map((s) => s.year_month)),
    [dashboard.snapshots],
  );

  function refetch() {
    startTransition(() => {
      router.refresh();
    });
  }

  const runAction: RunAction = async (action) => {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    refetch();
  };

  async function addSnapshot(yearMonth: number) {
    await runAction(() => createSnapshot(yearMonth));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await runAction(() => {
      switch (target.kind) {
        case "group":
          return deleteGroup(target.id);
        case "category":
          return deleteCategory(target.id);
        case "snapshot":
          return deleteSnapshot(target.snapshot.id);
      }
    });
  }

  const hasSnapshots = dashboard.snapshots.length > 0;
  const hasGroups = dashboard.categoryTree.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {hasSnapshots ? (
        <>
          {hasGroups ? (
            dashboard.categoryTree.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                snapshots={dashboard.snapshots}
                pending={pending}
                transition={transition}
                runAction={runAction}
                onRequestDelete={setDeleteTarget}
              />
            ))
          ) : (
            <EmptyGroupsHint />
          )}
          <AddGroupRow
            addingGroup={addingGroup}
            setAddingGroup={setAddingGroup}
            runAction={runAction}
            pending={pending}
          />
        </>
      ) : (
        <EmptyState
          existing={existingYearMonths}
          onSelect={addSnapshot}
          disabled={pending}
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getDeleteTitle(deleteTarget)}</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteMessage(deleteTarget)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getDeleteTitle(target: DeleteTarget | null): string {
  switch (target?.kind) {
    case "group":
      return "그룹 삭제";
    case "category":
      return "항목 삭제";
    case "snapshot":
      return "월 기록 삭제";
    default:
      return "";
  }
}

function getDeleteMessage(target: DeleteTarget | null): string {
  if (!target) return "";
  switch (target.kind) {
    case "group":
      return `"${target.name}" 그룹과 하위 ${target.categoryCount}개 항목, 그리고 관련된 모든 금액 기록이 삭제됩니다.`;
    case "category":
      return `"${target.name}" 항목과 관련된 모든 금액 기록이 삭제됩니다.`;
    case "snapshot":
      return `${formatYearMonth(target.snapshot.year_month)}의 모든 금액 기록이 삭제됩니다.`;
  }
}

function EmptyState({
  existing,
  onSelect,
  disabled,
}: {
  existing: Set<number>;
  onSelect: (yearMonth: number) => void;
  disabled: boolean;
}) {
  return (
    <Card className="shadow-none ring-0">
      <CardContent className="flex min-h-60 flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          아직 기록이 없습니다. 첫 달을 추가해 보세요.
        </p>
        <YearMonthPicker
          existing={existing}
          onSelect={onSelect}
          disabled={disabled}
          trigger={
            <Button size="sm" disabled={disabled}>
              <Plus className="size-4" />첫 달 추가
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}

function EmptyGroupsHint() {
  return (
    <Card className="shadow-none ring-0">
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        그룹이 없습니다. 아래에서 새 그룹을 추가해 보세요.
      </CardContent>
    </Card>
  );
}

function AddGroupRow({
  addingGroup,
  setAddingGroup,
  runAction,
  pending,
}: {
  addingGroup: boolean;
  setAddingGroup: (next: boolean) => void;
  runAction: RunAction;
  pending: boolean;
}) {
  if (addingGroup) {
    return (
      <div className="px-1">
        <InlineNameInput
          placeholder="새 그룹 이름"
          disabled={pending}
          onCancel={() => setAddingGroup(false)}
          onSave={(name) => {
            setAddingGroup(false);
            runAction(() => createGroup(name));
          }}
        />
      </div>
    );
  }
  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => setAddingGroup(true)}
        disabled={pending}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <Plus className="size-3.5" />
        새 그룹 추가
      </button>
    </div>
  );
}

type GroupSectionProps = {
  group: CategoryGroupWithCategories;
  snapshots: SnapshotWithEntries[];
  pending: boolean;
  transition: Transition;
  runAction: RunAction;
  onRequestDelete: (target: DeleteTarget) => void;
};

function GroupSection({
  group,
  snapshots,
  pending,
  transition,
  runAction,
  onRequestDelete,
}: GroupSectionProps) {
  const [addingCategory, setAddingCategory] = useState(false);

  const latest = snapshots[0];
  const latestSum = useMemo(() => {
    if (!latest) return 0;
    let total = 0;
    for (const cat of group.categories) {
      total += latest.entriesByCategory[cat.id]?.amount ?? 0;
    }
    return total;
  }, [latest, group.categories]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex min-w-0 items-center gap-1">
          <EditableText
            value={group.name}
            onSave={(next) => runAction(() => renameGroup(group.id, next))}
            disabled={pending}
            textClassName="text-sm font-semibold"
          />
          <InlineDeleteButton
            disabled={pending}
            onClick={() =>
              onRequestDelete({
                kind: "group",
                id: group.id,
                name: group.name,
                categoryCount: group.categories.length,
              })
            }
            label="그룹 삭제"
          />
        </div>
        <div className="shrink-0 text-sm tabular-nums">
          <span className="text-muted-foreground">합계 </span>
          <span className="font-semibold">{formatKRW(latestSum)}</span>
        </div>
      </div>

      <Card className="p-4 shadow-none ring-0">
        <div className="overflow-x-auto">
          <div className="flex min-w-fit">
            <NameColumn
              categories={group.categories}
              disabled={pending}
              runAction={runAction}
              onRequestDelete={onRequestDelete}
            />
            <AnimatePresence mode="popLayout" initial={false}>
              {snapshots.map((snap) => (
                <SnapshotColumn
                  key={snap.id}
                  snapshot={snap}
                  categories={group.categories}
                  disabled={pending}
                  runAction={runAction}
                  transition={transition}
                  onDelete={() =>
                    onRequestDelete({ kind: "snapshot", snapshot: snap })
                  }
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Card>

      <div className="px-1">
        {addingCategory ? (
          <InlineNameInput
            placeholder="새 항목 이름"
            disabled={pending}
            onCancel={() => setAddingCategory(false)}
            onSave={(name) => {
              setAddingCategory(false);
              runAction(() => createCategory(group.id, name));
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingCategory(true)}
            disabled={pending}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus className="size-3.5" />
            항목 추가
          </button>
        )}
      </div>
    </section>
  );
}

type NameColumnProps = {
  categories: Category[];
  disabled: boolean;
  runAction: RunAction;
  onRequestDelete: (target: DeleteTarget) => void;
};

function NameColumn({
  categories,
  disabled,
  runAction,
  onRequestDelete,
}: NameColumnProps) {
  return (
    <div className="sticky left-0 z-10 flex shrink-0 flex-col bg-card pr-6">
      <div className="h-10 border-b" />
      {categories.map((cat, i) => (
        <div
          key={cat.id}
          className={cn(
            "flex h-11 items-center gap-1 text-sm",
            i < categories.length - 1 && "border-b",
          )}
        >
          <EditableText
            value={cat.name}
            onSave={(next) => runAction(() => renameCategory(cat.id, next))}
            disabled={disabled}
          />
          <InlineDeleteButton
            disabled={disabled}
            onClick={() =>
              onRequestDelete({
                kind: "category",
                id: cat.id,
                name: cat.name,
              })
            }
            label="항목 삭제"
          />
        </div>
      ))}
    </div>
  );
}

type SnapshotColumnProps = {
  snapshot: SnapshotWithEntries;
  categories: Category[];
  disabled: boolean;
  runAction: RunAction;
  transition: Transition;
  onDelete: () => void;
};

function SnapshotColumn({
  snapshot,
  categories,
  disabled,
  runAction,
  transition,
  onDelete,
}: SnapshotColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      layout
      transition={transition}
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      exit={{ opacity: 0, width: 0 }}
      className="flex shrink-0 flex-col overflow-hidden pl-6"
    >
      <div className="flex h-10 items-center justify-end gap-0.5 border-b text-xs font-medium text-muted-foreground">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label="이 달 메뉴"
            >
              <MoreHorizontal className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1" align="end">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" />
              이 달 삭제
            </button>
          </PopoverContent>
        </Popover>
        <span className="truncate pr-1">
          {formatYearMonth(snapshot.year_month)}
        </span>
      </div>

      {categories.map((cat, i) => (
        <AmountCell
          key={cat.id}
          snapshotId={snapshot.id}
          categoryId={cat.id}
          entry={snapshot.entriesByCategory[cat.id]}
          disabled={disabled}
          runAction={runAction}
          isLast={i === categories.length - 1}
        />
      ))}
    </motion.div>
  );
}

type AmountCellProps = {
  snapshotId: string;
  categoryId: string;
  entry: SnapshotWithEntries["entriesByCategory"][string] | undefined;
  disabled: boolean;
  runAction: RunAction;
  isLast: boolean;
};

function AmountCell({
  snapshotId,
  categoryId,
  entry,
  disabled,
  runAction,
  isLast,
}: AmountCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const amount = entry?.amount ?? null;

  function start() {
    setDraft(amount !== null ? String(amount) : "");
    setEditing(true);
  }

  async function commit() {
    setEditing(false);
    const raw = draft.replace(/\D/g, "");
    const next = raw.length === 0 ? 0 : Number(raw);
    if (next === amount) return;
    await runAction(() => upsertEntry(snapshotId, categoryId, next));
  }

  function cancel() {
    setEditing(false);
    setDraft("");
  }

  async function remove() {
    if (!entry) {
      setEditing(false);
      return;
    }
    setEditing(false);
    await runAction(() => deleteEntry(entry.id));
  }

  const borderClass = isLast ? "" : "border-b";

  if (editing) {
    return (
      <div
        className={cn(
          "flex h-11 items-center gap-0.5 px-1 ring-1 ring-ring/60 ring-inset",
          borderClass,
        )}
      >
        <input
          autoFocus
          inputMode="numeric"
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            } else if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            }
          }}
          placeholder="0"
          className="h-8 flex-1 bg-transparent px-2 text-right text-sm tabular-nums focus:outline-none"
        />
        {entry ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onMouseDown={(event) => event.preventDefault()}
            onClick={remove}
            className="text-muted-foreground hover:text-destructive"
            aria-label="엔트리 삭제"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      className={cn(
        "flex h-11 items-center justify-end px-3 text-right text-sm tabular-nums transition-colors hover:bg-muted/40 disabled:opacity-60",
        borderClass,
      )}
    >
      {amount !== null ? (
        formatKRW(amount)
      ) : (
        <span className="text-muted-foreground/60">—</span>
      )}
    </button>
  );
}

function EditableText({
  value,
  onSave,
  disabled,
  textClassName,
}: {
  value: string;
  onSave: (next: string) => void;
  disabled: boolean;
  textClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function start() {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (!trimmed || trimmed === value) return;
    onSave(trimmed);
  }

  function cancel() {
    setEditing(false);
    setDraft(value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
        disabled={disabled}
        maxLength={40}
        className={cn(
          "rounded bg-transparent px-1 text-left outline-none ring-1 ring-ring/60 ring-inset",
          textClassName,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled}
      className={cn(
        "max-w-full truncate rounded px-1 text-left transition-colors hover:bg-muted/40 disabled:opacity-50",
        textClassName,
      )}
    >
      {value}
    </button>
  );
}

function InlineDeleteButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      className="shrink-0 text-muted-foreground/50 transition-colors hover:text-destructive"
      aria-label={label}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

function InlineNameInput({
  placeholder,
  onSave,
  onCancel,
  disabled,
}: {
  placeholder: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  disabled: boolean;
}): ReactNode {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    onSave(trimmed);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  }

  return (
    <input
      autoFocus
      type="text"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={40}
      className="rounded bg-transparent px-1 text-left text-sm outline-none ring-1 ring-ring/60 ring-inset placeholder:text-muted-foreground/60"
    />
  );
}

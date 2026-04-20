// 월별 자산 테이블. 그룹별 항목 관리 모달과 금액 입력을 한 화면에서 수행한다.
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
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  renameCategory,
  renameGroup,
  reorderCategories,
  type CategoryGroupWithCategories,
} from "@/actions/categories";
import type {
  DashboardData,
  SnapshotWithEntries,
} from "@/actions/dashboard";
import { deleteEntry, upsertEntry } from "@/actions/entries";
import { createSnapshot } from "@/actions/snapshots";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { YearMonthPicker } from "@/components/year-month-picker";
import { formatKRW, formatYearMonth } from "@/lib/format";
import { DURATION_BASE, EASE_OUT, SPRING_SOFT } from "@/lib/motion";
import type { Category } from "@/types/db";

type Props = {
  dashboard: DashboardData;
};

type ActionResult = { ok: true } | { ok: false; error: string };

type RunAction = (action: () => Promise<ActionResult>) => Promise<void>;

const INPUT_NO_FOCUS_RING =
  "focus-visible:border-transparent focus-visible:ring-0";

type GroupDeleteTarget =
  | { kind: "group"; id: string; name: string; categoryCount: number }
  | { kind: "category"; id: string; name: string };

export function AssetTable({ dashboard }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [addingGroup, setAddingGroup] = useState(false);

  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : SPRING_SOFT;

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

  const hasSnapshots = dashboard.snapshots.length > 0;
  const hasGroups = dashboard.categoryTree.length > 0;

  return (
    <div className="flex flex-col gap-8 pb-8">
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
    </div>
  );
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
    <div className="px-1 pb-4">
      <button
        type="button"
        onClick={() => setAddingGroup(true)}
        disabled={pending}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-white/70 disabled:pointer-events-none disabled:opacity-50"
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
};

function GroupSection({
  group,
  snapshots,
  pending,
  transition,
  runAction,
}: GroupSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-1">
        <h2 className="min-w-0 truncate px-1 text-2xl font-semibold">
          {group.name}
        </h2>
        <GroupManagementDialog
          group={group}
          disabled={pending}
          runAction={runAction}
        />
      </div>

      <Card className="p-4 shadow-none ring-0">
        <div className="overflow-x-auto">
          <div className="relative flex min-w-fit">
            <TableRowDividers rowCount={group.categories.length + 1} />
            <NameColumn categories={group.categories} />
            <AnimatePresence mode="popLayout" initial={false}>
              {snapshots.map((snap) => (
                <SnapshotColumn
                  key={snap.id}
                  snapshot={snap}
                  categories={group.categories}
                  disabled={pending}
                  runAction={runAction}
                  transition={transition}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </section>
  );
}

type NameColumnProps = {
  categories: Category[];
};

function NameColumn({ categories }: NameColumnProps) {
  return (
    <div
      className="sticky left-0 z-10 flex shrink-0 flex-col bg-card"
      style={{ width: 104, minWidth: 104, maxWidth: 104, flexBasis: 104 }}
    >
      <div className="h-10" />
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="flex h-11 min-w-0 items-center text-sm"
        >
          <span className="block min-w-0 truncate px-1">{cat.name}</span>
        </div>
      ))}
      <div className="flex h-11 min-w-0 items-center text-sm font-medium">
        <span className="block min-w-0 truncate px-1">합계</span>
      </div>
    </div>
  );
}

function TableRowDividers({ rowCount }: { rowCount: number }) {
  const lineCount = Math.max(rowCount, 1);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-20">
      {Array.from({ length: lineCount }, (_, index) => (
        <span
          key={index}
          className="absolute inset-x-0 border-t-[1.2px]"
          style={{ top: 40 + index * 44 }}
        />
      ))}
    </div>
  );
}

function GroupManagementDialog({
  group,
  disabled,
  runAction,
}: {
  group: CategoryGroupWithCategories;
  disabled: boolean;
  runAction: RunAction;
}) {
  const [open, setOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GroupDeleteTarget | null>(
    null,
  );
  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : SPRING_SOFT;

  async function saveGroupName(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed === group.name) return;
    await runAction(() => renameGroup(group.id, trimmed));
  }

  async function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setNewCategory("");
    await runAction(() => createCategory(group.id, trimmed));
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
    const index = group.categories.findIndex((cat) => cat.id === categoryId);
    const next = index + direction;
    if (index === -1 || next < 0 || next >= group.categories.length) return;
    const reordered = [...group.categories];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    await runAction(() =>
      reorderCategories(
        group.id,
        reordered.map((cat) => cat.id),
      ),
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    if (target.kind === "group") {
      setOpen(false);
      await runAction(() => deleteGroup(target.id));
      return;
    }

    await runAction(() => deleteCategory(target.id));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            className="size-7 shrink-0 rounded-full bg-foreground/7 text-muted-foreground transition-colors hover:bg-foreground/16 hover:text-foreground sm:size-6"
            aria-label={`${group.name} 관리`}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader className="items-start pr-10">
            <EditableDialogTitle
              value={group.name}
              disabled={disabled}
              onSave={saveGroupName}
            />
          </DialogHeader>

          <motion.div
            layout
            transition={transition}
            className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1"
          >
            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-medium text-muted-foreground">
                  항목
                </h3>
                <span className="text-xs text-muted-foreground">
                  {group.categories.length}개
                </span>
              </div>

              {group.categories.length > 0 ? (
                <motion.ul
                  layout
                  transition={transition}
                  className="divide-y-[1.2px]"
                >
                  <AnimatePresence initial={false}>
                    {group.categories.map((category, index) => (
                      <GroupCategoryRow
                        key={category.id}
                        category={category}
                        disabled={disabled}
                        canMoveUp={index > 0}
                        canMoveDown={index < group.categories.length - 1}
                        transition={transition}
                        onRename={(name) =>
                          runAction(() => renameCategory(category.id, name))
                        }
                        onMove={(direction) =>
                          moveCategory(category.id, direction)
                        }
                        onDelete={() =>
                          setDeleteTarget({
                            kind: "category",
                            id: category.id,
                            name: category.name,
                          })
                        }
                      />
                    ))}
                  </AnimatePresence>
                </motion.ul>
              ) : (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={transition}
                  className="rounded-2xl border border-dashed py-6 text-center text-sm text-muted-foreground"
                >
                  아직 항목이 없습니다.
                </motion.div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCategory();
                    }
                  }}
                  placeholder="새 항목 이름"
                  disabled={disabled}
                  maxLength={40}
                  className={`h-8 px-3 ${INPUT_NO_FOCUS_RING}`}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addCategory}
                  disabled={disabled || newCategory.trim().length === 0}
                >
                  <Plus className="size-4" />
                  추가
                </Button>
              </div>
            </section>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  setDeleteTarget({
                    kind: "group",
                    id: group.id,
                    name: group.name,
                    categoryCount: group.categories.length,
                  })
                }
              >
                <Trash2 className="size-4" />
                그룹 삭제
              </Button>
            </div>
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
            <AlertDialogTitle>
              {deleteTarget?.kind === "group" ? "그룹 삭제" : "항목 삭제"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getGroupDeleteMessage(deleteTarget)}
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

function GroupCategoryRow({
  category,
  disabled,
  canMoveUp,
  canMoveDown,
  transition,
  onRename,
  onMove,
  onDelete,
}: {
  category: Category;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  transition: Transition;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  function commit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed !== category.name) onRename(trimmed);
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, height: 0, y: -6 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -6 }}
      transition={transition}
      className="flex items-center gap-1 overflow-hidden py-2"
    >
      <Input
        key={category.name}
        defaultValue={category.name}
        onBlur={(event) => {
          if (!event.currentTarget.value.trim()) {
            event.currentTarget.value = category.name;
            return;
          }
          commit(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.value = category.name;
            event.currentTarget.blur();
          }
        }}
        disabled={disabled}
        maxLength={40}
        className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveUp}
        onClick={() => onMove(-1)}
        aria-label={`${category.name} 위로 이동`}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveDown}
        onClick={() => onMove(1)}
        aria-label={`${category.name} 아래로 이동`}
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
        aria-label={`${category.name} 삭제`}
      >
        <Trash2 className="size-4" />
      </Button>
    </motion.li>
  );
}

function EditableDialogTitle({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function start() {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    setDraft("");
    if (!trimmed || trimmed === value) return;
    onSave(trimmed);
  }

  function cancel() {
    setEditing(false);
    setDraft("");
  }

  if (editing) {
    return (
      <DialogTitle
        asChild
        className="w-full min-w-0 text-3xl font-semibold leading-tight sm:w-2/3"
      >
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
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
          disabled={disabled}
          maxLength={40}
          className="cursor-text rounded bg-transparent px-0 outline-none transition-colors hover:bg-muted/60"
        />
      </DialogTitle>
    );
  }

  return (
    <DialogTitle
      asChild
      className="w-full min-w-0 text-3xl font-semibold leading-tight sm:max-w-[66%]"
    >
      <button
        type="button"
        onClick={start}
        disabled={disabled}
        className="cursor-pointer truncate rounded px-1 text-left transition-colors hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        {value}
      </button>
    </DialogTitle>
  );
}

function getGroupDeleteMessage(target: GroupDeleteTarget | null): string {
  if (!target) return "";
  if (target.kind === "group") {
    return `"${target.name}" 그룹과 하위 ${target.categoryCount}개 항목, 그리고 관련된 모든 금액 기록이 삭제됩니다.`;
  }
  return `"${target.name}" 항목과 관련된 모든 금액 기록이 삭제됩니다.`;
}

type SnapshotColumnProps = {
  snapshot: SnapshotWithEntries;
  categories: Category[];
  disabled: boolean;
  runAction: RunAction;
  transition: Transition;
};

function SnapshotColumn({
  snapshot,
  categories,
  disabled,
  runAction,
  transition,
}: SnapshotColumnProps) {
  const columnTotal = useMemo(() => {
    let total = 0;
    for (const cat of categories) {
      total += Number(snapshot.entriesByCategory[cat.id]?.amount ?? 0);
    }
    return total;
  }, [snapshot.entriesByCategory, categories]);

  // 너비는 duration 기반 ease-out으로 정착시켜 스프링 특유의 미세한 바운스를 피한다.
  // 사이드로 밀려나는 형제 열은 `layout`이 transform 기반 FLIP으로 처리해 GPU 가속을 유지한다.
  const sizeTransition =
    "duration" in transition
      ? transition
      : { duration: DURATION_BASE, ease: EASE_OUT };

  return (
    <motion.div
      layout
      transition={{
        layout: transition,
        opacity: sizeTransition,
        width: sizeTransition,
      }}
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 132 }}
      exit={{ opacity: 0, width: 0 }}
      style={{ willChange: "transform, opacity, width" }}
      className="z-10 flex shrink-0 flex-col overflow-hidden pl-3"
    >
      <div className="flex h-10 items-center justify-end px-3 text-sm font-medium text-muted-foreground">
        <span className="truncate">
          {formatYearMonth(snapshot.year_month)}
        </span>
      </div>

      {categories.map((cat) => (
        <AmountCell
          key={cat.id}
          snapshotId={snapshot.id}
          categoryId={cat.id}
          entry={snapshot.entriesByCategory[cat.id]}
          disabled={disabled}
          runAction={runAction}
        />
      ))}

      <div className="flex h-11 w-full items-center justify-end px-3 text-right text-sm font-semibold tabular-nums">
        {formatKRW(columnTotal)}
      </div>
    </motion.div>
  );
}

type AmountCellProps = {
  snapshotId: string;
  categoryId: string;
  entry: SnapshotWithEntries["entriesByCategory"][string] | undefined;
  disabled: boolean;
  runAction: RunAction;
};

function AmountCell({
  snapshotId,
  categoryId,
  entry,
  disabled,
  runAction,
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

  if (editing) {
    return (
      <div className="flex h-11 w-full items-center gap-0.5 px-1">
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
          className="h-8 min-w-0 flex-1 cursor-text rounded-full bg-transparent px-2 text-right text-sm tabular-nums transition-colors hover:bg-muted/60 focus:outline-none"
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
      className="flex h-11 w-full cursor-pointer items-center justify-end px-3 text-right text-sm tabular-nums transition-colors hover:bg-muted/70 disabled:pointer-events-none disabled:opacity-60"
    >
      {amount !== null ? (
        formatKRW(amount)
      ) : (
        <span className="text-muted-foreground/60">—</span>
      )}
    </button>
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
      className="cursor-text rounded bg-transparent px-1 text-left text-sm outline-none ring-1 ring-ring/60 ring-inset transition-colors placeholder:text-muted-foreground/60 hover:bg-input/70"
    />
  );
}

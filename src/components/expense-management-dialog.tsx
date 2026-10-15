// "관리" trigger in the expense header. Manages members and expense categories in one dialog.
"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createExpenseCategory,
  deleteExpenseCategory,
  renameExpenseCategory,
  reorderExpenseCategories,
  seedDefaultExpenseCategories,
} from "@/actions/expense-categories";
import {
  createMember,
  deleteMember,
  renameMember,
  reorderMembers,
} from "@/actions/members";
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
import { SPRING_SOFT } from "@/lib/motion";
import { blurFocusedInput } from "@/lib/utils";
import {
  keyOf,
  NO_RENDER_KEYS,
  withAlias,
  type RenderKeys,
} from "@/lib/render-keys";
import type { ExpenseCategory, Member } from "@/types/db";

type Props = {
  members: Member[];
  categories: ExpenseCategory[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

type DeleteTarget =
  | { kind: "member"; id: string; name: string }
  | { kind: "category"; id: string; name: string };

// Mirrors MEMBER_COLORS / nextMemberColor in src/actions/members.ts so a new member's dot
// shows its final color immediately instead of flashing a placeholder.
const MEMBER_COLORS = ["chart-2", "chart-4", "chart-1", "chart-5", "chart-3"];

function nextMemberColor(used: string[]): string {
  return (
    MEMBER_COLORS.find((color) => !used.includes(color)) ??
    MEMBER_COLORS[used.length % MEMBER_COLORS.length]
  );
}

// Optimistic local copy of a server list: edits apply instantly and the server copy is
// only adopted again once every in-flight mutation has settled (then a refresh lands).
// Create actions don't return the new row, so when the server copy arrives a temp row is
// matched to its saved twin by name and keeps its render key (no exit + enter flicker).
function useOptimisticList<T extends { id: string; name: string }>(
  serverItems: T[],
) {
  const [items, setItems] = useState(serverItems);
  const [renderKeys, setRenderKeys] = useState<RenderKeys>(NO_RENDER_KEYS);
  const pendingRef = useRef(0);
  const serverRef = useRef(serverItems);
  const itemsRef = useRef(serverItems);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    serverRef.current = serverItems;
    if (pendingRef.current > 0) return;
    const known = new Set(itemsRef.current.map((item) => item.id));
    const temps = itemsRef.current.filter((item) => isTempId(item.id));
    if (temps.length > 0) {
      setRenderKeys((keys) => {
        let next = keys;
        for (const item of serverItems) {
          if (known.has(item.id)) continue;
          const index = temps.findIndex((temp) => temp.name === item.name);
          if (index === -1) continue;
          next = withAlias(next, item.id, temps[index].id);
          temps.splice(index, 1);
        }
        return next;
      });
    }
    setItems(serverItems);
  }, [serverItems]);

  return { items, setItems, renderKeys, pendingRef, serverRef };
}

function isTempId(id: string): boolean {
  return id.startsWith("optimistic-");
}

function tempId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function moveId(ids: string[], id: string, direction: -1 | 1): string[] | null {
  const index = ids.indexOf(id);
  const next = index + direction;
  if (index === -1 || next < 0 || next >= ids.length) return null;
  const reordered = [...ids];
  [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
  return reordered;
}

function reorderById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const byId = new Map(items.map((item) => [item.id, item] as const));
  return ids
    .map((id) => byId.get(id))
    .filter((item): item is T => item !== undefined);
}

export function ExpenseManagementDialog({ members, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Unfinished input (add fields, renames being typed). Edits here apply on their own, so
  // the sheet's ✓ only lights up while something is still being typed.
  const [memberDraft, setMemberDraft] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");
  const [editingRows, setEditingRows] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const hasPendingInput =
    memberDraft.trim() !== "" ||
    categoryDraft.trim() !== "" ||
    editingRows.size > 0;

  function markRowEditing(id: string, editing: boolean) {
    setEditingRows((current) => {
      if (current.has(id) === editing) return current;
      const next = new Set(current);
      if (editing) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  // Every way of closing commits unfinished typing, as ✓ does. Renames already save on
  // blur, and a swipe blurs the field, so dropping input on X alone would be inconsistent.
  function handleOpenChange(next: boolean) {
    if (!next) {
      if (memberDraft.trim()) addMember(memberDraft.trim());
      if (categoryDraft.trim()) addCategory(categoryDraft.trim());
      blurFocusedInput();
      setMemberDraft("");
      setCategoryDraft("");
      setEditingRows(new Set());
    }
    setOpen(next);
  }
  const [, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : SPRING_SOFT;

  const memberList = useOptimisticList(members);
  const categoryList = useOptimisticList(categories);
  const localMembers = memberList.items;
  const localCategories = categoryList.items;
  // Reordering sends every id, so arrows stay disabled until new rows have server ids.
  const membersSaving = localMembers.some((item) => isTempId(item.id));
  const categoriesSaving = localCategories.some((item) => isTempId(item.id));

  // Applies a mutation locally right away, then persists it in the background. On
  // failure the list snaps back to the last server copy.
  function runOptimistic<T extends { id: string; name: string }>(
    list: ReturnType<typeof useOptimisticList<T>>,
    update: (items: T[]) => T[],
    action: () => Promise<ActionResult>,
  ) {
    list.setItems(update);
    list.pendingRef.current += 1;
    void action()
      .then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          list.setItems(list.serverRef.current);
        }
      })
      .catch(() => {
        toast.error("변경사항을 저장하지 못했습니다.");
        list.setItems(list.serverRef.current);
      })
      .finally(() => {
        list.pendingRef.current = Math.max(0, list.pendingRef.current - 1);
        startTransition(() => router.refresh());
      });
  }

  async function seedCategories() {
    const result = await seedDefaultExpenseCategories();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => router.refresh());
  }

  function addMember(name: string) {
    const now = new Date().toISOString();
    runOptimistic(
      memberList,
      (items) => [
        ...items,
        {
          id: tempId(),
          account_id: "",
          name,
          color: nextMemberColor(items.map((item) => item.color)),
          sort_order: items.length,
          created_at: now,
        },
      ],
      () => createMember(name),
    );
  }

  function addCategory(name: string) {
    const now = new Date().toISOString();
    runOptimistic(
      categoryList,
      (items) => [
        ...items,
        {
          id: tempId(),
          account_id: "",
          name,
          sort_order: items.length,
          created_at: now,
        },
      ],
      () => createExpenseCategory(name),
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.kind === "member") {
      runOptimistic(
        memberList,
        (items) => items.filter((item) => item.id !== target.id),
        () => deleteMember(target.id),
      );
      return;
    }
    runOptimistic(
      categoryList,
      (items) => items.filter((item) => item.id !== target.id),
      () => deleteExpenseCategory(target.id),
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-26 justify-start gap-2.5 border-transparent bg-card text-foreground shadow-xs ring-1 ring-foreground/5 hover:bg-card/70 aria-expanded:bg-muted/70"
          >
            <Settings2 className="size-4" />
            지출 관리
          </Button>
        </DialogTrigger>
        <DialogContent
          className="overflow-hidden sm:max-h-[calc(100vh-2rem)] sm:max-w-lg"
          // Edits here apply as they happen; ✓ (like any close) commits whatever is still
          // being typed (new names, or renames that save on blur).
          onConfirm={() => handleOpenChange(false)}
          confirmDisabled={!hasPendingInput}
        >
          <DialogHeader>
            <DialogTitle>지출 관리</DialogTitle>
            <DialogDescription>
              함께 쓰는 멤버와 지출 카테고리를 관리합니다.
            </DialogDescription>
          </DialogHeader>

          <motion.div
            layout
            transition={transition}
            className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-1"
          >
            <ManagementSection
              title="멤버"
              count={localMembers.length}
              emptyMessage="멤버가 없습니다"
              addPlaceholder="새 멤버 이름"
              transition={transition}
              draft={memberDraft}
              onDraftChange={setMemberDraft}
              onAdd={addMember}
            >
              <AnimatePresence initial={false}>
                {localMembers.map((member, index) => (
                  <ManagementRow
                    key={keyOf(memberList.renderKeys, member.id)}
                    name={member.name}
                    onPendingChange={(pending) =>
                      markRowEditing(member.id, pending)
                    }
                    leading={
                      <span
                        aria-hidden
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--${member.color})` }}
                      />
                    }
                    disabled={isTempId(member.id)}
                    canMoveUp={index > 0 && !membersSaving}
                    canMoveDown={
                      index < localMembers.length - 1 && !membersSaving
                    }
                    transition={transition}
                    onRename={(name) =>
                      runOptimistic(
                        memberList,
                        (items) =>
                          items.map((item) =>
                            item.id === member.id ? { ...item, name } : item,
                          ),
                        () => renameMember(member.id, name),
                      )
                    }
                    onMove={(direction) => {
                      const ids = moveId(
                        localMembers.map((m) => m.id),
                        member.id,
                        direction,
                      );
                      if (!ids || ids.some(isTempId)) return;
                      runOptimistic(
                        memberList,
                        (items) => reorderById(items, ids),
                        () => reorderMembers(ids),
                      );
                    }}
                    onDelete={() =>
                      setDeleteTarget({
                        kind: "member",
                        id: member.id,
                        name: member.name,
                      })
                    }
                  />
                ))}
              </AnimatePresence>
            </ManagementSection>

            <ManagementSection
              title="카테고리"
              count={localCategories.length}
              emptyMessage="카테고리가 없습니다"
              addPlaceholder="새 카테고리 이름"
              transition={transition}
              draft={categoryDraft}
              onDraftChange={setCategoryDraft}
              onAdd={addCategory}
              emptyExtra={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void seedCategories()}
                >
                  <Plus className="size-4" />
                  기본 카테고리 채우기
                </Button>
              }
            >
              <AnimatePresence initial={false}>
                {localCategories.map((category, index) => (
                  <ManagementRow
                    key={keyOf(categoryList.renderKeys, category.id)}
                    name={category.name}
                    onPendingChange={(pending) =>
                      markRowEditing(category.id, pending)
                    }
                    disabled={isTempId(category.id)}
                    canMoveUp={index > 0 && !categoriesSaving}
                    canMoveDown={
                      index < localCategories.length - 1 && !categoriesSaving
                    }
                    transition={transition}
                    onRename={(name) =>
                      runOptimistic(
                        categoryList,
                        (items) =>
                          items.map((item) =>
                            item.id === category.id ? { ...item, name } : item,
                          ),
                        () => renameExpenseCategory(category.id, name),
                      )
                    }
                    onMove={(direction) => {
                      const ids = moveId(
                        localCategories.map((c) => c.id),
                        category.id,
                        direction,
                      );
                      if (!ids || ids.some(isTempId)) return;
                      runOptimistic(
                        categoryList,
                        (items) => reorderById(items, ids),
                        () => reorderExpenseCategories(ids),
                      );
                    }}
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
            </ManagementSection>
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
              {deleteTarget?.kind === "member" ? "멤버 삭제" : "카테고리 삭제"}
            </AlertDialogTitle>
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
    </>
  );
}


function getDeleteMessage(target: DeleteTarget | null): string {
  if (!target) return "";
  if (target.kind === "member") {
    return `"${target.name}"의 지출은 공용으로 옮겨집니다.`;
  }
  return `"${target.name}"의 지출은 미분류로 남습니다.`;
}

function ManagementSection({
  title,
  count,
  emptyMessage,
  emptyExtra,
  addPlaceholder,
  transition,
  draft,
  onDraftChange,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  emptyExtra?: ReactNode;
  addPlaceholder: string;
  transition: Transition;
  draft: string;
  onDraftChange: (draft: string) => void;
  onAdd: (name: string) => void;
  children: ReactNode;
}) {
  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onDraftChange("");
    onAdd(trimmed);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{count}개</span>
      </div>

      {count > 0 ? (
        <motion.ul layout transition={transition} className="divide-y">
          {children}
        </motion.ul>
      ) : (
        <motion.div
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={transition}
          className="flex flex-col items-center gap-3 squircle rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
        >
          {emptyMessage}
          {emptyExtra}
        </motion.div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={addPlaceholder}
          enterKeyHint="done"
          maxLength={40}
          className="h-8 px-3"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={draft.trim().length === 0}
        >
          <Plus className="size-4" />
          추가
        </Button>
      </div>
    </section>
  );
}

function ManagementRow({
  name,
  leading,
  disabled,
  canMoveUp,
  canMoveDown,
  transition,
  onRename,
  onMove,
  onDelete,
  onPendingChange,
}: {
  name: string;
  leading?: ReactNode;
  disabled: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  transition: Transition;
  onRename: (name: string) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onPendingChange: (pending: boolean) => void;
}) {
  function commit(value: string) {
    onPendingChange(false);
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed !== name) onRename(trimmed);
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
      {leading}
      <Input
        key={name}
        defaultValue={name}
        onChange={(event) => {
          const trimmed = event.target.value.trim();
          onPendingChange(trimmed !== "" && trimmed !== name);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.value.trim()) {
            event.currentTarget.value = name;
            onPendingChange(false);
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
            event.currentTarget.value = name;
            event.currentTarget.blur();
          }
        }}
        disabled={disabled}
        maxLength={40}
        className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveUp}
        onClick={() => onMove(-1)}
        aria-label={`${name} 위로 이동`}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveDown}
        onClick={() => onMove(1)}
        aria-label={`${name} 아래로 이동`}
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
        aria-label={`${name} 삭제`}
      >
        <Trash2 className="size-4" />
      </Button>
    </motion.li>
  );
}

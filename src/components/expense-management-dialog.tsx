// "관리" trigger in the expense header. Manages members and expense categories in one dialog.
"use client";

import { useState, useTransition, type ReactNode } from "react";
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
import type { ExpenseCategory, Member } from "@/types/db";

type Props = {
  members: Member[];
  categories: ExpenseCategory[];
};

type ActionResult = { ok: true } | { ok: false; error: string };

type DeleteTarget =
  | { kind: "member"; id: string; name: string }
  | { kind: "category"; id: string; name: string };

export function ExpenseManagementDialog({ members, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const reducedMotion = useReducedMotion();
  const transition: Transition = reducedMotion ? { duration: 0 } : SPRING_SOFT;

  async function runAction(action: () => Promise<ActionResult>) {
    const result = await action();
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  async function moveItem(
    ids: string[],
    id: string,
    direction: -1 | 1,
    reorder: (orderedIds: string[]) => Promise<ActionResult>,
  ) {
    const index = ids.indexOf(id);
    const next = index + direction;
    if (index === -1 || next < 0 || next >= ids.length) return;
    const reordered = [...ids];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    await runAction(() => reorder(reordered));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.kind === "member") {
      await runAction(() => deleteMember(target.id));
      return;
    }
    await runAction(() => deleteExpenseCategory(target.id));
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-26 justify-start gap-2.5 border-transparent bg-white text-foreground hover:bg-white/70 aria-expanded:bg-white/70"
          >
            <Settings2 className="size-4" />
            지출 관리
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-lg">
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
              count={members.length}
              emptyMessage="아직 멤버가 없습니다. 멤버를 추가하면 사람별로 지출을 나눠 볼 수 있습니다."
              addPlaceholder="새 멤버 이름"
              disabled={pending}
              transition={transition}
              onAdd={(name) => runAction(() => createMember(name))}
            >
              <AnimatePresence initial={false}>
                {members.map((member, index) => (
                  <ManagementRow
                    key={member.id}
                    name={member.name}
                    leading={
                      <span
                        aria-hidden
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: `var(--${member.color})` }}
                      />
                    }
                    disabled={pending}
                    canMoveUp={index > 0}
                    canMoveDown={index < members.length - 1}
                    transition={transition}
                    onRename={(name) =>
                      runAction(() => renameMember(member.id, name))
                    }
                    onMove={(direction) =>
                      moveItem(
                        members.map((m) => m.id),
                        member.id,
                        direction,
                        reorderMembers,
                      )
                    }
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
              count={categories.length}
              emptyMessage="아직 카테고리가 없습니다."
              addPlaceholder="새 카테고리 이름"
              disabled={pending}
              transition={transition}
              onAdd={(name) => runAction(() => createExpenseCategory(name))}
              emptyExtra={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    runAction(() => seedDefaultExpenseCategories())
                  }
                >
                  <Plus className="size-4" />
                  기본 카테고리 채우기
                </Button>
              }
            >
              <AnimatePresence initial={false}>
                {categories.map((category, index) => (
                  <ManagementRow
                    key={category.id}
                    name={category.name}
                    disabled={pending}
                    canMoveUp={index > 0}
                    canMoveDown={index < categories.length - 1}
                    transition={transition}
                    onRename={(name) =>
                      runAction(() => renameExpenseCategory(category.id, name))
                    }
                    onMove={(direction) =>
                      moveItem(
                        categories.map((c) => c.id),
                        category.id,
                        direction,
                        reorderExpenseCategories,
                      )
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
    return `"${target.name}" 멤버를 삭제합니다. 이 멤버의 지출 기록은 삭제되지 않고 공용으로 이동합니다.`;
  }
  return `"${target.name}" 카테고리를 삭제합니다. 이 카테고리의 지출 기록은 삭제되지 않고 미분류로 남습니다.`;
}

function ManagementSection({
  title,
  count,
  emptyMessage,
  emptyExtra,
  addPlaceholder,
  disabled,
  transition,
  onAdd,
  children,
}: {
  title: string;
  count: number;
  emptyMessage: string;
  emptyExtra?: ReactNode;
  addPlaceholder: string;
  disabled: boolean;
  transition: Transition;
  onAdd: (name: string) => Promise<void>;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState("");

  async function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    await onAdd(trimmed);
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
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground"
        >
          {emptyMessage}
          {emptyExtra}
        </motion.div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={addPlaceholder}
          disabled={disabled}
          maxLength={40}
          className="h-8 px-3"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={disabled || draft.trim().length === 0}
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
}) {
  function commit(value: string) {
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
        onBlur={(event) => {
          if (!event.currentTarget.value.trim()) {
            event.currentTarget.value = name;
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

// 카테고리 편집 Sheet. 그룹/항목의 추가·이름 변경·삭제·재정렬을 수행하고 각 액션 후 트리를 재동기화한다.
"use client";

import {
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  createCategory,
  createGroup,
  deleteCategory,
  deleteGroup,
  listCategoryTree,
  renameCategory,
  renameGroup,
  reorderCategories,
  reorderGroups,
  type CategoryGroupWithCategories,
} from "@/actions/categories";
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
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type ActionResult = { ok: true } | { ok: false; error: string };

type DeleteTarget =
  | { kind: "group"; id: string; name: string; cascadeCount: number }
  | { kind: "category"; id: string; name: string };

type Props = {
  initialTree: CategoryGroupWithCategories[];
};

export function CategoryEditorSheet({ initialTree }: Props) {
  const [open, setOpen] = useState(false);
  const [tree, setTree] = useState<CategoryGroupWithCategories[]>(initialTree);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [pending, startTransition] = useTransition();

  function runAction(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const fresh = await listCategoryTree();
      setTree(fresh);
    });
  }

  function moveGroup(groupId: string, direction: -1 | 1) {
    const idx = tree.findIndex((g) => g.id === groupId);
    const next = idx + direction;
    if (idx === -1 || next < 0 || next >= tree.length) return;
    const reordered = [...tree];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    runAction(() => reorderGroups(reordered.map((g) => g.id)));
  }

  function moveCategory(groupId: string, categoryId: string, direction: -1 | 1) {
    const group = tree.find((g) => g.id === groupId);
    if (!group) return;
    const idx = group.categories.findIndex((c) => c.id === categoryId);
    const next = idx + direction;
    if (idx === -1 || next < 0 || next >= group.categories.length) return;
    const reordered = [...group.categories];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    runAction(() =>
      reorderCategories(
        groupId,
        reordered.map((c) => c.id),
      ),
    );
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    runAction(() =>
      target.kind === "group"
        ? deleteGroup(target.id)
        : deleteCategory(target.id),
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            카테고리 편집
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>카테고리 편집</SheetTitle>
            <SheetDescription>
              그룹과 항목을 추가·이름 변경·삭제·정렬할 수 있습니다.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-6">
            <NewGroupForm
              disabled={pending}
              onCreate={(name) => runAction(() => createGroup(name))}
            />

            {tree.map((group, index) => (
              <GroupBlock
                key={group.id}
                group={group}
                canMoveUp={index > 0}
                canMoveDown={index < tree.length - 1}
                disabled={pending}
                onMove={(direction) => moveGroup(group.id, direction)}
                onRename={(name) => runAction(() => renameGroup(group.id, name))}
                onDelete={() =>
                  setDeleteTarget({
                    kind: "group",
                    id: group.id,
                    name: group.name,
                    cascadeCount: group.categories.length,
                  })
                }
                onAddCategory={(name) =>
                  runAction(() => createCategory(group.id, name))
                }
                onRenameCategory={(id, name) =>
                  runAction(() => renameCategory(id, name))
                }
                onDeleteCategory={(id, name) =>
                  setDeleteTarget({ kind: "category", id, name })
                }
                onMoveCategory={(id, direction) =>
                  moveCategory(group.id, id, direction)
                }
              />
            ))}

            {tree.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                그룹이 없습니다. 위에서 새 그룹을 추가해 보세요.
              </p>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

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
              {deleteTarget?.kind === "group"
                ? `"${deleteTarget.name}" 그룹과 하위 ${deleteTarget.cascadeCount}개의 항목, 그리고 관련된 모든 금액 기록이 삭제됩니다.`
                : deleteTarget?.kind === "category"
                  ? `"${deleteTarget.name}" 항목과 관련된 모든 금액 기록이 삭제됩니다.`
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

function NewGroupForm({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
    setName("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="새 그룹 이름"
        disabled={disabled}
        maxLength={40}
      />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={disabled || name.trim().length === 0}
      >
        <Plus className="size-4" />
        그룹
      </Button>
    </form>
  );
}

type GroupBlockProps = {
  group: CategoryGroupWithCategories;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string, name: string) => void;
  onMoveCategory: (id: string, direction: -1 | 1) => void;
};

function GroupBlock({
  group,
  canMoveUp,
  canMoveDown,
  disabled,
  onMove,
  onRename,
  onDelete,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
}: GroupBlockProps) {
  const [addingCategory, setAddingCategory] = useState(false);

  return (
    <section className="rounded-2xl border bg-card/50">
      <header className="flex items-center gap-1 border-b px-3 py-2">
        <EditableName
          value={group.name}
          disabled={disabled}
          onSave={onRename}
          textClassName="text-sm font-semibold"
        />
        <RowActions
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          disabled={disabled}
          onMove={onMove}
          onDelete={onDelete}
        />
      </header>

      {group.categories.length > 0 ? (
        <ul className="flex flex-col divide-y">
          {group.categories.map((category, index) => (
            <li
              key={category.id}
              className="flex items-center gap-1 py-2 pl-8 pr-3"
            >
              <EditableName
                value={category.name}
                disabled={disabled}
                onSave={(name) => onRenameCategory(category.id, name)}
                textClassName="text-sm"
              />
              <RowActions
                canMoveUp={index > 0}
                canMoveDown={index < group.categories.length - 1}
                disabled={disabled}
                onMove={(direction) => onMoveCategory(category.id, direction)}
                onDelete={() => onDeleteCategory(category.id, category.name)}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="px-3 py-2">
        {addingCategory ? (
          <InlineAdd
            disabled={disabled}
            onAdd={(name) => {
              onAddCategory(name);
              setAddingCategory(false);
            }}
            onCancel={() => setAddingCategory(false)}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddingCategory(true)}
            disabled={disabled}
            className="text-muted-foreground"
          >
            <Plus className="size-4" />
            항목 추가
          </Button>
        )}
      </div>
    </section>
  );
}

function RowActions({
  canMoveUp,
  canMoveDown,
  disabled,
  onMove,
  onDelete,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled: boolean;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveUp}
        onClick={() => onMove(-1)}
        aria-label="위로 이동"
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled || !canMoveDown}
        onClick={() => onMove(1)}
        aria-label="아래로 이동"
      >
        <ChevronDown className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled
        aria-label="드래그로 이동 (향후 지원)"
        title="드래그 앤 드롭은 향후 지원 예정"
      >
        <GripVertical className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={disabled}
        onClick={onDelete}
        aria-label="삭제"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function EditableName({
  value,
  disabled,
  onSave,
  textClassName,
}: {
  value: string;
  disabled: boolean;
  onSave: (name: string) => void;
  textClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
      setDraft("");
    }
  }

  if (editing) {
    return (
      <div className="flex flex-1 items-center gap-1">
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          disabled={disabled}
          maxLength={40}
          className="h-8"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-1 min-w-0">
      <span className={`truncate ${textClassName ?? ""}`}>{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={disabled}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        aria-label="이름 변경"
      >
        <Pencil className="size-3" />
      </Button>
    </div>
  );
}

function InlineAdd({
  disabled,
  onAdd,
  onCancel,
}: {
  disabled: boolean;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
        placeholder="새 항목 이름"
        disabled={disabled}
        maxLength={40}
        className="h-8"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || name.trim().length === 0}
        onClick={submit}
      >
        추가
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onCancel}
        disabled={disabled}
      >
        취소
      </Button>
    </div>
  );
}

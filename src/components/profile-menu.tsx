// 헤더 좌측 아바타 DropdownMenu. 프로필 설정 Dialog(표시 이름/PIN 변경/계정 삭제)와 로그아웃을 제공한다.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { signOut } from "@/actions/auth";
import {
  changePin,
  deleteAccount,
  updateDisplayName,
} from "@/actions/profile";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  displayName: string;
  firstUsedAt: string;
};

export function ProfileMenu({ displayName, firstUsedAt }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex cursor-pointer items-center gap-3 rounded-full transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="프로필 메뉴"
          >
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
            >
              {initial}
            </span>
            <span className="text-sm font-medium">{displayName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-40">
          <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
            <Settings className="size-3.5" />
            프로필 설정
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void signOut();
            }}
          >
            <LogOut className="size-3.5" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        displayName={displayName}
        firstUsedAt={firstUsedAt}
      />
    </>
  );
}

function ProfileDialog({
  open,
  onOpenChange,
  displayName,
  firstUsedAt,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  displayName: string;
  firstUsedAt: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(displayName);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function resetForm() {
    setName(displayName);
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm();
    onOpenChange(next);
  }

  async function saveDisplayName() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.error("표시 이름을 입력하세요.");
      return;
    }
    if (trimmed === displayName) return;

    setNameSaving(true);
    const result = await updateDisplayName(trimmed);
    setNameSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("표시 이름을 변경했습니다.");
    startTransition(() => router.refresh());
  }

  async function savePin() {
    if (newPin !== confirmPin) {
      toast.error("새 PIN이 서로 일치하지 않습니다.");
      return;
    }
    setPinSaving(true);
    const result = await changePin(oldPin, newPin);
    setPinSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("PIN을 변경했습니다.");
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
  }

  const nameDirty = name.trim().length > 0 && name.trim() !== displayName;
  const pinReady =
    oldPin.length > 0 && newPin.length > 0 && confirmPin.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 설정</DialogTitle>
            <DialogDescription>{formatFirstUsed(firstUsedAt)}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-1">
            <section className="flex flex-col gap-2">
              <Label htmlFor="profile-display-name">표시 이름</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="profile-display-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={40}
                  disabled={nameSaving}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={saveDisplayName}
                  disabled={nameSaving || !nameDirty}
                >
                  저장
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <Label>PIN 변경</Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  value={oldPin}
                  onChange={(event) =>
                    setOldPin(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="기존 PIN"
                  maxLength={12}
                  disabled={pinSaving}
                  autoComplete="current-password"
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) =>
                    setNewPin(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="새 PIN (숫자 6~12자리)"
                  maxLength={12}
                  disabled={pinSaving}
                  autoComplete="new-password"
                />
                <Input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) =>
                    setConfirmPin(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="새 PIN 확인"
                  maxLength={12}
                  disabled={pinSaving}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={savePin}
                  disabled={pinSaving || !pinReady}
                  className="self-end"
                >
                  PIN 변경
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <Label className="text-destructive">위험 영역</Label>
              <p className="text-xs text-muted-foreground">
                계정을 삭제하면 모든 스냅샷, 카테고리, 목표 기록이 영구적으로 함께 삭제됩니다. 되돌릴 수 없습니다.
              </p>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                className="self-end"
              >
                <Trash2 className="size-3.5" />
                계정 삭제
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteAccountAlert
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onDeleted={() => {
          onOpenChange(false);
          setDeleteConfirmOpen(false);
          router.replace("/login");
          router.refresh();
        }}
      />
    </>
  );
}

function DeleteAccountAlert({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onDeleted: () => void;
}) {
  const [pin, setPin] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) setPin("");
    onOpenChange(next);
  }

  async function performDelete() {
    if (pin.length === 0) {
      toast.error("현재 PIN을 입력하세요.");
      return;
    }
    setDeleting(true);
    const result = await deleteAccount(pin);
    setDeleting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPin("");
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>계정을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            확인을 위해 현재 PIN을 다시 입력하세요. 삭제된 계정은 복구할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            placeholder="현재 PIN"
            maxLength={12}
            disabled={deleting}
            autoFocus
            autoComplete="current-password"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              performDelete();
            }}
            disabled={deleting || pin.length === 0}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function formatFirstUsed(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월부터 함께`;
}

// Header-left avatar. On click, opens the profile settings Dialog (display name / change PIN / sign out / delete account).
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  displayName: string;
  firstUsedAt: string;
};

const INPUT_NO_FOCUS_RING =
  "focus-visible:border-transparent focus-visible:ring-0";

export function ProfileMenu({ displayName, firstUsedAt }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="group -m-1.5 flex min-w-0 cursor-pointer flex-col items-start gap-0.5 rounded-2xl p-1.5 text-left transition-[background-color,scale] duration-150 ease-out select-none hover:bg-foreground/4 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="프로필 설정 열기"
      >
        <span className="block max-w-[min(60vw,24rem)] truncate text-[13px] font-medium text-muted-foreground">
          {displayName}님의
        </span>
        <span className="block font-heading text-[1.85rem] font-semibold leading-none tracking-tight sm:text-4xl">
          자산 관리
        </span>
      </button>

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

  // Each returns whether it succeeded, so the sheet's ✓ only closes once all pending
  // changes are saved.
  async function saveDisplayName(): Promise<boolean> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.error("표시 이름을 입력하세요.");
      return false;
    }
    if (trimmed === displayName) return true;

    setNameSaving(true);
    const result = await updateDisplayName(trimmed);
    setNameSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("표시 이름을 변경했습니다.");
    startTransition(() => router.refresh());
    return true;
  }

  async function savePin(): Promise<boolean> {
    if (newPin !== confirmPin) {
      toast.error("새 PIN이 서로 일치하지 않습니다.");
      return false;
    }
    setPinSaving(true);
    const result = await changePin(oldPin, newPin);
    setPinSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("PIN을 변경했습니다.");
    setOldPin("");
    setNewPin("");
    setConfirmPin("");
    return true;
  }

  // Sheet bar ✓: saves whatever was changed (name, and the PIN once all three fields are
  // filled), then closes. A partly filled PIN form is reported instead of ignored.
  async function confirm() {
    const pinTouched =
      oldPin.length > 0 || newPin.length > 0 || confirmPin.length > 0;
    if (pinTouched && !pinReady) {
      toast.error("PIN을 바꾸려면 세 칸을 모두 입력하세요.");
      return;
    }
    if (nameDirty && !(await saveDisplayName())) return;
    if (pinReady && !(await savePin())) return;
    onOpenChange(false);
  }

  const nameDirty = name.trim().length > 0 && name.trim() !== displayName;
  const pinReady =
    oldPin.length > 0 && newPin.length > 0 && confirmPin.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="overflow-hidden sm:max-h-[calc(100vh-2rem)] sm:max-w-md"
          onConfirm={() => void confirm()}
          confirmDisabled={nameSaving || pinSaving}
        >
          <DialogHeader>
            <DialogTitle>프로필 설정</DialogTitle>
            <DialogDescription>{formatFirstUsed(firstUsedAt)}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto pr-1">
            <section className="flex flex-col gap-2">
              <Label htmlFor="profile-display-name">표시 이름</Label>
              <Input
                id="profile-display-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                disabled={nameSaving}
                enterKeyHint="done"
                className={INPUT_NO_FOCUS_RING}
              />
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
                  className={INPUT_NO_FOCUS_RING}
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
                  className={INPUT_NO_FOCUS_RING}
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
                  className={INPUT_NO_FOCUS_RING}
                />
              </div>
            </section>

            {/* The buttons say what they do; the confirmation alert explains the rest. */}
            <section className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void signOut();
                }}
                className="w-full"
              >
                <LogOut className="size-4" />
                로그아웃
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmOpen(true)}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
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
            모든 기록이 함께 삭제되며 되돌릴 수 없습니다. 현재 PIN을 입력하세요.
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
            aria-busy={deleting || undefined}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40"
          >
            {deleting ? <Loader2 className="animate-spin" /> : null}
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

// 헤더 우측의 "달 관리" 트리거. 신규 월은 추가하고 기존 월은 삭제 확인을 연다.
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

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
import { YearMonthPicker } from "@/components/year-month-picker";
import { formatYearMonth } from "@/lib/format";

type Props = {
  snapshots: Array<{ id: string; year_month: number }>;
};

export function MonthManagementButton({ snapshots }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; year_month: number } | null
  >(null);
  const existing = useMemo(
    () => new Set(snapshots.map((snapshot) => snapshot.year_month)),
    [snapshots],
  );
  const byYearMonth = useMemo(
    () =>
      new Map(
        snapshots.map((snapshot) => [snapshot.year_month, snapshot] as const),
      ),
    [snapshots],
  );

  async function handleSelect(yearMonth: number) {
    const existingSnapshot = byYearMonth.get(yearMonth);
    if (existingSnapshot) {
      setDeleteTarget(existingSnapshot);
      return;
    }

    const result = await createSnapshot(yearMonth);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const result = await deleteSnapshot(target.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <>
      <YearMonthPicker
        existing={existing}
        existingMode="selectable"
        onSelect={handleSelect}
        disabled={pending}
        trigger={
          <Button variant="outline" size="sm" disabled={pending}>
            <CalendarDays className="size-4" />
            달 관리
          </Button>
        }
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>월 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `${formatYearMonth(deleteTarget.year_month)}의 모든 금액 기록이 삭제됩니다.`
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

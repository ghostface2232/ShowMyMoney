// Header-right "month management" trigger. Adds new months and opens delete confirmation for existing ones (optimistically when the asset page is mounted).
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { useAssetActions } from "@/components/asset-actions";
import { Button } from "@/components/ui/button";
import { YearMonthPicker } from "@/components/year-month-picker";
import { formatYearMonth } from "@/lib/format";

type Props = {
  snapshots: Array<{ id: string; year_month: number }>;
};

export function MonthManagementButton({ snapshots }: Props) {
  const router = useRouter();
  const getAssetActions = useAssetActions();
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<
    { id: string; year_month: number } | null
  >(null);

  // `snapshots` is the server's list, so it lags an optimistic add/delete until the
  // refresh lands; picking the same month again then would hit the server twice. The
  // trigger stays disabled from the pick until a newer list than the one at settle arrives.
  const [optimisticBusy, setOptimisticBusy] = useState<{
    settledWith: Props["snapshots"] | null;
  } | null>(null);
  const snapshotsRef = useRef(snapshots);
  useEffect(() => {
    snapshotsRef.current = snapshots;
  }, [snapshots]);
  if (
    optimisticBusy?.settledWith &&
    optimisticBusy.settledWith !== snapshots
  ) {
    setOptimisticBusy(null);
  }
  // Fallback if the refresh never brings a new list (e.g. offline).
  useEffect(() => {
    if (!optimisticBusy?.settledWith) return;
    const timer = window.setTimeout(() => setOptimisticBusy(null), 5000);
    return () => window.clearTimeout(timer);
  }, [optimisticBusy]);

  async function runOptimistic(run: () => Promise<void>) {
    setOptimisticBusy({ settledWith: null });
    await run();
    setOptimisticBusy({ settledWith: snapshotsRef.current });
  }
  const busy = pending || optimisticBusy !== null;
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

    // On the asset page the new column appears immediately (optimistic); otherwise
    // fall back to a plain server round trip.
    const assetActions = getAssetActions();
    if (assetActions) {
      await runOptimistic(() => assetActions.addSnapshot(yearMonth));
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
    const assetActions = getAssetActions();
    if (assetActions) {
      await runOptimistic(() => assetActions.deleteSnapshot(target.id));
      return;
    }
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
        title="월별 관리"
        description="누르면 빈 달은 추가되고, 기록된 달은 삭제됩니다."
        disabled={busy}
        trigger={
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            className="min-w-26 justify-start gap-2.5 border-transparent bg-card text-foreground shadow-xs ring-1 ring-foreground/5 hover:bg-card/70 aria-expanded:bg-muted/70"
          >
            <CalendarDays className="size-4" />
            월별 관리
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

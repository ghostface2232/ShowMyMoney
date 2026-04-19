// 헤더 우측의 "달 추가" 트리거. year-month를 선택해 createSnapshot을 호출하고 대시보드를 갱신한다.
"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { createSnapshot } from "@/actions/snapshots";
import { Button } from "@/components/ui/button";
import { YearMonthPicker } from "@/components/year-month-picker";

type Props = {
  existingYearMonths: number[];
};

export function AddMonthButton({ existingYearMonths }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const existing = useMemo(
    () => new Set(existingYearMonths),
    [existingYearMonths],
  );

  async function handleSelect(yearMonth: number) {
    const result = await createSnapshot(yearMonth);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <YearMonthPicker
      existing={existing}
      onSelect={handleSelect}
      disabled={pending}
      trigger={
        <Button variant="outline" size="sm" disabled={pending}>
          <Plus className="size-4" />
          달 추가
        </Button>
      }
    />
  );
}

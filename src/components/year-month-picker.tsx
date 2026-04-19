// 년-월을 선택하는 미니 팝오버. 이미 존재하는 year_month는 비활성화한다.
"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  trigger: ReactNode;
  existing: Set<number>;
  onSelect: (yearMonth: number) => void;
  disabled?: boolean;
  existingMode?: "disabled" | "selectable";
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function YearMonthPicker({
  trigger,
  existing,
  onSelect,
  disabled,
  existingMode = "disabled",
}: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setYear(new Date().getFullYear());
  }

  function pick(month: number) {
    onSelect(year * 100 + month);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3 p-4" align="end">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((y) => y - 1)}
            aria-label="이전 해"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium">{year}년</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((y) => y + 1)}
            aria-label="다음 해"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month) => {
            const exists = existing.has(year * 100 + month);
            const selectable = !exists || existingMode === "selectable";
            return (
              <Button
                key={month}
                type="button"
                variant={exists ? "default" : "outline"}
                size="sm"
                className="h-9"
                disabled={!selectable}
                aria-pressed={exists}
                onClick={() => pick(month)}
              >
                {month}월
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

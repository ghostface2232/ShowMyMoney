// Year-month picker. A popover on wider screens; on iPhone-sized screens a bottom sheet, since
// HIG advises against popovers in compact width. Existing months are disabled or highlighted.
"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { currentYearMonth } from "@/lib/year-month";

type Props = {
  trigger: ReactNode;
  existing: Set<number>;
  onSelect: (yearMonth: number) => void;
  disabled?: boolean;
  existingMode?: "disabled" | "selectable";
  // Sheet title (and optional hint) on compact screens.
  title?: string;
  description?: string;
};

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export function YearMonthPicker({
  trigger,
  existing,
  onSelect,
  disabled,
  existingMode = "disabled",
  title = "월 선택",
  description,
}: Props) {
  const compact = useMediaQuery("(max-width: 639px)");
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Math.floor(currentYearMonth() / 100));

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setYear(Math.floor(currentYearMonth() / 100));
  }

  function pick(month: number) {
    onSelect(year * 100 + month);
    setOpen(false);
  }

  const today = currentYearMonth();
  const body = (
    <>
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
        <span className="text-sm font-medium tabular-nums" aria-live="polite">
          {year}년
        </span>
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
          const value = year * 100 + month;
          const exists = existing.has(value);
          const selectable = !exists || existingMode === "selectable";
          return (
            <Button
              key={month}
              type="button"
              variant={exists ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 tabular-nums pointer-coarse:h-11",
                // Quietly mark the current month so "this month" is findable at a glance.
                !exists && value === today && "border-primary/50 text-primary",
              )}
              disabled={!selectable}
              aria-pressed={exists}
              aria-current={value === today ? "date" : undefined}
              onClick={() => pick(month)}
            >
              {month}월
            </Button>
          );
        })}
      </div>
    </>
  );

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild disabled={disabled}>
          {trigger}
        </DialogTrigger>
        <DialogContent
          className="gap-4"
          // No description: tell Radix the omission is deliberate.
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {body}
          {/* Outside the header on purpose: the bar shows only the title, but this hint
              explains what tapping a month does, so it stays visible below the grid. */}
          {description ? (
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-3 p-4" align="end">
        {body}
      </PopoverContent>
    </Popover>
  );
}

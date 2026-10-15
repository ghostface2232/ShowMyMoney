// Scope filter chips for the expense view (all / per member / shared).
// Free-floating pill chips (Apple Mail / KakaoTalk style): the active chip fills
// with its identity color, the rest stay quiet card pills. Display data lives in
// the summary cards above; these chips own filtering.
"use client";

import { SCOPE_ALL, SCOPE_SHARED } from "@/lib/expense-scope";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/db";

type Chip = {
  key: string;
  label: string;
  /** Identity fill for the active state; also the dot color when inactive. */
  color: string;
  showDot: boolean;
};

type Props = {
  members: Member[];
  scope: string;
  onScopeChange: (scope: string) => void;
};

export function ExpenseScopeSegments({ members, scope, onScopeChange }: Props) {
  const chips: Chip[] = [
    { key: SCOPE_ALL, label: "전체", color: "var(--primary)", showDot: false },
    ...members.map((member) => ({
      key: member.id,
      label: member.name,
      color: `var(--${member.color})`,
      showDot: true,
    })),
    {
      key: SCOPE_SHARED,
      label: "공용",
      color: "var(--muted-foreground)",
      showDot: true,
    },
  ];

  return (
    <div
      aria-label="지출 범위 선택"
      className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain px-0.5 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = scope === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={active}
            onClick={() => onScopeChange(chip.key)}
            className={cn(
              "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px]",
              "transition-[background-color,color,box-shadow,scale] duration-200 ease-out active:scale-[0.96]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active
                ? "font-semibold text-white shadow-xs"
                : "bg-card font-medium text-muted-foreground shadow-xs ring-1 ring-foreground/5 hover:text-foreground",
            )}
            style={active ? { backgroundColor: chip.color } : undefined}
          >
            {chip.showDot && !active ? (
              <span
                aria-hidden
                className="inline-block size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: chip.color }}
              />
            ) : null}
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

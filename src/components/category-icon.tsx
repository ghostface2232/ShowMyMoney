// Tinted-circle category glyph. Shared by expense rows, the breakdown card, and chips
// so a category reads as the same object everywhere.
import { getCategoryVisual } from "@/lib/category-visual";
import { cn } from "@/lib/utils";

type Props = {
  categoryId: string | null;
  categoryName: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function CategoryIcon({
  categoryId,
  categoryName,
  size = "md",
  className,
}: Props) {
  const { icon: Icon, color } = getCategoryVisual(categoryId, categoryName);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "md" ? "size-10" : "size-7",
        className,
      )}
      style={{
        color,
        backgroundColor: `color-mix(in oklab, ${color} 13%, transparent)`,
      }}
    >
      <Icon className={size === "md" ? "size-[18px]" : "size-3.5"} strokeWidth={2} />
    </span>
  );
}

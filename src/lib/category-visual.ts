// Maps expense categories to a stable icon + identity color for tinted-circle glyphs.
// Icons match by Korean keyword; colors hash from the category id so a category keeps
// the same hue everywhere (rows, breakdown bars, chips) regardless of monthly rank.
import {
  Baby,
  Bus,
  CircleDashed,
  Clapperboard,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  PiggyBank,
  Plane,
  ReceiptText,
  Shirt,
  ShoppingBasket,
  Smartphone,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from "lucide-react";

const ICON_RULES: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /카페|커피|간식|디저트|음료/, icon: Coffee },
  { pattern: /식비|식사|외식|음식|밥/, icon: UtensilsCrossed },
  { pattern: /술|회식|모임|유흥/, icon: Wine },
  { pattern: /교통|차량|주유|자동차|택시|버스|지하철/, icon: Bus },
  { pattern: /주거|관리|월세|전세|공과|집/, icon: Home },
  { pattern: /생활|마트|장보기|잡화|용품/, icon: ShoppingBasket },
  { pattern: /의료|건강|병원|약|운동|헬스/, icon: HeartPulse },
  { pattern: /여가|문화|취미|영화|공연|게임/, icon: Clapperboard },
  { pattern: /쇼핑|의류|옷|패션|미용|뷰티/, icon: Shirt },
  { pattern: /여행|숙소|항공/, icon: Plane },
  { pattern: /교육|학원|책|도서|강의/, icon: GraduationCap },
  { pattern: /경조|선물|축의|조의|기념/, icon: Gift },
  { pattern: /통신|인터넷|폰|구독|멤버십/, icon: Smartphone },
  { pattern: /반려|펫|강아지|고양이/, icon: PawPrint },
  { pattern: /육아|아이|아기|자녀/, icon: Baby },
  { pattern: /저축|보험|금융|투자|이자/, icon: PiggyBank },
];

const IDENTITY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export type CategoryVisual = {
  icon: LucideIcon;
  /** CSS color value for the glyph; use with a low-alpha background tint. */
  color: string;
};

const UNCATEGORIZED_VISUAL: CategoryVisual = {
  icon: CircleDashed,
  color: "var(--muted-foreground)",
};

// FNV-1a: cheap, stable string hash for identity color assignment.
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Stable, distinct identity colors for a set of series (e.g. growth-chart groups), handed
// out in creation order along the palette (green, blue, amber, purple, rose). Display order
// never matters, so reordering can't recolor a series, and the first series always gets the
// brand-adjacent green rather than a hash landing an asset on the "negative"-looking rose.
export function assignIdentityColors(
  items: { id: string; created_at: string }[],
): Map<string, string> {
  const ordered = [...items].sort((a, b) =>
    a.created_at === b.created_at
      ? a.id.localeCompare(b.id)
      : a.created_at.localeCompare(b.created_at),
  );
  return new Map(
    ordered.map((item, index) => [
      item.id,
      IDENTITY_COLORS[index % IDENTITY_COLORS.length],
    ]),
  );
}

export function getCategoryVisual(
  id: string | null,
  name: string | null,
): CategoryVisual {
  if (!id) return UNCATEGORIZED_VISUAL;
  const matched = name
    ? ICON_RULES.find((rule) => rule.pattern.test(name))?.icon
    : undefined;
  return {
    icon: matched ?? ReceiptText,
    color: IDENTITY_COLORS[hashString(id) % IDENTITY_COLORS.length],
  };
}

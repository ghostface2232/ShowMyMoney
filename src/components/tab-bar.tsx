// iOS-style bottom tab bar for switching between the asset and expense pages.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReceiptText, Wallet, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/", label: "자산", icon: Wallet },
  { href: "/expenses", label: "지출", icon: ReceiptText },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="페이지 전환"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/80 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2 text-[11px] font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

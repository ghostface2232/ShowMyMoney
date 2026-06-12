// Expense page top header. Profile menu on the left, asset/expense tabs in the center, expense management on the right.
import { ExpenseManagementDialog } from "@/components/expense-management-dialog";
import { NavTabs } from "@/components/nav-tabs";
import { ProfileMenu } from "@/components/profile-menu";
import type { ExpenseCategory, Member } from "@/types/db";

type ExpenseHeaderProps = {
  displayName: string;
  firstUsedAt: string;
  members: Member[];
  categories: ExpenseCategory[];
};

export function ExpenseHeader({
  displayName,
  firstUsedAt,
  members,
  categories,
}: ExpenseHeaderProps) {
  return (
    <header>
      <div className="relative mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
        <ProfileMenu displayName={displayName} firstUsedAt={firstUsedAt} />
        <NavTabs className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <div className="grid shrink-0 grid-cols-1 gap-2">
          <ExpenseManagementDialog members={members} categories={categories} />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:hidden">
        <NavTabs />
      </div>
    </header>
  );
}

// Expense page top header. Profile menu on the left, expense management (members/categories) on the right.
import { ExpenseManagementDialog } from "@/components/expense-management-dialog";
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
      <div className="mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
        <ProfileMenu displayName={displayName} firstUsedAt={firstUsedAt} />
        <div className="grid shrink-0 grid-cols-1 gap-2">
          <ExpenseManagementDialog members={members} categories={categories} />
        </div>
      </div>
    </header>
  );
}

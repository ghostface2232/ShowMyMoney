// Expense dashboard entry point. Validates the session, then SSRs the selected month's (?ym=) expense data.
import { redirect } from "next/navigation";

import { getExpenseDashboardData } from "@/actions/expense-dashboard";
import { getProfile } from "@/actions/profile";
import { ExpenseHeader } from "@/components/expense-header";
import { ExpenseView } from "@/components/expense-view";
import { getSession } from "@/lib/session";
import { currentYearMonth, isValidYearMonth } from "@/lib/year-month";

type Props = {
  searchParams: Promise<{ ym?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  const { ym } = await searchParams;
  const parsed = Number(ym);
  const yearMonth = isValidYearMonth(parsed) ? parsed : currentYearMonth();

  const [dashboard, profile] = await Promise.all([
    getExpenseDashboardData(yearMonth),
    getProfile(),
  ]);

  return (
    <>
      <ExpenseHeader
        displayName={profile.displayName}
        firstUsedAt={profile.firstUsedAt}
        members={dashboard.members}
        categories={dashboard.categories}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-8">
        <ExpenseView dashboard={dashboard} />
      </main>
    </>
  );
}

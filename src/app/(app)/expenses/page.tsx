// Expense dashboard entry point. SSRs the selected month's (?ym=) expense data.
// Session guard and the shared header live in the (app) layout.
import { getExpenseDashboardData } from "@/actions/expense-dashboard";
import { ExpenseView } from "@/components/expense-view";
import { currentYearMonth, isValidYearMonth } from "@/lib/year-month";

type Props = {
  searchParams: Promise<{ ym?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const { ym } = await searchParams;
  const parsed = Number(ym);
  const yearMonth = isValidYearMonth(parsed) ? parsed : currentYearMonth();

  const dashboard = await getExpenseDashboardData(yearMonth);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-3 pb-28 md:px-8">
      <ExpenseView dashboard={dashboard} />
    </main>
  );
}

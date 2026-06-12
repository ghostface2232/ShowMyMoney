// Persistent chrome for the main tab pages: session guard plus the shared header
// ("OO의 자산 관리" + actions). The header stays mounted across tab navigations;
// only the content below it slides via MotionShell.
import { redirect } from "next/navigation";

import { listEntriesBySnapshot } from "@/actions/entries";
import { listExpenseCategories } from "@/actions/expense-categories";
import { listGoals } from "@/actions/goals";
import { listMembers } from "@/actions/members";
import { getProfile } from "@/actions/profile";
import { listSnapshots } from "@/actions/snapshots";
import { HeaderActions } from "@/components/header-actions";
import { MotionShell } from "@/components/motion-shell";
import { ProfileMenu } from "@/components/profile-menu";
import { getSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session.accountId || !session.displayName) {
    redirect("/login");
  }

  const [profile, snapshots, goals, members, categories] = await Promise.all([
    getProfile(),
    listSnapshots(),
    listGoals(),
    listMembers(),
    listExpenseCategories(),
  ]);

  const latest = snapshots[0];
  const latestEntries = latest ? await listEntriesBySnapshot(latest.id) : {};
  const currentTotalAssets = Object.values(latestEntries).reduce(
    (sum, entry) => sum + Number(entry.amount),
    0,
  );

  return (
    <>
      <header>
        <div className="mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
          <ProfileMenu
            displayName={profile.displayName}
            firstUsedAt={profile.firstUsedAt}
          />
          <HeaderActions
            snapshots={snapshots.map((snapshot) => ({
              id: snapshot.id,
              year_month: snapshot.year_month,
            }))}
            goals={goals}
            currentTotalAssets={currentTotalAssets}
            hasSnapshot={snapshots.length > 0}
            members={members}
            categories={categories}
          />
        </div>
      </header>
      <MotionShell>{children}</MotionShell>
    </>
  );
}

// Top dashboard header. Profile menu on the left, asset/expense tabs in the center, global actions (month management / goal analysis) on the right.
import { GoalDialog } from "@/components/goal-dialog";
import { MonthManagementButton } from "@/components/month-management-button";
import { NavTabs } from "@/components/nav-tabs";
import { ProfileMenu } from "@/components/profile-menu";
import type { Goal } from "@/types/db";

type AppHeaderProps = {
  displayName: string;
  firstUsedAt: string;
  snapshots: Array<{ id: string; year_month: number }>;
  goals: Goal[];
  currentTotalAssets: number;
  hasSnapshot: boolean;
};

export function AppHeader({
  displayName,
  firstUsedAt,
  snapshots,
  goals,
  currentTotalAssets,
  hasSnapshot,
}: AppHeaderProps) {
  return (
    <header>
      <div className="relative mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
        <ProfileMenu displayName={displayName} firstUsedAt={firstUsedAt} />
        <NavTabs className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:flex" />
        <div className="grid shrink-0 grid-cols-1 gap-2">
          <MonthManagementButton snapshots={snapshots} />
          <GoalDialog
            goals={goals}
            currentTotalAssets={currentTotalAssets}
            hasSnapshot={hasSnapshot}
          />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:hidden">
        <NavTabs />
      </div>
    </header>
  );
}

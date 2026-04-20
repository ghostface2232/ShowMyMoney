// 대시보드 최상단 헤더. 좌측 프로필 메뉴, 우측 글로벌 액션(달 관리 / 목표 분석).
import { GoalDialog } from "@/components/goal-dialog";
import { MonthManagementButton } from "@/components/month-management-button";
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
    <header className="sticky top-0 z-30 bg-background/70 backdrop-blur">
      <div className="mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
        <ProfileMenu displayName={displayName} firstUsedAt={firstUsedAt} />
        <div className="grid shrink-0 grid-cols-1 gap-2">
          <MonthManagementButton snapshots={snapshots} />
          <GoalDialog
            goals={goals}
            currentTotalAssets={currentTotalAssets}
            hasSnapshot={hasSnapshot}
          />
        </div>
      </div>
    </header>
  );
}

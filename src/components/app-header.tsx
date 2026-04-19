// 대시보드 최상단 헤더. 좌측 계정 정보, 우측 글로벌 액션(달 관리 / 목표 분석).
import { MonthManagementButton } from "@/components/month-management-button";
import { GoalAnalysisButton } from "@/components/goal-analysis-button";

type AppHeaderProps = {
  displayName: string;
  snapshots: Array<{ id: string; year_month: number }>;
};

export function AppHeader({ displayName, snapshots }: AppHeaderProps) {
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium"
          >
            {initial}
          </span>
          <span className="text-sm font-medium">{displayName}</span>
        </div>
        <div className="flex items-center gap-2">
          <MonthManagementButton snapshots={snapshots} />
          <GoalAnalysisButton />
        </div>
      </div>
    </header>
  );
}

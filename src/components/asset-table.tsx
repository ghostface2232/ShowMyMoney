// 월별 자산 스냅샷 테이블 영역. 현재는 "데이터 없음" placeholder만 렌더한다.
import { Card, CardContent } from "@/components/ui/card";

export function AssetTable() {
  return (
    <Card>
      <CardContent className="flex min-h-60 items-center justify-center text-sm text-muted-foreground">
        데이터 없음
      </CardContent>
    </Card>
  );
}

// 헤더 아래의 가로 요약 카드 스트립. 현재는 빈 플레이스홀더 4개만 렌더한다.
import { Card } from "@/components/ui/card";

export function SummaryCards() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="h-24" />
      ))}
    </div>
  );
}

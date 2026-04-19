// 헤더 아래의 요약 스트립. 하나의 가로 Card를 4열로 나누고 열 사이에 상하 여백을 둔 얇은 구분선을 둔다.
import { Fragment } from "react";

import { Card } from "@/components/ui/card";

const COLUMN_COUNT = 4;

export function SummaryCards() {
  return (
    <Card className="flex h-20 flex-row items-stretch gap-0 py-0 shadow-none ring-0">
      {Array.from({ length: COLUMN_COUNT }).map((_, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <div
              aria-hidden
              className="my-4 w-px shrink-0 bg-border"
            />
          ) : null}
          <div className="flex flex-1 flex-col justify-center px-6" />
        </Fragment>
      ))}
    </Card>
  );
}

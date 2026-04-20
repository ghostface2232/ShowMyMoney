// 오프라인 폴백 페이지. 서비스 워커가 네트워크 실패 시 document destination 요청에 대해 이 페이지를 반환한다.
"use client";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">오프라인 상태예요</h1>
        <p className="text-muted-foreground text-sm">
          네트워크에 연결되면 다시 시도할 수 있어요. 캐시된 화면은 그대로 볼 수 있습니다.
        </p>
      </div>
      <Button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      >
        다시 시도
      </Button>
    </main>
  );
}

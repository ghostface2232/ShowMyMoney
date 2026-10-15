// Offline fallback page. The service worker returns this page for document destination requests when the network fails.
"use client";

import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      {/* The service worker serves this page under the requested URL (e.g. "/"), so the
          tab bar can't hide itself by pathname; its tabs can't load offline anyway. */}
      <style>{`[data-slot="tab-bar"] { display: none; }`}</style>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">오프라인 상태예요</h1>
        <p className="text-muted-foreground text-sm">
          네트워크에 연결되면 다시 시도할 수 있어요.
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

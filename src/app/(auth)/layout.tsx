// 인증 페이지 전용 레이아웃. 헤더 없이 뷰포트 중앙에 카드를 띄운다.
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}

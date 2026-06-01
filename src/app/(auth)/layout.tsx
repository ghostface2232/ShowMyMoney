// Auth-only layout. Centers a card in the viewport with no header.
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      {children}
    </div>
  );
}

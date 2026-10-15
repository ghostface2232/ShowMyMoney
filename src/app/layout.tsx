// Root layout. Attaches global font variables, the bottom tab bar, sonner Toaster, and PWA metadata.
// Route transitions live in the (app) group layout so the shared header persists across tabs.
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { TabBar } from "@/components/tab-bar";
import { Toaster } from "@/components/ui/sonner";
import { SquircleCorners } from "@/components/squircle-corners";
import { ViewportSync } from "@/components/viewport-sync";
import { SCROLL_CONTAINER_ID } from "@/lib/scroll-memory";

const sfPro = localFont({
  src: [
    {
      path: "../../public/fonts/SFProKR-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/SFProKR-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ShowMyMoney",
  description: "월별 자산 스냅샷과 저축 목표 분석",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "ShowMyMoney",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#05AA5D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Edge-to-edge: without "cover", iOS reports every env(safe-area-inset-*) as 0, so the
  // tab bar and bottom sheets would sit on top of the home indicator.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${sfPro.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      {/* App-shell scrolling: the document itself never scrolls — all scrolling happens
          inside the container below. In Safari this keeps the toolbars from collapsing/
          expanding on scroll, so the fixed tab bar never gets pushed around; in standalone
          (home screen) mode the behavior is identical. overscroll-contain keeps iOS's native
          rubber-band bounce on the container without chaining into the locked document. */}
      <body className="h-full overflow-hidden bg-background text-foreground">
        <div
          id={SCROLL_CONTAINER_ID}
          className="flex h-full flex-col overflow-y-auto overscroll-y-contain pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]"
        >
          {children}
        </div>
        <TabBar />
        {/* Top-center like iOS banners: a bottom toast would land on the floating tab bar
            or behind the keyboard. */}
        <Toaster position="top-center" />
        <ViewportSync />
        <SquircleCorners />
      </body>
    </html>
  );
}

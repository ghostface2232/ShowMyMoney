// Root layout. Attaches global font variables, the bottom tab bar, sonner Toaster, and PWA metadata.
// Route transitions live in the (app) group layout so the shared header persists across tabs.
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { TabBar } from "@/components/tab-bar";
import { Toaster } from "@/components/ui/sonner";

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
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <TabBar />
        <Toaster />
      </body>
    </html>
  );
}

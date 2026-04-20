// PWA Web App Manifest. ShowMyMoney의 설치 메타 정보 (이름, 아이콘, 테마 색)를 정의한다.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShowMyMoney",
    short_name: "ShowMyMoney",
    description: "Monthly household asset tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f8f8",
    theme_color: "#4f46e5",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

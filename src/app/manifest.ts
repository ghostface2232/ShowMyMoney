// PWA Web App Manifest. Defines ShowMyMoney's install metadata (name, icons, theme color).
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

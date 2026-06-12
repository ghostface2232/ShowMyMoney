import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  experimental: {
    // Keep visited/prefetched dynamic pages (assets <-> expenses) in the client
    // router cache so tab switches render instantly without a refetch flash.
    // Server actions still invalidate the cache via revalidatePath after writes.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default withSerwist(nextConfig);

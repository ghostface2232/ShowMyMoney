import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Revision for the precached offline page; a fresh value per build keeps it current.
const offlineRevision = crypto.randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // The SW's document fallback can only serve /~offline if it is precached. The page is
  // static and account-independent, so caching it carries no cross-account risk.
  additionalPrecacheEntries: [{ url: "/~offline", revision: offlineRevision }],
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

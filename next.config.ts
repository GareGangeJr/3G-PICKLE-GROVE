import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep server-side Date calendar math aligned with the court timezone.
  env: {
    TZ: "Asia/Manila",
  },
};

export default nextConfig;

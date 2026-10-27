import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tell Turbopack to ignore these Node modules on the client
  serverExternalPackages: ["fs", "path", "os", "module", "v8", "perf_hooks"],
  
  // If you still have issues, you can also try this experimental flag
  experimental: {
    turbo: {
      resolveAlias: {
        fs: { browser: "./empty-module.ts" },
        path: { browser: "./empty-module.ts" },
        os: { browser: "./empty-module.ts" },
      },
    },
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Force Next.js to NOT use Turbopack for build (uses standard Webpack)
  experimental: {
    webpackBuildWorker: true,
  },
  // 2. Tell Webpack to ignore 'fs' and 'path' (which caused the error)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;

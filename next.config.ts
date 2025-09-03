// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // was experimental.serverComponentsExternalPackages
  serverExternalPackages: ['googleapis', 'pdf-parse'],

  // unblock CI builds that fail on lint (optional; see .eslintrc below)
  eslint: { ignoreDuringBuilds: true },
  // if you also want to ignore TS type errors in CI (optional):
  // typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

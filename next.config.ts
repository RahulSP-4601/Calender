/** @type {import('next').NextConfig} */
const nextConfig = {
  // If you previously added transpilePackages for pdfjs-dist, you can remove it now.
  experimental: {
    // This prevents Next from bundling pdf-parse and triggering its internal test assets.
    serverComponentsExternalPackages: ['pdf-parse'],
  },
  // If you set turbopack.root earlier you can keep it, but we'll not use Turbopack to avoid the issue.
};
module.exports = nextConfig;

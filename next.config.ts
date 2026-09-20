import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Generate every page at build time for static hosting.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@designcodeio/threeui'],
};

export default nextConfig;

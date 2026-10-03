import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/journey', destination: '/timeline', permanent: true },
      { source: '/history', destination: '/diary', permanent: true },
    ];
  },
};

export default nextConfig;

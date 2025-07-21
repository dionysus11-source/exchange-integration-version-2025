import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-dionysus11.duckdns.org/:path*',
      },
    ];
  },
};

export default nextConfig;

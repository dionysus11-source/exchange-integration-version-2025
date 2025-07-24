import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://backend-dionysus11.duckdns.org:8443/:path*',
      },
    ];
  },
};

export default nextConfig;

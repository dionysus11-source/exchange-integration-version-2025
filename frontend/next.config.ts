import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://dionysus11.ddns.net:3001/:path*',
      },
    ];
  },
};

export default nextConfig;

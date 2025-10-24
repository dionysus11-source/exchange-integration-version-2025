import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://n100-mini-pc:3001/:path*',
      },
    ];
  },
};

export default nextConfig;

import nextEnv from '@next/env';
import path from 'path';
import { fileURLToPath } from 'url';

const { loadEnvConfig } = nextEnv;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvConfig(rootDir);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker builds only — Vercel handles its own build
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  async redirects() {
    return [
      {
        source: '/admin/worker',
        destination: '/admin/workers',
        permanent: true,
      },
      {
        source: '/worker/order',
        destination: '/worker/orders',
        permanent: true,
      },
      {
        source: '/admin/order',
        destination: '/admin/orders',
        permanent: true,
      }
    ];
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://backend-sigma-topaz-29.vercel.app';
    const cleanBackendUrl = backendUrl.replace(/\/+$/, '').replace(/\/api$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${cleanBackendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

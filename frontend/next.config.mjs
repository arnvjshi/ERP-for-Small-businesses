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
};

export default nextConfig;

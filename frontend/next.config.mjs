/** @type {import('next').NextConfig} */
const nextConfig = {
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

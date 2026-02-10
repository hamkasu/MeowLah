/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for Railway (self-contained Node.js server)
  // Produces a minimal .next/standalone folder with only production deps
  output: 'standalone',

  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Image optimization configuration for S3-hosted media
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: 'media.meowlah.my',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Headers for PWA and security
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // Proxy API requests to the backend so the browser never calls a
  // cross-origin URL.  Works with Railway internal networking too.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
    ];
  },

  // Enable experimental features
  experimental: {
    // Optimize package imports for smaller bundles
    optimizePackageImports: ['date-fns', 'react-hot-toast'],
  },
};

module.exports = nextConfig;

import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const devApiOrigin = process.env.API_DEV_PROXY_ORIGIN ?? 'http://localhost:3000';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@mytask/api-client', '@mytask/i18n', '@mytask/tokens', '@mytask/types'],
  async headers() {
    // The staff panel is never indexed (ADR-010); Caddy sets the same header in production.
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/v1/:path*', destination: `${devApiOrigin}/api/v1/:path*` }]
      : [];
  },
};

export default config;

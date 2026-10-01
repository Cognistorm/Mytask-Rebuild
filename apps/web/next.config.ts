import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Local development without Caddy: the browser calls /api/v1 on this origin and Next forwards it to the
// API, so cookies stay first-party exactly as behind Caddy in production (architecture §5.1).
const devApiOrigin = process.env.API_DEV_PROXY_ORIGIN ?? 'http://localhost:3000';

const config: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(import.meta.dirname, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  // src/proxy.ts removes trailing slashes together with the /ka prefix in one 301 (url-map §1).
  skipTrailingSlashRedirect: true,
  transpilePackages: ['@mytask/api-client', '@mytask/i18n', '@mytask/tokens', '@mytask/types'],
  // `/app-return/*` URLs can carry one-time codes (social login, url-map §7): no Referer from the very first
  // request (the <meta> tag comes too late for early asset requests), and never indexed.
  async headers() {
    const headers = [
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ];
    return [
      { source: '/app-return/:path*', headers },
      { source: '/en/app-return/:path*', headers },
    ];
  },
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/v1/:path*', destination: `${devApiOrigin}/api/v1/:path*` }]
      : [];
  },
};

export default config;

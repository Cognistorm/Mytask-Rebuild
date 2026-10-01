// Shared ESLint flat config. Usage in a workspace: `export default mytaskConfig({ app: 'web' })`.
// The import-boundary rules make architecture §1 structural: clients (web, admin, mobile) can only
// reach the API through the generated @mytask/api-client, never through API code or a database client.
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const CLIENT_APPS = new Set(['web', 'admin', 'mobile']);

/** Imports a client app may never use (architecture §1, ADR-001). */
const clientForbidden = [
  {
    group: ['@mytask/api', '@mytask/api/*', '**/apps/api/**', '**/api/src/**', '**/api/prisma/**'],
    message: 'Clients must not import API code. Use @mytask/api-client (architecture §1).',
  },
  {
    group: ['@prisma/*', 'prisma', 'pg', 'ioredis', 'bullmq'],
    message: 'Clients have no database, Redis or queue access. Call the API (architecture §1).',
  },
];

/** Packages never import apps (architecture §4 dependency direction). */
const packageForbidden = [
  {
    group: ['@mytask/api', '@mytask/web', '@mytask/admin', '@mytask/mobile', '**/apps/**'],
    message: 'packages/* never import apps/* (architecture §4).',
  },
];

/**
 * @param {{ app?: 'api' | 'web' | 'admin' | 'mobile', kind?: 'app' | 'package' | 'tool', tsconfigRootDir?: string }} options
 */
export function mytaskConfig({ app, kind = 'app', tsconfigRootDir } = {}) {
  const patterns = CLIENT_APPS.has(app ?? '')
    ? clientForbidden
    : kind === 'package'
      ? packageForbidden
      : [];

  return tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/.next/**',
        '**/.expo/**',
        '**/.turbo/**',
        '**/coverage/**',
        '**/generated/**',
        '**/next-env.d.ts',
        '**/expo-env.d.ts',
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        globals: { ...globals.node, ...globals.browser },
        parserOptions: tsconfigRootDir ? { tsconfigRootDir } : {},
      },
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        // Off for the API: NestJS DI needs runtime class references in constructors.
        '@typescript-eslint/consistent-type-imports':
          app === 'api'
            ? 'off'
            : ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
        'no-restricted-imports': patterns.length ? ['error', { patterns }] : 'off',
        // React Native loads static assets (images, fonts) with require().
        '@typescript-eslint/no-require-imports': app === 'mobile' ? 'off' : 'error',
      },
    },
    ...(app === 'web' || app === 'admin'
      ? [
          {
            plugins: { '@next/next': nextPlugin },
            rules: {
              ...nextPlugin.configs.recommended.rules,
              ...nextPlugin.configs['core-web-vitals'].rules,
            },
          },
        ]
      : []),
    prettier,
  );
}

export default mytaskConfig();

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    { ignores: ['**/dist/**', 'apps/api/src/generated/prisma/**', 'test-results/**'] },
    {
        files: ['**/*.mjs'],
        languageOptions: { globals: { AbortController: 'readonly', AbortSignal: 'readonly', Buffer: 'readonly', console: 'readonly', fetch: 'readonly', process: 'readonly', structuredClone: 'readonly', URL: 'readonly' } },
        rules: eslint.configs.recommended.rules,
    },
    ...tseslint.configs.recommended.map(config => ({ ...config, files: ['**/*.ts'] })),
    { files: ['**/*.ts'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];

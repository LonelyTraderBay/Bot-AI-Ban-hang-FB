import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    { ignores: ['**/dist/**', 'test-results/**'] },
    {
        files: ['**/*.mjs'],
        languageOptions: { globals: { Buffer: 'readonly', console: 'readonly', fetch: 'readonly', process: 'readonly', structuredClone: 'readonly', URL: 'readonly' } },
        rules: eslint.configs.recommended.rules,
    },
    ...tseslint.configs.recommended.map(config => ({ ...config, files: ['**/*.ts'] })),
    { files: ['**/*.ts'], rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default tseslint.config(
 {ignores:['**/node_modules/**','**/dist/**','**/dist-demo/**','packages/**','evidence/**']},
 js.configs.recommended,
 ...tseslint.configs.recommended,
 {files:['apps/web/src/**/*.{ts,tsx}'],languageOptions:{globals:{...globals.browser,__MOCK__:'readonly'}},plugins:{'react-hooks':hooks},rules:{...hooks.configs.recommended.rules,'react-hooks/exhaustive-deps':'error','@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}}
);

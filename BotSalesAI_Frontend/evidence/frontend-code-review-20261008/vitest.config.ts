import { defineConfig } from 'vitest/config';
import base from '../../apps/web/vitest.config';
export default defineConfig({ ...base, test: { ...base.test, include: ['evidence/frontend-code-review-20261008/command-scope.test.tsx'] } });

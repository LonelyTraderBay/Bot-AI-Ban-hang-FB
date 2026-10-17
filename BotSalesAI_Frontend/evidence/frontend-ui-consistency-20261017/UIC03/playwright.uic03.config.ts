import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import config from '../../../playwright.config';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    ...config,
    testDir: here,
    testMatch: ['observe-worker-lifecycle.spec.ts'],
    testIgnore: [],
    globalSetup: '../../../tests/session/playwright-setup.ts',
    outputDir: path.resolve(here, '../../../test-results/frontend-ui-consistency-20261017-UIC03'),
});

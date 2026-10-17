import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { isolatedViteCacheDir } from '../../../scripts/vite-cache.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../');
const runId = process.env.BOTSALES_PLAYWRIGHT_RUN_ID || `uic07-targeted-${process.pid}-${randomUUID()}`;
process.env.BOTSALES_PLAYWRIGHT_RUN_ID = runId;
process.env.BOTSALES_VITE_CACHE_RUN_ID = runId;
const cacheDir = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId);
process.env.BOTSALES_VITE_CACHE_DIR = cacheDir;

export default defineConfig({
  testDir: path.join(projectRoot, 'tests'),
  testMatch: ['**/*.spec.ts'],
  testIgnore: ['**/built-demo-regression.spec.ts'],
  outputDir: path.join(projectRoot, 'test-results', 'uic07-route-state-corrective-targeted'),
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  use: { baseURL: 'http://127.0.0.1:5188', trace: 'retain-on-failure' },
  globalSetup: path.join(projectRoot, 'tests/session/playwright-setup.ts'),
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
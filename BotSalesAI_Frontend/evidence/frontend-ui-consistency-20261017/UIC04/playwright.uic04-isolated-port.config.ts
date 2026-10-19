import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { isolatedViteCacheDir } from '../../../scripts/vite-cache.mjs';
const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(evidenceDirectory, '../../..');
const runId = `uic04-${process.pid}-${randomUUID()}`;
const cacheDir = isolatedViteCacheDir(root, 'playwright-uic04-port5188', runId);
process.env.BOTSALES_VITE_CACHE_RUN_ID = runId;
process.env.BOTSALES_VITE_CACHE_DIR = cacheDir;
export default defineConfig({
  testDir: path.join(root, 'tests'), testMatch: ['**/*.spec.ts'], testIgnore: ['**/built-demo-regression.spec.ts'],
  outputDir: path.join(evidenceDirectory, 'playwright-output'), fullyParallel: false, workers: 1, timeout: 180_000,
  use: { baseURL: 'http://127.0.0.1:5188', trace: 'retain-on-failure' },
  globalSetup: path.join(root, 'tests/session/playwright-setup.ts'),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }, { name: 'firefox', use: { ...devices['Desktop Firefox'] } }],
});

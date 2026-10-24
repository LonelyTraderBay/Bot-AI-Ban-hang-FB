import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { isolatedViteCacheDir } from './scripts/vite-cache.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const runId = process.env.BOTSALES_PLAYWRIGHT_RUN_ID || `playwright-${process.pid}-${randomUUID()}`;
const { userAgent: _pinnedChromeUserAgent, ...desktopChrome } = devices['Desktop Chrome'];
process.env.BOTSALES_PLAYWRIGHT_RUN_ID = runId;
const cacheDir = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId);
const workers = process.env.BOTSALES_E2E_WORKERS ?? '1';
if (!/^[1-4]$/.test(workers)) throw new Error('BOTSALES_E2E_WORKERS must be an integer from 1 to 4.');

// Playwright workers inherit this ID; per-test Vite servers use a separate cache role.
process.env.BOTSALES_VITE_CACHE_RUN_ID = runId;
process.env.BOTSALES_VITE_CACHE_DIR = cacheDir;

export default defineConfig({
    testDir: './tests',
    testMatch: ['**/*.spec.ts'],
    testIgnore: ['**/built-demo-regression.spec.ts'],
    outputDir: path.join(projectRoot, 'test-results', runId),
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    workers: Number(workers),
    timeout: 180_000,
    use: { baseURL: 'http://127.0.0.1:5187', trace: 'retain-on-failure' },
    globalSetup:'./tests/session/playwright-setup.ts',
    projects: [
        { name: 'chromium', use: { ...desktopChrome, channel: 'chrome' } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
});

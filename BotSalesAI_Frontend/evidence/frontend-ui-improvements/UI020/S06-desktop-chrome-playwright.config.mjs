import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { isolatedViteCacheDir } from '../../../scripts/vite-cache.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const runId = `ui020-chrome-${process.pid}-${randomUUID()}`;
const cacheDir = isolatedViteCacheDir(projectRoot, 'playwright-webserver', runId);
const viteCli = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const webRoot = path.join(projectRoot, 'apps', 'web');

process.env.BOTSALES_VITE_CACHE_RUN_ID = runId;

export default defineConfig({
    testDir: path.join(projectRoot, 'tests'),
    fullyParallel: false,
    workers: 1,
    timeout: 180_000,
    // Do not spread Playwright's Desktop Chrome preset: it pins a stale
    // Chrome 153 User-Agent even when the actual installed Chrome is newer.
    use: {
        browserName: 'chromium',
        channel: 'chrome',
        baseURL: 'http://127.0.0.1:5173',
        viewport: { width: 1280, height: 720 },
        screen: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        trace: 'retain-on-failure',
    },
    webServer: {
        command: `"${process.execPath}" "${viteCli}" --mode demo --host 127.0.0.1`,
        cwd: webRoot,
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 90_000,
        env: {
            BOTSALES_VITE_CACHE_DIR: cacheDir,
            BOTSALES_VITE_CACHE_RUN_ID: runId,
        },
    },
    projects: [{ name: 'desktop-chrome', use: {} }],
});

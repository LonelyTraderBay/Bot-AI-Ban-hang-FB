import { randomUUID } from 'node:crypto';
import { devices, defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(projectRoot, 'apps/web');
const { userAgent: _pinnedChromeUserAgent, ...desktopChrome } = devices['Desktop Chrome'];
const viteCli = path.join(projectRoot, 'node_modules/vite/bin/vite.js');
const port = 4174;
const runId = process.env.BOTSALES_BUILT_DEMO_RUN_ID || `built-demo-${process.pid}-${randomUUID()}`;
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId)) throw new Error('Invalid built-demo run ID.');
process.env.BOTSALES_BUILT_DEMO_RUN_ID = runId;

export default defineConfig({
    testDir: './tests',
    outputDir: path.join(projectRoot, 'test-results', runId),
    testMatch: '**/built-demo-regression.spec.ts',
    fullyParallel: false,
    workers: 1,
    timeout: 180_000,
    expect: { timeout: 15_000 },
    use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
    webServer: {
        command: `"${process.execPath}" "${viteCli}" preview --outDir dist-demo --host 127.0.0.1 --port ${port} --strictPort`,
        cwd: webRoot,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
        timeout: 90_000,
        env: { NODE_ENV: 'production' },
    },
    projects: [
        { name: 'chromium-built-demo', use: { ...desktopChrome, channel: 'chrome' } },
        { name: 'firefox-built-demo', use: { ...devices['Desktop Firefox'] } },
    ],
});

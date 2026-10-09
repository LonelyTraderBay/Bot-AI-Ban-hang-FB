import { devices, defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(projectRoot, 'apps/web');
const viteCli = path.join(projectRoot, 'node_modules/vite/bin/vite.js');
const port = 4174;

export default defineConfig({
    testDir: './tests',
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
        { name: 'chromium-built-demo', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox-built-demo', use: { ...devices['Desktop Firefox'] } },
    ],
});

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: here,
    testMatch: 'fault-injection.spec.ts',
    outputDir: path.resolve(process.cwd(), 'test-results/uic03-worker-fault-injection'),
    timeout: 60_000,
    expect: { timeout: 20_000 },
    workers: 1,
    retries: 0,
    reporter: [
        ['line'],
        ['json', { outputFile: path.join(here, 'playwright-fault-injection.json') }],
    ],
    use: {
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ],
});

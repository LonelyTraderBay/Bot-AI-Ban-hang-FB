import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const initialEnv = { ...process.env };
for (const key of ['BOTSALES_PLAYWRIGHT_RUN_ID', 'BOTSALES_BUILT_DEMO_RUN_ID', 'BOTSALES_VITE_CACHE_RUN_ID']) delete initialEnv[key];
function load(file, env = initialEnv) {
    const source = `const {default:config}=await import(${JSON.stringify(pathToFileURL(path.join(root, file)).href)});console.log(JSON.stringify({outputDir:config.outputDir,cacheDir:process.env.BOTSALES_VITE_CACHE_DIR,runId:process.env.BOTSALES_PLAYWRIGHT_RUN_ID,builtRunId:process.env.BOTSALES_BUILT_DEMO_RUN_ID,workers:config.workers,forbidOnly:config.forbidOnly,trace:config.use.trace}));`;
    return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', source], { cwd: root, env, encoding: 'utf8', windowsHide: true }));
}
test('Playwright workers reuse their parent output/cache ID while independent runs remain isolated', () => {
    const runner = load('playwright.config.ts');
    const worker = load('playwright.config.ts', { ...initialEnv, BOTSALES_PLAYWRIGHT_RUN_ID: runner.runId });
    const independent = load('playwright.config.ts');
    assert.equal(worker.outputDir, runner.outputDir);
    assert.equal(worker.cacheDir, runner.cacheDir);
    assert.notEqual(independent.outputDir, runner.outputDir);
    assert.equal(path.dirname(runner.outputDir), path.join(root, 'test-results'));
});
test('built-demo artifacts use a stable private run directory instead of cleaning the parent test-results', () => {
    const runner = load('playwright.built-demo.config.ts');
    const worker = load('playwright.built-demo.config.ts', { ...initialEnv, BOTSALES_BUILT_DEMO_RUN_ID: runner.builtRunId });
    const independent = load('playwright.built-demo.config.ts');
    assert.equal(worker.outputDir, runner.outputDir);
    assert.notEqual(independent.outputDir, runner.outputDir);
    assert.equal(path.dirname(runner.outputDir), path.join(root, 'test-results'));
    assert.match(path.basename(runner.outputDir), /^built-demo-/);
});
test('built-demo rejects an inherited output ID that could escape the artifact root', () => {
    assert.throws(() => load('playwright.built-demo.config.ts', { ...initialEnv, BOTSALES_BUILT_DEMO_RUN_ID: '../sibling' }), /Invalid built-demo run ID/);
});

test('worker overrides stay bounded while local runs keep one worker and complete traces', () => {
    const local = { ...initialEnv }; delete local.BOTSALES_E2E_WORKERS;
    assert.equal(load('playwright.config.ts', local).workers, 1);
    for (const value of ['1', '2', '3', '4']) {
        const config = load('playwright.config.ts', { ...local, BOTSALES_E2E_WORKERS: value });
        assert.equal(config.workers, Number(value));
        assert.equal(config.trace, 'retain-on-failure');
    }
    for (const value of ['', '0', '5', '-1', '2.5', '02', '4x'])
        assert.throws(() => load('playwright.config.ts', { ...local, BOTSALES_E2E_WORKERS: value }), /integer from 1 to 4/);
});

test('CI rejects focused tests in both browser configs and keeps full failure traces', () => {
    for (const file of ['playwright.config.ts', 'playwright.built-demo.config.ts']) {
        const config = load(file, { ...initialEnv, CI: 'true' });
        assert.equal(config.forbidOnly, true);
        assert.equal(config.trace, 'retain-on-failure');
    }
});

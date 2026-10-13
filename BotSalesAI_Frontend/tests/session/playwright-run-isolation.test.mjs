import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '../..');
const initialEnv = { ...process.env };
for (const key of ['BOTSALES_PLAYWRIGHT_RUN_ID', 'BOTSALES_BUILT_DEMO_RUN_ID', 'BOTSALES_VITE_CACHE_RUN_ID']) delete initialEnv[key];
function load(file, env = initialEnv) {
    const source = `const {default:config}=await import(${JSON.stringify(pathToFileURL(path.join(root, file)).href)});console.log(JSON.stringify({outputDir:config.outputDir,cacheDir:process.env.BOTSALES_VITE_CACHE_DIR,runId:process.env.BOTSALES_PLAYWRIGHT_RUN_ID,builtRunId:process.env.BOTSALES_BUILT_DEMO_RUN_ID}));`;
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

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectedTests, requireExactTests } from './ci-partitions.mjs';

if (process.argv.length !== 2) throw new Error('Usage: node scripts/run-ci-built-demo.mjs');
const requested = process.env.BOTSALES_BUILT_DEMO_WORKERS ?? '1';
const workers = Number(requested), availableCpus = os.availableParallelism();
if (!/^[12]$/.test(requested) || workers > availableCpus) throw new Error('Unsupported built-demo runner capacity.');
console.log(JSON.stringify({ kind: 'built-demo-runner-capacity', configuredWorkers: workers, availableCpus }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-results', 'ci-built-demo-' + randomUUID());
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
const projects = ['chromium-built-demo', 'firefox-built-demo'];
const args = [cli, 'test', '--config=playwright.built-demo.config.ts',
    ...projects.map(project => '--project=' + project), '--workers=' + workers];
fs.mkdirSync(output, { recursive: true });
const discovery = spawnSync(process.execPath, [...args, '--list', '--reporter=json'],
    { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
if (discovery.error || discovery.status !== 0)
    throw new Error('Built-demo discovery failed: ' + (discovery.error?.message ?? discovery.stderr));
const expected = collectedTests(JSON.parse(discovery.stdout), projects);
for (const project of projects)
    if (expected.filter(t => t.test.projectName === project).length !== 3)
        throw new Error('Built-demo inventory must retain all three original cases per engine.');
// One immutable preview server; each project keeps its original serial file.
const reportPath = path.join(output, 'native.json');
const result = spawnSync(process.execPath, [...args, '--output=' + path.join(output, 'results'), '--reporter=line,json'],
    { cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath }, stdio: 'inherit', windowsHide: true });
if (result.error || result.status !== 0) process.exit(result.status || 1);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.config.workers !== workers) throw new Error('Built-demo configured worker count changed.');
const actual = collectedTests(report, projects);
requireExactTests(expected, actual, true);
for (const project of projects) {
    const tests = actual.filter(t => t.test.projectName === project);
    const engineWorkers = new Set(tests.map(t => t.test.results[0].workerIndex)).size;
    if (engineWorkers !== 1) throw new Error('Every built-demo engine must retain one serial worker.');
    console.log(JSON.stringify({ kind: 'built-demo-complete', project, configuredWorkers: workers,
        engineWorkers, selected: tests.length, ids: tests.map(t => t.id) }));
}

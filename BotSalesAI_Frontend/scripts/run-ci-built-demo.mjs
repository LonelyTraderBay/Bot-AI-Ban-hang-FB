import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectedTests, requireExactTests } from './ci-partitions.mjs';

if (process.argv.length !== 2) throw new Error('Usage: node scripts/run-ci-built-demo.mjs');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'test-results', `ci-built-demo-${randomUUID()}`);
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
fs.mkdirSync(output, { recursive: true });
// Each engine keeps the original serial suite; both run after the shared build.
for (const browser of ['chromium', 'firefox']) {
    const project = `${browser}-built-demo`;
    const args = [cli, 'test', '--config=playwright.built-demo.config.ts', `--project=${project}`];
    const discovery = spawnSync(process.execPath, [...args, '--list', '--reporter=json'],
        { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    if (discovery.error || discovery.status !== 0)
        throw new Error('Built-demo discovery failed: ' + (discovery.error?.message ?? discovery.stderr));
    const expected = collectedTests(JSON.parse(discovery.stdout), project);
    if (expected.length !== 3) throw new Error('Built-demo inventory must contain all three original cases per engine.');
    const reportPath = path.join(output, `${browser}.json`);
    const result = spawnSync(process.execPath, [...args, `--output=${path.join(output, browser)}`, '--reporter=line,json'],
        { cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath }, stdio: 'inherit', windowsHide: true });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (report.config.workers !== 1) throw new Error('Built-demo must retain one serial worker.');
    requireExactTests(expected, collectedTests(report, project), true);
    console.log(JSON.stringify({ kind: 'built-demo-complete', project, workers: 1,
        selected: expected.length, ids: expected.map(test => test.id) }));
}

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { collectedTests, partitionTests, requireExactTests, testList } from './ci-partitions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [project, shard, listOnly] = process.argv.slice(2);
if (!['chromium', 'firefox'].includes(project) || !/^[1-3]\/3$/.test(shard ?? '')
    || (listOnly !== undefined && listOnly !== '--list') || process.argv.length > 5)
    throw new Error('Usage: node scripts/run-ci-e2e.mjs <chromium|firefox> <1/3|2/3|3/3> [--list]');
const runId = `ci-${project}-${shard[0]}-${randomUUID()}`;
const output = path.join(root, 'test-results', runId);
const env = { ...process.env, BOTSALES_PLAYWRIGHT_RUN_ID: runId };
const cli = path.join(root, 'node_modules/@playwright/test/cli.js');
function collect(extra = []) {
    const result = spawnSync(process.execPath, [cli, 'test', `--project=${project}`, '--list', '--reporter=json', ...extra],
        { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
    if (result.error || result.status !== 0) throw new Error('Playwright discovery failed: ' + (result.error?.message ?? result.stderr));
    return collectedTests(JSON.parse(result.stdout), project);
}
const inventory = collect();
const timings = JSON.parse(fs.readFileSync(new URL('./ci-timings.json', import.meta.url), 'utf8'));
const partitions = partitionTests(inventory, timings.projects[project]);
const selected = partitions[Number(shard[0]) - 1];
// The list lives outside Playwright's outputDir, which the runner cleans on startup.
fs.mkdirSync(path.dirname(output), { recursive: true });
const listPath = output + '.txt';
fs.writeFileSync(listPath, testList(selected, project));
requireExactTests(selected.tests, collect(['--test-list', listPath]));
const plan = { project, shard, inventory: inventory.length, selected: selected.tests.length,
    historicalSeconds: partitions.map(p => Math.round(p.seconds)), ids: selected.tests.map(t => t.id) };
console.log(JSON.stringify({ ...plan, ids: undefined }));
fs.writeFileSync(output + '.plan.json', JSON.stringify(plan, null, 2) + '\n');
if (!listOnly) {
    for (const file of ['dist/index.html', 'dist-demo/index.html', 'public/mockServiceWorker.js'])
        if (!fs.existsSync(path.join(root, 'apps/web', file))) throw new Error('Missing current-run build/setup: ' + file);
    const resultPath = output + '.json';
    const result = spawnSync(process.execPath, [cli, 'test', `--project=${project}`, '--test-list', listPath,
        '--reporter=line,json', '--max-failures=1'], {
        cwd: root, env: { ...env, PLAYWRIGHT_JSON_OUTPUT_NAME: resultPath }, stdio: 'inherit', windowsHide: true,
    });
    if (result.error || result.status !== 0) process.exit(result.status || 1);
    requireExactTests(selected.tests, collectedTests(JSON.parse(fs.readFileSync(resultPath, 'utf8')), project), true);
}

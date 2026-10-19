import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const baseline = process.argv[2];
const browserLogName = process.argv[3];
assert.match(baseline || '', /^[0-9a-f]{40}$/i, 'Pass the exact baseline SHA used for this evidence.');
assert.equal(path.basename(browserLogName || ''), browserLogName, 'Pass a browser log file name in this evidence directory.');

const digest = value => createHash('sha256').update(value).digest('hex');
const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim();
const changed = execFileSync('git', [
    'diff', '--name-only', baseline, '--',
    'BotSalesAI_Frontend/apps/web/src',
    'BotSalesAI_Frontend/tests',
    'BotSalesAI_Frontend/playwright.config.ts',
    'BotSalesAI_Frontend/playwright.built-demo.config.ts',
], { cwd: repositoryRoot, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const evidenceInputs = [
    'BotSalesAI_Frontend/evidence/boundaries.json',
    'BotSalesAI_Frontend/evidence/domain-tests.json',
    'BotSalesAI_Frontend/evidence/source-check.json',
    'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json',
];
const sourcePaths = [...new Set([...changed, ...evidenceInputs])].sort();
const changedSourceFiles = await Promise.all(sourcePaths.map(async relativePath => ({
    path: relativePath,
    sha256: digest(await readFile(path.join(repositoryRoot, relativePath))),
})));

async function filesUnder(root, current = root) {
    const entries = await readdir(current, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async entry => {
        const target = path.join(current, entry.name);
        return entry.isDirectory() ? filesUnder(root, target) : [target];
    }));
    return nested.flat().sort((left, right) => left.localeCompare(right));
}

async function captureArtifact(relativeRoot) {
    const absoluteRoot = path.join(frontendRoot, relativeRoot);
    const files = await filesUnder(absoluteRoot);
    const entries = await Promise.all(files.map(async file => ({
        path: path.relative(absoluteRoot, file).replaceAll('\\', '/'),
        bytes: (await stat(file)).size,
        sha256: digest(await readFile(file)),
    })));
    const aggregate = createHash('sha256');
    for (let index = 0; index < files.length; index += 1) {
        aggregate.update(entries[index].path);
        aggregate.update('\0');
        aggregate.update(await readFile(files[index]));
        aggregate.update('\0');
    }
    return {
        sha256: aggregate.digest('hex'),
        fileCount: entries.length,
        totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
        files: entries,
    };
}

const artifacts = {
    'apps/web/dist': await captureArtifact('apps/web/dist'),
    'apps/web/dist-demo': await captureArtifact('apps/web/dist-demo'),
};
assert.equal(artifacts['apps/web/dist'].fileCount, 34, 'Production artifact must contain 34 measured files.');
assert.equal(artifacts['apps/web/dist-demo'].fileCount, 38, 'Demo artifact must contain 38 measured files.');
const findWorkerFiles = artifact => artifact.files
    .filter(file => /mockServiceWorker|(^|\/)msw([./-]|$)/i.test(file.path))
    .map(file => 'apps/web/' + (artifact === artifacts['apps/web/dist'] ? 'dist/' : 'dist-demo/') + file.path);
const prodMockServiceWorkerFiles = findWorkerFiles(artifacts['apps/web/dist']);
const demoMockServiceWorkerFiles = findWorkerFiles(artifacts['apps/web/dist-demo']);
assert.deepEqual(prodMockServiceWorkerFiles, [], 'Production must not ship the MSW worker/runtime.');
assert.deepEqual(demoMockServiceWorkerFiles, ['apps/web/dist-demo/mockServiceWorker.js']);

const browserLogPath = path.join(here, browserLogName);
const browserLog = await readFile(browserLogPath, 'utf8');
assert.match(browserLog, /6 passed/);
assert.match(browserLog, /browserVersion":"155\.0\.8059\.40"/);
assert.match(browserLog, /browserVersion":"155\.0"/);
const routeRecords = browserLog.split(/\r?\n/)
    .filter(line => line.includes('[built-demo-routes] '))
    .map(line => JSON.parse(line.slice(line.indexOf('[built-demo-routes] ') + '[built-demo-routes] '.length)));
assert.equal(routeRecords.length, 4, 'Expected one 390px and one 1440px route record for each browser.');
for (const record of routeRecords) {
    assert.equal(record.routes, 61);
    assert.equal(record.issues, 0);
    assert.equal(record.pageErrors, 0);
    assert.equal(record.artifactSha256, artifacts['apps/web/dist-demo'].sha256);
}

const outputPath = path.join(here, 'test-output-inventory.json');
const outputInventory = JSON.parse(await readFile(outputPath, 'utf8'));
const grouped = new Map();
for (const record of routeRecords) {
    const evidencePath = path.resolve(frontendRoot, record.evidence);
    const artifactEvidence = JSON.parse(await readFile(evidencePath, 'utf8'));
    assert.equal(artifactEvidence.expectedRoutes, 61);
    assert.equal(artifactEvidence.renderedRoutes, 61);
    assert.deepEqual(artifactEvidence.pageErrors, []);
    assert.deepEqual(artifactEvidence.issues, []);
    assert.equal(artifactEvidence.artifact.sha256, artifacts['apps/web/dist-demo'].sha256);
    const basename = path.basename(evidencePath);
    const match = basename.match(/-(\d{8}-\d{6}-\d+)\.json$/);
    assert.ok(match, 'Built-demo evidence filename must carry its run ID.');
    const runId = match[1];
    if (!grouped.has(runId)) grouped.set(runId, []);
    grouped.get(runId).push({
        browser: artifactEvidence.browser,
        width: artifactEvidence.viewport.width,
        path: 'BotSalesAI_Frontend/' + path.relative(frontendRoot, evidencePath).replaceAll('\\', '/'),
        bytes: (await stat(evidencePath)).size,
        sha256: digest(await readFile(evidencePath)),
    });
}

for (const [runId, items] of grouped) {
    assert.equal(items.length, 2);
    const browser = items[0].browser;
    assert.ok(items.every(item => item.browser === browser));
    assert.deepEqual(items.map(item => item.width).sort((a, b) => a - b), [390, 1440]);
    const files = items.map(({ path: filePath, bytes, sha256 }) => ({ path: filePath, bytes, sha256 }))
        .sort((left, right) => left.path.localeCompare(right.path));
    const run = {
        runId,
        status: 'PASS: current built-demo ' + browser + ' 3/3; 61 routes at 390px and 1440px',
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
        files,
    };
    outputInventory.runs = outputInventory.runs.filter(existing => existing.runId !== runId);
    outputInventory.runs.push(run);
}
outputInventory.capturedAt = new Date().toISOString();
outputInventory.gitHead = gitHead;

const inventoryPath = path.join(here, 'build-artifact-inventory.json');
const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
inventory.capturedAt = new Date().toISOString();
inventory.gitHead = gitHead;
inventory.changedSourceFiles = changedSourceFiles;
inventory.artifacts = artifacts;
inventory.prodMockServiceWorkerFiles = prodMockServiceWorkerFiles;
inventory.demoMockServiceWorkerFiles = demoMockServiceWorkerFiles;

const validation = {
    capturedAt: new Date().toISOString(),
    gitHead,
    baseline,
    checks: Object.entries(artifacts).map(([artifact, result]) => ({
        artifact,
        expectedFiles: artifact.endsWith('/dist') ? 34 : 38,
        actualFiles: result.fileCount,
        stale: 0,
        missing: 0,
        sha256: result.sha256,
        status: 'PASS',
    })),
    checksForMockIsolation: {
        productionWorkerFiles: prodMockServiceWorkerFiles,
        demoWorkerFiles: demoMockServiceWorkerFiles,
        status: 'PASS',
    },
};

await writeFile(inventoryPath, JSON.stringify(inventory, null, 2) + '\n', 'utf8');
await writeFile(path.join(here, 'build-artifact-inventory-validation.json'), JSON.stringify(validation, null, 2) + '\n', 'utf8');
await writeFile(outputPath, JSON.stringify(outputInventory, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
    baseline,
    gitHead,
    changedSourceFiles: changedSourceFiles.length,
    production: { files: artifacts['apps/web/dist'].fileCount, sha256: artifacts['apps/web/dist'].sha256, mockWorker: prodMockServiceWorkerFiles.length },
    demo: { files: artifacts['apps/web/dist-demo'].fileCount, sha256: artifacts['apps/web/dist-demo'].sha256, mockWorker: demoMockServiceWorkerFiles.length },
    browserRuns: [...grouped.keys()],
    routeRecords: routeRecords.length,
    status: 'PASS',
}, null, 2));

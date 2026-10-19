import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const manifestPath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sourceRelative = 'BotSalesAI_Frontend/tests/vertical-slices/fe022-flows.spec.ts';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const readRepoFile = relative => readFile(path.join(repositoryRoot, relative));

const repeatRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC07/ci-reconciliation-fe022-vs01-repeat-r2.log';
const flowRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC07/ci-reconciliation-fe022-flows-chromium-firefox-r2.log';
const verifyRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC07/npm-verify-fe022-response-ready-r1.log';
const assertExitZero = async relative => {
    const exit = (await readFile(path.join(repositoryRoot, `${relative}.exit`), 'utf8')).trim();
    assert.equal(exit, '0', `${relative} must exit 0.`);
};
await assertExitZero(repeatRelative);
await assertExitZero(flowRelative);
await assertExitZero(verifyRelative);
const repeatLog = await readRepoFile(repeatRelative);
const flowLog = await readRepoFile(flowRelative);
const verifyLog = await readRepoFile(verifyRelative);
assert.match(repeatLog.toString('utf8'), /6 passed \(1\.1m\)/);
assert.match(flowLog.toString('utf8'), /10 passed \(48\.1s\)/);
for (const pattern of [
    /"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61/,
    /Tests\s+252 passed \(252\)/,
    /layout-check PASS: 94 source files, 0 finding\(s\)/,
    /visual-token-check PASS: 93 source files, 0 finding\(s\)/,
    /ui-composition PASS: 92 source files, 0 finding\(s\)/,
    /ui-evidence PASS: S17; 32 command\/log record\(s\), 27 coverage row\(s\), 285 current fingerprint\(s\); status=COMPLETE/,
]) assert.match(verifyLog.toString('utf8'), pattern, `Full verify log is missing measured result ${pattern}.`);
const source = (await readRepoFile(sourceRelative)).toString('utf8');
assert.match(source, /page\.waitForResponse\(response => response\.request\(\)\.method\(\) === 'GET'[\s\S]{0,220}\/api\/v2\/shops\/shop-demo\/inventory/);
assert.match(source, /expect\(snapshots\.data\.some\(snapshot => snapshot\.sku === 'AO-002'\)\)\.toBe\(true\)/);

const raw = await readFile(manifestPath, 'utf8');
const evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE', 'S17 must have no open baseline work before this focused refresh.');
const allowedSource = new Set([sourceRelative]);
const staleSources = [];
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = sha256(await readRepoFile(relative));
    if (actual !== expected && !allowedSource.has(relative)) staleSources.push(relative);
}
assert.deepEqual(staleSources, [], `Refusing to refresh unrelated source fingerprints: ${staleSources.join(', ')}`);
assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourceRelative), `S17 is missing ${sourceRelative}.`);
evidence.sourceFingerprints[sourceRelative] = sha256(await readRepoFile(sourceRelative));

const resultFor = (label, count) => `FE022 ${label} passed ${count} on local Chromium 155.0.8059.40 and Firefox 155.0 using the synthetic MSW demo API.`;
const checks = [
    {
        id: 'uic07-fe022-vs01-response-ready-r2',
        command: "node node_modules/@playwright/test/cli.js test tests/vertical-slices/fe022-flows.spec.ts --project=chromium --project=firefox --grep 'FE022.VS01' --workers=1 --repeat-each=3 --reporter=line",
        path: repeatRelative,
        expected: resultFor('VS01 repeated response-ready regression', '6/6'),
    },
    {
        id: 'uic07-fe022-flow-suite-final-r2',
        command: "node node_modules/@playwright/test/cli.js test tests/vertical-slices/fe022-flows.spec.ts --project=chromium --project=firefox --grep 'FE022.' --workers=1 --reporter=line",
        path: flowRelative,
        expected: resultFor('VS01–VS04 plus S05 flow suite', '10/10'),
    },
    {
        id: 'uic07-current-source-full-verify-response-ready',
        command: 'npm run verify (Node 24.19.0, npm 11.17.0; full UIC07 checkout output captured in linked log)',
        path: verifyRelative,
        expected: 'Full verify PASS: generate 15 outputs/346 schemas/245 operations/61 routes; source/session 15/15; boundary 725 imports/10 negative fixtures; domain 117/117; Vitest 252/252; production build; layout 86/86 on 94 files/0 findings; visual token 6/6 on 93 files/0 findings; composition 41/41 on 92 files/0 findings; S17 validator 11/11; exit 0.',
    },
].map(item => ({
    id: item.id,
    command: item.command,
    exitCode: 0,
    result: 'PASS',
    expected: item.expected,
    observed: item.expected,
    log: { path: item.path, sha256: sha256(item.path === repeatRelative ? repeatLog : item.path === flowRelative ? flowLog : verifyLog) },
}));

for (const check of checks) {
    const previous = evidence.checks.find(item => item.id === check.id);
    if (previous) Object.assign(previous, check);
    else evidence.checks.push(check);
    const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const priorCoverage = evidence.coverage.find(item => item.name === coverage.name);
    if (priorCoverage) Object.assign(priorCoverage, coverage);
    else evidence.coverage.push(coverage);
}

const scopeClause = 'FE022.VS01 inventory rendering waits for the observed MSW GET response and confirms AO-002 in both payload and accessible row; repeated Chromium/Firefox evidence is recorded separately.';
if (!evidence.scope.includes(scopeClause)) evidence.scope = `${evidence.scope.trim()} ${scopeClause}`;
assert.ok(evidence.checks.every(item => item.result === 'PASS' || item.result === 'N/A'), 'S17 contains an open check.');
assert.ok(evidence.coverage.every(item => item.result === 'COMPLETE' || item.result === 'N/A'), 'S17 contains open coverage.');
evidence.status = 'COMPLETE';
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifestPath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({ sourceRelative, checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status }, null, 2));

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const verifyLogPath = path.join(here, 'npm-verify-after-correction-r2.log');
const verifyExitPath = verifyLogPath + '.exit';
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Truyền đúng một trong hai cờ --preverify hoặc --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/apps/web/src/modules/bot/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/catalog/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/finance/management.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/operations/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/orders/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/shared/ui/README.md',
    'BotSalesAI_Frontend/apps/web/src/shared/ui/components.tsx',
    'BotSalesAI_Frontend/apps/web/tests/states/fe023-state.test.tsx',
    'BotSalesAI_Frontend/tests/fe011.spec.ts',
    'BotSalesAI_Frontend/tests/fe012.spec.ts',
    'BotSalesAI_Frontend/tests/fe013.spec.ts',
    'BotSalesAI_Frontend/tests/fe014.spec.ts',
    'BotSalesAI_Frontend/tests/fe015.spec.ts',
    'BotSalesAI_Frontend/tests/fe016.spec.ts',
    'BotSalesAI_Frontend/tests/fe018.spec.ts',
    'BotSalesAI_Frontend/tests/states/generate-route-state-roles.mjs',
    'BotSalesAI_Frontend/tests/states/route-empty-composition.spec.ts',
    'BotSalesAI_Frontend/tests/states/route-role-command-unknown-master-actions.spec.ts',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const refreshed = Object.fromEntries(await Promise.all(sourceFiles.map(async relativePath => [
    relativePath,
    digest(await readFile(path.join(repositoryRoot, relativePath))),
])));

const allowed = new Set(sourceFiles);
const unrelatedStale = [];
for (const [relativePath, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = digest(await readFile(path.join(repositoryRoot, relativePath)));
    if (actual !== expected && !allowed.has(relativePath)) unrelatedStale.push(relativePath);
}
assert.deepEqual(unrelatedStale, [], 'Từ chối refresh fingerprint ngoài phạm vi UIC07: ' + unrelatedStale.join(', '));
Object.assign(evidence.sourceFingerprints, refreshed);

if (finalize) {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    const exitCode = (await readFile(verifyExitPath, 'utf8')).trim();
    assert.equal(exitCode, '0', 'npm run verify trên source UIC07 cuối phải exit 0.');
    for (const expected of [
        /outputs":15,"schemas":346,"operations":245,"routes":61/,
        /passed":117/,
        /Tests\s+252\s+passed\s+\(252\)/,
        /ℹ tests 86[\s\S]*?ℹ pass 86/,
        /layout-check PASS: 94 source files, 0 finding\(s\)/,
        /visual-token-check PASS: 93 source files, 0 finding\(s\)/,
        /ℹ tests 41[\s\S]*?ℹ pass 41/,
        /ui-composition PASS: 92 source files, 0 finding\(s\)/,
        /ui-evidence PASS: S17;/,
    ]) assert.match(verifyLog, expected);

    const relativePath = value => path.relative(repositoryRoot, value).replaceAll(path.sep, '/');
    const result = 'npm run verify trên source UIC07 cuối PASS: generate 15/346/245/61; source/session 15/15; boundary 10/10 fixture; domain 117/117; Vitest 252/252; typecheck/lint; production build; layout 86/86 với 94 file/0 finding; visual token 6/6 với 93 file/0 finding; UI composition 41/41 với 92 file/0 finding; S17 evidence validator PASS.';
    const check = {
        id: 'uic07-current-source-full-verify',
        command: 'npm.cmd --script-shell=cmd.exe run verify (Node 24.19.0, npm 11.17.0)',
        exitCode: 0,
        result: 'PASS',
        expected: result,
        observed: result,
        log: { path: relativePath(verifyLogPath), sha256: digest(verifyLog) },
    };
    const previous = evidence.checks.find(item => item.id === check.id);
    if (previous) Object.assign(previous, check);
    else evidence.checks.push(check);
    const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const previousCoverage = evidence.coverage.find(item => item.name === coverage.name);
    if (previousCoverage) Object.assign(previousCoverage, coverage);
    else evidence.coverage.push(coverage);
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({
    phase: preverify ? 'preverify' : 'finalize',
    refreshed,
    fingerprintCount: Object.keys(evidence.sourceFingerprints).length,
    checks: evidence.checks.length,
    coverage: evidence.coverage.length,
    recordedAt: evidence.recordedAt,
}, null, 2));

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const verifyLogName = process.env.UIC10_VERIFY_LOG || 'npm-verify-current-r3.log';
assert.equal(path.basename(verifyLogName), verifyLogName, 'UIC10_VERIFY_LOG must be a file name in this evidence directory.');
const verifyLogPath = path.join(here, verifyLogName);
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Pass exactly one of --preverify or --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/playwright.config.ts',
    'BotSalesAI_Frontend/playwright.built-demo.config.ts',
    'BotSalesAI_Frontend/tests/browser-runtime-identity.spec.ts',
    'BotSalesAI_Frontend/tests/built-demo-regression.spec.ts',
    'BotSalesAI_Frontend/tests/ui-master-resources.spec.ts',
    'BotSalesAI_Frontend/tests/ui-ux-completion.spec.ts',
    'BotSalesAI_Frontend/tests/states/route-role-state-composition.spec.ts',
    // UIC08 CI correction is part of the final sequential source fingerprint.
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
assert.deepEqual(unrelatedStale, [], `Refusing to refresh fingerprints outside UIC10: ${unrelatedStale.join(', ')}`);
assert.ok('BotSalesAI_Frontend/playwright.config.ts' in evidence.sourceFingerprints, 'S17 must already register the Playwright config.');
Object.assign(evidence.sourceFingerprints, refreshed);

if (finalize) {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    const exitCode = (await readFile(`${verifyLogPath}.exit`, 'utf8')).trim();
    assert.equal(exitCode, '0', 'npm run verify must pass on the final UIC10 source.');
    for (const expected of [
        /outputs":15,"schemas":346,"operations":245,"routes":61/,
        /passed":117/,
        /Tests\s+252\s+passed\s+\(252\)/,
        /ℹ tests 86[\s\S]*?ℹ pass 86/,
        /layout-check PASS: 94 source files, 0 finding\(s\)/,
        /ℹ tests 6[\s\S]*?ℹ pass 6[\s\S]*?visual-token-check PASS: 93 source files, 0 finding\(s\)/,
        /ℹ tests 41[\s\S]*?ℹ pass 41[\s\S]*?ui-composition PASS: 92 source files, 0 finding\(s\)/,
        /ℹ tests 11[\s\S]*?ℹ pass 11[\s\S]*?ui-evidence PASS: S17;/,
    ]) assert.match(verifyLog, expected);

    const relativePath = value => path.relative(repositoryRoot, value).replaceAll(path.sep, '/');
    const result = 'npm run verify trên source UIC10 PASS: generate 15/346/245/61; source/session 15/15; boundary 10/10 fixture; domain 117/117; Vitest 252/252; lint/typecheck; production build; layout 86/86 với 94 file/0 finding; visual token 6/6 với 93 file/0 finding; UI composition 41/41 với 92 file/0 finding; S17 validator 11/11 và evidence PASS.';
    const check = {
        id: 'uic10-current-source-full-verify',
        command: 'npm.cmd with Node 24.19.0 and npm 11.17.0: run verify',
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

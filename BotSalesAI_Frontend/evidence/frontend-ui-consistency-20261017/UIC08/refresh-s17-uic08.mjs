import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const verifyLogPath = path.join(here, 'npm-verify-uic08-final.log');
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Truyền đúng một trong hai cờ --preverify hoặc --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/apps/web/src/modules/finance/index.tsx',
    'BotSalesAI_Frontend/apps/web/src/modules/inbox/index.tsx',
    'BotSalesAI_Frontend/tests/ui012-keyboard.spec.ts',
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
assert.deepEqual(unrelatedStale, [], `Từ chối refresh fingerprint ngoài phạm vi UIC08: ${unrelatedStale.join(', ')}`);
for (const relativePath of sourceFiles) assert.ok(relativePath in evidence.sourceFingerprints, `S17 không đăng ký source UIC08: ${relativePath}`);
Object.assign(evidence.sourceFingerprints, refreshed);

if (finalize) {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    const exitCode = Number((await readFile(`${verifyLogPath}.exit`, 'utf8')).trim());
    assert.equal(exitCode, 0, 'npm run verify chưa PASS trên source UIC08.');
    assert.match(verifyLog, /ui-evidence PASS: S17;/);
    const relativePath = value => path.relative(repositoryRoot, value).replaceAll(path.sep, '/');
    const result = 'npm run verify trên source UIC08 cuối PASS; xem log gắn kèm để đọc đầy đủ generate, source/session, boundary, lint, typecheck, domain, unit, build, layout, visual, composition và S17 validator.';
    const check = {
        id: 'uic08-current-source-full-verify',
        command: 'npm run verify (Node 24.19.0, npm 11.17.0)',
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
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', refreshed, fingerprintCount: Object.keys(evidence.sourceFingerprints).length, checks: evidence.checks.length, coverage: evidence.coverage.length, recordedAt: evidence.recordedAt }, null, 2));

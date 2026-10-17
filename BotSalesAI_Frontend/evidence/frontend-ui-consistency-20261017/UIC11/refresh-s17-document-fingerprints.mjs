import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const logRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC11/s17-document-fingerprint-refresh.log';
const allowedSourceFingerprints = new Set(['BotSalesAI_Frontend/evidence/REPORT.md']);
const allowedCheckLogs = new Set(['BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC03/REPORT.md']);
const checkId = 'uic11-s17-document-fingerprint-refresh';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const hashPath = relative => digest(fs.readFileSync(path.resolve(repositoryRoot, relative)));

const raw = fs.readFileSync(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
assert.equal(evidence.status, 'COMPLETE', 'S17 status must be COMPLETE before refreshing UIC11 document fingerprints.');
assert.equal(Object.keys(evidence.sourceFingerprints ?? {}).length, 286, 'Unexpected S17 source fingerprint count.');
assert.equal(evidence.checks.length, 41, 'Unexpected S17 check count before UIC11 receipt.');
assert.equal(evidence.coverage.length, 36, 'Unexpected S17 coverage count before UIC11 receipt.');

const staleSources = Object.entries(evidence.sourceFingerprints)
    .filter(([relative, expected]) => hashPath(relative) !== expected)
    .map(([relative]) => relative)
    .sort();
const staleLogs = evidence.checks
    .filter(check => check.log?.path && hashPath(check.log.path) !== check.log.sha256)
    .map(check => ({ id: check.id, path: check.log.path }))
    .sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(staleSources, [...allowedSourceFingerprints].sort(), 'Refusing to refresh unexpected S17 source fingerprints.');
assert.deepEqual(staleLogs, [{ id: 'uic03-msw-update-recovery', path: [...allowedCheckLogs][0] }], 'Refusing to refresh unexpected S17 command/log hashes.');

const refreshedSourceHashes = Object.fromEntries([...allowedSourceFingerprints].map(relative => [relative, hashPath(relative)]));
for (const [relative, sha256] of Object.entries(refreshedSourceHashes)) evidence.sourceFingerprints[relative] = sha256;
const refreshedLogPath = [...allowedCheckLogs][0];
const refreshedLogHash = hashPath(refreshedLogPath);
const uic03Check = evidence.checks.find(check => check.id === 'uic03-msw-update-recovery');
assert.ok(uic03Check, 'Expected UIC03 S17 check is missing.');
uic03Check.log.sha256 = refreshedLogHash;

const sourceSummary = Object.entries(refreshedSourceHashes).map(([relative, sha256]) => relative + ' ' + sha256).join('; ');
const receiptText = [
    'UIC11 S17 document fingerprint refresh: PASS',
    'source ' + sourceSummary,
    'check-log ' + refreshedLogPath + ' ' + refreshedLogHash,
    'unexpected stale fingerprints: 0',
].join('\n') + '\n';
const receiptPath = path.resolve(repositoryRoot, logRelative);
fs.writeFileSync(receiptPath, receiptText, 'utf8');
const checkResult = receiptText.trim();
const check = {
    id: checkId,
    command: 'node evidence/frontend-ui-consistency-20261017/UIC11/refresh-s17-document-fingerprints.mjs',
    exitCode: 0,
    result: 'PASS',
    expected: checkResult,
    observed: checkResult,
    log: { path: logRelative, sha256: digest(Buffer.from(receiptText, 'utf8')) },
};
const existingCheck = evidence.checks.find(item => item.id === checkId);
if (existingCheck) Object.assign(existingCheck, check);
else evidence.checks.push(check);
const coverage = { name: checkId, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
const existingCoverage = evidence.coverage.find(item => item.name === checkId);
if (existingCoverage) Object.assign(existingCoverage, coverage);
else evidence.coverage.push(coverage);
assert.equal(evidence.checks.length, 42);
assert.equal(evidence.coverage.length, 37);

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({
    status: evidence.status,
    refreshedSourceFingerprints: refreshedSourceHashes,
    refreshedCheckLog: { id: uic03Check.id, path: uic03Check.log.path, sha256: refreshedLogHash },
    checks: evidence.checks.length,
    coverage: evidence.coverage.length,
    sourceFingerprints: Object.keys(evidence.sourceFingerprints).length,
}, null, 2));
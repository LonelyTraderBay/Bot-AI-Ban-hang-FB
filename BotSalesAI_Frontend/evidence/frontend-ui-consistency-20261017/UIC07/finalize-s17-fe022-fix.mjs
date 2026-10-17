import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.dirname(frontendRoot);
const manifestRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json';
const sourceRelative = 'BotSalesAI_Frontend/tests/vertical-slices/fe022-flows.spec.ts';
const logRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC07/npm-verify-fe022-fix.log';
const sha256 = value => createHash('sha256').update(value).digest('hex');

assert.equal((await readFile(path.join(here, 'npm-verify-fe022-fix.exit'), 'utf8')).trim(), '0', 'The full local verify must exit 0.');
const log = await readFile(path.join(repositoryRoot, logRelative), 'utf8');
for (const pattern of [
    /"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61/,
    /ℹ tests 15[\s\S]{0,100}ℹ pass 15/,
    /negativeFixtures": "Boundary fixtures: PASS 10\/10 scenarios/,
    /"passed":117/,
    /Tests\s+252 passed \(252\)/,
    /layout-check PASS: 94 source files, 0 finding\(s\)/,
    /visual-token-check PASS: 93 source files, 0 finding\(s\)/,
    /ui-composition PASS: 92 source files, 0 finding\(s\)/,
    /ui-evidence PASS: S17;/,
]) assert.match(log, pattern, `Full verify is missing expected receipt: ${pattern}`);

const manifestPath = path.join(repositoryRoot, manifestRelative);
const raw = await readFile(manifestPath, 'utf8');
const evidence = JSON.parse(raw);
assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourceRelative), `S17 is missing ${sourceRelative}`);
assert.equal(evidence.sourceFingerprints[sourceRelative], sha256(await readFile(path.join(repositoryRoot, sourceRelative))), 'The FE022 fingerprint changed after verify.');

const result = 'npm run verify PASS: generated 15 outputs/346 schemas/245 operations/61 routes; source/session 15/15; boundaries 725 imports and negative fixtures 10/10; domain 117/117; Vitest 252/252; production build; layout 86/86 and 94 sources/0 findings; visual-token 6/6 and 93 sources/0 findings; composition 41/41 and 92 sources/0 findings; S17 evidence validator 11/11.';
const check = {
    id: 'uic07-fe022-full-verify',
    command: 'npm.cmd --script-shell=pwsh.exe run verify (Node 24.19.0, npm 11.17.0; complete output captured in linked log)',
    exitCode: 0,
    result: 'PASS',
    expected: result,
    observed: result,
    log: { path: logRelative, sha256: sha256(log) },
};
const existingCheck = evidence.checks.find(item => item.id === check.id);
if (existingCheck) Object.assign(existingCheck, check);
else evidence.checks.push(check);

const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
const existingCoverage = evidence.coverage.find(item => item.name === coverage.name);
if (existingCoverage) Object.assign(existingCoverage, coverage);
else evidence.coverage.push(coverage);
assert.ok(evidence.coverage.every(item => item.result === 'COMPLETE' || item.result === 'N/A'), 'Cannot mark S17 COMPLETE while an evidence row remains open.');
evidence.status = 'COMPLETE';
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifestPath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({ manifest: manifestRelative, verify: 'PASS', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status, recordedAt: evidence.recordedAt }, null, 2));

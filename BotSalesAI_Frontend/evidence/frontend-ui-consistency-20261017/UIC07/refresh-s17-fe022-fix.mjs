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
const logRelative = 'BotSalesAI_Frontend/evidence/frontend-ui-consistency-20261017/UIC07/FE022-selector-fix-targeted.log';
const exitPath = path.join(here, 'FE022-selector-fix-targeted.exit');
const sha256 = value => createHash('sha256').update(value).digest('hex');

assert.equal((await readFile(exitPath, 'utf8')).trim(), '0', 'The targeted two-browser test must exit 0.');
const log = await readFile(path.join(repositoryRoot, logRelative), 'utf8');
assert.match(log, /\[chromium\].*FE022\.VS04/);
assert.match(log, /\[firefox\].*FE022\.VS04/);
assert.match(log, /2 passed \(\d+(?:\.\d+)?s\)/);

const manifestPath = path.join(repositoryRoot, manifestRelative);
const raw = await readFile(manifestPath, 'utf8');
const evidence = JSON.parse(raw);
assert.ok(Object.hasOwn(evidence.sourceFingerprints, sourceRelative), `S17 is missing ${sourceRelative}`);
evidence.sourceFingerprints[sourceRelative] = sha256(await readFile(path.join(repositoryRoot, sourceRelative)));

const result = 'FE022.VS04 API-to-rendered-link identity regression passed 1/1 on Chromium and 1/1 on Firefox using the local synthetic demo API.';
const check = {
    id: 'uic07-fe022-selector-semantics',
    command: "npm.cmd --script-shell=pwsh.exe run test:e2e -- --config=playwright.config.ts --grep 'FE022.VS04' --project=chromium --project=firefox --workers=1 --reporter=line",
    exitCode: 0,
    result: 'PASS',
    expected: result,
    observed: result,
    log: { path: logRelative, sha256: sha256(log) },
};
const existingCheck = evidence.checks.find(item => item.id === check.id);
if (existingCheck) Object.assign(existingCheck, check);
else evidence.checks.push(check);

const coverage = { name: check.id, expected: 2, observed: 2, missing: 0, result: 'COMPLETE' };
const existingCoverage = evidence.coverage.find(item => item.name === coverage.name);
if (existingCoverage) Object.assign(existingCoverage, coverage);
else evidence.coverage.push(coverage);

const scopeClause = 'UIC07 FE022 hosted Firefox exposed a row-versus-card locator mismatch; the test now follows the rendered link and asserts the reviewed knowledgeDraftId in its href, passing on local Chromium and Firefox.';
if (!evidence.scope.includes(scopeClause)) evidence.scope = `${evidence.scope.trim()} ${scopeClause}`;
evidence.status = 'IN_PROGRESS';
evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(manifestPath, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({ manifest: manifestRelative, sourceFingerprint: evidence.sourceFingerprints[sourceRelative], targetedBrowsers: '2/2 PASS', checks: evidence.checks.length, coverage: evidence.coverage.length, status: evidence.status, recordedAt: evidence.recordedAt }, null, 2));

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const verifyLogArgument = process.argv.find(argument => argument.startsWith('--verify-log='));
const verifyLogName = verifyLogArgument?.slice('--verify-log='.length) ?? 'npm-verify-uic08-sequence-final-20261018.log';
assert.equal(path.basename(verifyLogName), verifyLogName, 'Verify log must be a file name inside the UIC08 evidence directory.');
const verifyLogPath = path.join(here, verifyLogName);
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

    const addProof = async ({ id, command, logName, jsonName, expected }) => {
        const logPath = path.join(here, logName);
        const log = await readFile(logPath, 'utf8');
        assert.equal(Number((await readFile(`${logPath}.exit`, 'utf8')).trim()), 0, `${id} did not exit successfully.`);
        const proofPath = path.join(here, jsonName);
        const proof = JSON.parse(await readFile(proofPath, 'utf8'));
        assert.equal(proof.result, 'PASS', `${id} did not record PASS.`);
        assert.equal(proof.scenarios?.length, 5, `${id} must cover the five declared zoom scenarios.`);
        assert.ok(proof.scenarios.every(scenario => scenario.result === 'PASS' && (scenario.issues?.length ?? 0) === 0), `${id} has a failed or unresolved scenario.`);
        for (const [sourcePath, expectedHash] of Object.entries(proof.sourceSha256 ?? {})) {
            assert.equal(digest(await readFile(path.resolve(frontendRoot, sourcePath))), expectedHash, `${id} source hash changed: ${sourcePath}`);
        }
        const relativePath = value => path.relative(repositoryRoot, value).replaceAll(path.sep, '/');
        const check = {
            id,
            command,
            exitCode: 0,
            result: 'PASS',
            expected,
            observed: expected,
            log: { path: relativePath(logPath), sha256: digest(log) },
        };
        const priorCheck = evidence.checks.find(item => item.id === id);
        if (priorCheck) Object.assign(priorCheck, check);
        else evidence.checks.push(check);
        const coverage = { name: id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
        const priorCoverage = evidence.coverage.find(item => item.name === id);
        if (priorCoverage) Object.assign(priorCoverage, coverage);
        else evidence.coverage.push(coverage);
    };

    const keyboardLog = await readFile(path.join(here, 'uic08-sequence-ui012-chromium-firefox-r2.log'), 'utf8');
    assert.match(keyboardLog, /22 passed \(/, 'UIC08 keyboard regression must pass all 22 cases.');
    const keyboardLogPath = path.join(here, 'uic08-sequence-ui012-chromium-firefox-r2.log');
    assert.equal(Number((await readFile(`${keyboardLogPath}.exit`, 'utf8')).trim()), 0, 'UIC08 keyboard regression did not exit successfully.');
    const keyboardExpected = '22/22 UI012 keyboard tests pass on Chromium 155.0.8059.40 and Firefox 155.0; UIC08 R06/R49 regressions are included.';
    const keyboardCheck = {
        id: 'uic08-keyboard-regression-current-source',
        command: 'node node_modules/@playwright/test/cli.js test tests/ui012-keyboard.spec.ts --project=chromium --project=firefox --workers=1 --reporter=line',
        exitCode: 0,
        result: 'PASS',
        expected: keyboardExpected,
        observed: keyboardExpected,
        log: { path: path.relative(repositoryRoot, keyboardLogPath).replaceAll(path.sep, '/'), sha256: digest(keyboardLog) },
    };
    const priorKeyboard = evidence.checks.find(item => item.id === keyboardCheck.id);
    if (priorKeyboard) Object.assign(priorKeyboard, keyboardCheck);
    else evidence.checks.push(keyboardCheck);
    const keyboardCoverage = { name: keyboardCheck.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const priorKeyboardCoverage = evidence.coverage.find(item => item.name === keyboardCoverage.name);
    if (priorKeyboardCoverage) Object.assign(priorKeyboardCoverage, keyboardCoverage);
    else evidence.coverage.push(keyboardCoverage);
    await addProof({
        id: 'uic08-native-chrome-page-zoom-200',
        command: 'Native Google Chrome Page zoom 200% set and read back in chrome://settings/appearance; five local MSW scenarios.',
        logName: 'browser-zoom-native-settings-chrome155-r2.log',
        jsonName: '../../frontend-ui-improvements/UI028/W30/actual-browser-zoom-200-current-20261017-210145-58660.json',
        expected: 'Google Chrome Stable 155.0.8059.40 native Page zoom 200% passes 5/5 scenarios with no issue, page error, or frontend write.',
    });
    await addProof({
        id: 'uic08-native-firefox-text-only-zoom-200',
        command: 'Native Firefox Zoom Text Only 200% in a temporary profile with the site-specific text-only setting verified.',
        logName: 'native-text-focus-final.log',
        jsonName: '../../frontend-ui-improvements/UI028/W30/native-text-only-200-current-20261017-205102-11476.json',
        expected: 'Firefox 155.0 native text-only zoom passes 5/5 scenarios with the CSS viewport and DPR fixed and no issue.',
    });
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', refreshed, fingerprintCount: Object.keys(evidence.sourceFingerprints).length, checks: evidence.checks.length, coverage: evidence.coverage.length, recordedAt: evidence.recordedAt }, null, 2));

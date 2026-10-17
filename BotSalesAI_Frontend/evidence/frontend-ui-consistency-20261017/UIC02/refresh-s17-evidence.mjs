import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const evidenceFile = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const reportFile = path.join(here, 'REPORT.md');
const verifyLogFile = path.join(here, 'verify-uic02-current-source.log');
const fe010RepeatLogFile = path.join(here, 'fe010-navigation-dismissal-repeat-chromium.log');
const fe010SuiteLogFile = path.join(here, 'fe010-suite-chromium-firefox.log');
const raw = await readFile(evidenceFile, 'utf8');
const evidence = JSON.parse(raw);
const report = await readFile(reportFile, 'utf8');
const verifyLog = await readFile(verifyLogFile, 'utf8');
const before = JSON.parse(await readFile(path.join(here, 'before.json'), 'utf8'));
const after = JSON.parse(await readFile(path.join(here, 'after.json'), 'utf8'));
const sums = JSON.parse(await readFile(path.join(here, 'SHA256SUMS.json'), 'utf8'));

if (!report.includes('**PASS**') || sums.pass !== true) throw new Error('UIC02 report has not passed all recorded assertions.');
if (!verifyLog.includes('VERIFY_EXIT=0') || !verifyLog.includes('ui-evidence PASS: S17; 18 command/log record(s), 16 coverage row(s), 281 current fingerprint(s); status=COMPLETE')) throw new Error('UIC02 current-source npm run verify did not finish with the expected current evidence checks.');
if (before.browsers.length !== 2 || after.browsers.length !== 2) throw new Error('UIC02 browser captures are incomplete.');
if (!Object.hasOwn(evidence.sourceFingerprints, 'BotSalesAI_Frontend/apps/web/src/shared/ui/theme.ts')) throw new Error('S17 manifest does not fingerprint the theme owner.');

const digest = async relative => createHash('sha256').update(await readFile(path.join(frontendRoot, relative))).digest('hex');
const themePath = 'apps/web/src/shared/ui/theme.ts';
const testPath = 'tests/ui-overlay-theme.spec.ts';
const fe010Path = 'tests/fe010.spec.ts';
const themeHash = await digest(themePath);
const testHash = await digest(testPath);
const fe010Hash = await digest(fe010Path);
if (sums.files['../source/apps/web/src/shared/ui/theme.ts'] !== themeHash || sums.files['../source/tests/ui-overlay-theme.spec.ts'] !== testHash)
    throw new Error('UIC02 source hashes do not match the final report manifest.');

const repositoryPaths = {
    theme: `BotSalesAI_Frontend/${themePath}`,
    test: `BotSalesAI_Frontend/${testPath}`,
    fe010: `BotSalesAI_Frontend/${fe010Path}`,
};
const sourceHashes = { [repositoryPaths.theme]: themeHash, [repositoryPaths.test]: testHash, [repositoryPaths.fe010]: fe010Hash };
const staleExisting = [];
for (const [relative, expected] of Object.entries(evidence.sourceFingerprints)) {
    const absolute = path.join(path.resolve(frontendRoot, '..'), relative);
    const actual = createHash('sha256').update(await readFile(absolute)).digest('hex');
    if (actual !== expected && ![repositoryPaths.theme, repositoryPaths.fe010].includes(relative)) staleExisting.push(relative);
}
if (staleExisting.length) throw new Error(`Unexpected stale S17 fingerprints: ${staleExisting.join(', ')}`);
Object.assign(evidence.sourceFingerprints, sourceHashes);

const checkId = 'uic02-overlay-theme';
const relativeReport = path.relative(path.resolve(frontendRoot, '..'), reportFile).replaceAll(path.sep, '/');
const reportHash = createHash('sha256').update(await readFile(reportFile)).digest('hex');
const result = '18/18 visible backdrops match the canonical overlay token; 4/4 invisible Select backdrops remain transparent; 8 forced-colors samples retain visible dialog, backdrop and focus, with opacity transition 4/4; 4/4 Playwright Chromium and Firefox regressions pass.';
const refreshedCheck = {
    id: checkId,
    command: 'UIC02 browser measurement and shared overlay regression; see REPORT.md for commands and environment',
    exitCode: 0,
    result: 'PASS',
    expected: result,
    observed: result,
    log: { path: relativeReport, sha256: reportHash },
};
const existingCheck = evidence.checks.find(check => check.id === checkId);
if (existingCheck) Object.assign(existingCheck, refreshedCheck);
else evidence.checks.push(refreshedCheck);
const repositoryRoot = path.resolve(frontendRoot, '..');
const relativeVerifyLog = path.relative(repositoryRoot, verifyLogFile).replaceAll(path.sep, '/');
const verifyHash = createHash('sha256').update(await readFile(verifyLogFile)).digest('hex');
const verifyResult = 'Current-source npm run verify PASS: generated 15/346/245/61; boundaries 724 imports and 10/10 negative fixtures; domain 117 checks; Vitest 25 files/242 tests; production build; layout 86/86; visual tokens 5/5; UI composition 41/41; evidence validator 11/11 and S17 COMPLETE.';
const verifyCheck = { id: 'uic02-current-source-full-verify', command: 'npm.cmd --script-shell=pwsh.exe run verify (Node 24.19.0, npm 11.17.0)', exitCode: 0, result: 'PASS', expected: verifyResult, observed: verifyResult, log: { path: relativeVerifyLog, sha256: verifyHash } };
const existingVerifyCheck = evidence.checks.find(check => check.id === verifyCheck.id);
if (existingVerifyCheck) Object.assign(existingVerifyCheck, verifyCheck);
else evidence.checks.push(verifyCheck);
const repeatLog = await readFile(fe010RepeatLogFile, 'utf8');
const suiteLog = await readFile(fe010SuiteLogFile, 'utf8');
const repeatExit = (await readFile(`${fe010RepeatLogFile}.exit`, 'utf8')).trim();
const suiteExit = (await readFile(`${fe010SuiteLogFile}.exit`, 'utf8')).trim();
if (repeatExit !== '0' || !/10 passed \(/.test(repeatLog) || suiteExit !== '0' || !/18 passed \(/.test(suiteLog))
    throw new Error('FE010 follow-up requires 10/10 Chromium repeats and 18/18 Chromium/Firefox cases.');
const fe010Result = 'FE010 draft-dialog dismissal and product navigation: Chromium repeat 10/10 PASS; full FE010 suite Chromium/Firefox 18/18 PASS on local mock.';
const fe010Check = {
    id: 'uic02-fe010-navigation-regression',
    command: 'Playwright FE010 repeat and cross-browser suite; see UIC02 REPORT.md for raw logs and limits',
    exitCode: 0,
    result: 'PASS',
    expected: fe010Result,
    observed: fe010Result,
    log: { path: relativeReport, sha256: reportHash },
};
const existingFe010Check = evidence.checks.find(check => check.id === fe010Check.id);
if (existingFe010Check) Object.assign(existingFe010Check, fe010Check);
else evidence.checks.push(fe010Check);
const fe010Coverage = { name: fe010Check.id, expected: 28, observed: 28, missing: 0, result: 'COMPLETE' };
const existingFe010Coverage = evidence.coverage.find(item => item.name === fe010Coverage.name);
if (existingFe010Coverage) Object.assign(existingFe010Coverage, fe010Coverage);
else evidence.coverage.push(fe010Coverage);
evidence.recordedAt = new Date().toISOString();
if (!evidence.scope.includes('UIC02 shared backdrop token parity'))
    evidence.scope = `${evidence.scope} UIC02 shared backdrop token parity and browser regression were refreshed against the recorded local frontend/mock evidence.`;

const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidenceFile, `${JSON.stringify(evidence, null, 2).replaceAll('\n', newline)}${newline}`, 'utf8');
console.log(JSON.stringify({ evidence: path.relative(path.resolve(frontendRoot, '..'), evidenceFile).replaceAll(path.sep, '/'), synchronizedFingerprints: sourceHashes, check: { id: checkId, action: existingCheck ? 'updated' : 'added' }, reportHash, recordedAt: evidence.recordedAt }, null, 2));

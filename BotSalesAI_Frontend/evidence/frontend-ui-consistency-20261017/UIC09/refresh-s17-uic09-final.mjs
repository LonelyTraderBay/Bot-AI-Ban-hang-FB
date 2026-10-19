import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repositoryRoot = path.resolve(frontendRoot, '..');
const evidencePath = path.join(frontendRoot, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const argumentValue = name => {
    const argument = process.argv.find(value => value.startsWith(`${name}=`));
    const fileName = argument?.slice(name.length + 1);
    if (fileName) assert.equal(path.basename(fileName), fileName, `${name} must name a file inside the UIC09 evidence directory.`);
    return fileName;
};
const browserLogPath = path.join(here, argumentValue('--browser-log') ?? 'browser-runtime-identity-final-local.log');
const verifyLogPath = path.join(here, argumentValue('--verify-log') ?? 'npm-verify-uic09-final.log');
const preverify = process.argv.includes('--preverify');
const finalize = process.argv.includes('--finalize');
assert.notEqual(preverify, finalize, 'Truyền đúng một trong hai cờ --preverify hoặc --finalize.');

const sourceFiles = [
    'BotSalesAI_Frontend/playwright.config.ts',
    'BotSalesAI_Frontend/tests/browser-runtime-identity.spec.ts',
];
const digest = value => createHash('sha256').update(value).digest('hex');
const raw = await readFile(evidencePath, 'utf8');
const evidence = JSON.parse(raw);
const allowed = new Set(sourceFiles);
for (const [relativePath, expected] of Object.entries(evidence.sourceFingerprints)) {
    const actual = digest(await readFile(path.join(repositoryRoot, relativePath)));
    if (actual !== expected && !allowed.has(relativePath)) throw new Error(`Từ chối refresh fingerprint ngoài phạm vi UIC09: ${relativePath}`);
}
for (const relativePath of sourceFiles) {
    evidence.sourceFingerprints[relativePath] = digest(await readFile(path.join(repositoryRoot, relativePath)));
}

if (preverify) {
    const browserLog = await readFile(browserLogPath, 'utf8');
    assert.equal((await readFile(`${browserLogPath}.exit`, 'utf8')).trim(), '0', 'Browser identity tests must exit 0.');
    assert.match(browserLog, /BROWSER_IDENTITY engine=chromium binary=155\.0\.8059\.40 uaMajor=155/);
    assert.match(browserLog, /BROWSER_IDENTITY engine=firefox binary=155\.0 uaMajor=155/);
    assert.match(browserLog, /2 passed \(\d+(?:\.\d+)?s\)/);

    for (const [engine, version] of [['chromium', '155.0.8059.40'], ['firefox', '155.0']]) {
        const result = `${engine} binary ${version} and navigator.userAgent major 155 matched; browser identity regression passed 1/1.`;
        const check = {
            id: `uic09-browser-identity-${engine}`,
            command: "npm.cmd --script-shell=cmd.exe run test:e2e -- --config=playwright.config.ts --grep 'browser context reports' --project=chromium --project=firefox --workers=1 --reporter=line",
            exitCode: 0,
            result: 'PASS',
            expected: result,
            observed: result,
            log: { path: path.relative(repositoryRoot, browserLogPath).replaceAll(path.sep, '/'), sha256: digest(browserLog) },
        };
        const existing = evidence.checks.find(item => item.id === check.id);
        if (existing) Object.assign(existing, check);
        else evidence.checks.push(check);
        const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
        const existingCoverage = evidence.coverage.find(item => item.name === coverage.name);
        if (existingCoverage) Object.assign(existingCoverage, coverage);
        else evidence.coverage.push(coverage);
    }
    const clause = 'UIC09 removed the stale Chrome UA override and locally verified browser binary/user-agent major identity on Chromium 155.0.8059.40 and Firefox 155.0.';
    if (!evidence.scope.includes(clause)) evidence.scope = `${evidence.scope.trim()} ${clause}`;
    evidence.status = 'IN_PROGRESS';
} else {
    const verifyLog = await readFile(verifyLogPath, 'utf8');
    assert.equal((await readFile(`${verifyLogPath}.exit`, 'utf8')).trim(), '0', 'Final UIC09 npm run verify must exit 0.');
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
    ]) assert.match(verifyLog, pattern, `Final UIC09 verify is missing receipt: ${pattern}`);
    const result = 'npm run verify PASS on the UIC07–UIC09 sequential checkout; generated contracts, source/session, boundary, lint, typecheck, domain, unit, production build, layout, visual-token, composition and S17 gates all passed. Exact counts are in the linked command log.';
    const check = {
        id: 'uic09-sequential-full-verify',
        command: 'npm.cmd --script-shell=cmd.exe run verify (Node 24.19.0, npm 11.17.0)',
        exitCode: 0,
        result: 'PASS',
        expected: result,
        observed: result,
        log: { path: path.relative(repositoryRoot, verifyLogPath).replaceAll(path.sep, '/'), sha256: digest(verifyLog) },
    };
    const existing = evidence.checks.find(item => item.id === check.id);
    if (existing) Object.assign(existing, check);
    else evidence.checks.push(check);
    const coverage = { name: check.id, expected: 1, observed: 1, missing: 0, result: 'COMPLETE' };
    const existingCoverage = evidence.coverage.find(item => item.name === coverage.name);
    if (existingCoverage) Object.assign(existingCoverage, coverage);
    else evidence.coverage.push(coverage);
    assert.ok(evidence.coverage.every(item => item.result === 'COMPLETE' || item.result === 'N/A'), 'Cannot mark S17 COMPLETE while an evidence row remains open.');
    evidence.status = 'COMPLETE';
}

evidence.recordedAt = new Date().toISOString();
const newline = raw.includes('\r\n') ? '\r\n' : '\n';
await writeFile(evidencePath, JSON.stringify(evidence, null, 2).replaceAll('\n', newline) + newline, 'utf8');
console.log(JSON.stringify({ phase: preverify ? 'preverify' : 'finalize', sourceFingerprints: sourceFiles.map(file => [file, evidence.sourceFingerprints[file]]), checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status, recordedAt: evidence.recordedAt }, null, 2));

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(directory, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const digestFile = relative => digest(fs.readFileSync(path.join(repoRoot, relative)));
const sourceMapLog = 'botsales-kit/execution/frontend-evidence/FE017/S01-source-map-current-20261001.log';
const e2eLog = 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const supportLogs = [
    'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
];
const prior = JSON.parse(fs.readFileSync(path.join(directory, 'S05-current-approved-substitute.json'), 'utf8'));
const sourcePaths = [...new Set([
    ...prior.sourceFiles.map(file => file.path),
    'botsales-kit/execution/frontend-evidence/FE017/S01-route-operation-map.md',
    'botsales-kit/execution/frontend-evidence/FE017/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE017/write-priority-evidence-current-20261001.mjs',
    'docs/KNOWN_GAPS.md',
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: digestFile(file) }));
const sourceSnapshotSha256 = digest(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const currentE2e = fs.readFileSync(path.join(repoRoot, e2eLog), 'utf8');
const totalE2e = Number(currentE2e.match(/(\d+) passed\b/)?.[1]);
const browserCases = (currentE2e.match(/tests\\fe017(?:-validation)?\.spec\.ts:/g) ?? []).length;
if (totalE2e !== 123 || browserCases !== 8 || !/"taskId"\s*:\s*"FE017"/.test(currentE2e) || !/"checks"\s*:\s*4/.test(currentE2e)) {
    throw new Error(`Expected the current 123-case E2E run, four FE017 source assertions and eight FE017 browser cases; got ${totalE2e}/${browserCases}.`);
}
const sourceMapOutput = fs.readFileSync(path.join(repoRoot, sourceMapLog), 'utf8');
if (!/"checks"\s*:\s*4/.test(sourceMapOutput) || !sourceMapOutput.includes('ℹ pass 4') || !sourceMapOutput.includes('EXIT_CODE=0')) {
    throw new Error('Fresh FE017 source-map run did not pass all four checks.');
}
const allSupport = supportLogs.map(file => [file, fs.readFileSync(path.join(repoRoot, file), 'utf8')]);
const support = new Map(allSupport);
const assertions = [
    [supportLogs[0], /"files": 58[\s\S]*"operationCalls": 224[\s\S]*"routes": 54[\s\S]*"status": "PASS"/],
    [supportLogs[1], /"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54/],
    [supportLogs[2], /"imports": 402[\s\S]*negativeFixtures[\s\S]*8\/8[\s\S]*"status": "PASS"/],
    [supportLogs[3], /EXIT_CODE=0/],
    [supportLogs[4], /EXIT_CODE=0/],
    [supportLogs[5], /66 passed \(66\)[\s\S]*EXIT_CODE=0/],
    [supportLogs[6], /"passed":88[\s\S]*EXIT_CODE=0/],
    [supportLogs[7], /"status": "PASS", "checks": 356[\s\S]*EXIT_CODE=0/],
    [supportLogs[8], /✓ built[\s\S]*EXIT_CODE=0/],
    [supportLogs[9], /✓ built[\s\S]*EXIT_CODE=0/],
];
for (const [file, pattern] of assertions) {
    if (!pattern.test(support.get(file))) throw new Error(`Current supporting gate failed or has an unexpected result: ${file}`);
}

const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
    const item = commandMap.commands.find(entry => entry.id === id);
    if (!item || item.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command is not verified: ${id}`);
    return item.command;
};
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const expectations = {
    S01: {
        expected: 'R23–R25 operations, permissions, DTOs and current React source map to canonical contracts; record the missing allowedActions field without inventing a DTO member.',
        observed: 'Fresh source-map run passed 4/4. It verifies canonical route/operation/permission mapping, the absent Knowledge.allowedActions field, the approved knowledge.publish plus lifecycle substitute, separate product/stock snapshot sources, and immutable published revisions.',
    },
    S02: {
        expected: 'Knowledge draft, file/source status, revisions, review and publish flows use canonical operations and synthetic API state.',
        observed: 'All eight FE017 browser cases passed in the current 123/123 full Chromium suite across the validation and knowledge specs. They verify draft creation, upload purpose/status, evaluated publish and immutable history, file validation, feedback draft creation, and separate product/inventory snapshot reads.',
    },
    S03: {
        expected: 'Invalid fields/files, stale review, unauthorized publish/upload, and untrusted feedback fail visibly while preserving user data; publish uses only the documented frontend substitute.',
        observed: 'All eight FE017 browser cases passed. Synthetic 422 preserves form values; invalid/oversized files send no write; manager publish/upload returns 403; stale review preserves reason; feedback HTML-like content remains inert. The UI checks knowledge.publish permission plus ready_for_review lifecycle because allowedActions is absent from the canonical DTO.',
    },
    S04: {
        expected: 'Current FE017 E2E, source map, type, lint, boundary, generation, unit, domain/schema and build checks pass for frontend mock scope.',
        observed: 'Full Chromium 123/123; FE017 source map 4/4 and browser cases 8; Vitest 66/66; domain/MSW 88/88; schema validation 356/356; generate 11/283/210/54; source 58/224/54; boundaries 402 imports with 8/8 negative fixtures; typecheck/lint and production/demo builds exit 0. Bundle-size warning remains.',
    },
    S05: {
        expected: 'Knowledge acceptance runs in the real React Chromium demo with synthetic API, visible validation, role guard and responsive price/stock preview.',
        observed: 'The current full Chromium suite passed 123/123, including all eight FE017 cases. Product price and stock snapshot previews are permission-gated and timestamped; the 375px source preview has no horizontal overflow and supports focus. This is focused browser evidence, not complete keyboard/screen-reader UAT.',
    },
};
const checksByStep = { S01: 4, S02: 8, S03: 8, S04: 8, S05: 8 };
for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const primaryLog = stepId === 'S01' ? sourceMapLog : e2eLog;
    const primaryCommandId = stepId === 'S01' ? 'fe017-source-map' : 'e2e';
    const evidence = {
        taskId: 'FE017',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; knowledge sources, contracts, route map and handoff are hashed below.`,
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: command(primaryCommandId),
        commandId: primaryCommandId,
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
            details: 'React demo with deterministic synthetic MSW data. No live provider, backend authorization or server-provided allowedActions.',
            dataSource: stepId === 'S01' ? 'source-only' : 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile: primaryLog.slice('botsales-kit/'.length),
        logSha256: digestFile(primaryLog),
        sourceFiles,
        sourceSnapshotSha256,
        ...(stepId === 'S04' || stepId === 'S05' ? {
            supportingLogs: [sourceMapLog, ...supportLogs].map(file => ({ file: file.slice('botsales-kit/'.length), sha256: digestFile(file) })),
        } : {}),
    };
    fs.writeFileSync(path.join(directory, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify({ taskId: 'FE017', steps: 5, totalE2e, browserCases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);

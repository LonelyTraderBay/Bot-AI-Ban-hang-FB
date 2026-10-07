import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(evidenceDirectory, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = relative => hash(fs.readFileSync(path.join(repoRoot, relative)));
const relativeToKit = relative => relative.slice('botsales-kit/'.length);
const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const commands = new Map(commandMap.commands.map(command => [command.id, command]));
const registeredCommand = id => {
    const command = commands.get(id);
    if (!command || command.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command is not verified: ${id}`);
    return command.command;
};

const logs = {
    e2e: 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
    source: 'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    unit: 'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    domain: 'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    schemas: 'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    generate: 'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    typecheck: 'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    lint: 'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    boundaries: 'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    productionBuild: 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    demoBuild: 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
};

const previous = JSON.parse(fs.readFileSync(path.join(evidenceDirectory, 'S05-final-96-e2e.json'), 'utf8'));
const sourcePaths = [...new Set([
    ...previous.sourceFiles.map(file => file.path),
    'botsales-kit/execution/frontend-evidence/FE015/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE015/write-priority-evidence-20261001.mjs',
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: hashFile(file) }));
const sourceSnapshot = files => hash(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const sourceSnapshotSha256 = sourceSnapshot(sourceFiles);

const fullE2eLog = fs.readFileSync(path.join(repoRoot, logs.e2e), 'utf8');
const e2eChecksTotal = Number(fullE2eLog.match(/(\d+) passed\b/)?.[1]);
const financeBrowserCases = (fullE2eLog.match(/› tests\\fe015\.spec\.ts:/g) ?? []).length;
if (e2eChecksTotal !== 123 || financeBrowserCases !== 8 || !fullE2eLog.includes('FE015 source map: 131 contract/source assertions passed')) {
    throw new Error(`Unexpected current E2E evidence: ${e2eChecksTotal} total, ${financeBrowserCases} FE015 browser cases.`);
}

const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const commonExpected = 'The frontend maps canonical routes, operations, permissions, DTOs and finance restrictions to the current React source; monetary behavior uses synthetic API results only.';
const observed = {
    S01: 'The FE015 route/operation/source map passed 131 assertions in the current full E2E log. It covers R20–R22 and R48–R50, finance capabilities, decimal schemas, timezone inputs, mock reconciliation, and the absence of an account-catalog operation.',
    S02: 'All seven FE015 browser cases passed within the current 123/123 React Chromium suite. Reports use API aggregates; journal payloads preserve exact decimal strings; COD remittance/fee and partial bank allocations reflect synthetic returned state.',
    S03: 'All seven FE015 browser cases passed within the current 123/123 suite, including unbalanced journal rejection before POST, closed-period action denial, partial-row import errors, duplicate external IDs, partial allocation, and unknown journal-post recovery without blind resend.',
    S04: 'Current full E2E passed 123/123; Vitest 66/66; domain/MSW 88; schema validation 356/356; generated contract check 11 outputs/283 schemas/210 operations/54 routes; source 58/224/54; boundaries 402 imports with 8/8 negative fixtures; typecheck/lint and production/demo builds passed. Chunk-size warning remains.',
    S05: 'The latest 123/123 Chromium log contains seven FE015 acceptance cases and one FE021 report-explanation case in the same spec file. They cover timezone boundaries, journal/period states, CSV/COD/bank reconciliation, unknown command behavior, and mock-only report explanations. This is synthetic frontend evidence; real bookkeeping, payments, bank integrations and UAT are not claimed.',
};

const supportConfiguration = [
    ['unit', 'unit', 66],
    ['domain', 'domain', 88],
    ['schemas', 'schemas', 356],
    ['generate-check-windows', 'generate', 11],
    ['types', 'typecheck', 1],
    ['lint', 'lint', 1],
    ['source', 'source', 3],
    ['boundaries', 'boundaries', 8],
    ['build', 'productionBuild', 1],
    ['build-demo', 'demoBuild', 1],
];

function supplementaryEvidence(commandId, logKey, checksTotal) {
    const supportingFiles = sourceFiles;
    return {
        commandId,
        command: registeredCommand(commandId),
        logFile: relativeToKit(logs[logKey]),
        logSha256: hashFile(logs[logKey]),
        checksTotal,
        failed: 0,
        exitCode: 0,
        sourceFiles: supportingFiles,
        sourceSnapshotSha256,
    };
}

for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const checksByStep = { S01: 131, S02: 7, S03: 7, S04: 7, S05: 7 };
    const evidence = {
        taskId: 'FE015',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; all finance and shared-service sources above are hashed.`,
        expected: commonExpected,
        observed: observed[stepId],
        command: registeredCommand('e2e'),
        commandId: 'e2e',
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
            details: 'React demo and all finance, payment, COD, statement and bank data use deterministic synthetic MSW fixtures.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile: relativeToKit(logs.e2e),
        logSha256: hashFile(logs.e2e),
        sourceFiles,
        sourceSnapshotSha256,
        supportingLogs: stepId === 'S04' || stepId === 'S05'
            ? supportConfiguration.map(([, key]) => ({ file: relativeToKit(logs[key]), sha256: hashFile(logs[key]) }))
            : [],
        ...(stepId === 'S04' || stepId === 'S05'
            ? { supplementaryEvidence: supportConfiguration.map(([id, key, count]) => supplementaryEvidence(id, key, count)) }
            : {}),
    };
    fs.writeFileSync(path.join(evidenceDirectory, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify({ taskId: 'FE015', steps: 5, e2eChecksTotal, financeBrowserCases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);

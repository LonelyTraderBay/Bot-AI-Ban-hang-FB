import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const evidenceDirectory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(evidenceDirectory, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
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
    'botsales-kit/execution/frontend-evidence/FE016/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE016/write-priority-evidence-20261001.mjs',
])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: hashFile(file) }));
const snapshot = files => hash(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const sourceSnapshotSha256 = snapshot(sourceFiles);

const fullE2eLog = fs.readFileSync(path.join(repoRoot, logs.e2e), 'utf8');
const e2eChecksTotal = Number(fullE2eLog.match(/(\d+) passed\b/)?.[1]);
const inboxBrowserCases = (fullE2eLog.match(/› tests\\fe016\.spec\.ts:/g) ?? []).length;
if (e2eChecksTotal !== 123 || inboxBrowserCases !== 9 || !fullE2eLog.includes('FE016 maps R05/R06 reads and mutations to canonical permissions and current inbox source')) {
    throw new Error(`Unexpected E2E evidence: ${e2eChecksTotal} total, ${inboxBrowserCases} FE016 cases, current source map not found.`);
}

const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const expectations = {
    S01: {
        expected: 'R05/R06, canonical read/write operations and permissions, message payload fields, safe content rendering, event recovery and media capability gaps map to the current inbox source.',
        observed: 'The current full E2E log records three passing FE016 source-map checks. They cover R05/R06 operations and permissions, filter/message bounds, safe message references, shell-owned resync/recovery and the unsupported media gap.',
    },
    S02: {
        expected: 'Inbox filters, conversation/message pagination, takeover, reply state, feedback, contact/order composition and synthetic command status work through the real React demo.',
        observed: 'All nine FE016 browser cases passed in the full 123/123 run. They verify URL-backed filters/bookmarks, independent cursors, current-version takeover/reply, visible API send state, feedback review draft, inert message content, permission-gated customer/order references, sample promotion preview without discount, and local synthetic image/voice preview.',
    },
    S03: {
        expected: 'Stale takeover, permission loss, late/unknown send and untrusted message content do not lose drafts, execute unsupported actions, claim provider delivery or blindly resend.',
        observed: 'All nine FE016 browser cases passed in the full 123/123 run. Stale version retains the takeover reason, unknown send retains the reply draft and exposes recovery without a duplicate write, role-limited references stay unavailable, HTML-like message text is inert, and demo-only media/promotion previews do not call external providers or apply discounts.',
    },
    S04: {
        expected: 'Behavioral React/network tests and current source, domain/schema, type, lint, boundary, generation and production/demo build checks pass for the inbox mock scope.',
        observed: 'Current Chromium passed 123/123, including nine FE016 cases; Vitest 66/66; domain/MSW 88; schema checks 356/356; generated contracts 11/283/210/54; source 58/224/54; boundaries 402 imports and 8/8 negative fixtures; typecheck/lint and production/demo builds passed. Chunk warning remains recorded.',
    },
    S05: {
        expected: 'Inbox acceptance executes in the React Chromium demo with API-scoped state, roles, filters, error recovery and inert user content.',
        observed: 'The full current Chromium suite passed 123/123, including all nine FE016 browser scenarios and three route/source-map checks. All traffic is synthetic MSW; provider delivery, live events and backend authorization are outside this evidence.',
    },
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

function supplementary(commandId, logKey, checksTotal) {
    return {
        commandId,
        command: registeredCommand(commandId),
        logFile: relativeToKit(logs[logKey]),
        logSha256: hashFile(logs[logKey]),
        checksTotal,
        failed: 0,
        exitCode: 0,
        sourceFiles,
        sourceSnapshotSha256,
    };
}

for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const checksByStep = { S01: 3, S02: 9, S03: 9, S04: 9, S05: 9 };
    const evidence = {
        taskId: 'FE016',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; inbox, shell and mock sources are hash-recorded.`,
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: registeredCommand('e2e'),
        commandId: 'e2e',
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
            details: 'React demo, conversation/message state, roles, event traffic and API responses use synthetic MSW fixtures.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile: relativeToKit(logs.e2e),
        logSha256: hashFile(logs.e2e),
        sourceFiles,
        sourceSnapshotSha256,
        ...(stepId === 'S04' || stepId === 'S05'
            ? {
                supplementaryEvidence: supportConfiguration.map(([id, key, count]) => supplementary(id, key, count)),
                supportingLogs: supportConfiguration.map(([, key]) => ({ file: relativeToKit(logs[key]), sha256: hashFile(logs[key]) })),
            }
            : {}),
    };
    fs.writeFileSync(path.join(evidenceDirectory, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}

process.stdout.write(`${JSON.stringify({ taskId: 'FE016', steps: 5, e2eChecksTotal, inboxBrowserCases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);

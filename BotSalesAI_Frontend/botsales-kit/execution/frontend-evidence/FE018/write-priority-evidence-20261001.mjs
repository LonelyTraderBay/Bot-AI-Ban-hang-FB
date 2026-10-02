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
const sourcePaths = [
    'apps/web/src/app/CommandRecovery.tsx',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/mocks/auxiliary.ts',
    'apps/web/src/mocks/control.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/modules/bot/index.tsx',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/tests/components.test.tsx',
    'tests/fe018-source-map.test.mjs',
    'tests/fe018.spec.ts',
    'tests/session/demo-server.mjs',
    'playwright.config.ts',
    'packages/contracts/src/generated.ts',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/permissions.json',
    'packages/contracts/src/routes.json',
    'packages/contracts/src/schemas.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE018/S01-route-operation-map.md',
    'botsales-kit/execution/frontend-evidence/FE018/handoff.md',
    'botsales-kit/execution/frontend-evidence/FE018/write-priority-evidence-20261001.mjs',
    'docs/KNOWN_GAPS.md',
].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: digestFile(file) }));
const sourceSnapshotSha256 = digest(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const e2e = fs.readFileSync(path.join(repoRoot, e2eLog), 'utf8');
const total = Number(e2e.match(/(\d+) passed\b/)?.[1]);
const cases = (e2e.match(/tests\\fe018\.spec\.ts:/g) ?? []).length;
if (total !== 123 || cases !== 10 || !/"taskId"\s*:\s*"FE018"/.test(e2e) || !/"checks"\s*:\s*2/.test(e2e)) {
    throw new Error(`Expected current 123/123 E2E, two FE018 source-map assertions and ten FE018 browser spec cases; got ${total}/${cases}.`);
}
const support = supportLogs.map(file => [file, fs.readFileSync(path.join(repoRoot, file), 'utf8')]);
const supportMap = new Map(support);
const supportAssertions = [
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
for (const [file, pattern] of supportAssertions) if (!pattern.test(supportMap.get(file))) throw new Error(`Failed current supporting evidence: ${file}`);

const commandMap = JSON.parse(fs.readFileSync(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const e2eCommand = commandMap.commands.find(entry => entry.id === 'e2e');
if (!e2eCommand || e2eCommand.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered E2E command is not verified.');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
const expectations = {
    S01: {
        expected: 'R26/R27/R28/R51 and their canonical operation permissions map to the current React source; preserve route-manifest gaps and undeclared-field restrictions.',
        observed: 'The current full E2E source map passed two FE018 assertions. It checks all four canonical routes and their actions, the separate updateBudgetPolicy OpenAPI permission despite the R51 mapping gap, declared tool/capability schemas, and the locked human-confirmation contract.',
    },
    S02: {
        expected: 'Bot configuration, team roles, synthetic playground, revision-bound evaluation, publish/pause, budget approval and role kill switch update mock API state.',
        observed: 'Nine FE018 behavioral cases passed in the full 123/123 Chromium suite. Requests carried current versions; synthetic evaluation matched the draft revision, publish/pause returned asynchronous command state, playground sent no external message, and role/budget changes were reflected by the mock API.',
    },
    S03: {
        expected: 'Stale configuration, wrong evaluation revision, budget/tool denial, wrong/expired approval, role permissions and unknown command retain input and never imply false success.',
        observed: 'Nine FE018 behavioral cases passed. Mock 412/409/429/403 and unknown 202 scenarios kept draft/prompt/reason visible; no unapproved tool or budget action was granted, and unknown role command remained unresolved without retry or success claim.',
    },
    S04: {
        expected: 'Current FE018 E2E, unit, domain, schema, source, generation, boundaries, type, lint and production/demo build gates pass on the frontend mock scope.',
        observed: 'Full E2E 123/123 with ten FE018 spec cases, including route mapping; Vitest 66/66; domain/MSW 88/88; schemas 356/356; generate 11/283/210/54; source 58/224/54; boundaries 402 imports with 8/8 negative fixtures; typecheck/lint and production/demo builds exit 0. Chunk warning remains.',
    },
    S05: {
        expected: 'The real React Chromium demo exercises task routes with clear synthetic labels and verifies relevant narrow viewport behavior.',
        observed: 'The current full E2E passed 123/123 and includes all ten FE018 browser spec cases. Playground synthetic labeling/no external send and narrow viewport reflow passed; provider quality, backend, CI, staging, production deployment and UAT are not claimed.',
    },
};
const checksByStep = { S01: 2, S02: 9, S03: 9, S04: 9, S05: 9 };
for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const evidence = {
        taskId: 'FE018',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: `HEAD ${revision} plus current dirty working tree; bot, shell, mock, route map, contracts and tests are hashed below.`,
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: e2eCommand.command,
        commandId: e2eCommand.id,
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`,
            details: 'React demo and bot/evaluation/budget/tool responses use deterministic synthetic MSW data; no LLM or external message delivery.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile: e2eLog.slice('botsales-kit/'.length),
        logSha256: digestFile(e2eLog),
        sourceFiles,
        sourceSnapshotSha256,
        ...(stepId === 'S04' || stepId === 'S05' ? {
            supportingLogs: supportLogs.map(file => ({ file: file.slice('botsales-kit/'.length), sha256: digestFile(file) })),
        } : {}),
    };
    fs.writeFileSync(path.join(directory, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}
process.stdout.write(`${JSON.stringify({ taskId: 'FE018', steps: 5, totalE2e: total, fe018SpecCases: cases, sourceFiles: sourceFiles.length, sourceSnapshotSha256 })}\n`);

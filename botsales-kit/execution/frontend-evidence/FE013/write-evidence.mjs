import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(dir, '../../../..', 'botsales-kit');
const repoRoot = path.resolve(kitRoot, '..');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const commandMap = JSON.parse(await readFile(path.join(kitRoot, 'execution/frontend-command-map.json'), 'utf8'));
const e2e = commandMap.commands.find(command => command.id === 'e2e');
if (!e2e || e2e.status !== 'VERIFIED_AVAILABLE') throw new Error('The registered e2e command must remain verified.');

const sourcePaths = [
    'apps/web/src/app/CommandRecovery.tsx',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/router.tsx',
    'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/fulfillment.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/orders.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/modules/fulfillment/index.tsx',
    'apps/web/src/modules/orders/index.tsx',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/api/intents.ts',
    'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/tests/components.test.tsx',
    'tests/fe013.spec.ts',
    'tests/fe013-source-map.test.mjs',
    'tests/session/demo-server.mjs',
    'playwright.config.ts',
    'packages/contracts/src/generated.ts',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/routes.json',
    'packages/contracts/src/schemas.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/design/tokens.json',
    'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE013/S01-route-operation-map.md',
    'docs/KNOWN_GAPS.md',
];
const sourceFiles = await Promise.all(sourcePaths.map(async file => ({
    path: file,
    sha256: sha256(await readFile(path.join(repoRoot, file))),
})));
const sourceSnapshotSha256 = sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));

const logPaths = [
    'execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
    'execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
    'execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
    'execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
    'execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
    'execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
    'execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
    'execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
    'execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
    'execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
];
const supportingLogs = await Promise.all(logPaths.map(async file => ({
    file,
    sha256: sha256(await readFile(path.join(kitRoot, file))),
})));

const logFile = 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const e2eOutput = await readFile(path.join(kitRoot, logFile), 'utf8');
const e2eChecksTotal = Number(e2eOutput.match(/(\d+) passed\b/)?.[1]);
if (!Number.isInteger(e2eChecksTotal) || e2eChecksTotal !== 123) throw new Error('The current full E2E log must show the verified 123/123 result.');
const fe013BrowserCases = e2eOutput.split(/\r?\n/).filter(line => /tests\\fe013\.spec\.ts:/.test(line) && /› FE013\./.test(line)).length;
if (!e2eOutput.includes('"taskId": "FE013"') || !e2eOutput.includes('"checks": 54') || fe013BrowserCases !== 4) {
    throw new Error(`The current E2E log must include the 54-check FE013 source map and four FE013 browser cases (found ${fe013BrowserCases}).`);
}
const support = Object.fromEntries(await Promise.all(logPaths.map(async file => [file, await readFile(path.join(kitRoot, file), 'utf8')])));
const supportAssertions = [
    ['execution/frontend-evidence/FE009/source-rerun-current-20261001.log', /"files": 58[\s\S]*"operationCalls": 224[\s\S]*"routes": 54[\s\S]*"status": "PASS"/],
    ['execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log', /"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54/],
    ['execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log', /"imports": 402[\s\S]*negativeFixtures[\s\S]*8\/8[\s\S]*"status": "PASS"/],
    ['execution/frontend-evidence/FE007/unit-rerun-current-20261001.log', /66 passed \(66\)[\s\S]*EXIT_CODE=0/],
    ['execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log', /"passed":88[\s\S]*EXIT_CODE=0/],
    ['execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log', /"status": "PASS", "checks": 356[\s\S]*EXIT_CODE=0/],
    ['execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log', /EXIT_CODE=0/],
    ['execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log', /EXIT_CODE=0/],
    ['execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log', /✓ built[\s\S]*EXIT_CODE=0/],
    ['execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log', /✓ built[\s\S]*EXIT_CODE=0/],
];
for (const [file, pattern] of supportAssertions) {
    if (!pattern.test(support[file])) throw new Error(`Required current supporting evidence is absent or failed: ${file}`);
}
const checksByStep = { S01: 54, S02: 4, S03: 4, S04: 4, S05: 4 };
const sourceRevision = `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()} plus the hashed dirty working tree.`;

const expectations = {
    S01: {
        expected: 'R41/R42 routes, operation IDs, permission boundaries, DTOs and lifecycle states map to canonical contracts and current fulfillment source.',
        observed: 'The current full E2E log includes the FE013 source-map test passing 54 contract/source assertions. Route-owner, operations, permissions, DTO/version fields and separate prep, shipment, delivery and COD states are documented in S01-route-operation-map.md.',
    },
    S02: {
        expected: 'Claim, line-level pick, complete pack, shipment creation, handover and delivery use API state and visibly update the mock order/shipment views.',
        observed: 'All four FE013 browser scenarios passed in the React demo with synthetic MSW API: missing/unserviceable/expired shipping preview, claim, pick, pack, create shipment, current-version handover (202), separately evidenced delivered event, order/return eligibility, and unpaid COD remaining distinct.',
    },
    S03: {
        expected: 'Stale claim, invalid SKU, partial pick, pack constraints and unknown handover preserve data and prevent duplicate or false-success transitions.',
        observed: 'All four FE013 browser scenarios passed. They verify 412 claim conflict and refresh, 422 invalid SKU with retained input, partial-pick pack blocking, and unknown handover 202 with a disabled repeat action and exactly one POST.',
    },
    S04: {
        expected: 'Current source, generation, route/capability boundaries, types, lint, unit, domain, mock schema and production/demo builds pass for the frontend mock scope.',
        observed: `Current gates passed: full E2E ${e2eChecksTotal}/${e2eChecksTotal}, unit 66/66, domain/MSW 88 checks, mock schemas 356 checks, generate 11/283/210/54, source map 58/224/54, boundaries 402 imports and 8/8 negative fixtures, typecheck/lint, and production/demo builds. Builds exited 0 with the documented >500 kB chunk-size warning.`,
    },
    S05: {
        expected: 'Task-level browser acceptance runs in the React Chromium demo; role restrictions, responsive widths and focused accessibility checks are verified.',
        observed: `The full Chromium suite passed ${e2eChecksTotal}/${e2eChecksTotal}, including all four FE013 browser scenarios; warehouse cannot claim without operations.claim, layouts had no horizontal overflow at 320/390/768/1440 px, and focused axe reported zero violations.`,
    },
};

for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const logSha256 = sha256(await readFile(path.join(kitRoot, logFile)));
    const evidence = {
        taskId: 'FE013',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision,
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: e2e.command,
        commandId: e2e.id,
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: 'Windows / Node v24.19.0 / npm 11.17.0 / Chromium',
            details: 'React demo with in-memory synthetic MSW records; no live backend, carrier provider or real COD confirmation.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        logFile,
        logSha256,
        sourceFiles,
        sourceSnapshotSha256,
        supportingLogs,
    };
    await writeFile(path.join(dir, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(JSON.stringify({ taskId: 'FE013', steps: 5, sourceFiles: sourceFiles.length, e2eChecksTotal, sourceSnapshotSha256 }, null, 2));

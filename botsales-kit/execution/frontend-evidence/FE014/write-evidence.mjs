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
    'apps/web/src/mocks/collections.json',
    'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/procurement.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/modules/finance/index.tsx',
    'apps/web/src/modules/inventory/index.tsx',
    'apps/web/src/modules/operations/index.tsx',
    'apps/web/src/modules/procurement/index.tsx',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/api/intents.ts',
    'apps/web/src/shared/api/errors.ts',
    'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/tests/components.test.tsx',
    'tests/domain-scenarios.cjs',
    'tests/fixtures/mock-network.mjs',
    'tests/fe014.spec.ts',
    'tests/fe014-source-map.test.mjs',
    'tests/session/demo-server.mjs',
    'scripts/test-domain.mjs',
    'playwright.config.ts',
    'packages/contracts/src/generated.ts',
    'packages/contracts/src/operations.json',
    'packages/contracts/src/permissions.json',
    'packages/contracts/src/routes.json',
    'packages/contracts/src/schemas.json',
    'botsales-kit/contracts/openapi.json',
    'botsales-kit/contracts/route-manifest.json',
    'botsales-kit/contracts/permission-catalog.json',
    'botsales-kit/design/tokens.json',
    'botsales-kit/execution/frontend-plan.json',
    'botsales-kit/execution/frontend-command-map.json',
    'botsales-kit/execution/frontend-evidence/FE014/S01-route-operation-map.md',
    'botsales-kit/execution/frontend-evidence/FE014/handoff.md',
    'docs/FRONTEND_SCOPE.md',
    'docs/KNOWN_GAPS.md',
    'evidence/REPORT.md',
];
const sourceFiles = await Promise.all(sourcePaths.map(async file => ({ path: file, sha256: sha256(await readFile(path.join(repoRoot, file))) })));
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
const supportingLogs = await Promise.all(logPaths.map(async file => ({ file, sha256: sha256(await readFile(path.join(kitRoot, file))) })));
const logFile = 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log';
const e2eOutput = await readFile(path.join(kitRoot, logFile), 'utf8');
const e2eChecksTotal = Number(e2eOutput.match(/(\d+) passed\b/)?.[1]);
if (!Number.isInteger(e2eChecksTotal) || e2eChecksTotal !== 123) throw new Error('The current full E2E log must show the verified 123/123 result.');
const taskBrowserCases = (e2eOutput.match(/› tests\\fe014\.spec\.ts:/g) ?? []).length;
if (!e2eOutput.includes('"taskId": "FE014"') || !e2eOutput.includes('"checks": 95') || taskBrowserCases !== 6) {
    throw new Error(`The current E2E log must include the 95-check FE014 source map and all six FE014 browser cases, found ${taskBrowserCases}.`);
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
const checksByStep = { S01: 95, S02: 6, S03: 6, S04: 6, S05: 6 };
const sourceRevision = `HEAD ${execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim()} plus the hashed dirty working tree.`;

const expectations = {
    S01: {
        expected: 'R44–R47, operation IDs, permissions, DTOs and lifecycle gaps map to canonical contracts and current procurement source.',
        observed: 'The current full E2E log includes the FE014 source-map test passing 95 contract/source assertions. The route map records read/write capabilities, source-owned version/hash rules, no fabricated edit API, synthetic scope, budget policy and backend-owned concurrency limits.',
    },
    S02: {
        expected: 'Supplier, min-max proposal, multi-line purchase, version-bound approval/send and partial goods receipt work through real React routes and synthetic HTTP.',
        observed: `The current full React Chromium suite passed ${e2eChecksTotal}/${e2eChecksTotal}, including all six FE014 browser cases. Tests observed contract-shaped multi-line PO payload, API-priced total, approval version/hash, current PO/receipt version, accepted/rejected receipt quantities, stock increase and one payable from the simulator.`,
    },
    S03: {
        expected: 'Wrong shop/unapproved supplier, inactive or missing budget, stale approval, unknown send, receipt replay and permission restrictions fail visibly without duplicate or false-success state.',
        observed: `All six FE014 browser cases passed in the current ${e2eChecksTotal}/${e2eChecksTotal} Chromium suite, including invalid MOQ, disabled auto-send without an enabled budget, manager receive-action denial, unknown send with a single POST/no retry, rejected receipt reason, partial receipt and min-max replenishment. Current simulator/domain tests passed 88 combined checks, including cross-shop/unapproved supplier, inactive/missing budget, stale approval and replay without duplicate stock/AP.`,
    },
    S04: {
        expected: 'Current FE014 diff passes generation, source, boundaries, strict TypeScript, lint, unit, domain/MSW, schema, full browser and production/demo bundle checks.',
        observed: `Current checks passed: Chromium ${e2eChecksTotal}/${e2eChecksTotal}; all six FE014 browser cases and 95 source-map assertions; unit 66; domain/MSW 88; mock schemas 356; generate 11 outputs/283 schemas/210 operations/54 routes; source 58 files/224 API calls/54 routes; boundaries 402 imports/8 negative fixtures; typecheck and lint; production and demo builds exit 0. Both builds retain a >500 kB minified chunk warning.`,
    },
    S05: {
        expected: 'Task browser acceptance verifies procurement route flows, role-based controls, narrow responsive layout and focused accessibility in the React demo.',
        observed: `The full Chromium suite passed ${e2eChecksTotal}/${e2eChecksTotal}, including all six FE014 browser cases. Receipt flow had no horizontal document overflow at 320px and focused axe reported zero main-region violations. All data was synthetic; no supplier or payment provider was called.`,
    },
};

for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const evidence = {
        taskId: 'FE014',
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
            details: 'React demo with in-memory synthetic MSW records; no live backend, supplier provider or real payment confirmation.',
            dataSource: 'synthetic-msw',
        },
        checksTotal: checksByStep[stepId],
        failed: 0,
        exitCode: 0,
        logFile,
        logSha256: sha256(await readFile(path.join(kitRoot, logFile))),
        sourceFiles,
        sourceSnapshotSha256,
        supportingLogs,
    };
    await writeFile(path.join(dir, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(JSON.stringify({ taskId: 'FE014', steps: 5, sourceFiles: sourceFiles.length, taskBrowserCases, e2eChecksTotal, sourceSnapshotSha256 }, null, 2));

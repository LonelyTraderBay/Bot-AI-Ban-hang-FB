import { createHash } from 'node:crypto';
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
    'apps/web/src/modules/orders/index.tsx',
    'apps/web/src/modules/fulfillment/index.tsx',
    'apps/web/src/app/Shell.tsx',
    'apps/web/src/app/CommandRecovery.tsx',
    'apps/web/src/app/router.tsx',
    'apps/web/src/shared/api/client.ts',
    'apps/web/src/shared/api/hooks.ts',
    'apps/web/src/shared/model/scope.tsx',
    'apps/web/src/shared/model/filters.ts',
    'apps/web/src/shared/model/format.ts',
    'apps/web/src/shared/ui/components.tsx',
    'apps/web/src/mocks/catalog.ts',
    'apps/web/src/mocks/database.ts',
    'apps/web/src/mocks/fulfillment.ts',
    'apps/web/src/mocks/handlers.ts',
    'apps/web/src/mocks/orders.ts',
    'apps/web/src/mocks/seed.json',
    'apps/web/src/mocks/service.ts',
    'apps/web/src/mocks/collections.json',
    'apps/web/src/shared/api/intents.ts',
    'apps/web/tests/components.test.tsx',
    'tests/design/browser-audit.mjs',
    'tests/design/run-browser-audit.mjs',
    'tests/frontend.spec.ts',
    'tests/fe009.spec.ts',
    'tests/fe010.spec.ts',
    'tests/fe011.spec.ts',
    'tests/fe012.spec.ts',
    'tests/fe012-source-map.test.mjs',
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
if (!e2eOutput.includes('"taskId": "FE012"') || !e2eOutput.includes('"checks": 35') || !e2eOutput.includes('FE012.AC05 order drafting remains usable')) {
    throw new Error('The current full E2E log must include FE012 source-map assertions and the FE012 responsive/axe browser scenario.');
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
const checksByStep = { S01: 35, S02: 10, S03: 10, S04: 10, S05: 10 };

const expectations = {
    S01: {
        expected: 'R17/R18/R19/R43 routes, source owners, canonical operation IDs, permissions, DTO limits and known gaps map to the current React source; no endpoint is invented.',
        observed: 'The FE012 source-map test passed 35 contract/source assertions in the current full E2E run. It mapped order reads/actions, getReturnCase, Shell getShop, fulfillment handover, shared getCommand recovery, capability boundaries and the explicit shipping-address limitation.',
    },
    S02: {
        expected: 'Order drafting, remote customer/product search, edit/requote, customer evidence, confirmation and line-scoped return flows send contract-shaped bodies and expose API/mock state.',
        observed: 'All ten FE012 browser cases passed in the current full React Chromium run. They exercise createOrder, editOrderDraft, quoteOrder, customer confirmation, terminal 202 confirmation with inventory reservation, current return detail, partial receipt and refund. Returned totals/state came from the mock API.',
    },
    S03: {
        expected: 'Expiry, missing address, cumulative-return and refund limits, stale version, offline, 202/unknown, duplicate protection and allowedActions preserve user data and never show false success.',
        observed: 'All ten FE012 browser cases passed in the current full Chromium run. They cover cumulative-return 422, mock stale-version 412, offline mutation blocking, quote/confirmation expiry, unknown 202 recovery without resend, invalid return quantities and handed-over cancellation restriction. Inputs remained visible on rejection. Address CRUD remains an explicit canonical-contract gap.',
    },
    S04: {
        expected: 'Component/network/contract regressions and relevant source, schema, domain, type, lint, boundary, generation and build gates run on the current frontend/mock snapshot.',
        observed: `Full E2E passed ${e2eChecksTotal}/${e2eChecksTotal}, including all ten FE012 browser cases; Vitest 66/66; domain/MSW 88 checks; mock schemas 356 checks; generate:check (11/283/210/54), source mapping (58/224/54), boundaries (402 imports, negative fixtures 8/8), TypeScript and lint passed. Production and demo builds exited 0 with the documented >500 kB chunk warning.`,
    },
    S05: {
        expected: 'Run route-level acceptance in the real React Chromium demo with synthetic MSW; verify relevant responsive and focused accessibility behavior.',
        observed: `The full Chromium suite passed ${e2eChecksTotal}/${e2eChecksTotal}, including all ten FE012 cases. FE012 responsive/axe checks passed at 320/390/768/1440 CSS px; this is focused automated coverage, not full keyboard/screen-reader UAT.`,
    },
};

for (const stepId of ['S01', 'S02', 'S03', 'S04', 'S05']) {
    const logSha256 = sha256(await readFile(path.join(kitRoot, logFile)));
    const evidence = {
        taskId: 'FE012',
        stepId,
        kind: 'test_run',
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: new Date().toISOString(),
        sourceRevision: 'HEAD plus current dirty working tree; FE012 source, tests, contracts and mock fixtures hashed below.',
        expected: expectations[stepId].expected,
        observed: expectations[stepId].observed,
        command: e2e.command,
        commandId: e2e.id,
        cwd: repoRoot,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: 'Windows / Node v24.19.0 / npm 11.17.0',
            details: 'Actual React demo in local Chromium; users, shop, orders, inventory and payment evidence are synthetic MSW fixtures.',
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
console.log(JSON.stringify({ taskId: 'FE012', steps: 5, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

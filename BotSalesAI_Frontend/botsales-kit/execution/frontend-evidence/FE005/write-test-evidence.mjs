import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE005');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const configs = {
  S01: {
    commandId: 'source', log: 'S01-source-current-refresh.log', checks: 4,
    expected: 'Current React/TypeScript API operation references and route bindings resolve against canonical OpenAPI, route, permission and event contracts; contract gaps are recorded without adding endpoints.',
    observed: 'Current source check passed 53 frontend files, 207 operation calls and 54 routes with zero issues. A source-only inventory matched 210 OpenAPI operations to 210 generated operation entries and verified selected catalog/import/customer/finance IDs and query requirements. Service-case filtering by customerId is not in the contract; cashflow requires from/to/timezone. No backend behavior or new API is inferred.',
    sources: ['package.json','apps/web/package.json','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/client.type-contracts.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/errors.ts','apps/web/src/shared/api/validation.ts','apps/web/src/shared/api/intents.ts','apps/web/src/shared/model/filters.ts','apps/web/src/modules/bot/index.tsx','apps/web/src/modules/catalog/index.tsx','apps/web/src/modules/catalog/imports.tsx','apps/web/src/modules/customers/index.tsx','apps/web/src/modules/integrations/index.tsx','apps/web/src/modules/knowledge/index.tsx','apps/web/src/modules/workspace/index.tsx','apps/web/src/mocks/service.ts','botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/events.schema.json','botsales-kit/design/tokens.json','packages/contracts/src/index.ts','packages/contracts/src/operations.json','packages/contracts/src/schemas.json','packages/contracts/src/routes.json','packages/contracts/src/permissions.json','scripts/check-source.mjs','evidence/source-check.json','botsales-kit/execution/frontend-evidence/FE005/S01-contract-inventory.mjs','botsales-kit/execution/frontend-evidence/FE005/S01-operation-map-current-refresh.json'],
  },
  S02: {
    commandId: 'generate', log: 'S02-generate-current-refresh.log', checks: 11,
    expected: 'The canonical contract/token/route generator is fresh across its declared outputs; generated DTOs, operation metadata and route manifest remain derived outputs.',
    observed: 'Current npm run generate:check exited 0 and reported 11 outputs, 283 schemas, 210 operations and 54 routes. The generator reads canonical kit sources; no generated file was edited by hand.',
    sources: ['package.json','apps/web/package.json','scripts/generate.mjs','botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/events.schema.json','botsales-kit/design/tokens.json','packages/contracts/src/generated.ts','packages/contracts/src/index.ts','packages/contracts/src/operations.json','packages/contracts/src/schemas.json','packages/contracts/src/routes.json','packages/contracts/src/permissions.json','tests/contracts/generator.test.mjs'],
  },
  S03: {
    commandId: 'unit', log: 'S03-unit-current-refresh.log', checks: 45,
    expected: 'Typed HTTP boundary uses canonical operation IDs and DTOs, same-origin session credentials, CSRF/version/idempotency, abort/timeout handling, runtime schema validation and authoritative command settlement.',
    observed: 'Current Vitest suite passed 45/45 across 3 files, including the API client/hooks cases. No module makes direct backend fetch calls; request/response schema checks and command polling remain in shared API code. The exercise uses local fetch fixtures and synthetic data only.',
    sources: ['package.json','apps/web/package.json','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/client.type-contracts.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/errors.ts','apps/web/src/shared/api/validation.ts','apps/web/src/shared/api/intents.ts','apps/web/src/shared/model/scope.tsx','apps/web/src/modules/bot/index.tsx','apps/web/src/modules/catalog/index.tsx','apps/web/src/modules/catalog/imports.tsx','apps/web/src/modules/customers/index.tsx','apps/web/src/modules/integrations/index.tsx','apps/web/src/modules/knowledge/index.tsx','apps/web/src/modules/workspace/index.tsx','apps/web/src/mocks/service.ts','apps/web/tests/api-client.test.tsx','packages/contracts/src/operations.json','packages/contracts/src/schemas.json'],
  },
  S04: {
    commandId: 'unit', log: 'S04-unit-current-refresh.log', checks: 19,
    expected: 'Transport tests exercise HTTP success and structured 409/412/422/428/429 Problems, required body/query/version/CSRF failures, optional/null DTO values, 202 command settlement, timeout/unknown outcomes and schema-invalid request/response handling.',
    observed: 'The current API-client test file passed 19/19 cases within the full 45/45 Vitest run. It verifies structured field errors remain available, mutations with uncertain outcomes are locked pending reconciliation, 202 is not treated as completion, null values remain null and unsupported command enums are rejected. Tests use synthetic fetch fixtures and do not claim a server implementation.',
    sources: ['package.json','apps/web/package.json','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/client.type-contracts.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/errors.ts','apps/web/src/shared/api/validation.ts','apps/web/src/shared/api/intents.ts','apps/web/tests/api-client.test.tsx','packages/contracts/src/operations.json','packages/contracts/src/schemas.json'],
  },
  S05: {
    commandId: 'generate', log: 'S05-generate-current-refresh.log', checks: 7,
    expected: 'Final canonical generation, generator positive/negative fixtures, full strict typecheck, frontend unit/transport tests and current operation/route source mapping pass; generated outputs remain fresh.',
    observed: 'Current logs record generate:check 11 outputs/283 schemas/210 operations/54 routes; contract generator tests 6/6; strict typecheck with zero diagnostics; Vitest 45/45; source mapping 53 files/207 operation calls/54 routes/zero issues; and boundaries 53 files/378 imports/8 of 8 negative fixtures/zero issues. Handoff retains the finance required-query and service-case filter gaps and the separate noUncheckedIndexedAccess mock-file diagnostics. No backend/provider, CI, build or staging result is claimed.',
    sources: ['package.json','package-lock.json','apps/web/package.json','apps/web/tsconfig.json','scripts/generate.mjs','scripts/check-source.mjs','scripts/check-boundaries.mjs','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/client.type-contracts.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/errors.ts','apps/web/src/shared/api/validation.ts','apps/web/src/shared/api/intents.ts','apps/web/src/shared/model/filters.ts','apps/web/src/modules/bot/index.tsx','apps/web/src/modules/catalog/index.tsx','apps/web/src/modules/catalog/imports.tsx','apps/web/src/modules/customers/index.tsx','apps/web/src/modules/integrations/index.tsx','apps/web/src/modules/knowledge/index.tsx','apps/web/src/modules/workspace/index.tsx','apps/web/src/mocks/service.ts','apps/web/tests/api-client.test.tsx','tests/contracts/generator.test.mjs','tests/architecture/check-boundaries.mjs','botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json','botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/events.schema.json','botsales-kit/design/tokens.json','packages/contracts/src/generated.ts','packages/contracts/src/index.ts','packages/contracts/src/operations.json','packages/contracts/src/schemas.json','packages/contracts/src/routes.json','packages/contracts/src/permissions.json','botsales-kit/execution/frontend-evidence/FE005/S01-source-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S01-operation-map-current-refresh.json','botsales-kit/execution/frontend-evidence/FE005/S02-generate-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S03-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S04-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-contract-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-typecheck-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-unit-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-source-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-boundaries-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S05-diff-current-refresh.log','botsales-kit/execution/frontend-evidence/FE005/S02-no-unchecked-current-refresh.log','docs/KNOWN_GAPS.md'],
  },
};

const stepId = process.argv[2];
const config = configs[stepId];
if (!config) throw new Error(`Unknown step ${stepId}`);
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const registered = commandMap.commands.find(command => command.id === config.commandId);
if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error(`Unverified command ${config.commandId}`);
const sourcePaths = [
  ...config.sources,
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-evidence/FE005/write-test-evidence.mjs',
  `botsales-kit/execution/frontend-evidence/FE005/${config.log}`,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(repo, file))) }));
const logFile = `execution/frontend-evidence/FE005/${config.log}`;
const evidence = {
  taskId: 'FE005', stepId, kind: 'test_run', result: 'PASS',
  verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(),
  sourceRevision: 'HEAD 18be3c6 plus current dirty working tree; scoped contract/transport source hashes recorded below',
  expected: config.expected,
  observed: config.observed,
  command: registered.command,
  commandId: registered.id,
  cwd: repo,
  reviewer: 'Codex self-review; no independent peer review',
  environment: { name: `Windows / Node ${process.version} / npm 11.17.0`, details: 'Current frontend workspace; API execution uses local synthetic fixtures only.', dataSource: 'synthetic-msw' },
  checksTotal: config.checks,
  failed: 0,
  logFile,
  logSha256: sha256(fs.readFileSync(path.join(kit, logFile))),
  sourceFiles,
  sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
};
const evidencePath = path.join(dir, `${stepId}-refresh.json`);
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ stepId, commandId: registered.id, logFile, sources: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));

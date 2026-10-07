import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE009');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const kitRelative = file => path.relative(kit, path.join(repo, file)).replaceAll('\\', '/');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
  const entry = commandMap.commands.find(item => item.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as VERIFIED_AVAILABLE`);
  return entry.command;
};
const revisionResult = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' });
if (revisionResult.status !== 0) throw new Error('Cannot resolve current Git HEAD');
const revision = revisionResult.stdout.trim();
const logs = {
  e2e: 'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
  unit: 'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
  domain: 'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
  schemas: 'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
  source: 'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
  boundaries: 'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
  types: 'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
  lint: 'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
  generate: 'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
  production: 'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
  demo: 'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
  artifacts: 'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log',
};
const texts = Object.fromEntries(Object.entries(logs).map(([key, file]) => [key, fs.readFileSync(path.join(repo, file), 'utf8')]));
const e2eTotal = Number(texts.e2e.match(/\n\s*(\d+) passed \(/)?.[1]);
const unitTotal = Number(texts.unit.match(/Tests\s+(\d+) passed/)?.[1]);
const domainSummary = JSON.parse(texts.domain.split(/\r?\n/).find(line => line.startsWith('{"status"')) ?? '{}');
const schemaSummary = JSON.parse(texts.schemas.match(/\{.*"checkedAt".*\}/)?.[0] ?? '{}');
const sourceSummary = JSON.parse(texts.source.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
const boundarySummary = JSON.parse(texts.boundaries.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
if (e2eTotal !== 123 || unitTotal !== 66 || domainSummary.passed !== 88 || schemaSummary.checks !== 356 || sourceSummary.files !== 58 || sourceSummary.operationCalls !== 224 || boundarySummary.imports !== 402) {
  throw new Error(`Unexpected current gate totals: e2e=${e2eTotal}, unit=${unitTotal}, domain=${domainSummary.passed}, schemas=${schemaSummary.checks}, sourceFiles=${sourceSummary.files}, imports=${boundarySummary.imports}`);
}
if (!texts.source.includes('"status": "PASS"') || !texts.source.includes('EXIT_CODE=0')) throw new Error('Current source audit is not a passing run.');
if (!texts.boundaries.includes('"status": "PASS"') || !texts.boundaries.includes('EXIT_CODE=0') || !texts.boundaries.includes('PASS 8/8')) throw new Error('Current module-boundary audit is not a passing run.');
if (!texts.generate.includes('"status":"PASS"') || !texts.generate.includes('"outputs":11') || !texts.generate.includes('"schemas":283') || !texts.generate.includes('"operations":210') || !texts.generate.includes('"routes":54')) throw new Error('Current generator check is not a passing run.');
if (!texts.types.includes('> tsc -p apps/web/tsconfig.json --noEmit') || /error TS\d+/.test(texts.types)) throw new Error('Current strict typecheck did not pass.');
if (!texts.lint.includes('> eslint apps/web/src --max-warnings 0') || /\b(error|warning)\b/i.test(texts.lint)) throw new Error('Current lint log contains a warning or error.');
for (const key of ['production','demo']) {
  if (!texts[key].includes('✓ built in') || !texts[key].includes('EXIT_CODE=0')) throw new Error(`Current ${key} build did not pass.`);
}
if (!texts.artifacts.includes('"status": "PASS"') || (texts.artifacts.match(/"result": "PASS"/g) ?? []).length !== 9 || !texts.artifacts.includes('EXIT_CODE=0')) {
  throw new Error('Current artifact-isolation audit did not pass all nine checks.');
}
const sourcePaths = [
  'apps/web/index.html',
  'apps/web/package.json',
  'apps/web/src/main.tsx',
  'apps/web/src/app/Shell.tsx',
  'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/ScopeEvents.tsx',
  'apps/web/src/app/dirty-drafts.ts',
  'apps/web/src/app/navigation.ts',
  'apps/web/src/app/router.tsx',
  'apps/web/src/modules/workspace/index.tsx',
  'apps/web/src/modules/customers/index.tsx',
  'apps/web/src/modules/orders/index.tsx',
  'apps/web/src/mocks/service.ts',
  'apps/web/src/mocks/auxiliary.ts',
  'apps/web/src/mocks/catalog.ts',
  'apps/web/src/mocks/fulfillment.ts',
  'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/handlers.ts',
  'apps/web/src/mocks/collections.json',
  'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts',
  'apps/web/src/shared/api/errors.ts',
  'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/api/intents.ts',
  'apps/web/src/shared/api/validation.ts',
  'apps/web/src/shared/model/auth.ts',
  'apps/web/src/shared/model/dirty-drafts.ts',
  'apps/web/src/shared/model/filters.ts',
  'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/ui/components.tsx',
  'apps/web/tests/components.test.tsx',
  'apps/web/tests/states/fe023-state.test.tsx',
  'apps/web/vite.config.ts',
  'apps/web/vitest.config.ts',
  'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/docs/02_ARCHITECTURE.md',
  'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md',
  'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE009/S01-operation-map.md',
  'botsales-kit/execution/frontend-evidence/FE009/handoff.md',
  'botsales-kit/execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-priority-refresh-20261001.json',
  'botsales-kit/execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
  'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs',
  'botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-rerun-current-20261001.log',
  'docs/KNOWN_GAPS.md',
  'packages/contracts/src/operations.json',
  'packages/contracts/src/schemas.json',
  'packages/contracts/src/permissions.json',
  'playwright.config.ts',
  'package.json',
  'package-lock.json',
  'samples/MOCK_DATA.md',
  'scripts/check-source.mjs',
  'scripts/check-boundaries.mjs',
  'tests/fe009.spec.ts',
  'tests/fe011.spec.ts',
  'tests/fe012.spec.ts',
  'tests/frontend.spec.ts',
  'tests/domain-scenarios.cjs',
  'tests/fixtures/mock-network.mjs',
  'tests/session/dirty-drafts.check.mjs',
  'tests/states/fe023.spec.ts',
  'tests/vertical-slices/fe022-flows.spec.ts',
];
const stepConfigs = {
  S01: {
    commandId: 'source', log: 'source', checksTotal: 3,
    expected: 'Map FE009 routeId/operationId/permissions/features to canonical DTOs and current public module surfaces; record protocol gaps without inventing contract.',
    observed: `S01-operation-map.md maps the 11 FE009 routes to canonical operations, permissions and DTOs. Fresh source audit passed ${sourceSummary.files} TS files, ${sourceSummary.operationCalls} operation references and ${sourceSummary.routes} routes with zero issues. The map records the OIDC ReauthApproval boundary and keeps privacy approval outside this frontend behavior.`,
    support: ['e2e'],
  },
  S02: {
    commandId: 'e2e', log: 'e2e', checksTotal: e2eTotal,
    expected: 'Shop onboarding, membership, customer list/detail/forms, search/pagination and privacy request flows send canonical operations and update observable mock state.',
    observed: `Fresh full Chromium suite passed ${e2eTotal}/${e2eTotal}; nine named FE009 browser cases verify onboarding, customer validation/update with retained input, redacted read-only fields, setup checklist, consent preview, audit-field gaps, customer after-sale/shipment links, shop-scoped invite/revoke and pending privacy requests. Requests are served by synthetic MSW.`,
    support: ['domain','schemas'],
  },
  S03: {
    commandId: 'domain', log: 'domain', checksTotal: domainSummary.passed,
    expected: 'Role denial, revoke, 422/412/not-found, shop switching and unavailable privacy capability preserve input and never claim unauthorized success.',
    observed: `Fresh simulator/MSW checks passed ${domainSummary.passed}/${domainSummary.passed}; the Chromium run passed ${e2eTotal}/${e2eTotal}. Browser cases cover stale customer version with preserved edits, redacted fields, protected owner/revocation and privacy remaining pending. Domain/network fixtures confirm revoked-shop 403 does not fall back to another active shop. No privacy password shortcut was created.`,
    support: ['e2e'],
  },
  S04: {
    commandId: 'unit', log: 'unit', checksTotal: unitTotal,
    expected: 'Behavioral component, mock network, DTO/schema and route regressions exercise request payload, version, scope, permission and retained input.',
    observed: `Fresh Vitest passed ${unitTotal}/${unitTotal}; supporting current checks passed domain/MSW ${domainSummary.passed}/${domainSummary.passed}, captured schema ${schemaSummary.checks}/${schemaSummary.checks}, source map ${sourceSummary.files}/${sourceSummary.files} files and route/module boundaries ${boundarySummary.imports} imports with zero issues. Full Chromium suite passed ${e2eTotal}/${e2eTotal}, including five FE009 browser tests with request/version/scope assertions.`,
    support: ['e2e','domain','schemas','source','boundaries'],
  },
  S05: {
    commandId: 'e2e', log: 'e2e', checksTotal: e2eTotal,
    expected: 'Current React demo browser acceptance covers all FE009 happy/unhappy cases; strict type, lint, source, boundaries and current build/mock gates have actual passing evidence.',
    observed: `Fresh React Chromium suite passed ${e2eTotal}/${e2eTotal}, including all nine FE009 browser cases. Current gates passed: Vitest ${unitTotal}/${unitTotal}; source audit ${sourceSummary.files} files/${sourceSummary.operationCalls} operation refs/${sourceSummary.routes} routes; boundaries ${boundarySummary.imports} imports, zero issues/negative fixtures 8/8; domain/MSW ${domainSummary.passed}/${domainSummary.passed}; JSON schemas ${schemaSummary.checks}/${schemaSummary.checks}; generate:check, strict typecheck and lint. FE008 production/demo builds and artifact isolation are current; build warns above 500 kB with 730.13 kB raw production and 733.16 kB raw demo largest chunks. This is local mock frontend evidence, not CI/live/staging/production readiness.`,
    support: ['unit','domain','schemas','source','boundaries','generate','types','lint','production','demo','artifacts'],
  },
};

for (const [stepId, config] of Object.entries(stepConfigs)) {
  const extraFiles = new Set([logs[config.log], ...config.support.map(key => logs[key])]);
  const sourceFiles = [...new Set([...sourcePaths, ...extraFiles])].sort().map(file => ({ path: file, sha256: hashFile(file) }));
  const logFile = kitRelative(logs[config.log]);
  const evidence = {
    taskId: 'FE009', stepId, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: new Date().toISOString(),
    sourceRevision: `HEAD ${revision} plus current dirty working tree; files/logs are hashed below`,
    expected: config.expected, observed: config.observed,
    command: command(config.commandId), commandId: config.commandId, cwd: repo,
    reviewer: 'Codex self-review; no independent peer review',
    environment: {
      name: 'Windows / Node v24.19.0 / npm 11.17.0 / Python 3.12.10 / Chromium Playwright',
      details: 'Root frontend workspace. Python uses the isolated TEMP jsonschema target through PYTHONPATH when checking captured records. React, simulator, browser and API are synthetic/local; no backend/provider connection.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: config.checksTotal, failed: 0, logFile,
    logSha256: hashFile(`botsales-kit/${logFile}`), sourceFiles,
    sourceSnapshotSha256: sha256(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n'))),
    supplementaryEvidence: config.support.map(key => {
      const commandId = key === 'production' ? 'build' : key === 'demo' ? 'build-demo' : key === 'artifacts' ? null : key;
      return {
      command: key === 'artifacts' ? 'node botsales-kit/execution/frontend-evidence/FE008/S05-artifact-isolation-priority-20261001.mjs' : command(commandId),
      ...(commandId ? { commandId } : {}),
      logFile: kitRelative(logs[key]),
      logSha256: hashFile(logs[key]),
      checksTotal: key === 'e2e' ? e2eTotal : key === 'unit' ? unitTotal : key === 'domain' ? domainSummary.passed : key === 'schemas' ? schemaSummary.checks : key === 'source' ? 3 : key === 'boundaries' ? 1 : 1,
      failed: 0,
      };
    }),
  };
  const evidencePath = path.join(dir, `${stepId}-priority-refresh-20261001.json`);
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ stepId, commandId: evidence.commandId, checksTotal: evidence.checksTotal, sourceFiles: sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }, null, 2));
}

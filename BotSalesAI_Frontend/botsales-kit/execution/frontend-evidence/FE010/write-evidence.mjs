import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE010');
const helper = 'botsales-kit/execution/frontend-evidence/FE010/write-evidence.mjs';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const map = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commands = new Map(map.commands.map(entry => [entry.id, entry]));
const command = id => {
  const entry = commands.get(id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Unverified command ${id}`);
  return entry.command;
};
const logs = {
  source: 'execution/frontend-evidence/FE009/source-rerun-current-20261001.log',
  contractMap: 'execution/frontend-evidence/FE010/S01-contract-map-rerun-current-20261001.log',
  e2e: 'execution/frontend-evidence/FE003/S03-e2e-current-20261001.log',
  domain: 'execution/frontend-evidence/FE008/domain-priority-rerun-current-20261001.log',
  schema: 'execution/frontend-evidence/FE008/schema-priority-rerun-current-20261001.log',
  unit: 'execution/frontend-evidence/FE007/unit-rerun-current-20261001.log',
  generate: 'execution/frontend-evidence/FE009/S05-generate-rerun-current-20261001.log',
  typecheck: 'execution/frontend-evidence/FE009/S05-typecheck-rerun-current-20261001.log',
  lint: 'execution/frontend-evidence/FE009/S05-lint-rerun-current-20261001.log',
  boundaries: 'execution/frontend-evidence/FE009/boundaries-rerun-current-20261001.log',
  build: 'execution/frontend-evidence/FE008/S05-production-build-current-rerun-20261001.log',
  demoBuild: 'execution/frontend-evidence/FE008/S05-demo-build-current-rerun-20261001.log',
};
const logTexts = Object.fromEntries(Object.entries(logs).map(([key, file]) => [key, fs.readFileSync(path.join(kit, file), 'utf8')]));
const e2eTotal = Number(logTexts.e2e.match(/\n\s*(\d+) passed \(/)?.[1]);
const unitTotal = Number(logTexts.unit.match(/Tests\s+(\d+) passed/)?.[1]);
const domainSummary = JSON.parse(logTexts.domain.split(/\r?\n/).find(line => line.startsWith('{"status"')) ?? '{}');
const schemaSummary = JSON.parse(logTexts.schema.match(/\{.*"checkedAt".*\}/)?.[0] ?? '{}');
const sourceSummary = JSON.parse(logTexts.source.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
const boundarySummary = JSON.parse(logTexts.boundaries.match(/\{[\s\S]*?\n\}/)?.[0] ?? '{}');
const contractMap = JSON.parse(fs.readFileSync(path.join(dir, 'S01-contract-map.json'), 'utf8'));
if (e2eTotal !== 123 || unitTotal !== 66 || domainSummary.passed !== 88 || schemaSummary.checks !== 356 || sourceSummary.files !== 58 || sourceSummary.operationCalls !== 224 || sourceSummary.routes !== 54 || boundarySummary.imports !== 402 || contractMap.status !== 'PASS' || contractMap.checks.length !== 8) {
  throw new Error(`Current FE010 verification totals or contract map differ: e2e=${e2eTotal}; unit=${unitTotal}; domain=${domainSummary.passed}; schema=${schemaSummary.checks}; source=${sourceSummary.files}/${sourceSummary.operationCalls}/${sourceSummary.routes}; boundary=${boundarySummary.imports}`);
}
for (const key of ['source','contractMap','boundaries','generate','typecheck','lint','build','demoBuild']) {
  if (!logTexts[key].includes('EXIT_CODE=0')) throw new Error(`Current ${key} command did not record exit code 0.`);
}
if (!logTexts.contractMap.includes('"status": "PASS"') || !logTexts.generate.includes('"status":"PASS"') || !logTexts.build.includes('✓ built in') || !logTexts.demoBuild.includes('✓ built in')) {
  throw new Error('Current contract/generator/build output is not passing.');
}
const core = [
  'apps/web/src/modules/catalog/index.tsx','apps/web/src/modules/catalog/imports.tsx',
  'apps/web/src/shared/api/client.ts','apps/web/src/shared/api/hooks.ts','apps/web/src/shared/api/validation.ts',
  'apps/web/src/shared/model/filters.ts','apps/web/src/shared/model/format.ts',
  'apps/web/src/mocks/service.ts','apps/web/src/mocks/handlers.ts','apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/seed.json','apps/web/src/mocks/catalog.ts','apps/web/src/mocks/collections.json',
  'apps/web/src/mocks/files.ts','apps/web/src/mocks/auxiliary.ts','apps/web/src/mocks/browser.ts','apps/web/src/mocks/marketing-fixture.ts',
  'apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/theme.ts',
  'apps/web/tests/api-client.test.tsx','apps/web/tests/components.test.tsx','apps/web/tests/format.test.ts',
  'tests/fe010.spec.ts','tests/frontend.spec.ts','tests/domain-scenarios.cjs','tests/fixtures/mock-network.mjs',
  'tests/contracts/generator.test.mjs','tests/architecture/check-boundaries.mjs',
  'scripts/generate.mjs','scripts/check-source.mjs','scripts/check-boundaries.mjs','scripts/test-domain.mjs',
  'scripts/validate-mock-schemas.py','samples/products.csv','samples/MOCK_DATA.md',
  'package.json','apps/web/package.json','apps/web/tsconfig.json','playwright.config.ts',
  'botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json','botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/contracts/events.schema.json','botsales-kit/design/tokens.json',
  'packages/contracts/src/operations.json','packages/contracts/src/schemas.json',
  'packages/contracts/src/permissions.json','packages/contracts/src/routes.json',
];
const snapshot = files => sha256(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const sourceFiles = files => [...new Set(files)].map(file => ({ path: file, sha256: hashFile(file) })).sort((a,b)=>a.path.localeCompare(b.path));
const addLog = (...keys) => keys.map(key => `botsales-kit/${logs[key]}`);
const supplementary = (id, logKey, checks, sources = core) => ({
  commandId: id, command: command(id), logFile: logs[logKey], logSha256: hashFile(`botsales-kit/${logs[logKey]}`),
  checksTotal: checks, failed: 0, sourceFiles: sourceFiles(sources),
});
const configs = {
  S01: {
    commandId: 'source', log: 'source', checks: 3,
    expected: 'R09–R14 and all 16 catalog/import/job operation IDs, permissions, DTOs, version requirements and import tokens resolve against canonical manifests and generated operation metadata.',
    observed: 'The registered current source checker passed with 58 files, 224 operation references, 54 canonical routes and zero issues. The task-specific contract-map script independently passed 8/8 checks for R09–R14, all 16 operations and permissions, If-Match, ProductWrite/VariantWrite and import token requirements. No canonical contract was changed.',
    files: [...core,'botsales-kit/execution/frontend-evidence/FE010/S01-operation-map.md','botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.mjs','botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.json','botsales-kit/execution/frontend-evidence/FE010/S01-contract-map-rerun-current-20261001.log','evidence/source-check.json','scripts/check-source.mjs'],
  },
  S02: {
    commandId: 'e2e', log: 'e2e', checks: 8,
    expected: 'Product, variant, category, search/pagination, image and import happy paths use the typed HTTP client and synthetic API, producing observable payloads and resulting UI state.',
    observed: 'The current full React Chromium suite passed 123/123; all eight FE010 browser scenarios passed. They verify product create and variant payload, image association, product/category search, versioned update, sample CSV content, valid-only import commit and searchable imported results. Requests use the synthetic mock HTTP harness.',
    files: [...core,...addLog('e2e')],
  },
  S03: {
    commandId: 'e2e', log: 'e2e', checks: 8,
    expected: 'Invalid price/SKU/import rows, permission denial, upload/row limits and 412 preserve user edits and never appear as successful mutations.',
    observed: 'The current full 123/123 Chromium suite includes all eight FE010 cases: positive-price validation, image-only draft protection, 412 conflict retention, warehouse read-only/cost denial, duplicate and invalid CSV row reporting, stale import token retention, and explicit 1,000-row/5 MB demo limits. The current domain/MSW suite passed 88 checks.',
    files: [...core,...addLog('e2e','domain')],
  },
  S04: {
    commandId: 'e2e', log: 'e2e', checks: 8,
    expected: 'Behavioral browser/network regressions inspect actual request method, route, body, version and resulting screen state; schema and domain fixtures reject invalid data.',
    observed: 'All eight FE010 behavioral browser/network tests passed in the full 123/123 Chromium run. They inspect ProductWrite variants, If-Match, category search/version, CSV mapping/dryRun, confirmValidRowsOnly, stale validation 412, duplicate SKU, row/file caps and role denial. Current domain/MSW passed 88 checks, mock-schema validation passed 356/356, and Vitest passed 66/66.',
    files: [...core,...addLog('e2e','domain','schema','unit')],
  },
  S05: {
    commandId: 'e2e', log: 'e2e', checks: 8,
    expected: 'Final current React demo browser flow and frontend quality gates pass; all operation/schema references remain canonical and sample limits/permissions are explicit.',
    observed: 'Full Chromium E2E passed 123/123; all eight FE010 catalog/import scenarios passed. Current Vitest passed 66/66; domain/MSW 88; JSON Schema 356/356; generate:check 11 outputs/283 schemas/210 operations/54 routes; strict typecheck and lint passed; source mapping 58/224/54 and architecture boundaries with 402 imports and 8/8 negative fixtures passed. Current production and demo builds passed; the >500 kB chunk warning remains recorded. All API activity is synthetic. No CI, live backend, staging, production deployment or real import/storage integration is claimed.',
    files: [...core,...Object.values(logs).map(file=>`botsales-kit/${file}`),'botsales-kit/execution/frontend-evidence/FE010/S01-operation-map.md','botsales-kit/execution/frontend-evidence/FE010/S01-contract-map.json','botsales-kit/execution/frontend-evidence/FE010/S01-contract-map-rerun-current-20261001.log','botsales-kit/execution/frontend-evidence/FE010/handoff.md',helper],
  },
};

for (const [stepId, config] of Object.entries(configs)) {
  const logFile = logs[config.log];
  const logPath = path.join(kit, logFile);
  const files = sourceFiles([...config.files, 'botsales-kit/execution/frontend-command-map.json','botsales-kit/execution/frontend-plan.json',helper]);
  const evidence = {
    taskId: 'FE010', stepId, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(), sourceRevision: 'HEAD 18be3c6 plus current dirty working tree; exact FE010 source hashes recorded below',
    expected: config.expected, observed: config.observed, command: command(config.commandId), commandId: config.commandId,
    cwd: repo, reviewer: 'Codex self-review; no independent peer review',
    environment: { name: `Windows / Node ${process.version} / npm 11.17.0 / Chromium Playwright`, details: 'Real React demo, canonical generated contracts, synthetic MSW network and deterministic fixtures; no live backend/provider.', dataSource: 'synthetic-msw' },
    checksTotal: config.checks, failed: 0, logFile, logSha256: sha256(fs.readFileSync(logPath)), sourceFiles: files, sourceSnapshotSha256: snapshot(files),
  };
  if (stepId === 'S01') evidence.supportingLogs = [{ file: logs.contractMap, sha256: hashFile(`botsales-kit/${logs.contractMap}`) }];
  if (stepId === 'S03') evidence.supplementaryEvidence = [supplementary('domain','domain',88)];
  if (stepId === 'S04') evidence.supplementaryEvidence = [supplementary('domain','domain',88),supplementary('schemas','schema',356),supplementary('unit','unit',66)];
  if (stepId === 'S05') evidence.supplementaryEvidence = [
    supplementary('domain','domain',88),supplementary('schemas','schema',356),supplementary('unit','unit',66),
    supplementary('generate-check-windows','generate',11),supplementary('types','typecheck',1),
    supplementary('lint','lint',1),supplementary('source','source',3),supplementary('boundaries','boundaries',8),
    supplementary('build','build',1),supplementary('build-demo','demoBuild',1),
  ];
  for (const item of evidence.supplementaryEvidence ?? []) item.sourceSnapshotSha256 = snapshot(item.sourceFiles);
  fs.writeFileSync(path.join(dir, `${stepId}-priority-refresh-20261001.json`), `${JSON.stringify(evidence,null,2)}\n`);
  console.log(JSON.stringify({ stepId, commandId: evidence.commandId, logFile, checks: evidence.checksTotal, sourceFiles: files.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }));
}

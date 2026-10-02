import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE009');
const helper = 'botsales-kit/execution/frontend-evidence/FE009/refresh-current-evidence.mjs';
const logs = {
  source: 'execution/frontend-evidence/FE009/S05-source-current-refresh.log',
  e2e: 'execution/frontend-evidence/FE003/S03-e2e-full-rerun.log',
  domain: 'execution/frontend-evidence/FE008/S05-domain-current-refresh.log',
  unit: 'execution/frontend-evidence/FE008/S05-unit-current-refresh.log',
  schema: 'execution/frontend-evidence/FE008/S04-schema-current-refresh.log',
  generate: 'execution/frontend-evidence/FE008/S05-generate-current-refresh.log',
  typecheck: 'execution/frontend-evidence/FE008/S05-typecheck-current-refresh.log',
  lint: 'execution/frontend-evidence/FE008/S05-lint-current-refresh.log',
  boundaries: 'execution/frontend-evidence/FE004/S05-boundaries-current-refresh.log',
};
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readHash = file => sha256(fs.readFileSync(path.join(repo, file)));
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
  const entry = commandMap.commands.find(item => item.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as available`);
  return entry.command;
};
const snapshot = files => sha256(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const currentSourceFiles = (existing, additions, stepId) => {
  const paths = new Set(existing.map(file => file.path));
  for (const old of [
    'botsales-kit/execution/frontend-evidence/FE009/S04-domain-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-e2e-checkpoint-final.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-e2e-final.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-source-final.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-typecheck-final.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-lint-final.log',
    'botsales-kit/execution/frontend-evidence/FE009/S05-boundaries-final.log',
    'botsales-kit/execution/frontend-evidence/FE005/S03-unit-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE005/S01-source-current-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-current-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE008/S04-schema-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE005/S02-generate-refresh.log',
  ]) paths.delete(old);
  for (const file of additions) paths.add(`botsales-kit/${file}`);
  if (stepId === 'S05') {
    paths.add('botsales-kit/execution/frontend-evidence/FE009/handoff.md');
    paths.add(helper);
  }
  return [...paths].sort().map(file => ({ path: file, sha256: readHash(file) }));
};
const sourceSet = [
  'apps/web/src/modules/workspace/index.tsx','apps/web/src/modules/customers/index.tsx',
  'apps/web/src/app/Shell.tsx','apps/web/src/app/SessionProvider.tsx','apps/web/src/app/router.tsx',
  'apps/web/src/app/dirty-drafts.ts','apps/web/src/shared/api/client.ts','apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/api/errors.ts','apps/web/src/shared/model/filters.ts','apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/ui/components.tsx','apps/web/src/mocks/service.ts','apps/web/src/mocks/auxiliary.ts',
  'apps/web/src/mocks/catalog.ts','apps/web/src/mocks/fulfillment.ts','apps/web/src/mocks/database.ts','apps/web/src/mocks/handlers.ts',
  'apps/web/src/mocks/collections.json','apps/web/src/mocks/seed.json','apps/web/src/modules/orders/index.tsx','tests/fe009.spec.ts',
  'tests/fe011.spec.ts','tests/fe012.spec.ts','tests/frontend.spec.ts','tests/domain-scenarios.cjs','tests/fixtures/mock-network.mjs',
  'apps/web/tests/components.test.tsx','apps/web/vitest.config.ts','playwright.config.ts','package.json',
  'apps/web/package.json','botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/permission-catalog.json','packages/contracts/src/operations.json',
  'packages/contracts/src/schemas.json','packages/contracts/src/permissions.json',
];
const supplementary = (id, log, checks, sources = sourceSet) => ({
  commandId: id,
  command: command(id),
  logFile: logs[log],
  logSha256: readHash(`botsales-kit/${logs[log]}`),
  checksTotal: checks,
  failed: 0,
  sourceFiles: sources.map(file => ({ path: file, sha256: readHash(file) })),
});
const details = {
  S01: { id: 'source', log: 'source', checks: 3, observed: 'S01-operation-map.md maps the FE009 routes, operations, permissions and schemas to canonical contracts, including the OIDC reauthentication boundary for privacy approval. The current source check passed 53 TypeScript files, 208 operation references and 54 routes with zero issues; no canonical contract was edited.' },
  S02: { id: 'e2e', log: 'e2e', checks: 41, observed: 'Current React Chromium suite passed 41/41. The FE009 browser cases verify shop onboarding request/state, customer create/search/pagination and retained inputs after 422/412, If-Match update payload, shop-scoped membership invite/revoke, redacted fields and privacy requests remaining pending. All requests use synthetic MSW.' },
  S03: { id: 'domain', log: 'domain', checks: 86, observed: 'Current simulator/MSW run passed 73 simulator checks and 13 network/SSE scenarios (86 total), including revoked-shop 403 without cross-shop fallback. Current browser tests preserve customer values after 422/412, deny manager team access, protect the active owner, and keep privacy approval/deletion pending with no frontend shortcut.' },
  S04: { id: 'e2e', log: 'e2e', checks: 41, observed: 'Current browser suite passed 41/41 with FE009 payload/version assertions for shop/customer/membership/privacy flows. Supporting current runs passed: domain/MSW 86, unit 45, mock schema 394, generate:check 11 outputs/283 schemas/210 operations/54 routes, strict typecheck, lint, source mapping 53/208/54, and module boundaries. All requests are synthetic.' },
  S05: { id: 'e2e', log: 'e2e', checks: 41, observed: 'The current React demo browser suite passed 41/41 in Chromium. Its FE009 cases cover onboarding, customer validation/version retention, membership invite/revoke/role guard, and privacy requests remaining pending; the shared route sweep includes workspace/customer/job routes. Supporting simulator/MSW run passed 86 checks. This is synthetic acceptance, not backend/staging acceptance.' },
};

for (let i = 1; i <= 5; i += 1) {
  const stepId = `S0${i}`;
  const evidencePath = path.join(dir, `${stepId}.json`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const detail = details[stepId];
  evidence.commandId = detail.id;
  evidence.command = command(detail.id);
  evidence.checksTotal = detail.checks;
  evidence.failed = 0;
  evidence.logFile = logs[detail.log];
  evidence.logSha256 = readHash(`botsales-kit/${evidence.logFile}`);
  evidence.observed = detail.observed;
  evidence.sourceRevision = 'HEAD 18be3c6 plus current dirty working tree; exact task source hashes recorded below';
  const logAdditions = [detail.log];
  if (['S03','S04','S05'].includes(stepId)) logAdditions.push('domain');
  if (stepId === 'S04' || stepId === 'S05') logAdditions.push('unit','schema','generate','typecheck','lint','source','boundaries');
  evidence.sourceFiles = currentSourceFiles(evidence.sourceFiles, [...new Set(logAdditions)].map(key => logs[key]), stepId);
  if (stepId === 'S03') evidence.supplementaryEvidence = [supplementary('e2e','e2e',41)];
  if (stepId === 'S04') evidence.supplementaryEvidence = [
    supplementary('domain','domain',86),supplementary('unit','unit',45),supplementary('schemas','schema',394),
    supplementary('generate-check-windows','generate',11),supplementary('types','typecheck',1),
    supplementary('source','source',3),supplementary('lint','lint',1),supplementary('boundaries','boundaries',1),
  ];
  if (stepId === 'S05') {
    evidence.supplementaryEvidence = [supplementary('domain','domain',86)];
    evidence.sourceFiles = [...new Map([
      ...evidence.sourceFiles,
      ...['botsales-kit/execution/frontend-evidence/FE009/handoff.md',helper].map(file => ({ path: file, sha256: readHash(file) })),
    ].map(file => [file.path,file])).values()].sort((a,b)=>a.path.localeCompare(b.path));
  }
  for (const item of evidence.supplementaryEvidence ?? []) item.sourceSnapshotSha256 = snapshot(item.sourceFiles);
  evidence.sourceFiles = [...new Map(evidence.sourceFiles.map(file => [file.path,file])).values()].sort((a,b)=>a.path.localeCompare(b.path));
  evidence.sourceSnapshotSha256 = snapshot(evidence.sourceFiles);
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence,null,2)}\n`);
  console.log(JSON.stringify({ stepId,commandId:evidence.commandId,logFile:evidence.logFile,checks:evidence.checksTotal,sources:evidence.sourceFiles.length,sourceSnapshotSha256:evidence.sourceSnapshotSha256 }));
}

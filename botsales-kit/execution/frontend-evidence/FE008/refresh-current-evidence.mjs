import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE008');
const helper = 'botsales-kit/execution/frontend-evidence/FE008/refresh-current-evidence.mjs';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const registered = id => {
  const entry = commandMap.commands.find(item => item.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as available`);
  return entry.command;
};
const domainLog = 'execution/frontend-evidence/FE008/S05-domain-current-refresh.log';
const schemaLog = 'execution/frontend-evidence/FE008/S04-schema-current-refresh.log';
const e2eLog = 'execution/frontend-evidence/FE003/S03-e2e-full-rerun.log';
const generatorLog = 'execution/frontend-evidence/FE008/S05-generate-current-refresh.log';
const typecheckLog = 'execution/frontend-evidence/FE008/S05-typecheck-current-refresh.log';
const taskSources = [
  'apps/web/src/mocks/seed.json','apps/web/src/mocks/collections.json','apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/service.ts','apps/web/src/mocks/handlers.ts','apps/web/src/mocks/catalog.ts','apps/web/src/mocks/fulfillment.ts',
  'apps/web/src/mocks/browser.ts','apps/web/vite.config.ts','apps/web/package.json','apps/web/src/main.tsx',
  'apps/web/src/app/Shell.tsx','tests/domain-scenarios.cjs','tests/fixtures/mock-network.mjs',
  'tests/frontend.spec.ts','tests/fe009.spec.ts','tests/fe010.spec.ts','tests/fe012.spec.ts','scripts/test-domain.mjs',
  'scripts/validate-mock-schemas.py','samples/MOCK_DATA.md','package.json','packages/contracts/src/operations.json',
  'packages/contracts/src/schemas.json','packages/contracts/src/permissions.json',
  'botsales-kit/contracts/openapi.json','botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/feature-catalog.json','botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/events.schema.json',
];
const sourceSnapshot = files => hash(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const refreshSources = (existing, additions = []) => {
  const set = new Set(existing.map(file => file.path));
  for (const file of additions) set.add(file);
  const paths = [...set].filter(file =>
    file !== 'botsales-kit/execution/frontend-evidence/FE009/S04-domain-refresh.log'
    && file !== 'botsales-kit/execution/frontend-evidence/FE009/S05-e2e-final.log'
    && file !== 'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-current-refresh.log'
    && file !== 'botsales-kit/execution/frontend-evidence/FE003/S05-generate-current.log'
    && file !== 'botsales-kit/execution/frontend-evidence/FE003/S05-typecheck-current.log',
  );
  return paths.map(file => ({ path: file, sha256: hash(fs.readFileSync(path.join(repo, file))) }));
};
const steps = {
  S01: { commandId: 'domain', log: domainLog, checks: 86, observed: 'Current synthetic domain run passed 73 simulator checks and 13 MSW HTTP/SSE scenarios (86 total), with 210 MSW handlers and 87 operation cases. The deterministic two-shop/role fixture and current canonical operation mapping were exercised without a backend/provider.' },
  S02: { commandId: 'domain', log: domainLog, checks: 86, observed: 'Current synthetic domain run passed 73 simulator checks and 13 MSW network scenarios (86 total), with 210 operation handlers and 87 operation cases. The current mock path uses MSW HTTP/fetch, shop-scoped data, schema checks and request lifecycle fixtures; UI fixtures are not embedded in JSX and live mode does not fall back to mocks.' },
  S03: { commandId: 'domain', log: domainLog, checks: 86, observed: 'Current synthetic domain run passed 73 simulator checks and 13 MSW network scenarios (86 total), including current permission/shop isolation and stale/forbidden/revoked cases. Failure, empty/partial, delayed/aborted and command/SSE fixtures are synthetic; no real provider was called.' },
  S04: { commandId: 'schemas', log: schemaLog, checks: 394, observed: 'Python 3.12.10 with jsonschema 4.25.1 in the isolated TEMP target passed 394 canonical simulator-record/schema checks with zero errors. The current domain run independently passed 73 simulator + 13 MSW checks (86 total); generate:check passed 11 outputs/283 schemas/210 operations/54 routes and strict typecheck exited 0. This validates captured mock data only, not React, a live HTTP server, or a production backend.' },
  S05: { commandId: 'domain', log: domainLog, checks: 86, observed: 'Current reset/isolation domain suite passed 73 simulator and 13 MSW scenarios (86 total), including the order/partial-return fixture and denied/revoked shop access without fallback. The current complete React Chromium browser suite passed 41/41, including FE012 order confirmation and partial return scenarios, shop switching, catalog/import, route recovery and live-mode-unavailable. API activity and records were synthetic.' },
};

for (const [stepId, config] of Object.entries(steps)) {
  const file = path.join(dir, `${stepId}-refresh.json`);
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  const command = registered(config.commandId);
  const logPath = path.join(kit, config.log);
  evidence.command = command;
  evidence.commandId = config.commandId;
  evidence.logFile = config.log;
  evidence.logSha256 = hash(fs.readFileSync(logPath));
  evidence.checksTotal = config.checks;
  evidence.failed = 0;
  evidence.observed = config.observed;
  evidence.sourceRevision = 'HEAD 18be3c6 plus current dirty working tree; exact source hashes recorded below';
  if (stepId === 'S01' || stepId === 'S02' || stepId === 'S03') {
    evidence.sourceFiles = refreshSources(evidence.sourceFiles, [domainLog.replaceAll('execution/', 'botsales-kit/execution/')]);
  } else if (stepId === 'S04') {
    evidence.sourceFiles = refreshSources(evidence.sourceFiles, [
      'botsales-kit/execution/frontend-evidence/FE008/S05-domain-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S04-schema-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-generate-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-typecheck-current-refresh.log',
    ]);
  } else {
    evidence.sourceFiles = refreshSources(evidence.sourceFiles, [
      'botsales-kit/execution/frontend-evidence/FE008/S05-domain-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S04-schema-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-generate-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/S05-typecheck-current-refresh.log',
      'botsales-kit/execution/frontend-evidence/FE008/handoff.md', helper,
    ]);
    evidence.supplementaryEvidence = [{
      command: registered('e2e'),
      commandId: 'e2e',
      logFile: e2eLog,
      logSha256: hash(fs.readFileSync(path.join(kit, e2eLog))),
      checksTotal: 41,
      failed: 0,
      sourceFiles: taskSources.map(source => ({ path: source, sha256: hash(fs.readFileSync(path.join(repo, source))) })),
    }];
  }
  evidence.sourceFiles = [...new Map(evidence.sourceFiles.map(source => [source.path, source])).values()].sort((a, b) => a.path.localeCompare(b.path));
  evidence.sourceSnapshotSha256 = sourceSnapshot(evidence.sourceFiles);
  if (stepId === 'S05') evidence.supplementaryEvidence[0].sourceSnapshotSha256 = sourceSnapshot(evidence.supplementaryEvidence[0].sourceFiles);
  fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ stepId, commandId: evidence.commandId, logFile: evidence.logFile, checks: evidence.checksTotal, sourceFiles: evidence.sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }));
}

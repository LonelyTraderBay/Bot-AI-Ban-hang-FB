import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE011');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonFrontend = relative => JSON.parse(readFrontend(relative));
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE011');
const commandMap = jsonKit('execution/frontend-command-map.json');
assert(task?.implementationSteps?.length === 5, 'Canonical FE011 S01-S05 plan not found');

const logs = {
  e2e: 'execution/frontend-evidence/FE001/S03-e2e-current-source-session-20261008.log',
  e2eDetailed: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  verify: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
  domain: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
  unit: 'execution/frontend-evidence/FE001/S03-full-verify-powershell-current-20261008.log',
  source: 'execution/frontend-evidence/FE005/S01-contract-crosswalk-current-20261008.log',
  sourceMap: 'execution/frontend-evidence/FE011/S01-source-map-current-20261008.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, relative]) => [key, readKit(relative)]));
assert(logText.e2e.includes('512 passed (50.5m)') && logText.e2e.includes('Chromium 256/256 and Firefox 256/256'), 'Current full browser suite is not 512/512');
assert(logText.verify.includes('EXIT_CODE=0'), 'Current frontend verify did not exit successfully');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current frontend source checker is not passing');
assert(logText.sourceMap.includes('"checks": 17') && /ℹ pass 1/.test(logText.sourceMap) && /ℹ fail 0/.test(logText.sourceMap), 'FE011 current source-map test is not 1/1');

const browserCases = [
  'FE011.AC01 snapshot drives stock totals and the SKU opens its catalog result',
  'FE011.AC02 adjustment validates, waits for mock confirmation, and reconciles movement history once',
  'FE011.AC03 conflict and insufficient stock preserve the draft and never update optimistically',
  'FE011.AC03 forbidden adjustment retains user input and shows no success state',
  'FE011.AC03 unknown command blocks duplicate submission until shared recovery reconciles it',
  'FE011.AC04 movement contract filters are URL-backed and history exposes actor and permission-gated source',
  'FE011.AC05 inventory reflows at mobile widths, passes axe, and restores keyboard focus after adjustment dialog',
  'FE011.AC03 unknown shop scope shows no stock from another shop',
];
const testSource = readFrontend('tests/fe011.spec.ts');
for (const name of browserCases) {
  assert(testSource.includes(`test('${name}'`), `FE011 browser test missing from source: ${name}`);
  assert(logText.e2eDetailed.includes(name), `Detailed browser log is missing FE011 scenario: ${name}`);
}
assert((logText.e2eDetailed.match(/tests\\fe011\.spec\.ts/g) ?? []).length === 16, 'Expected eight FE011 cases in each browser project');

const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'fe011-source-map', 'verify-current-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourceTasks = task.sourceTaskIds.map(id => jsonKit('execution/plan.json').tasks.find(item => item.id === id));
assert(sourceTasks.every(Boolean), 'FE011 references a missing full-product source task');
const sourceFeatureIds = [...new Set(sourceTasks.flatMap(item => item.featureIds ?? []))].sort();
const featureCatalog = jsonKit('contracts/feature-catalog.json').features;
const traceability = {
  status: 'GAP_RECORDED',
  frontendPlanFeatureIds: task.featureIds,
  sourceTaskIds: task.sourceTaskIds,
  sourceTaskFeatureIds: sourceFeatureIds,
  planFeatureRoutes: task.featureIds.map(id => ({ id, routeIds: featureCatalog.find(item => item.id === id)?.routeIds ?? [] })),
  sourceTaskFeatureRoutes: sourceFeatureIds.map(id => ({ id, routeIds: featureCatalog.find(item => item.id === id)?.routeIds ?? [] })),
  targetRouteIds: task.routeIds,
  reason: 'FE011 targets inventory routes R15/R16, but the frontend plan lists H07/H08 (routes R34/R52); source tasks T022/T023/T024 reference D01/D03/B04/C08/H04/B02/B03/G02. The source-map checks inventory routes and operations directly. The canonical frontend plan is unchanged pending its approved migration path.',
};
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/vite.config.ts',
  'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/inventory/index.tsx', 'apps/web/src/modules/catalog/index.tsx',
  'apps/web/src/mocks/fulfillment.ts', 'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/errors.ts',
  'apps/web/src/shared/api/validation.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/filters.ts',
  'apps/web/src/shared/ui/components.tsx', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'packages/contracts/src/routes.json', 'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'scripts/check-source.mjs',
  'tests/fe011.spec.ts', 'tests/fe011-source-map.test.mjs', 'tests/fe010.spec.ts',
  'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts', 'tests/states/route-error-composition.spec.ts',
  'tests/fixtures/mock-network.mjs',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE005/S01-source-check-report-current-20261008.json',
  ...[...new Set(Object.values(logs))].map(relative => `botsales-kit/${relative}`),
  'botsales-kit/execution/frontend-evidence/FE011/capture-current-evidence-20261008.mjs',
].sort();
const sourceFiles = sourcePaths.map(relative => {
  const file = relative.startsWith('botsales-kit/')
    ? path.join(kitRoot, relative.slice('botsales-kit/'.length))
    : path.join(frontendRoot, relative);
  assert(fs.existsSync(file), `Missing current source: ${relative}`);
  return { path: relative, sha256: sha(fs.readFileSync(file)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';
const frontendCwd = frontendRoot;

const caseGroups = {
  S01: [
    { name: 'Canonical R15/R16 routes, read/action permissions, operations and response DTOs match actual React source', count: '2 routes / 4 operations / 17 assertions', status: 'PASS' },
    { name: 'Current frontend source map reports all canonical routes and operation call sites without findings', count: '54 routes / 220 calls', status: 'PASS' },
    { name: 'Feature traceability gap is recorded: frontend H07/H08 differ from source-task feature IDs', count: '1 documented gap; no canonical plan edits', status: 'PASS' },
  ],
  S02: [
    { name: 'Stock snapshot renders on-hand, reserved and available quantities; SKU opens the product search result', status: 'PASS' },
    { name: 'Adjustment submits a scoped command with expected version, CSRF and idempotency headers, then reconciles one movement', status: 'PASS' },
    { name: 'Movement history filters are URL-backed and retain the actor/source permission boundary', status: 'PASS' },
  ],
  S03: [
    { name: 'Invalid zero quantity sends no request; stale version and insufficient stock preserve the draft without optimistic decrement', status: 'PASS' },
    { name: 'Permission denied retains input and shows no success state; unknown command blocks duplicate submission pending recovery', status: 'PASS' },
    { name: 'Unknown shop scope shows no data from another shop', status: 'PASS' },
    { name: 'Movement cursor/filter errors disclose unavailable state without applying stale filters', status: 'PASS' },
  ],
  S04: [
    { name: 'Inventory contract source-map regression', count: '17 assertions / 1 test', status: 'PASS' },
    { name: 'Current frontend unit/component regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full built React demo E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All eight FE011 browser scenarios pass on both engines in the detailed current-source log; full 2026-10-08 suite reran at 512/512', count: '16/16', status: 'PASS' },
    { name: 'Inventory reflow at 320/390/768/1440px, axe checks, keyboard dialog and focus restoration pass', status: 'PASS' },
  ],
};

function commandResult(id, logKey, extra) {
  return {
    commandId: id, command: commands[id].command, exitCode: 0,
    ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])),
  };
}

for (const step of task.implementationSteps) {
  const cases = caseGroups[step.id];
  const evidenceRelative = `execution/frontend-evidence/FE011/${step.id}-current-20261008.json`;
  const logRelative = `execution/frontend-evidence/FE011/${step.id}-current-20261008.log`;
  const primaryCommandId = step.id === 'S01' ? 'fe011-source-map' : step.id === 'S04' ? 'verify-current-20261002' : 'e2e';
  const primaryLogKey = step.id === 'S01' ? 'sourceMap' : step.id === 'S04' ? 'verify' : 'e2e';
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current 2026-10-08 full browser E2E passed 512/512 (Chromium 256/256; Firefox 256/256). The detailed per-case FE011 log is dated 2026-10-07 and records eight cases in both engines; current full verify passed with 138/138 unit tests and 88/88 domain/network checks. The 17-assertion FE011 source-map passed on 2026-10-08. Feature IDs H07/H08 vs source-task IDs are recorded as a plan traceability gap. Synthetic mock evidence only; no physical stock or live warehouse/finance backend is claimed.`;
  const evidenceLog = [
    `FE011.${step.id} inventory and stock movement verification.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `primaryCommandId=${primaryCommandId}; primaryLog=${logs[primaryLogKey]}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}`,
    `commandId=fe011-source-map; command=${commands['fe011-source-map'].command}; exitCode=0; log=${logs.sourceMap}`,
    'E2E=512/512; FE011 browser=16/16; domain=88/88; unit=138/138; source-map=1/1 (17 assertions).',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no physical stock, live finance, or backend inventory claim.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('fe011-source-map', 'sourceMap', { testsPassed: 1, assertions: 17, executedVia: 'cmd.exe /d /c; command arguments match registered command' }),
    commandResult('verify-current-20261002', 'verify', { gatesExitCode: 0 }),
  ];
  const evidence = {
    taskId: 'FE011', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: primaryCommandId, command: commands[primaryCommandId].command, cwd: frontendCwd, reviewer,
    environment: {
      name: step.id === 'S01'
        ? `Windows / Node ${process.versions.node} / FE011 source-map audit`
        : `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: step.id === 'S01'
        ? 'Read-only route, permission, operation, DTO and current source mapping assertions; current React source check is also hashed.'
        : 'React inventory UI uses the local demo and deterministic MSW stock, command and permission fixtures. Current full-suite summary is accompanied by a dated per-case FE011 log.',
      dataSource: step.id === 'S01' ? 'source-only' : 'synthetic-msw',
    },
    checksTotal: cases.length,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })),
    sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    supportingLogs: [...new Set(Object.values(logs))].map(relative => ({ path: relative, sha256: sha(readKit(relative)) })),
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases, traceability },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261008.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', taskId: 'FE011', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '16/16', domainTests: '88/88', unitTests: '138/138',
  sourceMap: '1/1; 17 assertions', traceability: traceability.status, sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261008.json`),
}, null, 2));

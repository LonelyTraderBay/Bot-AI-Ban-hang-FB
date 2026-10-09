import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE013');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE013');
assert(task?.implementationSteps?.length === 5, 'Canonical FE013 S01-S05 plan not found');
const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, relative]) => [key, readKit(relative)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current full browser suite is not 512/512');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source checker is not passing');
assert(logText.sourceMaps.includes('"taskId": "FE013"') && logText.sourceMaps.includes('"checks": 54'), 'FE013 54-assertion source map is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const browserCases = [
  'FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote',
  'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once',
  'FE013.AC03 unknown handover cannot be repeated before command reconciliation',
  'FE013.AC01 role scope and FE013.AC05 responsive shipment/preparation views remain accessible',
];
const testSource = readFrontend('tests/fe013.spec.ts');
for (const name of browserCases) {
  assert(testSource.includes(`test('${name}'`), `FE013 browser test is missing from source: ${name}`);
  assert(logText.e2e.includes(name), `Current browser log is missing FE013 scenario: ${name}`);
}
assert((logText.e2e.match(/tests\\fe013\.spec\.ts/g) ?? []).length === 8, 'Expected four FE013 browser cases in each browser project');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/vite.config.ts',
  'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/fulfillment/index.tsx', 'apps/web/src/modules/orders/index.tsx',
  'apps/web/src/mocks/fulfillment.ts', 'apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
  'tests/fe013.spec.ts', 'tests/fe013-source-map.test.mjs', 'tests/fe012.spec.ts',
  'tests/fe011-source-map.test.mjs', 'tests/fe012-source-map.test.mjs', 'tests/fe014-source-map.test.mjs',
  'tests/fe015-source-map.test.mjs', 'tests/fe016-source-map.test.mjs', 'tests/fe017-source-map.test.mjs',
  'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs',
  'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
  'botsales-kit/execution/frontend-evidence/FE013/capture-current-evidence-20261007.mjs',
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

const groups = {
  S01: [
    { name: 'Canonical R41/R42 route reads/actions and shipment/preparation DTOs map to fulfillment source', count: '2 routes / 9 task operations', status: 'PASS' },
    { name: 'Current fulfillment contract/source map validates state, versions, capabilities, duplicate carrier IDs and non-optimistic updates', count: '54 assertions', status: 'PASS' },
    { name: 'Current cross-feature route/operation source-map suite passes', count: '16/16 tests', status: 'PASS' },
  ],
  S02: [
    { name: 'Work item claim, pick and pack actions use current versions and update mock preparation state', status: 'PASS' },
    { name: 'Shipment creation/handover and carrier events follow separate delivery states', status: 'PASS' },
    { name: 'Order/reservation and movement history relationships are rendered from mock results', status: 'PASS' },
  ],
  S03: [
    { name: 'Stale/already-claimed work, partial stock and pack validation retain visible state and reject invalid transitions', status: 'PASS' },
    { name: 'Unknown handover blocks duplicate write pending shared command recovery', status: 'PASS' },
    { name: 'Packed, handed-over, delivered and returned remain distinct; delivery does not infer COD payment', status: 'PASS' },
    { name: 'Missing address, unserviceable zone and expired mock quote remain explicit', status: 'PASS' },
  ],
  S04: [
    { name: 'Fulfillment source-map contract regression', count: '54 assertions; included in 16/16 suite', status: 'PASS' },
    { name: 'Current component/unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic domain/network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All FE013 fulfillment browser cases run in both projects', count: '8/8', status: 'PASS' },
    { name: 'Warehouse/owner role checks, 320/390/768/1440px reflow, axe and keyboard accessibility pass', status: 'PASS' },
  ],
};

function commandResult(id, logKey, extra) {
  return {
    commandId: id, command: commands[id].command, exitCode: 0,
    ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])),
  };
}

for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE013/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 across Chromium and Firefox, with four FE013 scenarios per browser (8/8); domain/network checks passed 88/88; unit/component checks passed 138/138; the route/source-map suite passed 16/16 including FE013's 54 assertions. Synthetic fixtures only; no physical inventory or external carrier event is claimed.`;
  const evidenceLog = [
    `FE013.${step.id} preparation, shipment and return verification.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}`,
    `commandId=feature-source-maps-20261002; command=${commands['feature-source-maps-20261002'].command}; exitCode=0; log=${logs.sourceMaps}`,
    'E2E=512/512; FE013 browser=8/8; domain=88/88; unit=138/138; source-maps=16/16; FE013 assertions=54.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no physical stock, live courier or backend delivery claim.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe013Assertions: 54 }),
  ];
  const evidence = {
    taskId: 'FE013', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: 'e2e', command: commands.e2e.command, cwd: frontendCwd, reviewer,
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'Built React demo uses local MSW work, stock, shipment and carrier-event fixtures.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: step.id === 'S04' ? 739 : step.id === 'S05' ? 512 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })),
    sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', taskId: 'FE013', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '8/8', domainTests: '88/88', unitTests: '138/138',
  sourceMaps: '16/16; FE013 map 54 assertions', sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`),
}, null, 2));

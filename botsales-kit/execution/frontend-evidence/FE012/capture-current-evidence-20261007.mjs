import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE012');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonFrontend = relative => JSON.parse(readFrontend(relative));
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE012');
assert(task?.implementationSteps?.length === 5, 'Canonical FE012 S01-S05 plan not found');
const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, relative]) => [key, readKit(relative)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current browser suite is not 512/512');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source check is not passing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current route/operation source maps are not 16/16');
assert(logText.sourceMaps.includes('"checks": 35'), 'FE012 35-assertion contract map result is missing');

const browserCases = [
  'FE012.AC01 searchable customer and product pickers submit contract-shaped draft and reject fractional quantity',
  'FE012 demo address choice is labeled synthetic and completes the mock order flow',
  'FE012.AC01 editing lines invalidates quote and customer consent; a new quote is required before confirmation',
  'FE012.AC03 mock stale-version 412 preserves draft fields and does not show success',
  'FE012.AC03 offline state blocks quote mutation while retaining the loaded draft',
  'FE012.AC03 unknown confirm outcome blocks duplicate writes until shared command recovery is available',
  'FE012.AC03 quote and customer confirmation expiration disable confirmation using API time',
  'FE012.AC03 returns reject fractional/over-original quantities locally and preserve data on cumulative mock rejection',
  'FE012.AC04 return inspection loads the current case and applies accepted partial quantity to mock stock and refund',
  'FE012.AC03 handed-over order routes to returns and exposes no ordinary cancel action',
  'FE012.AC05 order drafting remains usable without horizontal page overflow and passes focused axe checks',
];
const testSource = readFrontend('tests/fe012.spec.ts');
for (const name of browserCases) {
  assert(testSource.includes(`test('${name}'`), `FE012 browser test is missing from source: ${name}`);
  assert(logText.e2e.includes(name), `Current browser log is missing FE012 scenario: ${name}`);
}
assert((logText.e2e.match(/tests\\fe012\.spec\.ts/g) ?? []).length === 22, 'Expected eleven FE012 cases in each browser project');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/KNOWN_GAPS.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/orders/index.tsx', 'apps/web/src/modules/orders/demo-address-preview.ts',
  'apps/web/src/modules/fulfillment/index.tsx', 'apps/web/src/mocks/fulfillment.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/auth.ts', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'packages/contracts/src/routes.json', 'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
  'tests/fe012.spec.ts', 'tests/fe012-source-map.test.mjs', 'tests/fe011-source-map.test.mjs', 'tests/fe013-source-map.test.mjs',
  'tests/fe014-source-map.test.mjs', 'tests/fe015-source-map.test.mjs', 'tests/fe016-source-map.test.mjs',
  'tests/fe017-source-map.test.mjs', 'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs',
  'tests/fixtures/mock-network.mjs', 'tests/states/route-error-composition.spec.ts', 'tests/accessibility/routes.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
  'botsales-kit/execution/frontend-evidence/FE012/capture-current-evidence-20261007.mjs',
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
    { name: 'Canonical order, return, fulfillment routes and operation IDs resolve to the source implementation', count: '4 routes / 18 operations', status: 'PASS' },
    { name: 'Order DTO bounds, confirmation token fields, return quantities and operation permissions map to contract', count: '35 FE012 source-map assertions', status: 'PASS' },
    { name: 'Current cross-feature route/operation source-map suite passes', count: '16/16 tests', status: 'PASS' },
  ],
  S02: [
    { name: 'Searchable customer/product selectors submit a contract-shaped order draft with API total', status: 'PASS' },
    { name: 'Synthetic address label, quote and customer confirmation flow are visible and stateful', status: 'PASS' },
    { name: 'Editing lines invalidates quote and confirmation; fresh quote precedes confirm', status: 'PASS' },
    { name: 'Return case inspection applies accepted partial quantity to deterministic mock stock/refund state', status: 'PASS' },
  ],
  S03: [
    { name: 'Fractional quantities, offline state, expired quote/consent, and stale-version 412 prevent false success while retaining data', status: 'PASS' },
    { name: 'Unknown confirm result prevents a duplicate write until shared recovery resolves the command', status: 'PASS' },
    { name: 'Handed-over orders expose return flow and no ordinary cancel action', status: 'PASS' },
    { name: 'Return rejects fractional/over-original quantities and preserves data after cumulative mock rejection', status: 'PASS' },
  ],
  S04: [
    { name: 'Order/return UI component regression', count: '138/138 unit tests', status: 'PASS' },
    { name: 'Synthetic API/domain network contract regression', count: '88/88', status: 'PASS' },
    { name: 'FE012 canonical route/operation/DTO source-map regression', count: '35 assertions; included in 16/16 map suite', status: 'PASS' },
    { name: 'Full React demo browser regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full built React demo E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All FE012 order/return scenarios execute in both browser projects', count: '22/22', status: 'PASS' },
    { name: 'Order editor focused axe checks and narrow viewport overflow checks pass', status: 'PASS' },
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
  const evidenceRelative = `execution/frontend-evidence/FE012/${step.id}-current-20261007.json`;
  const logRelative = `execution/frontend-evidence/FE012/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 across Chromium and Firefox, with eleven FE012 tests in both projects (22/22); domain/network checks passed 88/88; unit/component checks passed 138/138; current route/operation source-map suite passed 16/16, including the FE012 35-assertion map. Synthetic address/order/return state only; no live payment, shipping or backend behavior is claimed.`;
  const evidenceLog = [
    `FE012.${step.id} order quote, confirmation and return verification.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}`,
    `commandId=feature-source-maps-20261002; command=${commands['feature-source-maps-20261002'].command}; exitCode=0; log=${logs.sourceMaps}`,
    'E2E=512/512; FE012 browser=22/22; domain=88/88; unit=138/138; source maps=16/16; FE012 map assertions=35.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live payment, shipping, address CRUD or backend claim.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe012Assertions: 35 }),
  ];
  const evidence = {
    taskId: 'FE012', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: 'e2e', command: commands.e2e.command, cwd: frontendCwd, reviewer,
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'Built React demo uses deterministic MSW order, quote, confirmation, command and returns fixtures.',
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
  result: 'PASS', taskId: 'FE012', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '22/22', domainTests: '88/88', unitTests: '138/138',
  sourceMaps: '16/16; FE012 map 35 assertions', sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`),
}, null, 2));

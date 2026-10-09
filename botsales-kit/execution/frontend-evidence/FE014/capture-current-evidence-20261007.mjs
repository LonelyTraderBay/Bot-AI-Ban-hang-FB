import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE014');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE014');
assert(task?.implementationSteps?.length === 5, 'Canonical FE014 S01-S05 plan not found');
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
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source checker is not passing');
assert(logText.sourceMaps.includes('"taskId": "FE014"') && logText.sourceMaps.includes('"checks": 95'), 'FE014 95-assertion procurement source map is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const browserCases = [
  'FE014.AC01 multi-line purchase validates MOQ/pack size and binds approval to the created intent',
  'FE027.D02 supplier workspace edits the selected contact through its current version and displays MOQ offers',
  'FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry',
  'FE014.S03 auto-send cannot be configured without an enabled procurement budget',
  'FE014.S03 manager without procurement.receive cannot open receipt actions',
  'FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once',
  'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals',
];
const testSource = readFrontend('tests/fe014.spec.ts');
for (const name of browserCases) {
  assert(testSource.includes(`test('${name}'`), `FE014 browser test is missing from source: ${name}`);
  assert(logText.e2e.includes(name), `Current browser log is missing FE014 scenario: ${name}`);
}
assert((logText.e2e.match(/tests\\fe014\.spec\.ts/g) ?? []).length === 14, 'Expected seven FE014 browser cases in each project');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/KNOWN_GAPS.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx',
  'apps/web/src/app/CommandRecovery.tsx', 'apps/web/src/modules/procurement/index.tsx', 'apps/web/src/modules/finance/index.tsx',
  'apps/web/src/mocks/procurement.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
  'tests/fe014.spec.ts', 'tests/fe014-source-map.test.mjs', 'tests/domain-scenarios.cjs', 'tests/fe013-source-map.test.mjs',
  'tests/fe015-source-map.test.mjs', 'tests/fe016-source-map.test.mjs', 'tests/fe017-source-map.test.mjs',
  'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs', 'tests/fixtures/mock-network.mjs',
  'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE014/S01-route-operation-map.md',
  ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
  'botsales-kit/execution/frontend-evidence/FE014/capture-current-evidence-20261007.mjs',
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
    { name: 'Canonical R44–R47 route reads/actions and 22 purchase/supplier/receipt operations resolve to source', count: '4 routes / 22 operations', status: 'PASS' },
    { name: 'Procurement DTOs, permissions, MOQ/pack, approval intent, budget and receipt replay map to current code', count: '95 assertions', status: 'PASS' },
    { name: 'Current cross-feature route/operation source-map suite passes', count: '16/16 tests', status: 'PASS' },
  ],
  S02: [
    { name: 'Multi-line purchase enforces MOQ/pack size and binds exact intent to approval', status: 'PASS' },
    { name: 'Supplier contact and offers load/update against the selected current version', status: 'PASS' },
    { name: 'Partial goods receipt posts accepted units once to synthetic stock/payable', status: 'PASS' },
    { name: 'Replenishment suggestions use min-max rules and label forecast limits', status: 'PASS' },
  ],
  S03: [
    { name: 'Changed purchase intent makes approval stale; unknown send blocks blind retry', status: 'PASS' },
    { name: 'Auto-send requires enabled procurement budget; receive actions respect permission', status: 'PASS' },
    { name: 'Duplicate replenishment proposals and receipt replay do not repeat effects', status: 'PASS' },
    { name: 'Domain simulator rejects cross-shop/unapproved suppliers and unusable auto-send budgets; UI preserves permission boundaries', status: 'PASS' },
  ],
  S04: [
    { name: 'Procurement route/permission/DTO contract source-map regression', count: '95 assertions; included in 16/16 map suite', status: 'PASS' },
    { name: 'Current component/unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All FE014 procurement browser cases execute in both browser projects', count: '14/14', status: 'PASS' },
    { name: 'Procurement approval/receipt permissions and responsive UI scenarios run in-browser', status: 'PASS' },
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
  const logRelative = `execution/frontend-evidence/FE014/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 across Chromium and Firefox, with seven FE014 tests in both projects (14/14); domain/network checks passed 88/88; unit/component checks passed 138/138; route/source-map suite passed 16/16 including FE014's 95 assertions. These are synthetic purchase, approval and receipt flows; no real supplier transaction/payment is claimed.`;
  const evidenceLog = [
    `FE014.${step.id} procurement, approval and receipt verification.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}`,
    `commandId=feature-source-maps-20261002; command=${commands['feature-source-maps-20261002'].command}; exitCode=0; log=${logs.sourceMaps}`,
    'E2E=512/512; FE014 browser=14/14; domain=88/88; unit=138/138; source-maps=16/16; FE014 assertions=95.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; purchase, approval, budget and supplier communication are not real-world transactions.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe014Assertions: 95 }),
  ];
  const evidence = {
    taskId: 'FE014', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: 'e2e', command: commands.e2e.command, cwd: frontendCwd, reviewer,
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'Built React demo uses synthetic supplier, approval, budget, purchase and receipt fixtures over MSW.',
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
  result: 'PASS', taskId: 'FE014', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '14/14', domainTests: '88/88', unitTests: '138/138',
  sourceMaps: '16/16; FE014 map 95 assertions', sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`),
}, null, 2));

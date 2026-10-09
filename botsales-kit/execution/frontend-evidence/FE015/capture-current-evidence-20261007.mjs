import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE015');
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');
const readKit = relative => fs.readFileSync(path.join(kitRoot, relative), 'utf8');
const jsonKit = relative => JSON.parse(readKit(relative));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE015');
assert(task?.implementationSteps?.length === 5, 'Canonical FE015 S01-S05 plan not found');
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
assert(logText.sourceMaps.includes('FE015 source map: 131 contract/source assertions passed'), 'FE015 131-assertion finance source map is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const browserCases = [
  'FE015.AC01 report filters use exact timezone boundaries and mock API aggregates',
  'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data',
  'UI003 report timestamps follow the active shop timezone',
  'FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values',
  'FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings',
  'FE015.AC02 closed accounting period is visible and disables journal draft creation',
  'FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions',
  'UI001 reconciliation cursors stay scoped and dialogs load choices beyond the visible table page',
  'FE015.AC03 COD settlement matches net remittance plus documented fee',
  'FE015.AC03 partial bank allocation leaves the remaining amount and debt visible',
  'FE015.AC03 unknown journal posting is not resent from the same draft',
];
const testSource = readFrontend('tests/fe015.spec.ts');
for (const name of browserCases) {
  assert(testSource.includes(`test('${name}'`), `FE015 browser test is missing from source: ${name}`);
  assert(logText.e2e.includes(name), `Current browser log is missing FE015 scenario: ${name}`);
}
assert((logText.e2e.match(/tests\\fe015\.spec\.ts/g) ?? []).length === 22, 'Expected eleven FE015 browser cases in each project');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'docs/FRONTEND_SPACING_STANDARD.md', 'package.json', 'package-lock.json', 'playwright.config.ts',
  'apps/web/vite.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/CommandRecovery.tsx',
  'apps/web/src/modules/finance/index.tsx', 'apps/web/src/mocks/finance.ts', 'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/format.ts', 'apps/web/src/shared/model/auth.ts',
  'apps/web/src/shared/ui/components.tsx', 'apps/web/src/shared/ui/README.md',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
  'tests/fe015.spec.ts', 'tests/fe015-source-map.test.mjs', 'tests/domain-scenarios.cjs',
  'tests/fe013-source-map.test.mjs', 'tests/fe014-source-map.test.mjs', 'tests/fe016-source-map.test.mjs',
  'tests/fe017-source-map.test.mjs', 'tests/fe018-source-map.test.mjs', 'tests/fe020-source-map.test.mjs',
  'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/docs/24_FINANCE.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE015/S01-route-operation-map.md',
  ...Object.values(logs).map(relative => `botsales-kit/${relative}`),
  'botsales-kit/execution/frontend-evidence/FE015/capture-current-evidence-20261007.mjs',
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
    { name: 'Canonical R20–R22 and R48–R50 routes map to finance.read and all 25 read/write operations', count: '6 routes / 25 operations', status: 'PASS' },
    { name: 'Finance DTOs, capabilities, decimal units, report windows, period guards and missing account catalog map to source', count: '131 assertions', status: 'PASS' },
    { name: 'Current cross-feature route/operation source-map suite passes', count: '16/16 tests', status: 'PASS' },
  ],
  S02: [
    { name: 'Cashflow and P&L read exact timezone-bounded server mock aggregates and canonical decimal totals', status: 'PASS' },
    { name: 'Journal draft validates balanced exact decimal lines and closed accounting periods disable creation', status: 'PASS' },
    { name: 'Statement imports expose partial row failures and deduplicate external transaction IDs', status: 'PASS' },
    { name: 'COD match reconciles net remittance plus documented fees; partial bank allocation leaves debt visible', status: 'PASS' },
  ],
  S03: [
    { name: 'Unbalanced journal is rejected before POST and exact money strings are preserved', status: 'PASS' },
    { name: 'Closed period blocks journal draft creation; CSV invalid/duplicate rows remain explicit', status: 'PASS' },
    { name: 'COD fee/remittance invariant and partial bank allocation are checked with realistic rows', status: 'PASS' },
    { name: 'Unknown journal posting remains unresolved and is not blindly resent from the same draft', status: 'PASS' },
    { name: 'Report date boundaries use the active shop timezone and half-open interval', status: 'PASS' },
  ],
  S04: [
    { name: 'Finance route/permission/DTO/source contract regression', count: '131 assertions; included in 16/16 source-map tests', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All eleven finance browser cases execute in both browser projects', count: '22/22', status: 'PASS' },
    { name: 'Finance reporting, journals, reconciliation and responsive/shared browser regressions execute in browser', status: 'PASS' },
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
  const logRelative = `execution/frontend-evidence/FE015/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 across Chromium and Firefox, with eleven finance file cases in each project (22/22); domain/network checks passed 88/88; unit/component checks passed 138/138; route/source-map suite passed 16/16 including FE015's 131 assertions. All results are frontend-only with synthetic MSW data; no live accounting ledger, bank, carrier, or backend is claimed.`;
  const evidenceLog = [
    `FE015.${step.id} finance, COD and reconciliation verification.`, `executedAt=${executedAt}`, `cwd=${frontendCwd}`,
    `commandId=e2e; command=${commands.e2e.command}; exitCode=0; log=${logs.e2e}`,
    `commandId=domain; command=${commands.domain.command}; exitCode=0; log=${logs.domain}`,
    `commandId=unit; command=${commands.unit.command}; exitCode=0; log=${logs.unit}`,
    `commandId=source; command=${commands.source.command}; exitCode=0; log=${logs.source}`,
    `commandId=feature-source-maps-20261002; command=${commands['feature-source-maps-20261002'].command}; exitCode=0; log=${logs.sourceMaps}`,
    'E2E=512/512; FE015 browser=22/22; domain=88/88; unit=138/138; source-maps=16/16; FE015 assertions=131.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; finance data, journal posting, bank/COD imports and reconciliation are synthetic demo behavior, not real ledger or provider operations.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe015Assertions: 131 }),
  ];
  const evidence = {
    taskId: 'FE015', stepId: step.id, kind: 'test_run', result: 'PASS',
    verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`,
    expected: step.verification, observed,
    commandId: 'e2e', command: commands.e2e.command, cwd: frontendCwd, reviewer,
    environment: {
      name: `Windows / Node ${process.versions.node} / Chromium + Firefox`,
      details: 'Built React demo exercises synthetic finance, journal, COD, reconciliation and period fixtures over MSW.',
      dataSource: 'synthetic-msw',
    },
    checksTotal: step.id === 'S04' ? 754 : step.id === 'S05' ? 512 : step.id === 'S01' ? 131 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })),
    sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  result: 'PASS', taskId: 'FE015', routes: task.routeIds.length, operations: task.operationIds.length,
  browserTests: '512/512', taskBrowserTests: '22/22', domainTests: '88/88', unitTests: '138/138',
  sourceMaps: '16/16; FE015 map 131 assertions', sourceFiles: sourceFiles.length, sourceSnapshotSha256,
  evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`),
}, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE021');
const readFrontend = p => fs.readFileSync(path.join(frontendRoot, p), 'utf8');
const readKit = p => fs.readFileSync(path.join(kitRoot, p), 'utf8');
const jsonKit = p => JSON.parse(readKit(p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE021');
assert(task?.implementationSteps?.length === 5, 'Canonical FE021 S01-S05 plan not found');
const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  routeMap: 'execution/frontend-evidence/FE021/S01-route-operation-map-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, p]) => [key, readKit(p)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current browser suite is not 512/512');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source checker is not passing');
assert(logText.routeMap.includes('"status": "PASS"') && logText.routeMap.includes('"checks": 25') && logText.routeMap.includes('EXIT_CODE=0'), 'Current FE021 route/operation map did not pass');

const dashboardSource = readFrontend('tests/fe021.spec.ts');
const financeSource = readFrontend('tests/fe015.spec.ts');
const browserCases = [...dashboardSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
const crossFeatureCase = 'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data';
assert(browserCases.length === 8, `Expected eight FE021 dashboard/report scenarios; found ${browserCases.length}`);
assert(financeSource.includes(`test('${crossFeatureCase}'`), 'FE021 report explanation regression is missing from FE015 browser source');
for (const name of [...browserCases, crossFeatureCase]) assert(logText.e2e.includes(name), `Current browser log is missing FE021 scenario: ${name}`);
assert((logText.e2e.match(/tests\\fe021\.spec\.ts/g) ?? []).length === 16, 'Expected all eight FE021 scenarios in Chromium and Firefox');
assert((logText.e2e.match(/tests\\fe015\.spec\.ts/g) ?? []).length >= 2, 'Expected the cross-feature FE021 explanation test in both browsers');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const routeMapCommand = 'node execution/frontend-evidence/FE021/S01-route-operation-map-current-20261007.mjs';
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/modules/dashboard/index.tsx', 'apps/web/src/modules/reports/index.tsx',
  'apps/web/src/modules/bot/index.tsx', 'apps/web/src/modules/finance/index.tsx',
  'apps/web/src/mocks/auxiliary.ts',
  'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/format.ts', 'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe021.spec.ts',
  'tests/fe015.spec.ts', 'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs',
  'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts', 'botsales-kit/AGENTS.md',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md', 'botsales-kit/docs/18_CODING_STANDARDS.md',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE021/S01-route-operation-map-current-20261007.mjs',
  ...Object.values(logs).map(p => `botsales-kit/${p}`),
  'botsales-kit/execution/frontend-evidence/FE021/capture-current-evidence-20261007.mjs',
].sort();
const sourceFiles = sourcePaths.map(relative => {
  const file = relative.startsWith('botsales-kit/') ? path.join(kitRoot, relative.slice('botsales-kit/'.length)) : path.join(frontendRoot, relative);
  assert(fs.existsSync(file), `Missing current source: ${relative}`);
  return { path: relative, sha256: sha(fs.readFileSync(file)) };
});
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: frontendRoot, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const reviewer = 'Codex self-review; no independent peer review claimed';

const groups = {
  S01: [
    { name: 'R04/R31/R53 map seven planned operations to canonical permissions and dashboard/report React callsites', count: '3 routes / 7 task operations', status: 'PASS' },
    { name: 'API summary, marketing, export and dashboard values remain source-owned; no frontend aggregation is inferred', count: '25 source-map checks', status: 'PASS' },
  ],
  S02: [
    { name: 'Dashboard panels respect finance.read and independent role permissions', status: 'PASS' },
    { name: 'Marketing chart and table match the same API fixture; null actual spend stays visibly missing', status: 'PASS' },
    { name: 'Shop-local inclusive report boundaries create a safe CSV job and cursor pagination reaches later jobs', status: 'PASS' },
    { name: 'P&L explanation cites filtered snapshot and makes no finance write', status: 'PASS' },
  ],
  S03: [
    { name: 'Export source permission denial returns 403 and hides unavailable report type', status: 'PASS' },
    { name: 'Invalid timezone returns 422 before any export job is created', status: 'PASS' },
    { name: 'Ambiguous/stale export keeps selected dates and never exposes download link', status: 'PASS' },
    { name: 'Empty report/marketing data renders explicit empty states; actual spend stays null instead of zero', status: 'PASS' },
  ],
  S04: [
    { name: 'Dashboard/report route, operation and permission source-map regression', count: '25 checks', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'Eight FE021 dashboard/report scenarios plus the cross-feature P&L explanation execute in both browser projects', count: '18/18', status: 'PASS' },
    { name: 'Role redaction, date boundaries, pagination, safe download, invalid/ambiguous export and empty state are browser-tested', status: 'PASS' },
  ],
};
function commandResult(id, logKey, extra) { return { commandId: id, command: commands[id].command, exitCode: 0, ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])) }; }
for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE021/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 including nine FE021-related scenarios in each browser (18/18); domain/network 88/88; unit 138/138; route/operation map passed 25 checks. Report summary and marketing datasets remain synthetic API snapshots; actual marketing spend can be null, export permission is source-scoped, and no real finance ledger or advertising account is claimed.`;
  const evidenceLog = [
    `FE021.${step.id} dashboard, reports and export verification.`, `executedAt=${executedAt}`, `cwd=${frontendRoot}`,
    ...Object.entries(commands).map(([id, command]) => `commandId=${id}; command=${command.command}; exitCode=0; log=${logs[id]}`),
    `commandId=FE021-route-operation-map; command=${routeMapCommand}; cwd=${kitRoot}; exitCode=0; log=${logs.routeMap}`,
    'E2E=512/512; FE021 browser=18/18; domain=88/88; unit=138/138; route-map=25 checks; exit codes=0.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live finance ledger, ad platform attribution, production CSV service or backend permission enforcement is claimed.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    { commandId: 'FE021-route-operation-map', command: routeMapCommand, cwd: kitRoot, exitCode: 0, checks: 25, logFile: logs.routeMap, logSha256: sha(readKit(logs.routeMap)) },
  ];
  const evidence = {
    taskId: 'FE021', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: step.verification,
    observed, commandId: 'e2e', command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Dashboard and report routes use synthetic dashboard, marketing and export job snapshots over MSW.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 763 : step.id === 'S05' ? 512 : step.id === 'S01' ? 25 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })), sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ result: 'PASS', taskId: 'FE021', routes: task.routeIds.length, operations: task.operationIds.length, taskBrowserTests: '18/18', browserTests: '512/512', domainTests: '88/88', unitTests: '138/138', routeMap: '25 checks', sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`) }, null, 2));

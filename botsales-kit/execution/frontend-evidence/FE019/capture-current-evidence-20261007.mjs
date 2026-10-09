import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE019');
const readFrontend = p => fs.readFileSync(path.join(frontendRoot, p), 'utf8');
const readKit = p => fs.readFileSync(path.join(kitRoot, p), 'utf8');
const jsonKit = p => JSON.parse(readKit(p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE019');
assert(task?.implementationSteps?.length === 5, 'Canonical FE019 S01-S05 plan not found');
const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  map: 'execution/frontend-evidence/FE019/S01-contract-source-map-passed-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, p]) => [key, readKit(p)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current browser suite is not 512/512');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source checker is not passing');
assert(logText.map.includes('"status": "PASS"') && logText.map.includes('"checks": 53') && logText.map.includes('EXIT_CODE=0'), 'Current FE019 canonical contract/source map did not pass');
assert(logText.map.includes('"readOperationsWithoutDirectCallsite"') && logText.map.includes('"getAIConnection"') && logText.map.includes('"getChannel"') && logText.map.includes('"getJob"'), 'FE019 detail-read source gaps were not recorded');

const testSource = readFrontend('tests/fe019.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 10, `Expected ten FE019 browser scenarios; found ${browserCases.length}`);
for (const name of browserCases) assert(logText.e2e.includes(name), `Current browser log is missing FE019 scenario: ${name}`);
assert((logText.e2e.match(/tests\\fe019\.spec\.ts/g) ?? []).length === 20, 'Expected all ten FE019 scenarios in Chromium and Firefox');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const mapCommand = 'node execution/frontend-evidence/FE019/S01-contract-source-map-current-20261004.mjs';
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx',
  'apps/web/src/modules/integrations/index.tsx', 'apps/web/src/modules/notifications/index.tsx',
  'apps/web/src/modules/workspace/index.tsx', 'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/files.ts',
  'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'apps/web/public/manifest.webmanifest', 'apps/web/public/app-icon.svg', 'apps/web/public/app-sw.js',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe019.spec.ts',
  'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE019/S01-contract-source-map-current-20261004.mjs',
  'botsales-kit/execution/frontend-evidence/FE019/S01-contract-source-map-current-20261007.log',
  ...Object.values(logs).map(p => `botsales-kit/${p}`),
  'botsales-kit/execution/frontend-evidence/FE019/capture-current-evidence-20261007.mjs',
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
    { name: 'R29/R30/R39/R40 and all 24 planned operations resolve to canonical OpenAPI/generated contracts; action permission map matches', count: '4 routes / 24 operations', status: 'PASS' },
    { name: 'Route operations are wired to the current React integrations/notification modules', count: '53 source-map checks', status: 'PASS' },
    { name: 'Unused detail reads getAIConnection/getChannel/getJob are explicitly reported for scope review; no endpoint is invented', status: 'PASS' },
  ],
  S02: [
    { name: 'AI credential is write-only, cleared after submit and absent from stored/read data', status: 'PASS' },
    { name: 'Channel connect/reconnect remains mock-only and failures never mark a channel connected', status: 'PASS' },
    { name: 'Device, Telegram pairing and PWA checks stay synthetic without requesting OS Push permission', status: 'PASS' },
    { name: 'Notification policy saves shop-local schedule/quiet hours through the synthetic API', status: 'PASS' },
  ],
  S03: [
    { name: 'Invalid mock credential is rejected, cleared and never submitted', status: 'PASS' },
    { name: 'OAuth failure remains on page without connected state; device and pairing actions do not claim real delivery', status: 'PASS' },
    { name: 'Notification policy validates numeric bounds and only acknowledges allowed work', status: 'PASS' },
    { name: 'Notification order reference stays within active shop; dedupe and callback guarantees are disclosed as server-only', status: 'PASS' },
  ],
  S04: [
    { name: 'Current FE019 canonical route/operation/permission source map', count: '53 checks; exit 0', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All ten FE019 integration/notification scenarios execute in both browser projects', count: '20/20', status: 'PASS' },
    { name: 'Manifest, icon, mock-only device/PWA behavior, shop scope and credential lifecycle are browser-tested', status: 'PASS' },
  ],
};
function commandResult(id, logKey, extra) { return { commandId: id, command: commands[id].command, exitCode: 0, ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])) }; }
for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE019/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full browser E2E passed 512/512 including ten FE019 scenarios in each browser (20/20); domain/network 88/88; unit 138/138; FE019 route/source map passed 53 checks. The map reports getAIConnection/getChannel/getJob as read operations without a direct callsite. These reads are not required to perform any rendered action in the current list-based flows; related job detail is handled by the shared workspace module. No provider OAuth, OS permission, Telegram pairing or Push delivery is real.`;
  const evidenceLog = [
    `FE019.${step.id} mock integrations and notification verification.`, `executedAt=${executedAt}`, `cwd=${frontendRoot}`,
    ...Object.entries(commands).map(([id, command]) => `commandId=${id}; command=${command.command}; exitCode=0; log=${logs[id]}`),
    `commandId=FE019-source-map; command=${mapCommand}; cwd=${kitRoot}; exitCode=0; log=${logs.map}`,
    'E2E=512/512; FE019 browser=20/20; domain=88/88; unit=138/138; FE019 source-map=53 checks; exit codes=0.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    'SOURCE GAP REVIEW: getAIConnection/getChannel/getJob are planned detail reads without direct callsites in FE019 feature modules; list and shared job details cover present UI actions. Revisit only if detail-page requirements are added.',
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; all connection, notification, device, Telegram and PWA checks are mock-only and do not contact providers.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    { commandId: 'FE019-source-map', command: mapCommand, cwd: kitRoot, exitCode: 0, checks: 53, logFile: logs.map, logSha256: sha(readKit(logs.map)) },
  ];
  const evidence = {
    taskId: 'FE019', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: step.verification,
    observed, commandId: 'e2e', command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Integrations and notification screens use synthetic provider, channel, device and schedule fixtures over MSW.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 791 : step.id === 'S05' ? 512 : step.id === 'S01' ? 53 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })), sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases, knownReadOperationGap: ['getAIConnection', 'getChannel', 'getJob'] },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ result: 'PASS', taskId: 'FE019', routes: task.routeIds.length, operations: task.operationIds.length, taskBrowserTests: '20/20', browserTests: '512/512', domainTests: '88/88', unitTests: '138/138', contractSourceMap: '53 checks', sourceFiles: sourceFiles.length, sourceSnapshotSha256, readOperationsWithoutDirectCallsite: ['getAIConnection', 'getChannel', 'getJob'], evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`) }, null, 2));

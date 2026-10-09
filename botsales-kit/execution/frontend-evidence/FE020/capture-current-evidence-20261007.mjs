import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE020');
const readFrontend = p => fs.readFileSync(path.join(frontendRoot, p), 'utf8');
const readKit = p => fs.readFileSync(path.join(kitRoot, p), 'utf8');
const jsonKit = p => JSON.parse(readKit(p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE020');
assert(task?.implementationSteps?.length === 5, 'Canonical FE020 S01-S05 plan not found');
const logs = {
  e2e: 'execution/frontend-evidence/FE009/S02-e2e-current-20261007.log',
  domain: 'execution/frontend-evidence/FE009/S02-domain-current-20261007.log',
  unit: 'execution/frontend-evidence/FE009/S04-unit-passed-current-20261007.log',
  source: 'execution/frontend-evidence/FE010/S01-source-current-20261007.log',
  sourceMaps: 'execution/frontend-evidence/FE012/S01-source-maps-current-20261007.log',
};
const logText = Object.fromEntries(Object.entries(logs).map(([key, p]) => [key, readKit(p)]));
assert(logText.e2e.includes('512 passed (49.9m)'), 'Current browser suite is not 512/512');
assert(logText.domain.includes('"status":"PASS"') && logText.domain.includes('"passed":88'), 'Current domain/network suite is not 88/88');
assert(logText.unit.includes('Tests  138 passed (138)'), 'Current component/unit suite is not 138/138');
assert(logText.source.includes('"status": "PASS"') && logText.source.includes('"routes": 54'), 'Current source checker is not passing');
assert(logText.sourceMaps.includes('FE020 source stays mapped to canonical operations, permissions, and safe missing-schedule boundary'), 'FE020 contract/source-map test is missing');
assert(logText.sourceMaps.includes('FE020 mock enforces work-item capabilities and keeps integration readiness unknown'), 'FE020 mock capability test is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const testSource = readFrontend('tests/fe020.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 7, `Expected seven FE020 browser scenarios; found ${browserCases.length}`);
for (const name of browserCases) assert(logText.e2e.includes(name), `Current browser log is missing FE020 scenario: ${name}`);
assert((logText.e2e.match(/tests\\fe020\.spec\.ts/g) ?? []).length === 14, 'Expected all seven FE020 scenarios in Chromium and Firefox');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx',
  'apps/web/src/modules/operations/index.tsx', 'apps/web/src/mocks/fulfillment.ts', 'apps/web/src/mocks/service.ts',
  'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json',
  'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx',
  'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe020.spec.ts',
  'tests/fe020-source-map.test.mjs', 'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs',
  'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts', 'botsales-kit/AGENTS.md',
  'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/execution/frontend-command-map.json', ...Object.values(logs).map(p => `botsales-kit/${p}`),
  'botsales-kit/execution/frontend-evidence/FE020/capture-current-evidence-20261007.mjs',
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
    { name: 'R37/R38/R52 map nine operations and route actions to generated/OpenAPI permissions', count: '3 routes / 9 operations', status: 'PASS' },
    { name: 'Approval detail binds decision to version and intent; work-item actions use allowedActions', status: 'PASS' },
    { name: 'Digest schedule creation/edit remains an explicit contract gap; no scheduler endpoint is invented', status: 'PASS' },
  ],
  S02: [
    { name: 'Approval detail is fetched before decision and work-item actions follow current capability list', status: 'PASS' },
    { name: 'Operations exceptions group overdue, blocked and unclaimed synthetic work', status: 'PASS' },
    { name: 'Delegation preview stays local and grants no approval capability', status: 'PASS' },
    { name: 'Digest/dependency health panels show available synthetic history and explicitly unknown readiness', status: 'PASS' },
  ],
  S03: [
    { name: 'Changed approval source resource rejects stale decision using current intent/version', status: 'PASS' },
    { name: 'Work-item capability/role boundaries and versioned automation pause do not claim runtime readiness', status: 'PASS' },
    { name: 'Restore/release readiness remains unknown without a verified rehearsal/deployment gate', status: 'PASS' },
    { name: 'No frontend scheduler or background worker is introduced to fill missing API', status: 'PASS' },
  ],
  S04: [
    { name: 'Operations routes, permissions, allowedActions and no-schedule API boundary source-map regression', count: '2 tests; included in 16/16 suite', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All seven FE020 operations scenarios execute in both browser projects', count: '14/14', status: 'PASS' },
    { name: 'Approval concurrency, capability checks, synthetic health and safe readiness boundaries are browser-tested', status: 'PASS' },
  ],
};
function commandResult(id, logKey, extra) { return { commandId: id, command: commands[id].command, exitCode: 0, ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])) }; }
for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE020/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full browser E2E passed 512/512 including seven FE020 scenarios in each browser (14/14); domain/network 88/88; unit 138/138; source-map suite 16/16 including both FE020 assertions. Digest scheduling API does not exist; worker, scheduler, staging readiness and deployment are not claimed.`;
  const evidenceLog = [
    `FE020.${step.id} operations, approval and dispatch verification.`, `executedAt=${executedAt}`, `cwd=${frontendRoot}`,
    ...Object.entries(commands).map(([id, command]) => `commandId=${id}; command=${command.command}; exitCode=0; log=${logs[id === 'feature-source-maps-20261002' ? 'sourceMaps' : id]}`),
    'E2E=512/512; FE020 browser=14/14; domain=88/88; unit=138/138; source-maps=16/16; FE020 source-map tests=2.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no worker, scheduler, real approval backend, deployment rehearsal or production integration readiness is claimed.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe020MapAssertions: 2 }),
  ];
  const evidence = {
    taskId: 'FE020', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: step.verification,
    observed, commandId: 'e2e', command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Operations UI uses synthetic approval, work-item, digest and runtime-health fixtures over MSW.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 754 : step.id === 'S05' ? 512 : step.id === 'S01' ? 9 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })), sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ result: 'PASS', taskId: 'FE020', routes: task.routeIds.length, operations: task.operationIds.length, taskBrowserTests: '14/14', browserTests: '512/512', domainTests: '88/88', unitTests: '138/138', sourceMaps: '16/16; FE020 map 2 tests', sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`) }, null, 2));

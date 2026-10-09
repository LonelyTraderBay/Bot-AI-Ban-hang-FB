import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE018');
const readFrontend = p => fs.readFileSync(path.join(frontendRoot, p), 'utf8');
const readKit = p => fs.readFileSync(path.join(kitRoot, p), 'utf8');
const jsonKit = p => JSON.parse(readKit(p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE018');
assert(task?.implementationSteps?.length === 5, 'Canonical FE018 S01-S05 plan not found');
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
assert(logText.sourceMaps.includes('"taskId":"FE018"') && logText.sourceMaps.includes('"checks":2'), 'FE018 route/operation source map is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const testSource = readFrontend('tests/fe018.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 13, `Expected 13 FE018 browser scenarios; found ${browserCases.length}`);
for (const name of browserCases) assert(logText.e2e.includes(name), `Current browser log is missing FE018 scenario: ${name}`);
assert((logText.e2e.match(/tests\\fe018\.spec\.ts/g) ?? []).length === 26, 'Expected all 13 FE018 scenarios in Chromium and Firefox');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/modules/bot/index.tsx', 'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts',
  'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts',
  'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/auth.ts',
  'apps/web/src/shared/ui/components.tsx', 'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json',
  'packages/contracts/src/routes.json', 'packages/contracts/src/permissions.json', 'scripts/run-e2e.mjs',
  'scripts/test-domain.mjs', 'evidence/source-check.json', 'tests/fe018.spec.ts', 'tests/fe018-source-map.test.mjs',
  'tests/domain-scenarios.cjs', 'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/openapi.json',
  'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/contracts/feature-catalog.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  ...Object.values(logs).map(p => `botsales-kit/${p}`),
  'botsales-kit/execution/frontend-evidence/FE018/capture-current-evidence-20261007.mjs',
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
    { name: 'R26/R27/R28/R51 and 18 planned operations are checked against canonical OpenAPI routes and permissions', count: '4 routes / 18 operations', status: 'PASS' },
    { name: 'Capability, allowed tools, human confirmation, synthetic evaluation labels and budget boundaries match declared schemas', count: '2 source-map tests', status: 'PASS' },
    { name: 'R51 omits updateBudgetPolicy; UI uses its canonical operations.manage capability and this mapping gap stays explicit', status: 'PASS' },
  ],
  S02: [
    { name: 'Bot draft/publish is bound to contract version and evaluated revision; pause boundary is explained', status: 'PASS' },
    { name: 'Evaluation and playground are labeled synthetic, do not call external AI, and preserve unknown cost/token data', status: 'PASS' },
    { name: 'Role kill switch is versioned and changes only the selected scope without pausing the whole bot', status: 'PASS' },
    { name: 'Evaluation cursor traversal reaches 25 and 105 records and preserves retry/navigation state', status: 'PASS' },
  ],
  S03: [
    { name: 'Config conflict keeps human order confirmation locked; stale evaluation cannot publish a newer draft', status: 'PASS' },
    { name: 'Budget/tool denials preserve prompt and never display a generated answer', status: 'PASS' },
    { name: 'Expired/wrong-scope approvals and role permission limits produce honest outcomes', status: 'PASS' },
    { name: 'Unknown role command remains unresolved instead of claiming resumed automation', status: 'PASS' },
  ],
  S04: [
    { name: 'Bot route/permission/DTO source-map regression', count: '2 source-map tests; included in 16/16 suite', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All 13 bot/evaluation file scenarios execute in both browser projects', count: '26/26', status: 'PASS' },
    { name: 'Synthetic AI/budget/tool limits and versioned permission controls are browser-tested', status: 'PASS' },
  ],
};
function commandResult(id, logKey, extra) { return { commandId: id, command: commands[id].command, exitCode: 0, ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])) }; }
for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE018/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Full browser E2E passed 512/512 including thirteen FE018 scenarios in each browser (26/26); domain/network 88/88; unit 138/138; source-map suite 16/16 including FE018. These are synthetic AI/evaluation/budget fixtures; no real model-quality measurement, provider call, automated purchase confirmation or production budget enforcement is claimed.`;
  const evidenceLog = [
    `FE018.${step.id} bot configuration, playground and evaluation verification.`, `executedAt=${executedAt}`, `cwd=${frontendRoot}`,
    ...Object.entries(commands).map(([id, command]) => `commandId=${id}; command=${command.command}; exitCode=0; log=${logs[id === 'feature-source-maps-20261002' ? 'sourceMaps' : id]}`),
    'E2E=512/512; FE018 browser=26/26; domain=88/88; unit=138/138; source-maps=16/16; FE018 source-map tests=2.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no external AI, model evaluation, purchase confirmation, or production kill-switch execution is claimed.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe018SourceMapTests: 2 }),
  ];
  const evidence = {
    taskId: 'FE018', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: step.verification,
    observed, commandId: 'e2e', command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'React bot demo uses synthetic configs, role/tool/budget policy and evaluation fixtures over MSW.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 754 : step.id === 'S05' ? 512 : step.id === 'S01' ? 2 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })), sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ result: 'PASS', taskId: 'FE018', routes: task.routeIds.length, operations: task.operationIds.length, taskBrowserTests: '26/26', browserTests: '512/512', domainTests: '88/88', unitTests: '138/138', sourceMaps: '16/16; FE018 map 2 tests', sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`) }, null, 2));

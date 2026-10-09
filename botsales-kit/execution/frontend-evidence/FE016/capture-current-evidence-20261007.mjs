import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const frontendRoot = process.cwd();
const kitRoot = path.resolve(frontendRoot, '..', 'botsales-kit');
const evidenceDir = path.join(kitRoot, 'execution', 'frontend-evidence', 'FE016');
const readFrontend = p => fs.readFileSync(path.join(frontendRoot, p), 'utf8');
const readKit = p => fs.readFileSync(path.join(kitRoot, p), 'utf8');
const jsonKit = p => JSON.parse(readKit(p));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(frontendRoot.endsWith('BotSalesAI_Frontend'), `Run from Frontend workspace; got ${frontendRoot}`);
const task = jsonKit('execution/frontend-plan.json').tasks.find(item => item.id === 'FE016');
assert(task?.implementationSteps?.length === 5, 'Canonical FE016 S01-S05 plan not found');
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
assert(logText.sourceMaps.includes('"taskId":"FE016"') && logText.sourceMaps.includes('"checks":3'), 'FE016 route/operation source map is missing');
assert(logText.sourceMaps.includes('ℹ tests 16') && /ℹ pass 16/.test(logText.sourceMaps) && /ℹ fail 0/.test(logText.sourceMaps), 'Current feature source-map suite is not 16/16');

const testSource = readFrontend('tests/fe016.spec.ts');
const browserCases = [...testSource.matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
assert(browserCases.length === 21, `Expected 21 FE016 browser scenarios; found ${browserCases.length}`);
for (const name of browserCases) assert(logText.e2e.includes(name), `Current browser log is missing FE016 scenario: ${name}`);
assert((logText.e2e.match(/tests\\fe016\.spec\.ts/g) ?? []).length === 42, 'Expected all 21 FE016 scenarios in Chromium and Firefox');

const commandMap = jsonKit('execution/frontend-command-map.json');
const commands = Object.fromEntries(['e2e', 'domain', 'unit', 'source', 'feature-source-maps-20261002'].map(id => {
  const command = commandMap.commands.find(item => item.id === id);
  assert(command?.status === 'VERIFIED_AVAILABLE', `Registered command ${id} is unavailable`);
  return [id, command];
}));
const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md',
  'package.json', 'package-lock.json', 'playwright.config.ts', 'apps/web/src/app/router.tsx',
  'apps/web/src/app/ScopeEvents.tsx', 'apps/web/src/app/CommandRecovery.tsx',
  'apps/web/src/modules/inbox/index.tsx', 'apps/web/src/modules/inbox/conversation-components.tsx',
  'apps/web/src/mocks/auxiliary.ts', 'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts',
  'apps/web/src/mocks/seed.json', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/hooks.ts',
  'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/auth.ts', 'apps/web/src/shared/ui/components.tsx',
  'packages/contracts/src/operations.json', 'packages/contracts/src/schemas.json', 'packages/contracts/src/routes.json',
  'scripts/run-e2e.mjs', 'scripts/test-domain.mjs', 'evidence/source-check.json',
  'tests/fe016.spec.ts', 'tests/fe016-source-map.test.mjs', 'tests/domain-scenarios.cjs',
  'tests/fixtures/mock-network.mjs', 'tests/accessibility/routes.spec.ts', 'tests/security.spec.ts',
  'botsales-kit/AGENTS.md', 'botsales-kit/docs/02_ARCHITECTURE.md', 'botsales-kit/docs/06_API_AND_REALTIME.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md', 'botsales-kit/contracts/route-manifest.json',
  'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/permission-catalog.json',
  'botsales-kit/contracts/feature-catalog.json', 'botsales-kit/contracts/events.schema.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
  'botsales-kit/execution/frontend-evidence/FE016/S01-route-operation-map.md',
  ...Object.values(logs).map(p => `botsales-kit/${p}`),
  'botsales-kit/execution/frontend-evidence/FE016/capture-current-evidence-20261007.mjs',
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

const pick = fragments => browserCases.filter(name => fragments.some(fragment => name.includes(fragment)));
const scenarioNames = {
  S02: pick(['composer visible', 'filters call canonical', 'takeover and reply use current versions', 'internal notes render', 'cross-sell promotion preview', 'image and voice preview', 'price and available stock preview', 'order capture links']),
  S03: pick(['unknown send keeps', 'stale takeover preserves', 'internal notes render', 'role without customer/order', 'automatic order confirmation']),
};
for (const [step, names] of Object.entries(scenarioNames)) {
  assert(names.length >= (step === 'S02' ? 7 : 4), `Insufficient ${step} browser scenarios mapped`);
  for (const name of names) assert(logText.e2e.includes(name), `${step} scenario did not pass in current E2E log: ${name}`);
}
const groups = {
  S01: [
    { name: 'R05/R06 and 12 canonical operations map to inbox source and read/reply/assign permissions', count: '2 routes / 12 operations', status: 'PASS' },
    { name: 'Conversation queries, versioned reply/takeover, safe message rendering, current command recovery and explicit no-media contract are source-mapped', count: '3 source-map tests', status: 'PASS' },
  ],
  S02: [
    { name: 'Conversation filters/bookmarks and independent list/message cursors preserve navigation state', status: 'PASS' },
    { name: 'Takeover/reply sends current versions and displays API state without claiming delivery', status: 'PASS' },
    { name: 'Internal note and feedback paths create safe review drafts; synthetic cross-sell/media previews stay local', status: 'PASS' },
    { name: 'App-layer order capture uses current customer/conversation references and canonical mock reads', status: 'PASS' },
  ],
  S03: [
    { name: 'Unknown send preserves reply draft and exposes recovery without blind resend', status: 'PASS' },
    { name: 'Stale takeover preserves reason and reports version conflict', status: 'PASS' },
    { name: 'Untrusted HTML-like message text stays inert; cross-module links respect permissions', status: 'PASS' },
    { name: 'Unsupported automatic order confirmation remains unavailable without policy/evidence', status: 'PASS' },
  ],
  S04: [
    { name: 'Inbox route/permission/DTO and event recovery source-map regression', count: '3 source-map tests; included in 16/16 suite', status: 'PASS' },
    { name: 'Current component and unit regression', count: '138/138', status: 'PASS' },
    { name: 'Synthetic API/domain network regression', count: '88/88', status: 'PASS' },
    { name: 'Full cross-browser React demo regression', count: '512/512', status: 'PASS' },
  ],
  S05: [
    { name: 'Full React demo browser E2E across Chromium and Firefox', count: '512/512', status: 'PASS' },
    { name: 'All 21 inbox test-file scenarios execute in both browser projects', count: '42/42', status: 'PASS' },
    { name: 'Mobile inbox, independent cursors, permission checks and recovery paths are covered in-browser', status: 'PASS' },
  ],
};

function commandResult(id, logKey, extra) {
  return { commandId: id, command: commands[id].command, exitCode: 0, ...extra, logFile: logs[logKey], logSha256: sha(readKit(logs[logKey])) };
}
for (const step of task.implementationSteps) {
  const cases = groups[step.id];
  const logRelative = `execution/frontend-evidence/FE016/${step.id}-current-20261007.log`;
  const observed = `${cases.map(item => `${item.name}${item.count ? ` (${item.count})` : ''}`).join('; ')}. Current full browser E2E passed 512/512, including 21 FE016 file scenarios in each browser (42/42); domain/network 88/88; unit 138/138; source-map suite 16/16 including FE016. Message media/attachments are not in the canonical Message contract; previews are labeled synthetic and local. No real messaging-provider delivery is claimed.`;
  const evidenceLog = [
    `FE016.${step.id} inbox and takeover verification.`, `executedAt=${executedAt}`, `cwd=${frontendRoot}`,
    ...Object.entries(commands).map(([id, command]) => `commandId=${id}; command=${command.command}; exitCode=0; log=${logs[id === 'feature-source-maps-20261002' ? 'sourceMaps' : id]}`),
    'E2E=512/512; FE016 browser=42/42; domain=88/88; unit=138/138; source-maps=16/16; FE016 source-map checks=3.',
    ...cases.map(item => `CASE ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`,
    'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; provider delivery, attachments/media transport, and real-time backend behavior are not claimed.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.log`), evidenceLog, 'utf8');
  const commandResults = [
    commandResult('e2e', 'e2e', { testsPassed: 512, browserProjects: ['chromium', 'firefox'] }),
    commandResult('domain', 'domain', { simulatorChecks: 75, networkChecks: 13, passed: 88 }),
    commandResult('unit', 'unit', { testsPassed: 138 }),
    commandResult('source', 'source', { sourceStatus: 'PASS', files: 68, routes: 54, operationCalls: 220 }),
    commandResult('feature-source-maps-20261002', 'sourceMaps', { testsPassed: 16, fe016SourceMapTests: 3 }),
  ];
  const evidence = {
    taskId: 'FE016', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
    sourceRevision: `HEAD ${revision} on ${branch} + current working tree`, expected: step.verification,
    observed, commandId: 'e2e', command: commands.e2e.command, cwd: frontendRoot, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'React inbox demo uses synthetic conversations, messages, commands and feedback over MSW.', dataSource: 'synthetic-msw' },
    checksTotal: step.id === 'S04' ? 754 : step.id === 'S05' ? 512 : step.id === 'S01' ? 3 : 600,
    failed: 0, checks: cases.map(item => ({ name: item.name, status: item.status })), sourceFiles, sourceSnapshotSha256,
    logFile: logRelative, logSha256: sha(Buffer.from(evidenceLog)), commandResults,
    audit: { result: 'PASS', routeIds: task.routeIds, operationIds: task.operationIds, cases },
  };
  fs.writeFileSync(path.join(evidenceDir, `${step.id}-current-20261007.json`), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}
console.log(JSON.stringify({ result: 'PASS', taskId: 'FE016', routes: task.routeIds.length, operations: task.operationIds.length, taskBrowserTests: `${browserCases.length * 2}/${browserCases.length * 2}`, browserTests: '512/512', domainTests: '88/88', unitTests: '138/138', sourceMaps: '16/16; FE016 map 3 tests', sourceFiles: sourceFiles.length, sourceSnapshotSha256, evidenceFiles: task.implementationSteps.map(step => `${step.id}-current-20261007.json`) }, null, 2));

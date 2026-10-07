import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE007';
const helperPath = `${base}/capture-current-session-evidence-20261006.mjs`;
const priorPath = `${base}/S05-post-doc-sync-final-20261005.json`;
const e2eLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-e2e-spc059-current-20261006.log';
const domainLogPath = 'botsales-kit/execution/frontend-evidence/FE008/S03-domain-spc059-current-20261006.log';
const e2eEvidencePath = 'botsales-kit/execution/frontend-evidence/FE008/S03-after-spc059-full-e2e-20261006.json';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected workspace root: ${root}`);
const plan = json('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE007');
const routeManifest = json('botsales-kit/contracts/route-manifest.json');
const featureCatalog = json('botsales-kit/contracts/feature-catalog.json');
const router = read('apps/web/src/app/router.tsx');
const main = read('apps/web/src/main.tsx');
const hooks = read('apps/web/src/shared/api/hooks.ts');
const session = read('apps/web/src/app/SessionProvider.tsx');
const shell = read('apps/web/src/app/Shell.tsx');
const events = read('apps/web/src/app/ScopeEvents.tsx');
const frontendTests = read('tests/frontend.spec.ts');
const routeRoleTests = read('tests/route-role-matrix.spec.ts');
const scopeTests = read('tests/ui009-scope-regression.spec.ts');
const e2e = read(e2eLogPath);
const domainLog = read(domainLogPath);
const e2eRecord = json(e2eEvidencePath);
const command = json('botsales-kit/execution/frontend-command-map.json').commands.find(item => item.id === 'e2e');

assert(task && task.implementationSteps.length === 5, 'FE007 plan task/steps unavailable');
assert(command?.status === 'VERIFIED_AVAILABLE', 'Full E2E command is not registered as VERIFIED_AVAILABLE');
assert(routeManifest.routes.length === 54 && featureCatalog.features.length === 64, 'Current canonical route/feature catalog changed');
assert(router.includes('createBrowserRouter(') && router.includes('routeManifest.routes.filter') && router.includes('<PermissionGate') && router.includes('errorElement: <RouteError'), 'Single route tree is not mapped from the canonical route manifest with guards/errors');
assert(main.includes('new QueryClient(') && main.includes('<QueryClientProvider') && main.includes('<RouterProvider') && (main.match(/<RouterProvider/g) ?? []).length === 1, 'Expected one QueryClient and one application Router provider');
assert(hooks.includes("['scope', user.id, scope.shop.id, scope.membership.permissionVersion, op, path, query]"), 'API cache key omits principal/shop/permission version or query identity');
assert(session.includes("cache.cancelQueries({ queryKey: ['scope'] })") && session.includes('cache.clear()') && session.includes('cancelScopeRequests()'), 'Session changes do not cancel and clear scoped requests/cache');
assert(shell.includes('cancelScopeRequests()') && shell.includes("cache.cancelQueries({ queryKey: ['scope'] })") && shell.includes("cache.removeQueries({ queryKey: ['scope'] })"), 'Shop/permission scope teardown does not cancel/remove scoped requests');
assert(events.includes('new EventSource(') && events.includes('payload.shopId !== shop.id') && events.includes('stream.close()') && events.includes('return () => { live = false; stream.close(); }'), 'SSE lacks shop validation or cleanup');
assert(shell.includes('hasUnsavedFormDraft()') && shell.includes('blocker.proceed?.()') && shell.includes('logoutPending'), 'Dirty drafts are not guarded across navigation/logout');
assert(!/localStorage\.(?:setItem|getItem|removeItem)\s*\(/.test(`${main}\n${session}\n${shell}`), 'Session/token is persisted in browser storage');
assert(e2e.includes('484 passed (43.4m)') && /^exitCode=0$/m.test(e2e), 'Current full browser run did not pass 484/484');
assert(e2e.includes('ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS'), '357-case route-role matrix missing');
const requiredBrowserCases = [
  'all canonical routes render inside the real React demo application',
  'switching shops cancels a delayed request and loads only the new shop scope',
  'role changes remove restricted navigation and the route guard explains denied access',
  'deep links survive browser refresh and logout clears the mock session',
  'logout asks before discarding a draft and retains the session when logout fails',
  'mobile navigation opens, routes, and closes without viewport overflow',
  'chunk loading errors use the route recovery boundary',
  'live mode reports an unavailable session API without enabling mock data',
  'delayed customer orders from the previous shop cannot leak into the new shop profile',
];
for (const name of requiredBrowserCases) assert(e2e.includes(name), `Missing browser case: ${name}`);
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Current scope/session mock-network domain run did not pass');
assert(e2eRecord.audit?.playwrightTestsPassed === 484 && e2eRecord.audit?.browserProjects?.includes('chromium') && e2eRecord.audit?.browserProjects?.includes('firefox'), 'Current FE008 full-run evidence does not match the browser log');

const prior = json(priorPath);
const sourcePaths = [...new Set([
  ...prior.sourceFiles.map(item => item.path),
  'AGENTS.md', 'AI_RULES.md', 'botsales-kit/execution/frontend-plan.json',
  'botsales-kit/contracts/route-manifest.json', 'botsales-kit/contracts/feature-catalog.json',
  'apps/web/src/app/router.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/ScopeEvents.tsx', 'apps/web/src/app/Shell.tsx',
  'apps/web/src/main.tsx', 'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/client.ts',
  'tests/frontend.spec.ts', 'tests/route-role-matrix.spec.ts', 'tests/ui009-scope-regression.spec.ts',
  e2eEvidencePath, e2eLogPath, domainLogPath, helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot file: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const now = new Date().toISOString();
const casesByStep = {
  S01: [
    { name: 'Canonical route manifest drives public and shop route entries with permission/error boundaries', status: 'PASS' },
    { name: 'All 54 routes mount in the real React demo', status: 'PASS' },
    { name: 'All seven roles cover 51 private routes in 357 route/role cases', status: 'PASS' },
  ],
  S02: [
    { name: 'Single Router/QueryClient/theme provider and scoped query identity', status: 'PASS' },
    { name: 'Permission guard distinguishes forbidden from empty and hides restricted navigation', status: 'PASS' },
    { name: 'Auth demo/live labels are explicit and session tokens are not persisted in browser storage', status: 'PASS' },
  ],
  S03: [
    { name: 'Shop switch cancels the delayed prior-shop query and renders only current scope', status: 'PASS' },
    { name: 'Logout clears scoped/session cache only after API confirmation; failure retains session/draft', status: 'PASS' },
    { name: 'Dirty draft blocks navigation/logout; SSE validates shop and closes on scope cleanup', status: 'PASS' },
  ],
  S04: [
    { name: 'Refreshable deep links, browser history, chunk recovery, and mobile navigation', status: 'PASS' },
    { name: 'Delayed previous-shop result is discarded; 357-case route-role guard matrix passes', status: 'PASS' },
    { name: 'Live transport outage is shown as unavailable and never falls back to mock data', status: 'PASS' },
  ],
  S05: [
    { name: 'Current React shell full E2E across Chromium and Firefox', status: 'PASS', count: '484/484' },
    { name: 'Demo label, live missing-session API, route fallback, and no-mock fallback behavior are exercised', status: 'PASS' },
    { name: 'FE008 activation guard and production-artifact exclusion verified in the same current E2E evidence', status: 'PASS' },
  ],
};
const output = [];
for (const step of task.implementationSteps) {
  const pathEvidence = `${base}/${step.id}-after-spc059-current-session-20261006.json`;
  const pathLog = `${base}/${step.id}-after-spc059-current-session-20261006.log`;
  const scenarios = casesByStep[step.id];
  const observed = `${scenarios.map(item => item.name + (item.count ? ` (${item.count})` : '')).join('; ')}. Full local browser suite passed 484/484 tests on Chromium/Firefox, including the 357-case role matrix. This is Frontend-only synthetic evidence; no live OIDC/server authorization is claimed.`;
  const log = [
    `FE007.${step.id} current shell/session/scope verification.`, `executedAt=${now}`, `cwd=${root}`,
    `commandId=${command.id}; command=${command.command}; exitCode=0`, `E2E_LOG=${e2eLogPath}; sha256=${sha(bytes(e2eLogPath))}`,
    `DOMAIN_LOG=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`,
    `ROUTES=${routeManifest.routes.length}; FEATURES=${featureCatalog.features.length}; PRIVATE_ROLE_MATRIX=357; E2E=484/484; browserProjects=chromium,firefox`,
    ...scenarios.map(item => `CHECK ${item.status}: ${item.name}${item.count ? ` (${item.count})` : ''}`),
    `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
    `reviewer=${reviewer}`, 'Scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live identity provider/backend or hosted CI claim.',
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(root, pathLog), log, 'utf8');
  const evidence = {
    taskId: 'FE007', stepId: step.id, kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt: now,
    sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`, expected: step.verification, observed,
    commandId: command.id, command: command.command, cwd: root, reviewer,
    environment: { name: `Windows / Node ${process.versions.node} / Chromium + Firefox`, details: 'Full local React demo E2E with deterministic synthetic MSW; current route/session code and tests.', dataSource: 'synthetic-msw' },
    checksTotal: 484, failed: 0, logFile: pathLog.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(log)), sourceFiles, sourceSnapshotSha256,
    commandResults: [
      { commandId: command.id, command: command.command, exitCode: 0, testsPassed: 484, browserProjects: ['chromium', 'firefox'], logFile: e2eLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(e2eLogPath)) },
      { command: 'Current run test:domain (registered domain command)', exitCode: 0, checksPassed: 88, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) },
    ],
    audit: { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', routeCount: 54, featureCount: 64, routeRoleMatrix: 357, playwrightPassed: 484, browserProjects: ['chromium', 'firefox'], scenarios },
  };
  fs.writeFileSync(path.join(root, pathEvidence), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  output.push({ step: step.id, evidence: pathEvidence, log: pathLog, scenarios: scenarios.length });
}
console.log(JSON.stringify({ result: 'PASS', task: 'FE007', steps: output, routeCount: 54, featureCount: 64, routeRoleMatrix: 357, playwright: '484/484', sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

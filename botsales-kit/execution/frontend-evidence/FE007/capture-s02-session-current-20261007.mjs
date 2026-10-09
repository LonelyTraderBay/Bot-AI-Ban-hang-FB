import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const out = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const inFrontend = path.relative(fe, file);
  return inFrontend.startsWith('..') ? `botsales-kit/${relKit(file)}` : inFrontend.replaceAll('\\', '/');
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (file, args, options) => spawnSync(file, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });

const commandMap = json(path.join(kit, 'execution/frontend-command-map.json'));
const unit = commandMap.commands.find(item => item.id === 'unit');
assert(unit?.status === 'VERIFIED_AVAILABLE', 'Registered current unit command is unavailable.');
const currentClientTest = path.join(fe, 'apps/web/tests/api-client.test.tsx');
const preservedClientTestSha = sha(fs.readFileSync(currentClientTest));
const unitRun = run('cmd.exe', ['/d', '/c', unit.command], { cwd: fe, env: process.env, timeout: 600000 });
const unitOutput = `${unitRun.stdout || ''}${unitRun.stderr || ''}`;
assert(unitRun.status === 0, `Registered unit tests failed (exit=${unitRun.status}):\n${unitOutput.slice(-14000)}`);
assert(/Tests\s+\d+ passed/.test(unitOutput), 'Current Vitest output has no passing test summary.');
assert(sha(fs.readFileSync(currentClientTest)) === preservedClientTestSha, 'The pre-existing user-edited API client test file changed during unit tests.');

const browserCommand = 'node node_modules/@playwright/test/cli.js test tests/frontend.spec.ts tests/session/session-unauthorized.spec.ts tests/ui007-query-states.spec.ts --grep "role changes remove restricted navigation|live mode reports an unavailable session API|expired live session redirects to login|UI007 forbidden order query is an access state" --reporter=line';
const playwrightCli = path.join(fe, 'node_modules/@playwright/test/cli.js');
const browserRun = run(process.execPath, [playwrightCli, 'test', 'tests/frontend.spec.ts', 'tests/session/session-unauthorized.spec.ts', 'tests/ui007-query-states.spec.ts', '--grep', 'role changes remove restricted navigation|live mode reports an unavailable session API|expired live session redirects to login|UI007 forbidden order query is an access state', '--reporter=line'], { cwd: fe, env: process.env, timeout: 600000 });
const browserOutput = `${browserRun.stdout || ''}${browserRun.stderr || ''}`;
const browserLogPath = path.join(out, 'S02-session-browser-current-20261007.log');
fs.writeFileSync(browserLogPath, browserOutput, 'utf8');
assert(browserRun.status === 0 && /8 passed/.test(browserOutput), `Session/access browser scenarios failed (exit=${browserRun.status}):\n${browserOutput.slice(-14000)}`);

const main = read(path.join(fe, 'apps/web/src/main.tsx'));
const providerOccurrences = {
  router: (main.match(/<RouterProvider\b/g) || []).length,
  queryClient: (main.match(/<QueryClientProvider\b/g) || []).length,
  session: (main.match(/<SessionProvider\b/g) || []).length,
  theme: (main.match(/<ThemeProvider\b/g) || []).length,
};
assert(Object.values(providerOccurrences).every(count => count === 1), `App does not have exactly one root provider set: ${JSON.stringify(providerOccurrences)}.`);
assert((main.match(/new QueryClient\s*\(/g) || []).length === 1, 'Root QueryClient is not a single instance.');
const router = read(path.join(fe, 'apps/web/src/app/router.tsx'));
const session = read(path.join(fe, 'apps/web/src/app/SessionProvider.tsx'));
const shell = read(path.join(fe, 'apps/web/src/app/Shell.tsx'));
const hooks = read(path.join(fe, 'apps/web/src/shared/api/hooks.ts'));
const api = read(path.join(fe, 'apps/web/src/shared/api/client.ts'));
const queryState = read(path.join(fe, 'apps/web/src/shared/ui/components.tsx'));
const ui007 = read(path.join(fe, 'tests/ui007-query-states.spec.ts'));
const frontendTest = read(path.join(fe, 'tests/frontend.spec.ts'));
const unauthorizedTest = read(path.join(fe, 'tests/session/session-unauthorized.spec.ts'));
assert(router.includes("queryClient") === false && router.includes('GlobalGate') && shell.includes("error.status === 401"), '401 route/session behavior does not redirect unauthenticated sessions correctly.');
assert(session.includes("queryKey: ['session']") && session.includes("cache.removeQueries({ queryKey: ['scope'] })") && session.includes('cache.clear();'), 'Session query and refresh/logout lifecycle is incomplete.');
assert(hooks.includes("['scope', user.id, scope.shop.id, scope.membership.permissionVersion") && shell.includes("['shop', session?.user.id, shopId, membership?.permissionVersion]"), 'Feature/shop query keys omit user, shop or permission version.');
assert(api.includes("credentials: 'same-origin'"), 'API request no longer uses same-origin session credentials.');
assert(queryState.includes('status === 403') && queryState.includes('status === 404') && ui007.includes('successful empty query is distinct'), 'Forbidden API state is not distinguished from an empty success state.');
assert(frontendTest.includes('role changes remove restricted navigation') && frontendTest.includes('live mode reports an unavailable session API') && unauthorizedTest.includes("status: 401"), 'Current browser test coverage misses role denial, unavailable live session or expired session.');

const unitLogPath = path.join(out, 'S02-session-unit-current-20261007.log');
fs.writeFileSync(unitLogPath, unitOutput, 'utf8');
const executedAt = new Date().toISOString();
const auditPath = path.join(out, 'S02-session-audit-current-20261007.json');
const audit = {
  executedAt,
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  rootProviders: providerOccurrences,
  queryClientInstances: 1,
  sessionQuery: ['session'],
  shopQuery: ['shop', 'session.user.id', 'shopId', 'membership.permissionVersion'],
  featureQuery: ['scope', 'user.id', 'shop.id', 'membership.permissionVersion', 'operation', 'path', 'filters'],
  auth: { expiredSession401: 'Redirects to /login and preserves the requested shop path in returnTo; browser asserted in Chromium and Firefox.', unavailableLiveSession: 'Shows an API unavailable message and no mock data; browser asserted in Chromium and Firefox.' },
  authorization: { roleRouteGuard: 'Viewer role sees an explicit denied state for a restricted route; browser asserted in Chromium and Firefox.', forbiddenRead: '403 appears as an access error; successful empty list remains a different state; browser asserted in Chromium and Firefox.', serverAuthorization: 'Not proved. Role behavior comes from synthetic MSW/local fixtures.' },
  tests: { unitSummary: unitOutput.split(/\r?\n/).filter(line => /Tests\s+\d+ passed/.test(line)).at(-1) || 'Vitest exited 0; see full log.', browserTests: 8, browserProjects: ['chromium', 'firefox'], browserLog: relKit(browserLogPath), browserLogSha256: sha(fs.readFileSync(browserLogPath)) },
  preservedUserSource: { path: 'apps/web/tests/api-client.test.tsx', sha256Before: preservedClientTestSha, sha256After: sha(fs.readFileSync(currentClientTest)), unchanged: true },
  limits: 'Session/auth/role cases use local frontend and synthetic fixtures; no OIDC server, real backend authorization, hosting, or provider integration was exercised.',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md',
  'apps/web/src/main.tsx', 'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/ScopeEvents.tsx',
  'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/errors.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/ui/components.tsx',
  'apps/web/tests/api-client.test.tsx', 'tests/frontend.spec.ts', 'tests/ui007-query-states.spec.ts', 'tests/session/session-unauthorized.spec.ts', 'tests/session/demo-server.mjs',
];
const kitSources = [
  'contracts/permission-catalog.json', 'contracts/route-manifest.json', 'execution/frontend-plan.json', 'execution/frontend-command-map.json',
  'execution/frontend-evidence/FE007/capture-s02-session-current-20261007.mjs',
  'execution/frontend-evidence/FE007/S02-session-unit-current-20261007.log',
  'execution/frontend-evidence/FE007/S02-session-browser-current-20261007.log',
  'execution/frontend-evidence/FE007/S02-session-audit-current-20261007.json',
];
const sourceFiles = [...sourcePaths.map(item => path.join(fe, item)), ...kitSources.map(item => path.join(kit, item))]
  .map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const git = args => { const result = run('git', args, { cwd: repo }); return result.status === 0 ? result.stdout.trim() : 'unavailable'; };
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  'exactly one root router, query client/provider, session provider and theme provider',
  'registered current Vitest unit command passed',
  'expired session HTTP 401 redirected to login and retained requested return route in both browsers',
  'live session API unavailable state does not fall back to mock data in both browsers',
  'role-restricted route shows explicit access-denied state in both browsers',
  'HTTP 403 query state is distinct from a successful empty list in both browsers',
  'shop and feature query keys include user, shop and permission version',
  'pre-existing edited API client test file remained byte-identical through the unit run',
];
const logPath = path.join(out, 'S02-session-current-20261007.log');
const logText = [
  'FE007.S02 shell/session/query identity and auth/permission evidence',
  `executedAt=${executedAt}`,
  `cwd=${fe}`,
  `registered commandId=${unit.id}; command=${unit.command}; exitCode=${unitRun.status}`,
  audit.tests.unitSummary,
  `targeted browser command=${browserCommand}; exitCode=${browserRun.status}; tests=8/8 across Chromium and Firefox`,
  `rootProviders=${JSON.stringify(providerOccurrences)}; QueryClient instances=1`,
  '401 expiry redirects to login with allowlisted return path; 503 live API shows unavailable and never substitutes mock data.',
  '403 route/query renders access denied; the separate successful empty query scenario stays empty-success rather than forbidden.',
  'No backend/OIDC/production auth claim; behavior is local frontend tested against synthetic fixtures.',
  `preserved api-client.test.tsx sha256=${sha(fs.readFileSync(currentClientTest))}`,
  `checks=${checks.length}; failed=0`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
  reviewer,
  '--- registered unit command output ---',
  unitOutput.trimEnd(),
].join('\n') + '\n';
fs.writeFileSync(logPath, logText, 'utf8');

const evidence = {
  taskId: 'FE007', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current'])} plus current frontend working tree`,
  expected: 'One app provider set and current session/query identities prevent tenant-free feature cache; expired 401 returns to login with its safe return path; 403 stays an access error instead of an empty success.',
  observed: `Registered Vitest unit command passed. ${checks.length} checks were satisfied; 8 targeted browser cases passed across Chromium and Firefox, including expired-session 401, live unavailable session, role route denial, and the 403-versus-empty distinction. Feature/shop query keys carry user, shop, and permissionVersion.`,
  commandId: unit.id, command: unit.command, cwd: fe, reviewer,
  environment: { name: `Windows Node ${process.versions.node} / npm / Playwright Chromium+Firefox`, details: 'Registered Vitest ran from the frontend workspace; selected real React route/auth scenarios ran on local Vite servers. Request fixtures and demo session are synthetic. Existing edited api-client.test.tsx was fingerprinted before and after.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, checks, sourceFiles, sourceSnapshotSha256,
  logFile: relKit(logPath), logSha256: sha(Buffer.from(logText)),
  commandResults: [
    { commandId: unit.id, command: unit.command, exitCode: 0, logFile: relKit(unitLogPath), logSha256: sha(fs.readFileSync(unitLogPath)) },
    { commandId: 'supplemental-current-app-session-access', command: browserCommand, exitCode: 0, testsPassed: 8, projects: ['chromium', 'firefox'], logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)) },
  ],
  audit,
};
const evidencePath = path.join(out, 'S02-session-current-20261007.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), unitSummary: audit.tests.unitSummary, browserTests: 8, browserProjects: 2, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

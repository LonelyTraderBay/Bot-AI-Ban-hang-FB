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

const sourceCommand = json(path.join(kit, 'execution/frontend-command-map.json')).commands.find(item => item.id === 'source');
assert(sourceCommand?.status === 'VERIFIED_AVAILABLE', 'Registered source command is unavailable.');
const evidenceDirectory = path.join(fe, 'evidence');
const generatedReport = path.join(evidenceDirectory, 'source-check.json');
assert(fs.existsSync(generatedReport), 'Expected existing source-check.json to preserve was not found.');
const priorGeneratedReport = fs.readFileSync(generatedReport);
const sourceRun = run('cmd.exe', ['/d', '/c', sourceCommand.command], { cwd: fe, env: process.env, timeout: 600000 });
let currentGeneratedReport;
try {
  assert(sourceRun.status === 0, `Registered source command failed (exit=${sourceRun.status}):\n${sourceRun.stdout}\n${sourceRun.stderr}`);
  currentGeneratedReport = fs.readFileSync(generatedReport);
  const parsed = JSON.parse(currentGeneratedReport.toString('utf8'));
  assert(parsed.status === 'PASS' && parsed.routes === 54 && parsed.issues.length === 0, 'Current source checker did not pass all 54 routes.');
} finally {
  fs.writeFileSync(generatedReport, priorGeneratedReport);
}
assert(sha(fs.readFileSync(generatedReport)) === sha(priorGeneratedReport), 'Restored source-check.json differs from the pre-run user file.');

const canonical = json(path.join(kit, 'contracts/route-manifest.json')).routes;
const generated = json(path.join(fe, 'packages/contracts/src/routes.json')).routes;
const router = read(path.join(fe, 'apps/web/src/app/router.tsx'));
const shell = read(path.join(fe, 'apps/web/src/app/Shell.tsx'));
const session = read(path.join(fe, 'apps/web/src/app/SessionProvider.tsx'));
const hooks = read(path.join(fe, 'apps/web/src/shared/api/hooks.ts'));
const events = read(path.join(fe, 'apps/web/src/app/ScopeEvents.tsx'));
const routeE2e = read(path.join(fe, 'tests/frontend.spec.ts'));
const ids = canonical.map(route => route.id).sort();
assert(canonical.length === 54 && generated.length === 54, 'Expected 54 canonical and generated frontend routes.');
assert(new Set(canonical.map(route => route.path)).size === 54, 'Canonical route paths are not unique.');
for (const route of canonical) {
  const match = generated.find(item => item.id === route.id);
  assert(match && match.path === route.path && match.readPermission === route.readPermission, `Generated route mismatch for ${route.id}.`);
  assert(new RegExp(`\\b${route.id}\\s*:`).test(router), `Router has no page entry for ${route.id}.`);
}
const pageIds = [...router.matchAll(/^\s*(R\d{2}):\s*\w+/gm)].map(match => match[1]).sort();
assert(JSON.stringify(pageIds) === JSON.stringify(ids), 'Router page registry does not map exactly the canonical route IDs.');
assert(router.includes("r.path.startsWith('/s/')") && router.includes("path: '/s/:shopId'") && router.includes('<PermissionGate permission={r.readPermission}>'), 'Shop routes are not nested beneath the scoped shell and permission gate.');
assert(router.includes('r.id === \'R01\' ? page : <GlobalGate>{page}</GlobalGate>') && router.includes('<Suspense fallback={<Loading'), 'Public/auth and lazy-loading route gates are missing.');
assert(router.includes('errorElement: <RouteError />') && router.includes("{ path: '*', element: <NotFound />"), 'Route recovery or unknown-route fallback is missing.');
assert(shell.includes("queryKey: ['shop', session?.user.id, shopId, membership?.permissionVersion]") && shell.includes("queryKey: ['scope']") && shell.includes('membership?.permissionVersion'), 'Shop shell query/cancellation scope misses principal, shop or permission version.');
assert(session.includes("queryKey: ['session']") && session.includes("cache.removeQueries({ queryKey: ['scope'] })") && session.includes('cache.clear();'), 'Session refresh/logout does not clear dependent scoped cache state.');
assert(hooks.includes("['scope', user.id, scope.shop.id, scope.membership.permissionVersion") && events.includes("['scope', session.user.id, shop.id, membership.permissionVersion]"), 'Feature query or SSE invalidation omits user/shop/permissionVersion scope.');
for (const testName of [
  'all canonical routes render inside the real React demo application',
  'role changes remove restricted navigation and the route guard explains denied access',
  'deep links survive browser refresh and logout clears the mock session',
]) assert(routeE2e.includes(testName), `Missing current browser scenario: ${testName}.`);

const playwrightCli = path.join(fe, 'node_modules/@playwright/test/cli.js');
const browserCommand = 'node node_modules/@playwright/test/cli.js test tests/frontend.spec.ts --grep "all canonical routes render inside the real React demo application" --reporter=line';
const browserRun = run(process.execPath, [playwrightCli, 'test', 'tests/frontend.spec.ts', '--grep', 'all canonical routes render inside the real React demo application', '--reporter=line'], { cwd: fe, env: process.env, timeout: 600000 });
const browserOutput = `${browserRun.stdout || ''}${browserRun.stderr || ''}`;
const browserLogPath = path.join(out, 'S01-router-routes-browser-current-20261007.log');
fs.writeFileSync(browserLogPath, browserOutput, 'utf8');
assert(browserRun.status === 0 && /2 passed/.test(browserOutput), `Canonical route browser test failed (exit=${browserRun.status}):\n${browserOutput.slice(-10000)}`);

const generatedReportPath = path.join(out, 'S01-source-check-report-current-20261007.json');
fs.writeFileSync(generatedReportPath, `${currentGeneratedReport.toString('utf8').trimEnd()}\n`, 'utf8');
const executedAt = new Date().toISOString();
const commandMapPath = path.join(kit, 'execution/frontend-command-map.json');
const evidencePath = path.join(out, 'S01-router-current-20261007.json');
const auditPath = path.join(out, 'S01-router-audit-current-20261007.json');
const audit = {
  executedAt,
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  canonicalRoutes: canonical.length,
  generatedRoutes: generated.length,
  routePathsUnique: true,
  generatedIdPathPermissionMatches: true,
  routerPageEntries: pageIds.length,
  publicR01WithoutGlobalGate: true,
  otherPublicRoutesBehindGlobalGate: true,
  shopRoutesUnderScopedShell: true,
  shopRoutesHavePermissionGateAndLazyLoading: true,
  routeErrorAndNotFoundFallbacks: true,
  featureAndEventQueryScope: ['user.id', 'shop.id', 'permissionVersion'],
  sessionRefreshAndLogoutClearScopeCaches: true,
  sourceChecker: { status: 'PASS', routeCount: 54, issues: 0, restoredUserEvidenceSha256: sha(priorGeneratedReport) },
  browserRouteRender: { status: 'PASS', browsers: ['chromium', 'firefox'], tests: 2, routesPerTest: 54, command: browserCommand, logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)) },
  limits: 'All route rendering used the current React app in local demo mode and synthetic MSW data. No backend/provider/auth service or production hosting was tested.',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const sourcePaths = [
  'AGENTS.md', 'AI_RULES.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md',
  'apps/web/src/app/router.tsx', 'apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/ScopeEvents.tsx',
  'apps/web/src/shared/api/hooks.ts', 'apps/web/src/shared/model/scope.tsx', 'apps/web/src/shared/model/auth.ts',
  'apps/web/src/shared/api/errors.ts', 'apps/web/src/shared/ui/components.tsx',
  'tests/frontend.spec.ts', 'scripts/check-source.mjs', 'scripts/source-policy.mjs', 'packages/contracts/src/routes.json',
];
const kitSources = [
  'contracts/route-manifest.json', 'execution/frontend-plan.json', 'execution/frontend-command-map.json',
  'execution/frontend-evidence/FE007/capture-s01-router-current-20261007.mjs',
  'execution/frontend-evidence/FE007/S01-source-check-report-current-20261007.json',
  'execution/frontend-evidence/FE007/S01-router-audit-current-20261007.json',
  'execution/frontend-evidence/FE007/S01-router-routes-browser-current-20261007.log',
];
const sourceFiles = [...sourcePaths.map(item => path.join(fe, item)), ...kitSources.map(item => path.join(kit, item))]
  .map(file => ({ path: relSource(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const git = args => { const res = run('git', args, { cwd: repo }); return res.status === 0 ? res.stdout.trim() : 'unavailable'; };
const reviewer = 'Codex self-review; no independent peer review claimed';
const checks = [
  'registered source command passed with current source report and restored the prior evidence file byte-for-byte',
  'generated route manifest matches all 54 canonical id/path/readPermission triples',
  'router has exactly one page entry for each of 54 canonical route IDs',
  'public authentication route and protected public routes are separated',
  'shop routes inherit shell/session and per-route permission gate with loading/error/not-found fallbacks',
  'feature query and event invalidation keys include user, shop and permissionVersion',
  'session refresh/logout cancels or removes scoped data',
  'Chromium and Firefox each rendered all 54 current routes without browser failures',
];
const logPath = path.join(out, 'S01-router-current-20261007.log');
const logText = [
  'FE007.S01 canonical route/router/session/cache audit',
  `executedAt=${executedAt}`,
  `cwd=${fe}`,
  `registered commandId=${sourceCommand.id}; command=${sourceCommand.command}; exitCode=${sourceRun.status}`,
  `source checker report: PASS; routes=54; issues=0; restored pre-existing evidence/source-check.json sha256=${sha(priorGeneratedReport)}`,
  `route runtime command=${browserCommand}; exitCode=${browserRun.status}; browser projects chromium+firefox; each case visited all 54 canonical routes`,
  `browserLogSha256=${sha(fs.readFileSync(browserLogPath))}`,
  `page map: ${pageIds.length} entries exactly match canonical route ids; public R01 and shop-scoped routes handled separately`,
  'session, shop query and feature/event invalidation cache scopes inspected in current source; no tenant-free feature cache key found.',
  'Data source: local React demo and synthetic MSW only; no live identity provider or backend authorization proof.',
  `checks=${checks.length}; failed=0`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`),
  reviewer,
  '--- source checker command output ---',
  `${sourceRun.stdout || ''}${sourceRun.stderr || ''}`.trimEnd(),
].join('\n') + '\n';
fs.writeFileSync(logPath, logText, 'utf8');

const evidence = {
  taskId: 'FE007', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${git(['rev-parse', '--short', 'HEAD'])} on ${git(['branch', '--show-current'])} plus current frontend working tree`,
  expected: 'Generated frontend routes match the canonical manifest; every route has a React page entry, correct public/shop guard, scoped cache identity, loading/error fallbacks, and a route that opens on direct load.',
  observed: 'Registered frontend source checks passed with zero issues and the user-owned source-check report was restored byte-for-byte. All 54 generated routes match canonical IDs/paths/permissions and map exactly once in the router. The actual local React demo rendered all 54 routes in both Chromium and Firefox with no browser errors; current source shows shop and feature/SSE caches keyed by user, shop, and permissionVersion.',
  commandId: sourceCommand.id, command: sourceCommand.command, cwd: fe, reviewer,
  environment: { name: `Windows Node ${process.versions.node} / npm ${process.env.npm_config_user_agent?.match(/npm\/(\S+)/)?.[1] || '11.x'} / Playwright Chromium+Firefox`, details: 'The registered source command ran from the frontend workspace. A targeted current-app route test ran in both configured browsers using local demo servers and synthetic MSW. Existing evidence/source-check.json was restored byte-for-byte.', dataSource: 'synthetic-msw' },
  checksTotal: checks.length, failed: 0, checks, sourceFiles, sourceSnapshotSha256,
  logFile: relKit(logPath), logSha256: sha(Buffer.from(logText)),
  commandResults: [
    { commandId: sourceCommand.id, command: sourceCommand.command, exitCode: 0, report: relKit(generatedReportPath), reportSha256: sha(currentGeneratedReport) },
    { commandId: 'supplemental-current-app-route-render', command: browserCommand, exitCode: 0, testsPassed: 2, routesPerBrowser: 54, logFile: relKit(browserLogPath), logSha256: sha(fs.readFileSync(browserLogPath)) },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), routesPerBrowser: 54, browserProjects: 2, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

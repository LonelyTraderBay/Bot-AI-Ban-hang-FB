import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const read = file => fs.readFileSync(file, 'utf8');
const bytes = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const fromFe = path.relative(fe, file);
  return fromFe.startsWith('..') ? `botsales-kit/${relKit(file)}` : fromFe.replaceAll('\\', '/');
};
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
  const file = path.join(dir, item.name);
  return item.isDirectory() ? walk(file) : [file];
});

const receipt = json(path.join(out, 'S02-transport-current-20261007.json'));
const domainResult = receipt.commandResults.find(item => item.commandId === 'domain');
const unitResult = receipt.commandResults.find(item => item.commandId === 'unit');
const domainLogPath = path.join(kit, domainResult.logFile);
const unitLogPath = path.join(kit, unitResult.logFile);
const domainReportPath = path.join(out, 'S02-domain-report-current-20261007.json');
const emptyLogPath = path.join(out, 'S03-browser-empty-current-20261007.log');
const errorLogPath = path.join(out, 'S03-browser-error-current-20261007-after-toast-assertion.log');
const diagnosticLogPath = path.join(out, 'S03-browser-current-20261007.log');
const auditPath = path.join(out, 'S03-interaction-audit-current-20261007.json');
const auditLogPath = path.join(out, 'S03-interaction-audit-current-20261007.log');
const evidencePath = path.join(out, 'S03-interaction-current-20261007.json');
const evidenceLogPath = path.join(out, 'S03-interaction-current-20261007.log');

assert(receipt.result === 'PASS' && domainResult.exitCode === 0 && unitResult.exitCode === 0, 'FE008.S02 current registered domain/unit evidence is not passing.');
assert(sha(bytes(domainLogPath)) === domainResult.logSha256 && sha(bytes(unitLogPath)) === unitResult.logSha256, 'Supporting FE008.S02 logs changed after their capture.');
const domain = json(domainReportPath);
const domainLog = read(domainLogPath);
const unitLog = read(unitLogPath);
const emptyLog = read(emptyLogPath);
const errorLog = read(errorLogPath);
const diagnosticLog = read(diagnosticLogPath);
assert(domain.status === 'PASS' && domain.checks.length === 75 && domain.network.checks.length === 13 && domain.network.handlers === 210, 'Current domain report is incomplete.');
assert(domain.checks.every(item => item.status === 'PASS') && domain.network.checks.every(item => item.status === 'PASS'), 'Domain/network evidence includes a failed check.');
assert(domainLog.includes('"passed":88') && unitLog.includes('138 passed (138)'), 'Current supporting logs do not prove the 88/88 and 138/138 totals.');
assert((emptyLog.match(/ROUTE_EMPTY_COMPOSITION=11\/11 RESULT=PASS/g) || []).length === 2 && emptyLog.includes('2 passed'), 'Empty state route browser checks must pass 11/11 in each browser.');
assert((errorLog.match(/ROUTE_ERROR_COMPOSITION=1\/1 RESULT=PASS/g) || []).length === 2 && errorLog.includes('2 passed'), 'Current error/retry browser checks must pass in Chromium and Firefox.');
assert(diagnosticLog.includes('ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS') && diagnosticLog.includes('Expected length: 1') && diagnosticLog.includes('2 failed'), 'Initial route-filter diagnostic should remain recorded for review.');

const routeErrorTest = read(path.join(fe, 'tests/states/route-error-composition.spec.ts'));
const routeEmptyTest = read(path.join(fe, 'tests/states/route-empty-composition.spec.ts'));
const routeManifest = json(path.join(kit, 'contracts/route-manifest.json'));
const client = read(path.join(fe, 'apps/web/src/shared/api/client.ts'));
const hooks = read(path.join(fe, 'apps/web/src/shared/api/hooks.ts'));
const handlers = read(path.join(fe, 'apps/web/src/mocks/handlers.ts'));
const browserSource = read(path.join(fe, 'apps/web/src/mocks/browser.ts'));
const vite = read(path.join(fe, 'apps/web/vite.config.ts'));
const demoServer = read(path.join(fe, 'tests/session/demo-server.mjs'));
const emptyRoutes = new Set(['R07', 'R09', 'R12', 'R17', 'R21', 'R29', 'R30', 'R39', 'R44', 'R48', 'R50']);
assert(routeManifest.routes.filter(route => emptyRoutes.has(route.id) && route.path.startsWith('/s/')).length === 11, 'Current route catalog differs from the 11 empty-state browser routes.');
assert(routeEmptyTest.includes("getByRole('status')") && routeEmptyTest.includes('tbody td[colspan]'), 'Empty-state UI checks do not require accessible status and table semantics.');
assert(routeErrorTest.includes('ROUTE_ERROR_TEST_ID') && routeErrorTest.includes('Không tải được danh mục') && routeErrorTest.includes('Thử lại danh mục'), 'Error browser case does not exercise the failed lookup and visible retry path.');
assert(routeErrorTest.includes('.MuiSnackbar-root') && routeErrorTest.includes('must not show a success toast while an API read is failing'), 'Error state does not assert that a success toast is absent.');
assert(client.includes('UnknownResultError') && hooks.includes("request('getCommand'") && hooks.includes("observed === 'failed'"), 'Client command lifecycle can report failed/unknown outcomes as success.');
assert(handlers.includes('assertSchema(spec.responseSchema, envelope)') && browserSource.includes('print.error()'), 'Current UI test boundary can silently accept malformed or unhandled mock API calls.');
assert(vite.includes("const mocks = mode === 'demo'") && vite.includes('proxy: mocks ? undefined'), 'Demo browser run can fall through to the live API proxy.');
assert(demoServer.includes("startViteServer('demo'") && demoServer.includes('--mode',), 'Browser scenario server is not explicitly in demo mode.');

const commandMap = json(path.join(kit, 'execution/frontend-command-map.json'));
const domainCommand = commandMap.commands.find(item => item.id === 'domain');
const unitCommand = commandMap.commands.find(item => item.id === 'unit');
const browserErrorCommand = 'cmd.exe /d /c set "PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH%" && set "ROUTE_ERROR_TEST_ID=R10" && node node_modules/@playwright/test/cli.js test tests/states/route-error-composition.spec.ts --reporter=line';
const browserEmptyCommand = 'cmd.exe /d /c set "PATH=C:\\Windows\\System32;C:\\Program Files\\nodejs;%PATH%" && node node_modules/@playwright/test/cli.js test tests/states/route-empty-composition.spec.ts --reporter=line';
const browser = {
  projects: ['chromium', 'firefox'],
  errorRetry: { testsPassed: 2, route: 'R10 /s/:shopId/products/new', routeMatchesPerProject: 1, successToastWhileReadFails: 0, logFile: relKit(errorLogPath), logSha256: sha(bytes(errorLogPath)), command: browserErrorCommand },
  emptyState: { testsPassed: 2, routesPerProject: 11, accessibleAnnouncements: true, logFile: relKit(emptyLogPath), logSha256: sha(bytes(emptyLogPath)), command: browserEmptyCommand },
  diagnosticRun: { exitCode: 1, productFailure: false, reason: 'The initial CMD set ROUTE_ERROR_TEST_ID=R10 retained a trailing space, so the route filter stopped at its expected-count precondition. The corrected quoted environment command above passed both browser projects.', logFile: relKit(diagnosticLogPath), logSha256: sha(bytes(diagnosticLogPath)) },
};
const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', generatedAt: new Date().toISOString(),
  currentSupportingRuns: { domain: '75/75 simulator + 13/13 MSW scenarios + 210/210 handlers', unit: '138/138', domainLogSha256: sha(bytes(domainLogPath)), unitLogSha256: sha(bytes(unitLogPath)) },
  browser, routesInManifest: routeManifest.routes.length,
  behavior: { failureStateVisibleAndRetryable: true, successToastOnFailedRead: false, emptyStateRoutesPerBrowser: 11, noRealApiFallbackInDemoMode: true, noBackendOrProviderIntegrationClaimed: true },
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const auditLog = [
  'FE008.S03 current failure, empty-state and retry interaction audit',
  `registered domain command ${domainCommand.id}: exit=0; simulator 75/75; network 13/13; handlers 210/210`,
  `registered unit command ${unitCommand.id}: exit=0; 138/138`,
  `Chromium + Firefox: empty routes 11/11 each; error/retry route R10 1/1 each; success toast during failed read=0`,
  `diagnostic: initial run stopped at route-filter precondition due trailing whitespace; the corrected run passed, no product defect was observed`,
  'Boundary: local React/Vite demo and synthetic MSW only; no live API/provider/backend call is claimed.',
].join('\n') + '\n';
fs.writeFileSync(auditLogPath, auditLog, 'utf8');

const srcDir = path.join(fe, 'apps/web/src');
const sourcePaths = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'package.json'), path.join(fe, 'package-lock.json'),
  path.join(fe, 'apps/web/package.json'), path.join(fe, 'apps/web/vitest.config.ts'), path.join(fe, 'apps/web/vite.config.ts'),
  path.join(fe, 'apps/web/index.html'), path.join(fe, 'apps/web/public/mockServiceWorker.js'), path.join(fe, 'playwright.config.ts'),
  path.join(fe, 'scripts/run-e2e.mjs'), path.join(fe, 'scripts/vite-cache.mjs'), path.join(fe, 'tests/session/demo-server.mjs'),
  path.join(fe, 'tests/states/route-error-composition.spec.ts'), path.join(fe, 'tests/states/route-empty-composition.spec.ts'),
  path.join(fe, 'tests/fixtures/mock-network.mjs'), path.join(fe, 'apps/web/tests/api-client.test.tsx'),
  path.join(fe, 'apps/web/tests/shared-ui-render-contract.test.tsx'), path.join(fe, 'apps/web/tests/states/fe023-state.test.tsx'),
  path.join(fe, 'apps/web/src/mocks/handlers.ts'), path.join(fe, 'apps/web/src/mocks/browser.ts'),
  path.join(fe, 'apps/web/src/shared/api/client.ts'), path.join(fe, 'apps/web/src/shared/api/hooks.ts'), path.join(fe, 'apps/web/src/shared/ui/components.tsx'),
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/route-manifest.json'), path.join(kit, 'contracts/feature-catalog.json'),
  path.join(kit, 'contracts/events.schema.json'), path.join(kit, 'execution/frontend-plan.json'), path.join(kit, 'execution/frontend-command-map.json'),
  path.join(out, 'S02-transport-current-20261007.json'), path.join(out, 'S02-transport-current-20261007.log'),
  path.join(out, 'S02-domain-report-current-20261007.json'), path.join(domainLogPath), path.join(unitLogPath),
  emptyLogPath, errorLogPath, diagnosticLogPath, auditPath, auditLogPath, script,
  ...walk(srcDir),
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: relSource(file), sha256: sha(bytes(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const executedAt = audit.generatedAt;
const reviewer = 'Codex self-review; no independent peer review claimed';
const log = [
  'FE008.S03 current visible-error, retry and empty-state evidence', `executedAt=${executedAt}`, `cwd=${fe}`,
  `domain commandId=${domainCommand.id}; exitCode=0; simulator=75/75; network=13/13; handlers=210/210`,
  `unit commandId=${unitCommand.id}; exitCode=0; passed=138/138`,
  `browser error/retry: Chromium 1/1 + Firefox 1/1; no success snackbar while the read is failing`,
  `browser empty states: Chromium 11/11 + Firefox 11/11; accessible role=status/table states`,
  `diagnostic: initial route selector included trailing whitespace and failed only the selector count; corrected run passed.`,
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(evidenceLogPath, log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S03', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected: 'Synthetic mock happy/error/empty paths remain explicit; failed reads expose error and retry without success toast, and no demo route falls through to a live API.',
  observed: 'Fresh supporting runs: 75/75 simulator checks, 13/13 network scenarios, 210/210 handlers and 138/138 unit tests. Current Chromium and Firefox browser runs each passed the R10 error/retry route (1/1) with zero success snackbar while its API read failed, and the 11 canonical empty-state routes (11/11) with accessible announcements. The initial combined browser run had a trailing-space route-filter diagnostic; it was corrected and the same error case then passed in both browsers.',
  commandId: domainCommand.id, command: domainCommand.command, cwd: fe, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / Playwright Chromium + Firefox`, details: 'The product UI was served by local Vite demo mode; all API behavior was synthetic MSW. Empty/error states did not use live backend/provider services.', dataSource: 'synthetic-msw' },
  checksTotal: 230, failed: 0, sourceFiles, sourceSnapshotSha256, logFile: relKit(evidenceLogPath), logSha256: sha(Buffer.from(log)),
  commandResults: [
    { commandId: domainCommand.id, command: domainCommand.command, exitCode: 0, logFile: relKit(domainLogPath), logSha256: sha(bytes(domainLogPath)), simulatorChecks: 75, networkChecks: 13, handlers: 210 },
    { commandId: unitCommand.id, command: unitCommand.command, exitCode: 0, logFile: relKit(unitLogPath), logSha256: sha(bytes(unitLogPath)), testsPassed: 138 },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), simulatorChecks: 75, networkChecks: 13, unitTests: 138, browserErrorPerProject: 1, browserEmptyRoutesPerProject: 11, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

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
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const fromFe = path.relative(fe, file);
  return fromFe.startsWith('..') ? `botsales-kit/${relKit(file)}` : fromFe.replaceAll('\\', '/');
};
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const bytes = file => fs.readFileSync(file);
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const map = json(path.join(kit, 'execution/frontend-command-map.json'));
const domainCommand = map.commands.find(item => item.id === 'domain');
const unitCommand = map.commands.find(item => item.id === 'unit');
assert(domainCommand?.status === 'VERIFIED_AVAILABLE' && domainCommand.cwd === 'BotSalesAI_Frontend', 'Registered domain command unavailable.');
assert(unitCommand?.status === 'VERIFIED_AVAILABLE' && unitCommand.cwd === 'BotSalesAI_Frontend', 'Registered unit command unavailable.');

const protectedPaths = [path.join(fe, 'evidence/domain-tests.json'), path.join(fe, 'evidence/logs/mock-typecheck.log')];
const previousFiles = new Map(protectedPaths.map(file => [file, fs.existsSync(file) ? bytes(file) : null]));
const runCommand = command => spawnSync('cmd.exe', ['/d', '/c', command], {
  cwd: fe, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 600_000, env: { ...process.env },
});
let domainRun, unitRun, domainReport, typecheckLog;
try {
  domainRun = runCommand(domainCommand.command);
  if (fs.existsSync(protectedPaths[0])) domainReport = json(protectedPaths[0]);
  if (fs.existsSync(protectedPaths[1])) typecheckLog = bytes(protectedPaths[1]);
  unitRun = runCommand(unitCommand.command);
} finally {
  for (const [file, previous] of previousFiles) {
    if (previous === null) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } else {
      fs.writeFileSync(file, previous);
    }
  }
}

const outputOf = run => `${run?.stdout || ''}${run?.stderr ? `\n[stderr]\n${run.stderr}` : ''}`;
const domainOutput = outputOf(domainRun);
const unitOutput = outputOf(unitRun);
const domainLogPath = path.join(out, 'S02-domain-current-20261007.log');
const unitLogPath = path.join(out, 'S02-unit-current-20261007.log');
const domainReportPath = path.join(out, 'S02-domain-report-current-20261007.json');
const auditPath = path.join(out, 'S02-transport-audit-current-20261007.json');
const auditLogPath = path.join(out, 'S02-transport-audit-current-20261007.log');
const evidencePath = path.join(out, 'S02-transport-current-20261007.json');
const evidenceLogPath = path.join(out, 'S02-transport-current-20261007.log');
const typecheckText = typecheckLog?.toString('utf8') || '(domain runner did not produce mock typecheck log)';
const domainLog = [
  `Command: ${domainCommand.command}`, `CWD: ${fe}`, `Exit: ${domainRun?.status ?? 'null'}`,
  '', domainOutput, '--- Generated domain report ---', JSON.stringify(domainReport ?? null, null, 2),
  '--- Mock typecheck log ---', typecheckText,
].join('\n') + '\n';
fs.writeFileSync(domainLogPath, domainLog, 'utf8');
fs.writeFileSync(unitLogPath, [`Command: ${unitCommand.command}`, `CWD: ${fe}`, `Exit: ${unitRun?.status ?? 'null'}`, '', unitOutput].join('\n') + '\n', 'utf8');
if (domainReport) fs.writeFileSync(domainReportPath, `${JSON.stringify(domainReport, null, 2)}\n`, 'utf8');

assert(!domainRun?.error && domainRun?.status === 0, `Registered domain command failed: ${domainRun?.error?.message || domainOutput}`);
assert(domainReport?.status === 'PASS' && domainReport.checks.length === 75 && domainReport.checks.every(item => item.status === 'PASS'), 'Current simulator suite must pass 75/75.');
assert(domainReport.network?.status === 'PASS' && domainReport.network.handlers === 210 && domainReport.network.checks.length === 13 && domainReport.network.checks.every(item => item.status === 'PASS'), 'Current MSW suite must pass 13/13 over 210 handlers.');
assert(domainOutput.includes('"passed":88') && domainOutput.includes('"networkChecks":13'), 'Current domain command output does not prove 88/88 checks.');
assert(!unitRun?.error && unitRun?.status === 0, `Registered unit command failed: ${unitRun?.error?.message || unitOutput}`);

const operations = json(path.join(fe, 'packages/contracts/src/operations.json'));
const handlers = read(path.join(fe, 'apps/web/src/mocks/handlers.ts'));
const browser = read(path.join(fe, 'apps/web/src/mocks/browser.ts'));
const main = read(path.join(fe, 'apps/web/src/main.tsx'));
const vite = read(path.join(fe, 'apps/web/vite.config.ts'));
const client = read(path.join(fe, 'apps/web/src/shared/api/client.ts'));
const hooks = read(path.join(fe, 'apps/web/src/shared/api/hooks.ts'));
const sharedUi = read(path.join(fe, 'apps/web/src/shared/ui/components.tsx'));
const service = read(path.join(fe, 'apps/web/src/mocks/service.ts'));
const orderService = read(path.join(fe, 'apps/web/src/mocks/orders.ts'));
const fulfillmentService = read(path.join(fe, 'apps/web/src/mocks/fulfillment.ts'));
const procurementService = read(path.join(fe, 'apps/web/src/mocks/procurement.ts'));
const networkFixture = read(path.join(fe, 'tests/fixtures/mock-network.mjs'));
const apiTests = read(path.join(fe, 'apps/web/tests/api-client.test.tsx'));
const vitestConfig = read(path.join(fe, 'apps/web/vitest.config.ts'));
const packageJson = json(path.join(fe, 'package.json'));
const appPackage = json(path.join(fe, 'apps/web/package.json'));
const moduleDir = path.join(fe, 'apps/web/src/modules');
const moduleFiles = [];
const visit = dir => {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) visit(file);
    else if (/\.(tsx?|jsx?)$/.test(item.name)) moduleFiles.push(file);
  }
};
visit(moduleDir);
const moduleMockImports = moduleFiles.filter(file => /from\s+['"][^'"]*(?:\/mocks\/|seed\.json)/.test(read(file)));

assert(Object.keys(operations).length === 210, 'Generated operation catalog is not the observed 210-operation contract.');
assert(handlers.includes('Object.entries(operations)') && handlers.includes('methods[spec.method as keyof typeof methods]') && handlers.includes('spec.path.replace'), 'MSW handlers are not generated from canonical operation IDs, methods and paths.');
assert(handlers.includes('assertSchema(spec.requestSchema, body)') && handlers.includes('assertSchema(spec.responseSchema, envelope)'), 'MSW boundary does not validate request and response schemas.');
assert(handlers.includes('INVALID_CURSOR') && handlers.includes('Math.min(100') && handlers.includes('url.searchParams.get(\'cursor\')'), 'Cursor/limit pagination handling is missing.');
assert(handlers.includes("'if-match' ? 428") && handlers.includes("'x-csrf-token' ? 403"), 'Contract-required version/CSRF headers do not map to expected HTTP errors.');
assert(handlers.includes("'/api/v2/shops/:shopId/events'") && handlers.includes('memberships.some'), 'SSE endpoint lacks active-shop membership authorization.');
assert(browser.includes('if (!__MOCK__)') && browser.includes('print.error()'), 'Mock worker lacks a hard mock-only guard or strict unhandled API behavior.');
assert(main.includes('if (__MOCK__)') && main.includes("import('./mocks/browser')") && main.includes('mockServiceWorker.js'), 'Application boot does not separate mock activation and stale worker cleanup.');
assert(vite.includes("const mocks = mode === 'demo'") && vite.includes("mode === 'production' && env.VITE_ENABLE_MOCKS === 'true'"), 'Vite does not isolate demo mode or reject production mock activation.');
assert(appPackage.scripts.dev.includes('--mode demo') && appPackage.scripts['dev:live'].includes('--mode development'), 'Demo and live-development app entrypoints are not separate.');
assert(client.includes('operationUrl(op, options.path, options.query)') && client.includes('await fetch(url') && client.includes('assertSchema<ResponseOf<K>>'), 'React API client is not a contract-validated fetch boundary.');
assert(client.includes("headers['If-Match']") && client.includes("headers['Idempotency-Key']") && client.includes('new UnknownResultError'), 'Client omits version, idempotency or unknown-result handling.');
assert(hooks.includes("request('getCommand'") && hooks.includes('UnknownResultError'), 'Command response hook does not poll/reconcile command status.');
assert(service.includes("headers['if-match']") && service.includes('idempotency-key') && orderService.includes('allowedActions') && fulfillmentService.includes('allowedActions') && procurementService.includes('allowedActions'), 'Mock service/domain owners lack version/idempotency/action lifecycle handling.');
assert(sharedUi.includes('allowedActions') && sharedUi.includes('useCan(permission, allowedActions, action)'), 'Shared action UI does not combine permission and server-provided allowed actions.');
assert(networkFixture.includes(`server.listen({ onUnhandledRequest: 'error' })`), 'Network tests do not fail on unhandled requests.');
assert(vitestConfig.includes("include:['apps/web/tests/**/*.test.{ts,tsx}']") && apiTests.includes('waits for command completion after HTTP 202') && apiTests.includes('keeps an accepted command unresolved when command status polling fails'), 'Passing unit suite does not include current API command lifecycle tests.');
assert(moduleMockImports.length === 0, `Feature modules import mock fixtures directly: ${moduleMockImports.map(file => path.relative(fe, file)).join(', ')}`);
const requiredScenarios = [
  'Registers every canonical HTTP operation', 'Returns schema-valid, paginated data and rejects stale cursors',
  'Pages through a deterministic large dataset', 'Scopes reads to the requested shop and role permissions',
  'Maps request validation, CSRF, and missing If-Match', 'Creates a product with schema-complete variants through HTTP',
  'Preserves idempotency and exposes stale and unknown mutation outcomes over HTTP',
  'Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically',
  'Aborted delayed reads do not leak into the next request', 'Streams only the authorized shop',
];
for (const scenario of requiredScenarios) assert(domainReport.network.checks.some(check => check.name.includes(scenario) && check.status === 'PASS'), `Missing passing network scenario: ${scenario}`);

const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', generatedAt: new Date().toISOString(),
  operationCatalog: Object.keys(operations).length,
  currentRuns: {
    domain: { commandId: domainCommand.id, exitCode: domainRun.status, simulatorChecks: 75, networkChecks: 13, handlers: domainReport.network.handlers },
    unit: { commandId: unitCommand.id, exitCode: unitRun.status, apiClientTestIncludedByVitestConfig: true },
  },
  networkScenarios: domainReport.network.checks.map(item => ({ name: item.name, status: item.status })),
  transport: {
    operationsGeneratedFromContract: true, requestAndResponseSchemaValidation: true, paginationAndCursor: true,
    requiredVersionAndCsrfHeaderHandling: true, sseShopAuthorization: true, clientVersionAndIdempotency: true,
    commandStatusPollingAndUnknownReconciliation: true, serverAllowedActionsUsedBySharedUi: true,
    demoLiveModesSeparated: true, productionMockActivationRejected: true, unhandledApiRequestsFail: true,
    featureModuleDirectMockImports: moduleMockImports.length,
  },
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const auditLog = [
  'FE008.S02 current contract-derived MSW and API-client verification',
  `domain exit=${domainRun.status}; simulator=75/75; network=13/13; handlers=${domainReport.network.handlers}/210`,
  `unit exit=${unitRun.status}; API client tests included by ${path.relative(fe, path.join(fe, 'apps/web/vitest.config.ts')).replaceAll('\\', '/')}`,
  `contract operations=${Object.keys(operations).length}; feature module direct mock imports=${moduleMockImports.length}`,
  ...domainReport.network.checks.map(item => `NETWORK ${item.status}: ${item.name}`),
  'Static review: contract-derived handler paths/methods; request/response schemas; filters/cursors; version/CSRF; shop-scoped SSE; shared client; allowed actions; command polling/unknown recovery; demo/live/prod boundary.',
  'Scope: local frontend and synthetic MSW only. No backend, provider, staging or production integration is claimed.',
].join('\n') + '\n';
fs.writeFileSync(auditLogPath, auditLog, 'utf8');

const sourcePaths = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'package.json'), path.join(fe, 'apps/web/package.json'),
  path.join(fe, 'apps/web/vitest.config.ts'), path.join(fe, 'apps/web/src/main.tsx'), path.join(fe, 'apps/web/vite.config.ts'),
  path.join(fe, 'apps/web/src/mocks/browser.ts'), path.join(fe, 'apps/web/src/mocks/handlers.ts'), path.join(fe, 'apps/web/src/mocks/service.ts'),
  path.join(fe, 'apps/web/src/mocks/database.ts'), path.join(fe, 'apps/web/src/mocks/orders.ts'), path.join(fe, 'apps/web/src/mocks/fulfillment.ts'), path.join(fe, 'apps/web/src/mocks/procurement.ts'), path.join(fe, 'apps/web/src/shared/api/client.ts'), path.join(fe, 'apps/web/src/shared/api/hooks.ts'),
  path.join(fe, 'apps/web/src/shared/ui/components.tsx'), path.join(fe, 'apps/web/tests/api-client.test.tsx'),
  path.join(fe, 'tests/fixtures/mock-network.mjs'), path.join(fe, 'tests/domain-scenarios.cjs'), path.join(fe, 'scripts/test-domain.mjs'),
  path.join(fe, 'packages/contracts/src/operations.json'), path.join(fe, 'packages/contracts/src/index.ts'),
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/route-manifest.json'), path.join(kit, 'contracts/feature-catalog.json'),
  path.join(kit, 'contracts/permission-catalog.json'), path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  domainLogPath, unitLogPath, domainReportPath, auditPath, auditLogPath, script,
  ...moduleFiles,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: relSource(file), sha256: sha(bytes(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const executedAt = audit.generatedAt;
const reviewer = 'Codex self-review; no independent peer review claimed';
const log = [
  'FE008.S02 fresh registered MSW/domain and unit/API-client evidence', `executedAt=${executedAt}`, `cwd=${fe}`,
  `domain commandId=${domainCommand.id}; exitCode=${domainRun.status}; simulator=75/75; network=13/13; handlers=${domainReport.network.handlers}/210`,
  `unit commandId=${unitCommand.id}; exitCode=${unitRun.status}; vitest API-client suite included`, auditLog.trimEnd(),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  `domainLogSha256=${sha(bytes(domainLogPath))}`, `unitLogSha256=${sha(bytes(unitLogPath))}`, `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(evidenceLogPath, log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected: 'Canonical operation-based MSW transport, client schema/version/idempotency handling, allowed-action and command lifecycle, and demo-only mock activation pass current local verification.',
  observed: `Fresh registered domain run passed 75/75 simulator and 13/13 network scenarios over ${domainReport.network.handlers} handlers; fresh registered unit command exited 0 with the API-client tests included by the current Vitest config. Static review found ${moduleMockImports.length} direct mock/seed imports under feature modules and confirmed contract-derived operation handling, strict mock activation, version/idempotency and command reconciliation paths.`,
  commandId: domainCommand.id, command: domainCommand.command, cwd: fe, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / npm local workspace`, details: 'Fresh local simulator, in-process MSW HTTP/SSE suite and current Vitest suite; mock data only.', dataSource: 'synthetic-msw' },
  checksTotal: 23, failed: 0, sourceFiles, sourceSnapshotSha256,
  logFile: relKit(evidenceLogPath), logSha256: sha(Buffer.from(log)),
  commandResults: [
    { commandId: domainCommand.id, command: domainCommand.command, exitCode: domainRun.status, logFile: relKit(domainLogPath), logSha256: sha(bytes(domainLogPath)), simulatorChecks: 75, networkChecks: 13, handlers: domainReport.network.handlers },
    { commandId: unitCommand.id, command: unitCommand.command, exitCode: unitRun.status, logFile: relKit(unitLogPath), logSha256: sha(bytes(unitLogPath)) },
  ],
  audit,
  protectedOutputRestoration: protectedPaths.map(file => ({ path: path.relative(fe, file).replaceAll('\\', '/'), restored: previousFiles.get(file) === null ? !fs.existsSync(file) : sha(previousFiles.get(file)) === sha(bytes(file)) })),
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), operations: Object.keys(operations).length, handlers: domainReport.network.handlers, simulatorChecks: 75, networkChecks: 13, unitExit: unitRun.status, moduleMockImports: moduleMockImports.length, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

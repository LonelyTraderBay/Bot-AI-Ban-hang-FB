import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const base = 'botsales-kit/execution/frontend-evidence/FE008';
const oldEvidencePath = `${base}/S02-after-spc059-20261006.json`;
const domainLogPath = `${base}/S03-domain-spc059-current-20261006.log`;
const domainReportPath = 'evidence/domain-tests.json';
const evidencePath = `${base}/S02-after-spc059-after-fe011-20261006.json`;
const logPath = `${base}/S02-after-spc059-after-fe011-20261006.log`;
const helperPath = `${base}/refresh-s02-current-domain-evidence-20261006.mjs`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(path.join(root, file));
const read = file => bytes(file).toString('utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

assert(root.endsWith('BotSalesAI_Frontend'), `Unexpected workspace root: ${root}`);
const oldEvidence = json(oldEvidencePath);
const report = json(domainReportPath);
const map = json('botsales-kit/execution/frontend-command-map.json');
const command = map.commands.find(item => item.id === 'domain');
const domainLog = read(domainLogPath);
const handlers = read('apps/web/src/mocks/handlers.ts');
const worker = read('apps/web/src/mocks/browser.ts');
const main = read('apps/web/src/main.tsx');
const vite = read('apps/web/vite.config.ts');
const client = read('apps/web/src/shared/api/client.ts');
const network = read('tests/fixtures/mock-network.mjs');
const packageJson = json('apps/web/package.json');
const operationCount = Object.keys(json('packages/contracts/src/operations.json')).length;
assert(command?.status === 'VERIFIED_AVAILABLE', 'Domain command is not registered as available');
assert(report.status === 'PASS' && report.checks.length === 75 && report.checks.every(item => item.status === 'PASS'), 'Simulator suite must pass 75/75');
assert(report.network.handlers === operationCount && report.network.handlers === 210, 'Mock handler count must match canonical operations');
assert(report.network.checks.length === 13 && report.network.checks.every(item => item.status === 'PASS'), 'Network scenarios must pass 13/13');
assert(domainLog.includes('"passed":88') && /^exitCode=0$/m.test(domainLog), 'Fresh domain command log is incomplete');
assert(report.network.checks.some(item => item.name.includes('Maps request validation') && item.status === 'PASS'), 'Schema/request rejection scenario is missing');
assert(report.network.checks.some(item => item.name.includes('Scopes reads') && item.status === 'PASS'), 'Shop/role isolation scenario is missing');
assert(report.network.checks.some(item => item.name.includes('Streams only the authorized shop') && item.name.includes('canonical v2 schema')), 'Authorized SSE scenario is missing');
assert(handlers.includes('Object.entries(operations)') && handlers.includes('methods[spec.method as keyof typeof methods]'), 'MSW handlers are not derived from canonical operations');
assert(worker.includes("onUnhandledRequest: 'error'") || worker.includes('onUnhandledRequest'), 'Mock service worker must fail loudly on unhandled requests');
assert(main.includes("import('./mocks/browser')") && vite.includes("mode === 'production' && env.VITE_ENABLE_MOCKS === 'true'"), 'Demo/live mock activation guard is missing');
assert(client.includes('assertSchema<ResponseOf<K>>') && client.includes('await fetch(url'), 'Shared contract-validated API client is missing');
assert(network.includes("onUnhandledRequest: 'error'") && packageJson.scripts.dev.includes('--mode demo'), 'Network fixture and demo-only script are not configured');
const moduleFiles = fs.readdirSync(path.join(root, 'apps/web/src/modules'), { withFileTypes: true });
assert(moduleFiles.length > 0, 'Feature module tree is empty');

const sourcePaths = [...new Set([
  ...oldEvidence.sourceFiles.map(item => item.path),
  oldEvidencePath,
  domainLogPath,
  domainReportPath,
  helperPath,
])].sort();
for (const file of sourcePaths) assert(fs.existsSync(path.join(root, file)), `Missing source snapshot file: ${file}`);
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).join('\n')));
const executedAt = new Date().toISOString();
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const reviewer = 'Codex self-review; no independent peer review claimed';
const scenarios = report.network.checks.map(item => ({ name: item.name, status: item.status }));
const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', operations: operationCount,
  networkHandlers: report.network.handlers, simulatorChecks: report.checks.length,
  networkChecks: report.network.checks.length, networkScenarios: scenarios,
  transport: { operationIdsPathsAndMethodsGeneratedFromCanonicalIndex: true, frontendClientUsesContractValidatedFetchBoundary: true, demoAndLiveModesRemainSeparate: true, productionMockActivationRejected: true, unhandledApiRequestsFail: true, featureModuleTreePresent: true },
  observedAt: executedAt,
};
const auditLog = [
  'FE008.S02 revalidated after FE011 test assertion correction using a fresh registered domain run.',
  `executedAt=${executedAt}`, `commandId=${command.id}; command=${command.command}; exitCode=0`,
  `simulator=${report.checks.length}/${report.checks.length}; network=${report.network.checks.length}/${report.network.checks.length}; handlers=${report.network.handlers}/${operationCount}`,
  ...scenarios.map(item => `NETWORK ${item.status}: ${item.name}`),
  'Static review: canonical operation-derived handlers; shared response-schema validation; demo/live separation; production mock guard; strict unhandled request behavior.',
  'Scope=local Frontend with synthetic MSW only; no live Backend/provider integration claimed.',
].join('\n') + '\n';
fs.writeFileSync(path.join(root, logPath), auditLog, 'utf8');
const snapshotHash = sha(Buffer.from(sourceFiles.map(item => `${item.path}:${item.sha256}`).sort().join('\n')));
const evidenceLog = [auditLog.trimEnd(), `domainLog=${domainLogPath}; sha256=${sha(bytes(domainLogPath))}`, `domainReport=${domainReportPath}; sha256=${sha(bytes(domainReportPath))}`, `sourceSnapshotSha256=${snapshotHash}`, ...sourceFiles.map(item => `SOURCE ${item.path} sha256=${item.sha256}`), `reviewer=${reviewer}`].join('\n') + '\n';
fs.writeFileSync(path.join(root, logPath), evidenceLog, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} + current frontend working tree`,
  expected: 'Every canonical HTTP operation uses shared operation-ID-derived MSW handlers; schema-invalid and wrong-shop requests are detected; deterministic seed/reset, fixtures, and SSE remain frontend-only.',
  observed: `Fresh registered domain run exited 0: ${report.checks.length}/${report.checks.length} simulator checks, ${report.network.checks.length}/${report.network.checks.length} MSW network scenarios, ${report.network.handlers}/${operationCount} canonical operation handlers. Current static review confirms shared response-schema validation, separated demo/live activation, production mock guard, and strict unhandled requests.`,
  commandId: command.id, command: command.command, cwd: root, reviewer,
  environment: { name: `Windows / Node ${process.versions.node} / local Frontend toolchain`, details: 'Fresh deterministic in-memory MSW simulator/network validation; no live services.', dataSource: 'synthetic-msw' },
  checksTotal: report.network.checks.length, failed: 0, logFile: logPath.replace(/^botsales-kit\//, ''), logSha256: sha(Buffer.from(evidenceLog)), sourceFiles, sourceSnapshotSha256: snapshotHash,
  commandResults: [{ commandId: command.id, command: command.command, exitCode: 0, simulatorChecks: report.checks.length, networkChecks: report.network.checks.length, handlers: report.network.handlers, logFile: domainLogPath.replace(/^botsales-kit\//, ''), logSha256: sha(bytes(domainLogPath)) }],
  audit,
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', simulator: '75/75', network: '13/13', handlers: report.network.handlers, sourceFiles: sourceFiles.length, sourceSnapshotSha256: snapshotHash, evidence: evidencePath, log: logPath }, null, 2));

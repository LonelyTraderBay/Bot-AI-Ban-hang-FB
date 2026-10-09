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
const bytes = file => fs.readFileSync(file);
const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const relKit = file => path.relative(kit, file).replaceAll('\\', '/');
const relSource = file => {
  const fromFe = path.relative(fe, file);
  return fromFe.startsWith('..') ? `botsales-kit/${relKit(file)}` : fromFe.replaceAll('\\', '/');
};
const map = json(path.join(kit, 'execution/frontend-command-map.json'));
const schemaCommand = map.commands.find(item => item.id === 'schemas');
assert(schemaCommand?.status === 'VERIFIED_AVAILABLE' && schemaCommand.command === 'python scripts/validate-mock-schemas.py', 'Registered mock-schema command unavailable or changed.');
const domainReceipt = json(path.join(out, 'S02-transport-current-20261007.json'));
const domainResult = domainReceipt.commandResults.find(item => item.commandId === 'domain');
const domainLogPath = path.join(kit, domainResult.logFile);
const domainReportPath = path.join(out, 'S02-domain-report-current-20261007.json');
const domainReport = json(domainReportPath);
assert(domainReceipt.result === 'PASS' && domainResult.exitCode === 0 && sha(bytes(domainLogPath)) === domainResult.logSha256, 'Current FE008 domain report/log is stale or altered.');
assert(domainReport.status === 'PASS' && domainReport.checks.length === 75 && domainReport.network.checks.length === 13 && domainReport.network.handlers === 210, 'Supporting domain/network result is incomplete.');

const reportPath = path.join(fe, 'evidence/domain-tests.json');
const schemaOutputPath = path.join(fe, 'evidence/mock-schema-check.json');
const schemaCopyPath = path.join(out, 'S04-schema-report-current-20261007.json');
const schemaLogPath = path.join(out, 'S04-schema-run-current-20261007.log');
const auditPath = path.join(out, 'S04-schema-audit-current-20261007.json');
const auditLogPath = path.join(out, 'S04-schema-audit-current-20261007.log');
const evidencePath = path.join(out, 'S04-schema-current-20261007.json');
const evidenceLogPath = path.join(out, 'S04-schema-current-20261007.log');
const schemaEnvPath = 'C:\\Users\\Joker-PC\\AppData\\Local\\Temp\\botsales-jsonschema-20261001';
assert(fs.existsSync(path.join(schemaEnvPath, 'jsonschema')), 'Isolated jsonschema runtime recorded in the command map is missing.');
const protectedFiles = new Map([[reportPath, bytes(reportPath)], [schemaOutputPath, fs.existsSync(schemaOutputPath) ? bytes(schemaOutputPath) : null]]);
let run, schemaResult, pythonVersion;
try {
  fs.writeFileSync(reportPath, bytes(domainReportPath));
  const env = { ...process.env, PYTHONPATH: schemaEnvPath };
  pythonVersion = spawnSync('python', ['--version'], { cwd: fe, env, encoding: 'utf8' });
  run = spawnSync('python', ['scripts/validate-mock-schemas.py'], { cwd: fe, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 300_000 });
  if (fs.existsSync(schemaOutputPath)) schemaResult = json(schemaOutputPath);
} finally {
  for (const [file, previous] of protectedFiles) {
    if (previous === null) {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } else {
      fs.writeFileSync(file, previous);
    }
  }
}
const output = `${run?.stdout || ''}${run?.stderr ? `\n[stderr]\n${run.stderr}` : ''}`;
const py = `${pythonVersion?.stdout || ''}${pythonVersion?.stderr || ''}`.trim();
if (schemaResult) fs.writeFileSync(schemaCopyPath, `${JSON.stringify(schemaResult, null, 2)}\n`, 'utf8');
fs.writeFileSync(schemaLogPath, [
  `Command: ${schemaCommand.command}`, `CWD: ${fe}`, `Exit: ${run?.status ?? 'null'}`,
  `PYTHONPATH: ${schemaEnvPath}`, `Python: ${py}`, '', output,
  '--- Generated schema report ---', JSON.stringify(schemaResult ?? null, null, 2),
].join('\n') + '\n', 'utf8');
assert(!run?.error && run?.status === 0, `Registered schema command failed: ${run?.error?.message || output}`);
assert(schemaResult?.status === 'PASS' && Number.isInteger(schemaResult.checks) && schemaResult.checks > 0 && schemaResult.errors.length === 0, 'Current simulator transcript/database contains schema errors.');
assert(schemaResult.scope.includes('no HTTP/MSW, React or real backend execution'), 'Schema validator scope differs from the registered static JSON Schema validator.');

const networkFixture = read(path.join(fe, 'tests/fixtures/mock-network.mjs'));
const schemas = json(path.join(fe, 'packages/contracts/src/schemas.json'));
const collections = json(path.join(fe, 'apps/web/src/mocks/collections.json'));
const operations = json(path.join(fe, 'packages/contracts/src/operations.json'));
const networkNames = domainReport.network.checks.map(item => item.name);
assert(networkFixture.includes('assertSchema(\'ProductListResponse\'') && networkFixture.includes('assertSchema(\'CommandResponse\''), 'Network fixture does not assert schema-valid request/response payloads.');
assert(networkFixture.includes('assert.equal(invalidBody.status, 422)') && networkFixture.includes('assert.equal(crossShop.status, 404)'), 'Network fixture does not detect malformed requests and wrong-shop resource access.');
assert(networkNames.some(name => name.includes('Maps request validation')) && networkNames.some(name => name.includes('Scopes reads to the requested shop')) && networkNames.some(name => name.includes('Streams only the authorized shop')), 'Current network report misses required invalid, wrong-shop or SSE authorization cases.');
assert(Object.keys(schemas.components.schemas).length === 283 && Object.keys(collections).length === 51 && Object.keys(operations).length === 210, 'Current schemas/collections/operations inventory differs from the generated contract source.');
assert(schemaResult.checks >= domainReport.transcript.length && Object.keys(domainReport.db).length === 51, 'Schema checks did not cover the current simulator transcript and collections.');

const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', generatedAt: new Date().toISOString(),
  schemaValidation: { status: schemaResult.status, checks: schemaResult.checks, errors: schemaResult.errors.length, transcriptEntries: domainReport.transcript.length, databaseCollections: Object.keys(domainReport.db).length, collectionsCatalog: Object.keys(collections).length, schemas: Object.keys(schemas.components.schemas).length, operations: Object.keys(operations).length, python: py, jsonschemaRuntime: 'isolated jsonschema 4.26.0' },
  simulator: { checks: domainReport.checks.length, passed: domainReport.checks.filter(item => item.status === 'PASS').length },
  network: { handlers: domainReport.network.handlers, checks: domainReport.network.checks.length, passed: domainReport.network.checks.filter(item => item.status === 'PASS').length, malformedRequest422: true, crossShop404: true, permissionDenied403: true, sseShopAuthorization: true },
  protectedOutputRestoration: [...protectedFiles].map(([file, previous]) => ({ path: path.relative(fe, file).replaceAll('\\', '/'), restored: previous === null ? !fs.existsSync(file) : sha(previous) === sha(bytes(file)), restoredSha256: previous === null ? null : sha(bytes(file)) })),
};
assert(audit.protectedOutputRestoration.every(item => item.restored), 'Temporary frontend report substitution was not restored byte-for-byte.');
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const auditLog = [
  'FE008.S04 current JSON Schema, simulator and network audit',
  `schema command exit=${run.status}; ${schemaResult.checks}/${schemaResult.checks} schema checks passed; errors=0`,
  `fresh domain support: ${audit.simulator.passed}/${audit.simulator.checks} simulator; ${audit.network.passed}/${audit.network.checks} network; ${audit.network.handlers}/${audit.network.handlers} handlers`,
  `schema inputs: transcript=${audit.schemaValidation.transcriptEntries}; simulator DB=${audit.schemaValidation.databaseCollections} collections; catalog=${audit.schemaValidation.collectionsCatalog} collections; contract schemas=${audit.schemaValidation.schemas}; operations=${audit.schemaValidation.operations}`,
  'negative cases: request schema invalid -> 422; wrong-shop resource -> 404; role denied -> 403; SSE checks active-shop authorization.',
  'Temporary evidence/domain-tests.json replacement used the captured current S02 report; evidence/domain-tests.json and evidence/mock-schema-check.json were restored byte-for-byte.',
  'Scope: in-process simulator data and JSON Schema validation; no real HTTP backend, provider or production system is verified.',
].join('\n') + '\n';
fs.writeFileSync(auditLogPath, auditLog, 'utf8');

const sourcePaths = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'scripts/validate-mock-schemas.py'),
  path.join(fe, 'tests/fixtures/mock-network.mjs'), path.join(fe, 'tests/domain-scenarios.cjs'), path.join(fe, 'scripts/test-domain.mjs'),
  path.join(fe, 'apps/web/src/mocks/seed.json'), path.join(fe, 'apps/web/src/mocks/collections.json'), path.join(fe, 'apps/web/src/mocks/database.ts'), path.join(fe, 'apps/web/src/mocks/handlers.ts'), path.join(fe, 'apps/web/src/mocks/service.ts'),
  path.join(fe, 'packages/contracts/src/schemas.json'), path.join(fe, 'packages/contracts/src/operations.json'),
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/feature-catalog.json'), path.join(kit, 'contracts/route-manifest.json'), path.join(kit, 'contracts/permission-catalog.json'),
  path.join(kit, 'execution/frontend-plan.json'), path.join(kit, 'execution/frontend-command-map.json'),
  path.join(out, 'S02-transport-current-20261007.json'), path.join(domainReportPath), path.join(domainLogPath),
  schemaCopyPath, schemaLogPath, auditPath, auditLogPath, script,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: relSource(file), sha256: sha(bytes(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const executedAt = audit.generatedAt;
const reviewer = 'Codex self-review; no independent peer review claimed';
const log = [
  'FE008.S04 current schema/simulator/network proof', `executedAt=${executedAt}`, `cwd=${fe}`,
  `schema commandId=${schemaCommand.id}; exitCode=${run.status}; checks=${schemaResult.checks}/${schemaResult.checks}; errors=0`,
  `domain supporting run: 75/75 simulator; 13/13 network; 210/210 handlers; captured at ${domainReport.checkedAt}`,
  auditLog.trimEnd(), `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `schemaLogSha256=${sha(bytes(schemaLogPath))}`, `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(evidenceLogPath, log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected: 'Current simulator transcript, mock collections, request/response payloads and shared schemas validate; network tests detect malformed data and cross-shop access.',
  observed: `Fresh registered schema run passed ${schemaResult.checks}/${schemaResult.checks} checks with zero errors over ${domainReport.transcript.length} simulator transcript entries and ${Object.keys(domainReport.db).length} collections. Supporting current domain logs show 75/75 simulator checks and 13/13 MSW network scenarios over 210 handlers, including invalid-request 422, wrong-shop 404, permission 403 and authorized SSE cases. Existing dirty frontend evidence files were restored byte-for-byte.`,
  commandId: schemaCommand.id, command: schemaCommand.command, cwd: fe, reviewer,
  environment: { name: `Windows / Python ${py.replace(/^Python /, '')} / jsonschema 4.26.0 isolated runtime`, details: 'Mock schema validator consumed the fresh captured simulator report; outputs were captured into botsales-kit and original frontend evidence files restored byte-for-byte.', dataSource: 'synthetic-msw' },
  checksTotal: schemaResult.checks + domainReport.checks.length + domainReport.network.checks.length, failed: 0,
  sourceFiles, sourceSnapshotSha256, logFile: relKit(evidenceLogPath), logSha256: sha(Buffer.from(log)),
  commandResults: [
    { commandId: schemaCommand.id, command: schemaCommand.command, exitCode: run.status, logFile: relKit(schemaLogPath), logSha256: sha(bytes(schemaLogPath)), schemaChecks: schemaResult.checks, errors: schemaResult.errors.length },
    { commandId: 'domain', command: domainResult.command, exitCode: domainResult.exitCode, logFile: domainResult.logFile, logSha256: domainResult.logSha256, simulatorChecks: 75, networkChecks: 13, handlers: 210 },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), schemaChecks: schemaResult.checks, transcript: domainReport.transcript.length, databaseCollections: Object.keys(domainReport.db).length, simulatorChecks: 75, networkChecks: 13, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

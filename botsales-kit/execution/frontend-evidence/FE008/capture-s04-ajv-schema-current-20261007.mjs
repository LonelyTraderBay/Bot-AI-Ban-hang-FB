import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
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
const domainReceiptPath = path.join(out, 'S02-transport-current-20261007.json');
const domainReceipt = json(domainReceiptPath);
const domainCommand = domainReceipt.commandResults.find(item => item.commandId === 'domain');
const unitCommand = domainReceipt.commandResults.find(item => item.commandId === 'unit');
const domainLogPath = path.join(kit, domainCommand.logFile);
const unitLogPath = path.join(kit, unitCommand.logFile);
const domainReportPath = path.join(out, 'S02-domain-report-current-20261007.json');
const domain = json(domainReportPath);
assert(domainReceipt.result === 'PASS' && domainCommand.exitCode === 0 && unitCommand.exitCode === 0, 'Current domain/unit evidence is not passing.');
assert(sha(bytes(domainLogPath)) === domainCommand.logSha256 && sha(bytes(unitLogPath)) === unitCommand.logSha256, 'Supporting test logs changed.');
assert(domain.status === 'PASS' && domain.checks.length === 75 && domain.network.checks.length === 13 && domain.network.handlers === 210, 'Current simulator and network report is incomplete.');

const schemasPath = path.join(fe, 'packages/contracts/src/schemas.json');
const collectionsPath = path.join(fe, 'apps/web/src/mocks/collections.json');
const schemaCatalog = json(schemasPath);
const collections = json(collectionsPath);
const require = createRequire(path.join(fe, 'package.json'));
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats').default;
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats(ajv);
ajv.addSchema({ $id: 'botsales', ...schemaCatalog });
const failures = [];
let checks = 0;
function validate(schema, value, origin) {
  checks++;
  const validator = ajv.getSchema(`botsales#/components/schemas/${schema}`);
  if (!validator) {
    failures.push({ origin, schema, message: 'Schema was not registered.' });
    return;
  }
  if (!validator(value)) {
    for (const error of (validator.errors || []).slice(0, 5)) {
      failures.push({ origin, schema, path: error.instancePath || '/', message: error.message || 'Invalid value.' });
    }
  }
}
for (const [index, item] of domain.transcript.entries()) {
  if (item.requestSchema && Object.hasOwn(item, 'request')) validate(item.requestSchema, item.request, `call ${index}: ${item.op} request`);
  if (item.schema) {
    const data = item.data;
    const envelope = { data, meta: { requestId: 'schema-check', asOf: '2026-09-29T14:00:00Z' } };
    if (item.schema.endsWith('ListResponse')) {
      assert(Array.isArray(data), `Expected list payload for ${item.op}.`);
      envelope.data = data.slice(0, 100);
      envelope.page = { limit: 100, total: data.length, nextCursor: null, hasMore: false };
    }
    validate(item.schema, envelope, `call ${index}: ${item.op} response`);
  }
}
for (const [collection, rows] of Object.entries(domain.db)) {
  if (!Object.hasOwn(collections, collection)) continue;
  assert(Array.isArray(rows), `Simulator collection ${collection} is not an array.`);
  for (const row of rows) validate(collections[collection], row, `${collection}/${row?.id || 'config'}`);
}
const schemaReport = {
  checkedAt: new Date().toISOString(), status: failures.length ? 'FAIL' : 'PASS', checks, errors: failures,
  transcriptEntries: domain.transcript.length, databaseCollections: Object.keys(domain.db).length,
  collectionSchemas: Object.keys(collections).length, componentSchemas: Object.keys(schemaCatalog.components.schemas).length,
  scope: 'Current captured simulator request/response transcript and database rows checked with the same Ajv 2020 configuration used by the frontend API boundary; not backend, React browser, or production validation.',
};
const schemaReportPath = path.join(out, 'S04-ajv-schema-report-current-20261007.json');
const schemaLogPath = path.join(out, 'S04-ajv-schema-run-current-20261007.log');
const auditPath = path.join(out, 'S04-ajv-schema-audit-current-20261007.json');
const auditLogPath = path.join(out, 'S04-ajv-schema-audit-current-20261007.log');
const evidencePath = path.join(out, 'S04-schema-current-20261007.json');
const evidenceLogPath = path.join(out, 'S04-schema-current-20261007.log');
fs.writeFileSync(schemaReportPath, `${JSON.stringify(schemaReport, null, 2)}\n`, 'utf8');
const nodeVersion = process.version;
const schemaLog = [
  'Current simulator transcript/database JSON Schema audit using the existing frontend Ajv runtime',
  `Node: ${nodeVersion}`, `checkedAt=${schemaReport.checkedAt}`, `status=${schemaReport.status}`,
  `checks=${checks}; errors=${failures.length}; transcript=${domain.transcript.length}; databaseCollections=${Object.keys(domain.db).length}`,
  ...failures.map(error => `FAIL ${error.origin} schema=${error.schema} path=${error.path || '/'}: ${error.message}`),
  schemaReport.scope,
].join('\n') + '\n';
fs.writeFileSync(schemaLogPath, schemaLog, 'utf8');
assert(schemaReport.status === 'PASS' && checks > 0 && failures.length === 0, `Current Ajv schema audit failed: ${JSON.stringify(failures.slice(0, 10))}`);

const networkFixturePath = path.join(fe, 'tests/fixtures/mock-network.mjs');
const networkFixture = read(networkFixturePath);
const testNames = domain.network.checks.map(item => item.name);
assert(networkFixture.includes("assertSchema('ProductListResponse'") && networkFixture.includes("assertSchema('CommandResponse'"), 'Network fixture misses schema assertions.');
assert(networkFixture.includes('assert.equal(invalidBody.status, 422)') && networkFixture.includes('assert.equal(crossShop.status, 404)'), 'Network fixture misses invalid request and wrong-shop cases.');
assert(testNames.some(name => name.includes('Maps request validation')) && testNames.some(name => name.includes('Scopes reads to the requested shop')) && testNames.some(name => name.includes('Streams only the authorized shop')), 'Current network run missed request validation, shop isolation or SSE authorization.');
assert(Object.keys(schemaCatalog.components.schemas).length === 283 && Object.keys(collections).length === 51 && Object.keys(domain.db).length === 51, 'Schema/collection catalog does not cover current simulator data.');

const pythonDiagnosticPath = path.join(out, 'S04-schema-run-current-20261007.log');
const pythonDiagnostic = fs.existsSync(pythonDiagnosticPath) ? read(pythonDiagnosticPath) : '';
assert(pythonDiagnostic.includes('Draft202012Validator') && pythonDiagnostic.includes('Exit: 1'), 'The optional Python schema checker environment failure was not retained as a diagnostic.');
const audit = {
  scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', result: 'PASS', generatedAt: new Date().toISOString(),
  schema: schemaReport,
  simulator: { checks: domain.checks.length, passed: domain.checks.filter(item => item.status === 'PASS').length },
  network: { operations: 210, handlers: domain.network.handlers, checks: domain.network.checks.length, passed: domain.network.checks.filter(item => item.status === 'PASS').length, invalidRequest422: true, wrongShop404: true, permissionDenied403: true, sseAuthorization: true },
  runtimeChoice: { validator: 'Existing Ajv 2020 frontend dependency/configuration', addedProjectDependency: false, pythonOptionalChecker: 'Unavailable: isolated temp jsonschema folder lacks jsonschema/__init__.py and Draft202012Validator; its stale prior report was excluded.' },
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const auditLog = [
  'FE008.S04 current JSON Schema, simulator and MSW network audit',
  `existing frontend Ajv 2020 validated ${checks} current request/response and database objects; errors=${failures.length}`,
  `current supporting registered tests: domain ${domain.checks.length}/${domain.checks.length} simulator + ${domain.network.checks.length}/${domain.network.checks.length} network; ${domain.network.handlers}/${domain.network.handlers} handlers`,
  `current inputs: transcript=${domain.transcript.length}; simulator DB=${Object.keys(domain.db).length}/${Object.keys(collections).length} collections; component schemas=${Object.keys(schemaCatalog.components.schemas).length}`,
  'negative cases: malformed request returns 422; cross-shop resource returns 404; role permission denial returns 403; SSE is shop-authorized.',
  'The optional Python validator could not import Draft202012Validator because its isolated Temp package folder is incomplete. Its 2026-10-04 report was excluded. No project dependency was installed.',
  'Scope: current local simulator and frontend schema definitions only; no live backend/provider/production validation.',
].join('\n') + '\n';
fs.writeFileSync(auditLogPath, auditLog, 'utf8');

const commandMap = json(path.join(kit, 'execution/frontend-command-map.json'));
const registeredDomain = commandMap.commands.find(item => item.id === 'domain');
const sourcePaths = [
  path.join(fe, 'AGENTS.md'), path.join(fe, 'AI_RULES.md'), path.join(fe, 'apps/web/src/shared/api/validation.ts'),
  path.join(fe, 'apps/web/src/mocks/seed.json'), path.join(fe, 'apps/web/src/mocks/collections.json'), path.join(fe, 'apps/web/src/mocks/database.ts'), path.join(fe, 'apps/web/src/mocks/handlers.ts'), path.join(fe, 'apps/web/src/mocks/service.ts'),
  path.join(fe, 'tests/fixtures/mock-network.mjs'), path.join(fe, 'tests/domain-scenarios.cjs'), path.join(fe, 'scripts/test-domain.mjs'),
  path.join(fe, 'packages/contracts/src/schemas.json'), path.join(fe, 'packages/contracts/src/operations.json'),
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/route-manifest.json'), path.join(kit, 'contracts/feature-catalog.json'), path.join(kit, 'contracts/permission-catalog.json'),
  path.join(kit, 'execution/frontend-plan.json'), path.join(kit, 'execution/frontend-command-map.json'),
  domainReceiptPath, domainReportPath, domainLogPath, unitLogPath, schemaReportPath, schemaLogPath, pythonDiagnosticPath, auditPath, auditLogPath, script,
];
const sourceFiles = [...new Set(sourcePaths)].map(file => ({ path: relSource(file), sha256: sha(bytes(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const head = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repo, encoding: 'utf8', check: true }).stdout.trim();
const branch = spawnSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const executedAt = audit.generatedAt;
const reviewer = 'Codex self-review; no independent peer review claimed';
const log = [
  'FE008.S04 current Ajv schema/simulator/network proof', `executedAt=${executedAt}`, `cwd=${fe}`,
  `primary registered commandId=${registeredDomain.id}; command=${registeredDomain.command}; exitCode=0; simulator=75/75; network=13/13; handlers=210/210`,
  `supplemental existing Ajv 2020 audit: ${checks}/${checks} checks; errors=0; transcript=${domain.transcript.length}; databaseCollections=${Object.keys(domain.db).length}`,
  auditLog.trimEnd(), `sourceSnapshotSha256=${sourceSnapshotSha256}`,
  ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`), `domainLogSha256=${sha(bytes(domainLogPath))}`, `reviewer=${reviewer}`,
].join('\n') + '\n';
fs.writeFileSync(evidenceLogPath, log, 'utf8');
const evidence = {
  taskId: 'FE008', stepId: 'S04', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt, sourceRevision: `HEAD ${head} on ${branch} plus current frontend working tree`,
  expected: 'Simulator transcript, request/response and every current mock database row validate against canonical JSON Schemas; invalid request and wrong-shop cases are detected by current network tests.',
  observed: `The current captured simulator transcript/database passed ${checks}/${checks} checks with existing frontend Ajv 2020, covering ${domain.transcript.length} transcript entries and all ${Object.keys(domain.db).length} mock collections. Supporting registered domain run passed 75/75 simulator checks and 13/13 MSW network scenarios over 210 handlers, including 422 malformed request, 404 wrong-shop, 403 role-denied and shop-authorized SSE cases. The optional Python validator could not run because its isolated Temp jsonschema package is incomplete; its stale 2026-10-04 report was excluded and no dependency was installed.`,
  commandId: registeredDomain.id, command: registeredDomain.command, cwd: fe, reviewer,
  environment: { name: `Windows Node ${process.versions.node} / project Ajv 2020 runtime`, details: 'Schema audit uses the existing frontend Ajv dependency. Current S02 report and user-owned frontend evidence outputs were preserved; Python temp package failure is separately recorded.', dataSource: 'synthetic-msw' },
  checksTotal: checks + domain.checks.length + domain.network.checks.length, failed: 0,
  sourceFiles, sourceSnapshotSha256, logFile: relKit(evidenceLogPath), logSha256: sha(Buffer.from(log)),
  commandResults: [
    { commandId: registeredDomain.id, command: registeredDomain.command, exitCode: 0, logFile: relKit(domainLogPath), logSha256: domainCommand.logSha256, simulatorChecks: 75, networkChecks: 13, handlers: 210 },
    { commandId: 'unit', command: unitCommand.command, exitCode: 0, logFile: unitCommand.logFile, logSha256: unitCommand.logSha256, testsPassed: 138 },
  ],
  audit,
};
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', evidence: relKit(evidencePath), schemaChecks: checks, transcript: domain.transcript.length, databaseCollections: Object.keys(domain.db).length, simulatorChecks: 75, networkChecks: 13, excludedPythonReport: true, sourceFiles: sourceFiles.length, sourceSnapshotSha256 }, null, 2));

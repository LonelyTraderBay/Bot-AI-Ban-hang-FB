import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const require = createRequire(path.join(fe, 'package.json'));
const ts = require('typescript');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const relative = file => path.relative(fe, file).startsWith('..')
  ? `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`
  : path.relative(fe, file).replaceAll('\\', '/');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const sourceReport = path.join(fe, 'evidence/source-check.json');
const sourceReportCopy = path.join(out, 'S01-source-check-report-current-20261008.json');
const sourceCommandLog = path.join(out, 'S01-source-check-current-20261008.log');
const crosswalkPath = path.join(out, 'S01-contract-crosswalk-current-20261008.json');
const finalLogPath = path.join(out, 'S01-contract-crosswalk-current-20261008.log');
const receiptPath = path.join(out, 'S01-contract-crosswalk-current-20261008.receipt.json');

const commandMap = readJson(path.join(kit, 'execution/frontend-command-map.json'));
const sourceCommand = commandMap.commands.find(item => item.id === 'source');
assert(sourceCommand?.status === 'VERIFIED_AVAILABLE' && sourceCommand.cwd === 'BotSalesAI_Frontend', 'Registered frontend source command unavailable');
const savedSourceReport = fs.readFileSync(sourceReport);
const savedSourceReportHash = sha(savedSourceReport);
const env = { ...process.env };
const systemRoot = env.SystemRoot || 'C:\\Windows';
env.PATH = [
  'C:\\Program Files\\nodejs',
  'C:\\Program Files\\Git\\cmd',
  path.join(systemRoot, 'System32'),
  path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'),
  systemRoot,
].join(';');

let sourceRun;
try {
  sourceRun = spawnSync('cmd.exe', ['/d', '/c', sourceCommand.command], { cwd: fe, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  assert(!sourceRun.error, `Could not launch registered source command: ${sourceRun.error?.message}`);
  assert(fs.existsSync(sourceReport), 'Source checker did not emit evidence/source-check.json');
  fs.copyFileSync(sourceReport, sourceReportCopy);
} finally {
  fs.writeFileSync(sourceReport, savedSourceReport);
}
const restoredSourceReportHash = sha(fs.readFileSync(sourceReport));
assert(restoredSourceReportHash === savedSourceReportHash, 'Pre-existing evidence/source-check.json was not restored byte-for-byte');
const sourceReportJson = readJson(sourceReportCopy);
fs.writeFileSync(sourceCommandLog,
  `Command: ${sourceCommand.command}\nCWD: ${fe}\nExit: ${sourceRun.status}\n` +
  `Original source-check sha256: ${savedSourceReportHash}\nRestored source-check sha256: ${restoredSourceReportHash}\n` +
  `Restored byte-for-byte: ${restoredSourceReportHash === savedSourceReportHash}\n\n` +
  (sourceRun.stdout || '') + (sourceRun.stderr ? `\n[stderr]\n${sourceRun.stderr}` : ''), 'utf8');
assert(sourceRun.status === 0, `Registered source command exited ${sourceRun.status}`);
assert(sourceReportJson.status === 'PASS' && sourceReportJson.issues.length === 0, 'Fresh source checker report contains issues');

const inputPaths = {
  openapi: path.join(kit, 'contracts/openapi.json'),
  routes: path.join(kit, 'contracts/route-manifest.json'),
  permissions: path.join(kit, 'contracts/permission-catalog.json'),
  events: path.join(kit, 'contracts/events.schema.json'),
  operationIndex: path.join(kit, 'contracts/operation-index.json'),
};
const api = readJson(inputPaths.openapi);
const routeManifest = readJson(inputPaths.routes);
const permissionCatalog = readJson(inputPaths.permissions);
const eventSchema = readJson(inputPaths.events);
const operationIndex = readJson(inputPaths.operationIndex);
const generatedOperations = readJson(path.join(fe, 'packages/contracts/src/operations.json'));
const generatedRoutes = readJson(path.join(fe, 'packages/contracts/src/routes.json'));
const generatedPermissions = readJson(path.join(fe, 'packages/contracts/src/permissions.json'));
const generatedSchemas = readJson(path.join(fe, 'packages/contracts/src/schemas.json'));

const openapiOperations = [];
for (const [route, methods] of Object.entries(api.paths || {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (operation?.operationId) openapiOperations.push({
      operationId: operation.operationId,
      method: method.toUpperCase(),
      path: route,
      permission: operation['x-permission'] ?? null,
      operation,
    });
  }
}
const openapiById = new Map(openapiOperations.map(item => [item.operationId, item]));
const indexById = new Map(operationIndex.operations.map(item => [item.operationId, item]));
const permissionIds = new Set(permissionCatalog.permissions.map(item => item.id));
const generatedPermissionIds = new Set(generatedPermissions.permissions.map(item => item.id));
const routeOperationRefs = new Set(routeManifest.globalOperations || []);
const routePermissions = new Set();
for (const route of routeManifest.routes) {
  for (const operationId of route.readOperations || []) routeOperationRefs.add(operationId);
  if (route.readPermission) routePermissions.add(route.readPermission);
  for (const action of route.actions || []) {
    if (action.operationId) routeOperationRefs.add(action.operationId);
    if (action.permission) routePermissions.add(action.permission);
  }
}
const apiPermissions = new Set(openapiOperations.map(item => item.permission).filter(Boolean));
const permissionUsage = new Set([...routePermissions, ...apiPermissions]);

const appRoot = path.join(fe, 'apps/web/src');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(?:ts|tsx)$/.test(file) ? [file] : [];
  });
}
const appFiles = walk(appRoot).sort();
const usageCounts = new Map();
const usedByModule = new Map();
const jsxPermissions = new Set();
const dynamicOperationCalls = [];
const parseErrors = [];
for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const rel = path.relative(fe, file).replaceAll('\\', '/');
  const moduleMatch = rel.match(/apps\/web\/src\/modules\/([^/]+)/);
  const owner = moduleMatch?.[1] || (rel.includes('/shared/') ? 'shared' : 'app');
  for (const diagnostic of source.parseDiagnostics) parseErrors.push(`${rel}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`);
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['useApi', 'useCommand', 'request'].includes(node.expression.text) && node.arguments[0]) {
      const argument = node.arguments[0];
      if (ts.isStringLiteral(argument)) {
        usageCounts.set(argument.text, (usageCounts.get(argument.text) || 0) + 1);
        if (!usedByModule.has(owner)) usedByModule.set(owner, new Set());
        usedByModule.get(owner).add(argument.text);
      } else if (moduleMatch) dynamicOperationCalls.push({ file: rel, callee: node.expression.text, expression: argument.getText(source) });
    }
    if (ts.isJsxAttribute(node) && node.name.text === 'permission' && node.initializer && ts.isStringLiteral(node.initializer)) jsxPermissions.add(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const schemas = api.components.schemas;
const generatedText = fs.readFileSync(path.join(fe, 'packages/contracts/src/generated.ts'), 'utf8');
const generatedSource = ts.createSourceFile('generated.ts', generatedText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const typeAliases = new Map(generatedSource.statements.filter(ts.isTypeAliasDeclaration).map(item => [item.name.text, item.type]));
function generatedMembers(name) {
  const type = typeAliases.get(name);
  assert(type && ts.isTypeLiteralNode(type), `Missing generated object type ${name}`);
  return new Map(type.members.filter(ts.isPropertySignature).map(member => [member.name.getText(generatedSource).replaceAll(/[\"']/g, ''), member]));
}
function hasNull(type) {
  const unwrapped = ts.isParenthesizedTypeNode(type) ? type.type : type;
  return ts.isUnionTypeNode(unwrapped) && unwrapped.types.some(part => part.kind === ts.SyntaxKind.NullKeyword || (ts.isLiteralTypeNode(part) && part.literal.kind === ts.SyntaxKind.NullKeyword));
}
function schemaHasNull(schema) {
  if (!schema || typeof schema !== 'object') return false;
  if (schema.type === 'null' || (Array.isArray(schema.type) && schema.type.includes('null'))) return true;
  return ['anyOf', 'oneOf'].some(key => Array.isArray(schema[key]) && schema[key].some(schemaHasNull));
}
function dtoField(model, schemaName, property, expectedOptional, expectedNullable) {
  const member = generatedMembers(model).get(property);
  const modelSchema = schemas[schemaName];
  const propertySchema = modelSchema?.properties?.[property];
  assert(member?.type && propertySchema, `Missing generated/OpenAPI field ${model}.${property}`);
  const openapiOptional = !(modelSchema.required || []).includes(property);
  const openapiNullable = schemaHasNull(propertySchema);
  const generatedOptional = Boolean(member.questionToken);
  const generatedNullable = hasNull(member.type);
  return {
    check: `${model}.${property} optional/null semantics`,
    generated: `${model}.${property}${generatedOptional ? '?' : ''}: ${member.type.getText(generatedSource)}`,
    openapiOptional, generatedOptional, openapiNullable, generatedNullable,
    pass: openapiOptional === generatedOptional && openapiNullable === generatedNullable && openapiOptional === expectedOptional && openapiNullable === expectedNullable,
  };
}
const moneyMembers = generatedMembers('Money');
const dtoEvidence = [
  { check: 'Id remains a string with the canonical runtime pattern', pass: typeAliases.get('Id')?.kind === ts.SyntaxKind.StringKeyword && schemas.Id?.type === 'string' && schemas.Id.pattern === '^[A-Za-z0-9_-]+$' },
  { check: 'Money amount stays Decimal string and currency stays Currency', pass: moneyMembers.get('amount')?.type.getText(generatedSource) === 'Decimal' && moneyMembers.get('currency')?.type.getText(generatedSource) === 'Currency' && typeAliases.get('Decimal')?.kind === ts.SyntaxKind.StringKeyword && schemas.Money?.properties?.amount?.$ref?.endsWith('/Decimal') && schemas.Money.required?.includes('amount') },
  dtoField('Problem', 'Problem', 'detail', true, false),
  dtoField('Problem', 'Problem', 'commandId', true, false),
  dtoField('Command', 'Command', 'result', false, true),
  dtoField('Product', 'Product', 'categoryId', false, true),
  dtoField('Variant', 'Variant', 'price', false, true),
  dtoField('Customer', 'Customer', 'phone', false, true),
];

const gaps = [...parseErrors.map(item => `TypeScript parse error: ${item}`)];
for (const item of openapiOperations) {
  const indexed = indexById.get(item.operationId);
  const generated = generatedOperations[item.operationId];
  if (!indexed || indexed.path !== item.path || indexed.method !== item.method || (indexed.permission ?? null) !== item.permission) gaps.push(`operation-index mismatch: ${item.operationId}`);
  if (!generated) gaps.push(`generated operation missing: ${item.operationId}`);
  else if (generated.path !== item.path || generated.method !== item.method || (generated.permission ?? null) !== item.permission) gaps.push(`generated operation mismatch: ${item.operationId}`);
  if (item.permission && !permissionIds.has(item.permission)) gaps.push(`OpenAPI unknown permission: ${item.permission}`);
}
for (const id of indexById.keys()) if (!openapiById.has(id)) gaps.push(`OpenAPI missing indexed operation: ${id}`);
for (const id of Object.keys(generatedOperations)) if (!openapiById.has(id)) gaps.push(`generated operation absent from OpenAPI: ${id}`);
for (const id of routeOperationRefs) if (!openapiById.has(id)) gaps.push(`route unknown operation: ${id}`);
for (const permission of permissionUsage) if (!permissionIds.has(permission)) gaps.push(`unknown route/API permission: ${permission}`);
for (const permission of jsxPermissions) if (!permissionIds.has(permission)) gaps.push(`unknown JSX permission: ${permission}`);
for (const id of usageCounts.keys()) if (!openapiById.has(id)) gaps.push(`unknown source operation: ${id}`);
for (const check of dtoEvidence) if (!check.pass) gaps.push(`DTO mismatch: ${check.check}`);
if (dynamicOperationCalls.length) gaps.push(`dynamic API operation IDs in module source: ${dynamicOperationCalls.length}`);
if (routeManifest.routes.length !== generatedRoutes.routes?.length) gaps.push('Generated route count differs from canonical manifest');
const generatedRouteMap = new Map((generatedRoutes.routes || []).map(route => [route.id, route]));
for (const route of routeManifest.routes) if (generatedRouteMap.get(route.id)?.path !== route.path) gaps.push(`Generated route mismatch: ${route.id}`);
if (permissionIds.size !== generatedPermissionIds.size || [...permissionIds].some(id => !generatedPermissionIds.has(id))) gaps.push('Generated permission IDs differ from canonical catalog');
const generatedSchemaMap = generatedSchemas.components?.schemas || {};
if (Object.keys(schemas).length !== Object.keys(generatedSchemaMap).length || Object.keys(schemas).some(id => !generatedSchemaMap[id])) gaps.push('Generated component schema IDs differ from OpenAPI');

const serviceCases = openapiById.get('listServiceCases');
const serviceCaseQuery = [...(api.paths[serviceCases.path].parameters || []), ...(serviceCases.operation.parameters || [])].filter(param => param.in === 'query');
const cashflow = generatedOperations.getCashflow;
const contractLimits = [
  { finding: 'listServiceCases has no customerId query parameter in canonical OpenAPI', observedQueryParameters: serviceCaseQuery.map(param => ({ name: param.name, required: Boolean(param.required) })) },
  { finding: 'getCashflow requires from, to, and timezone; frontend must not invent a reporting period', requiredQueryParameters: cashflow.queryParameters.filter(param => param.required).map(param => param.name) },
  { finding: 'No contract or endpoint was added by this crosswalk.' },
];
assert(!serviceCaseQuery.some(param => param.name === 'customerId'), 'Canonical service-case filter changed; re-review the documented contract limit');
assert(['from', 'to', 'timezone'].every(name => cashflow.queryParameters.some(param => param.name === name && param.required)), 'Canonical getCashflow query contract changed; re-review finance integration');

const canonicalInputHashes = Object.fromEntries(Object.entries(inputPaths).map(([name, file]) => [name, sha(fs.readFileSync(file))]));
const usedOperations = [...usageCounts].map(([operationId, callSites]) => ({
  operationId, method: openapiById.get(operationId)?.method, path: openapiById.get(operationId)?.path,
  permission: openapiById.get(operationId)?.permission ?? null, callSites,
  modules: [...usedByModule].filter(([, ids]) => ids.has(operationId)).map(([name]) => name).sort(),
})).sort((a, b) => a.operationId.localeCompare(b.operationId));
const eventTypes = eventSchema.properties.type.enum;
const sourceFileCount = appFiles.length;
const literalCallCount = [...usageCounts.values()].reduce((sum, count) => sum + count, 0);
const crosswalk = {
  taskId: 'FE005', stepId: 'S01', result: gaps.length ? 'FAIL' : 'PASS', checkedAt: new Date().toISOString(),
  scope: 'Static source-to-canonical OpenAPI/route/permission/event/DTO crosswalk; no backend, staging, provider, or hosted CI execution.',
  canonicalInputHashes,
  openapi: { version: api.info.version, pathEntries: Object.keys(api.paths).length, operations: openapiOperations.length, componentSchemas: Object.keys(schemas).length, apiBasePath: api.servers?.[0]?.url },
  operationIndex: { entries: operationIndex.operations.length, exactIdMethodPathPermissionMatches: openapiOperations.length - gaps.filter(gap => gap.startsWith('operation-index mismatch:')).length },
  frontendCallSites: { sourceFiles: sourceFileCount, literalOperationCalls: literalCallCount, uniqueOperationIds: usageCounts.size, unresolved: [...usageCounts.keys()].filter(id => !openapiById.has(id)), dynamicCallsInModules: dynamicOperationCalls },
  usedOperations,
  routes: { canonical: routeManifest.routes.length, generated: generatedRoutes.routes.length, referencedOperations: routeOperationRefs.size, unresolvedOperations: [...routeOperationRefs].filter(id => !openapiById.has(id)), unresolvedPermissions: [...routePermissions].filter(id => !permissionIds.has(id)) },
  permissions: { canonical: permissionIds.size, generated: generatedPermissionIds.size, referencedByApiOrRoutes: permissionUsage.size, jsxLiteralReferences: jsxPermissions.size, unresolvedJsx: [...jsxPermissions].filter(id => !permissionIds.has(id)) },
  events: { schemaId: eventSchema.$id, eventTypes, count: eventTypes.length, requiredEnvelopeFields: eventSchema.required, scope: 'Schema inventory only; no live event stream/backend exercised.' },
  dtoEvidence,
  generatedArtifacts: { operationIds: Object.keys(generatedOperations).length, permissionIds: generatedPermissionIds.size, componentSchemas: Object.keys(generatedSchemaMap).length },
  sourceChecker: { status: sourceReportJson.status, files: sourceReportJson.files, operationCalls: sourceReportJson.operationCalls, routes: sourceReportJson.routes, issues: sourceReportJson.issues, preExistingReportRestoredByteForByte: restoredSourceReportHash === savedSourceReportHash },
  contractLimits,
  gaps,
};
assert(!gaps.length, `Contract crosswalk found ${gaps.length} gap(s): ${gaps.slice(0, 12).join('; ')}`);
assert(sourceReportJson.files === sourceFileCount && sourceReportJson.operationCalls === literalCallCount && sourceReportJson.routes === routeManifest.routes.length, 'Fresh source checker counts differ from TypeScript AST / canonical routes');
fs.writeFileSync(crosswalkPath, `${JSON.stringify(crosswalk, null, 2)}\n`, 'utf8');

const sourcePaths = [
  ...appFiles,
  ...Object.values(inputPaths),
  path.join(kit, 'execution/frontend-plan.json'), path.join(kit, 'execution/frontend-command-map.json'),
  path.join(kit, 'docs/06_API_AND_REALTIME.md'), path.join(kit, 'docs/18_CODING_STANDARDS.md'),
  path.join(fe, 'package.json'), path.join(fe, 'package-lock.json'), path.join(fe, 'apps/web/package.json'),
  path.join(fe, 'packages/contracts/src/generated.ts'), path.join(fe, 'packages/contracts/src/index.ts'),
  path.join(fe, 'packages/contracts/src/operations.json'), path.join(fe, 'packages/contracts/src/permissions.json'),
  path.join(fe, 'packages/contracts/src/routes.json'), path.join(fe, 'packages/contracts/src/schemas.json'),
  path.join(fe, 'scripts/check-source.mjs'), path.join(fe, 'scripts/source-policy.mjs'), path.join(fe, 'scripts/tools.mjs'),
  path.join(fe, 'tests/source-checker.test.mjs'), path.join(fe, 'docs/route-implementation.json'),
  path.join(fe, 'apps/web/public/manifest.webmanifest'), sourceReportCopy, sourceCommandLog, crosswalkPath, script,
].filter((file, index, all) => fs.existsSync(file) && all.indexOf(file) === index);
const sourceFiles = sourcePaths.map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const repoHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const checks = [
  'OpenAPI, operation index, and generated operation registry IDs/methods/paths/permissions agree',
  'all current Frontend literal operation call sites and route operation/permission references resolve',
  'all JSX permission literals resolve to the canonical permission catalog',
  'canonical route, generated route, permission, and schema artifacts have matching identifiers',
  'Id/Money and representative optional-versus-nullable DTO fields match canonical OpenAPI schemas',
  'event names and required envelope fields were inventoried from canonical events.schema.json',
  'known service-case and finance contract limits were confirmed without inventing an endpoint or query default',
  'registered source checker and its tests exit 0; prior source-check report restored byte-for-byte',
];
const log = [
  'FE005.S01 current canonical Frontend contract crosswalk', `executedAt=${new Date().toISOString()}`,
  `HEAD=${repoHead} plus current working-tree source`, `registeredCommand=${sourceCommand.command}`, `cwd=${fe}`,
  `sourceCommandExit=${sourceRun.status}; sourceChecker=${sourceReportJson.status}; sourceFiles=${sourceReportJson.files}; operationCalls=${sourceReportJson.operationCalls}; routes=${sourceReportJson.routes}`,
  `crosswalk=${crosswalkPath}; sha256=${sha(fs.readFileSync(crosswalkPath))}`,
  `OpenAPI=${openapiOperations.length} operations/${Object.keys(schemas).length} schemas; routes=${routeManifest.routes.length}; permissions=${permissionIds.size}; eventTypes=${eventTypes.length}`,
  `Frontend=${sourceFileCount} TS/TSX source files/${literalCallCount} API calls/${usageCounts.size} unique operationIds; unresolved=0; DTO checks=${dtoEvidence.length}/${dtoEvidence.length}`,
  `source-check evidence original/restored sha256=${savedSourceReportHash}/${restoredSourceReportHash}; byte-for-byte=${savedSourceReportHash === restoredSourceReportHash}`,
  'No canonical contracts, generated outputs, product implementation, or backend were modified/executed.',
  `checksTotal=${checks.length}; failed=0`, ...checks.map(item => `CHECK PASS: ${item}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  '\n[registered source command output]', sourceRun.stdout || '', ...(sourceRun.stderr ? ['[stderr]', sourceRun.stderr] : []),
].join('\n') + '\n';
fs.writeFileSync(finalLogPath, log, 'utf8');

const evidence = {
  taskId: 'FE005', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `${repoHead} (current working-tree source)`,
  expected: 'Đọc OpenAPI/routes/permissions/events; map operationId và DTO dùng thật, ghi gaps không tự sửa canonical.',
  observed: `${openapiOperations.length} OpenAPI operations/${routeManifest.routes.length} routes/${permissionIds.size} permissions/${eventTypes.length} event types. ${sourceFileCount} TS/TSX files/${literalCallCount} literal API calls/${usageCounts.size} unique operationIds; all checked references resolve. ${dtoEvidence.length} DTO semantics checks pass; the documented service-case and finance limitations were verified from canonical files. No canonical input edited and no backend execution claimed.`,
  commandId: sourceCommand.id, command: sourceCommand.command, cwd: fe, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} / npm local source audit`, details: `Registered test:source command exited ${sourceRun.status}; static TypeScript AST/OpenAPI crosswalk over current files; Git HEAD ${repoHead} plus working tree; frontend synthetic scope only.`, dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  logFile: path.relative(kit, finalLogPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(log)),
  commandResults: [{ commandId: sourceCommand.id, command: sourceCommand.command, exitCode: sourceRun.status, logFile: path.relative(kit, sourceCommandLog).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(sourceCommandLog)) }],
  crosswalk: { path: path.relative(kit, crosswalkPath).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(crosswalkPath)), openapiOperations: openapiOperations.length, routes: routeManifest.routes.length, permissions: permissionIds.size, eventTypes: eventTypes.length, frontendOperationCalls: literalCallCount, uniqueOperationIds: usageCounts.size, dtoChecks: dtoEvidence.length, unresolved: 0 },
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', openapiOperations: openapiOperations.length, routes: routeManifest.routes.length, permissions: permissionIds.size, eventTypes: eventTypes.length, frontendFiles: sourceFileCount, operationCalls: literalCallCount, uniqueOperationIds: usageCounts.size, dtoChecks: dtoEvidence.length, gaps: gaps.length, preservedSourceReport: savedSourceReportHash === restoredSourceReportHash, receipt: relative(receiptPath), logSha256: sha(Buffer.from(log)) }, null, 2));

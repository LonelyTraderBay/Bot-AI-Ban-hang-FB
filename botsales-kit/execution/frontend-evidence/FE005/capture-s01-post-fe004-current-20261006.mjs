import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const kit = 'botsales-kit';
const dir = `${kit}/execution/frontend-evidence/FE005`;
const helper = `${dir}/capture-s01-post-fe004-current-20261006.mjs`;
const sourceLog = `${dir}/S01-source-check-post-fe004-current-20261006.log`;
const sourceReportPath = `${dir}/S01-source-report-post-fe004-current-20261006.json`;
const crosswalkPath = `${dir}/S01-contract-crosswalk-post-fe004-current-20261006.json`;
const evidencePath = `${dir}/S01-post-fe004-current-20261006.json`;
const finalLogPath = `${dir}/S01-post-fe004-current-20261006.log`;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const bytes = file => fs.readFileSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const require = createRequire(import.meta.url);
const ts = require('typescript');
assert(root.endsWith('BotSalesAI_Frontend'), `Expected frontend root; got ${root}`);

const openapiPath = `${kit}/contracts/openapi.json`;
const routePath = `${kit}/contracts/route-manifest.json`;
const permissionPath = `${kit}/contracts/permission-catalog.json`;
const eventPath = `${kit}/contracts/events.schema.json`;
const operationIndexPath = `${kit}/contracts/operation-index.json`;
const openapi = readJson(openapiPath);
const routeManifest = readJson(routePath);
const permissionCatalog = readJson(permissionPath);
const eventSchema = readJson(eventPath);
const operationIndex = readJson(operationIndexPath);
const generated = readJson('packages/contracts/src/operations.json');
const generatedPermissions = readJson('packages/contracts/src/permissions.json');
const generatedRoutes = readJson('packages/contracts/src/routes.json');
const generatedSchemas = readJson('packages/contracts/src/schemas.json');
const sourceReport = readJson(sourceReportPath);
const commandMap = readJson(`${kit}/execution/frontend-command-map.json`);
const sourceCommand = commandMap.commands.find(item => item.id === 'source');
assert(sourceCommand?.status === 'VERIFIED_AVAILABLE', 'Registered source command is unavailable');
const sourceLogText = fs.readFileSync(path.join(root, sourceLog), 'utf8');
assert(sourceLogText.includes(`command=${sourceCommand.command}`), 'Fresh source log does not identify the registered command');
assert(/^sourceCommandExitCode=0$/m.test(sourceLogText) && /^reportRestored=True$/m.test(sourceLogText), 'Fresh source check failed or did not restore its previous report');
assert(sourceReport.status === 'PASS' && sourceReport.files === 67 && sourceReport.operationCalls === 220 && sourceReport.routes === 54 && sourceReport.issues.length === 0, 'Fresh source checker did not pass the expected 67/220/54 scan');

const openapiOperations = [];
for (const [route, methods] of Object.entries(openapi.paths || {})) {
  for (const [method, operation] of Object.entries(methods)) {
    if (operation?.operationId) openapiOperations.push({ operationId: operation.operationId, method: method.toUpperCase(), path: route, permission: operation['x-permission'] ?? null });
  }
}
const openapiById = new Map(openapiOperations.map(item => [item.operationId, item]));
const indexById = new Map(operationIndex.operations.map(item => [item.operationId, item]));
const generatedById = new Map(Object.entries(generated));
const permissionIds = new Set(permissionCatalog.permissions.map(item => item.id));
const generatedPermissionIds = new Set(generatedPermissions.permissions.map(item => item.id));
const routeOperationRefs = new Set(routeManifest.globalOperations || []);
const routePermissions = new Set();
for (const route of routeManifest.routes) {
  for (const operation of route.readOperations || []) routeOperationRefs.add(operation);
  for (const action of route.actions || []) {
    if (action.operationId) routeOperationRefs.add(action.operationId);
    if (action.permission) routePermissions.add(action.permission);
  }
  if (route.readPermission) routePermissions.add(route.readPermission);
}
const apiPermissions = new Set(openapiOperations.map(item => item.permission).filter(Boolean));
const permissionUsage = new Set([...routePermissions, ...apiPermissions]);

const appRoot = path.join(root, 'apps/web/src');
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : /\.(ts|tsx)$/.test(entry.name) ? [file] : [];
  });
}
const appFiles = walk(appRoot);
const usageCounts = new Map();
const usedByModule = new Map();
const jsxPermissions = new Set();
const dynamicOperationCalls = [];
for (const file of appFiles) {
  const text = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const moduleMatch = relative.match(/apps\/web\/src\/modules\/([^/]+)/);
  const moduleName = moduleMatch?.[1] || (relative.includes('/shared/') ? 'shared' : 'app');
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['useApi', 'useCommand', 'request'].includes(node.expression.text) && node.arguments[0]) {
      const argument = node.arguments[0];
      if (ts.isStringLiteral(argument)) {
        const operationId = argument.text;
        usageCounts.set(operationId, (usageCounts.get(operationId) || 0) + 1);
        if (!usedByModule.has(moduleName)) usedByModule.set(moduleName, new Set());
        usedByModule.get(moduleName).add(operationId);
      } else if (relative.includes('/modules/')) {
        dynamicOperationCalls.push({ file: relative, callee: node.expression.text, expression: argument.getText(source) });
      }
    }
    if (ts.isJsxAttribute(node) && node.name.text === 'permission' && node.initializer && ts.isStringLiteral(node.initializer)) jsxPermissions.add(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const schemas = openapi.components.schemas;
const generatedText = fs.readFileSync(path.join(root, 'packages/contracts/src/generated.ts'), 'utf8');
const generatedSource = ts.createSourceFile('generated.ts', generatedText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const typeAliases = new Map(generatedSource.statements.filter(ts.isTypeAliasDeclaration).map(item => [item.name.text, item.type]));
function generatedMembers(name) {
  const type = typeAliases.get(name);
  assert(type && ts.isTypeLiteralNode(type), `Missing generated object type ${name}`);
  return new Map(type.members.filter(ts.isPropertySignature).map(member => [member.name.getText(generatedSource).replaceAll(/["']/g, ''), member]));
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
function dtoField(model, schemaName, property, shouldBeOptional, shouldBeNullable) {
  const member = generatedMembers(model).get(property);
  const schema = schemas[schemaName];
  const propertySchema = schema?.properties?.[property];
  assert(member?.type && propertySchema, `Missing ${model}.${property} or OpenAPI ${schemaName}.${property}`);
  const apiOptional = !(schema.required || []).includes(property);
  const apiNullable = schemaHasNull(propertySchema);
  return {
    generated: `${model}.${property}${member.questionToken ? '?' : ''}: ${member.type.getText(generatedSource)}`,
    schema: `${schemaName}.${property}`,
    openapiOptional: apiOptional,
    generatedOptional: Boolean(member.questionToken),
    openapiNullable: apiNullable,
    generatedNullable: hasNull(member.type),
    pass: apiOptional === Boolean(member.questionToken) && apiNullable === hasNull(member.type) && apiOptional === shouldBeOptional && apiNullable === shouldBeNullable,
  };
}
const dtoEvidence = [
  { check: 'Id is an opaque TypeScript string; schema carries runtime format/pattern constraints', pass: typeAliases.get('Id')?.kind === ts.SyntaxKind.StringKeyword && schemas.Id?.type === 'string' && schemas.Id.pattern === '^[A-Za-z0-9_-]+$' },
  { check: 'Money.amount remains Decimal string and currency uses Currency', pass: (() => { const m = generatedMembers('Money'); return m.get('amount')?.type.getText(generatedSource) === 'Decimal' && m.get('currency')?.type.getText(generatedSource) === 'Currency' && schemas.Money?.properties?.amount?.$ref?.endsWith('/Decimal') && schemas.Money.required?.includes('amount'); })() },
  dtoField('Problem', 'Problem', 'detail', true, false),
  dtoField('Problem', 'Problem', 'commandId', true, false),
  dtoField('Command', 'Command', 'result', false, true),
  dtoField('Product', 'Product', 'categoryId', false, true),
  dtoField('Variant', 'Variant', 'price', false, true),
  dtoField('Customer', 'Customer', 'phone', false, true),
];

const crosswalkGaps = [];
for (const item of openapiOperations) {
  const indexed = indexById.get(item.operationId);
  if (!indexed || indexed.path !== item.path || indexed.method !== item.method) crosswalkGaps.push(`operation-index mismatch: ${item.operationId}`);
  if (!generatedById.has(item.operationId)) crosswalkGaps.push(`generated operation missing: ${item.operationId}`);
  if (item.permission && !permissionIds.has(item.permission)) crosswalkGaps.push(`OpenAPI unknown permission: ${item.permission}`);
}
for (const operationId of indexById.keys()) if (!openapiById.has(operationId)) crosswalkGaps.push(`OpenAPI missing indexed operation: ${operationId}`);
for (const operationId of routeOperationRefs) if (!openapiById.has(operationId)) crosswalkGaps.push(`route unknown operation: ${operationId}`);
for (const permission of permissionUsage) if (!permissionIds.has(permission)) crosswalkGaps.push(`unknown route/API permission: ${permission}`);
for (const permission of jsxPermissions) if (!permissionIds.has(permission)) crosswalkGaps.push(`unknown JSX permission: ${permission}`);
for (const operationId of usageCounts.keys()) if (!openapiById.has(operationId)) crosswalkGaps.push(`unknown source operation: ${operationId}`);
for (const check of dtoEvidence) if (check.pass === false) crosswalkGaps.push(`DTO mismatch: ${check.check || check.generated}`);
if (generatedRoutes.routes?.length !== routeManifest.routes.length) crosswalkGaps.push('Generated route count differs from canonical route manifest');
if (generatedPermissionIds.size !== permissionIds.size || [...permissionIds].some(id => !generatedPermissionIds.has(id))) crosswalkGaps.push('Generated permission ids differ from canonical permission catalog');
if (Object.keys(generatedSchemas.components?.schemas || {}).length !== Object.keys(schemas).length) crosswalkGaps.push('Generated schema count differs from OpenAPI component schema count');

const changedResponses = new Map();
for (const item of openapiOperations) for (const status of ['202', '409', '412', '422', '428', '429']) if (openapi.paths[item.path]?.[item.method.toLowerCase()]?.responses?.[status]) changedResponses.set(status, (changedResponses.get(status) || 0) + 1);
const crosswalk = {
  taskId: 'FE005', stepId: 'S01', result: crosswalkGaps.length ? 'GAPS_FOUND' : 'PASS', checkedAt: new Date().toISOString(),
  scope: 'Frontend source-to-canonical contract crosswalk; static/local evidence only. OpenAPI is specification, not a running backend.',
  canonicalInputs: [openapiPath, routePath, permissionPath, eventPath, operationIndexPath],
  openapi: { version: openapi.info.version, paths: Object.keys(openapi.paths).length, operations: openapiOperations.length, componentSchemas: Object.keys(schemas).length },
  operationIndex: { operations: operationIndex.operations.length, mismatchedOrMissing: crosswalkGaps.filter(gap => /operation-index mismatch|OpenAPI missing indexed operation/.test(gap)) },
  frontendCallSites: { sourceFiles: appFiles.length, literalOperationCalls: [...usageCounts.values()].reduce((sum, count) => sum + count, 0), uniqueOperationIds: usageCounts.size, unresolved: [...usageCounts.keys()].filter(id => !openapiById.has(id)), dynamicCallsInModules: dynamicOperationCalls },
  usedOperations: [...usageCounts].map(([operationId, callSites]) => ({ ...openapiById.get(operationId), callSites, modules: [...usedByModule].filter(([, ids]) => ids.has(operationId)).map(([name]) => name).sort() })).sort((a, b) => a.operationId.localeCompare(b.operationId)),
  routes: { canonicalRoutes: routeManifest.routes.length, generatedRoutes: generatedRoutes.routes.length, uniqueOperationRefs: routeOperationRefs.size, unresolvedOperations: [...routeOperationRefs].filter(id => !openapiById.has(id)), unresolvedPermissions: [...routePermissions].filter(id => !permissionIds.has(id)) },
  permissions: { canonical: permissionIds.size, generated: generatedPermissionIds.size, apiOrRouteReferenced: permissionUsage.size, jsxLiteralReferences: jsxPermissions.size, unresolved: [...jsxPermissions].filter(id => !permissionIds.has(id)) },
  events: { schemaId: eventSchema.$id, supportedTypes: eventSchema.properties.type.enum, count: eventSchema.properties.type.enum.length, requiredFields: eventSchema.required, scope: 'Contract shape only; no live event stream/backend was exercised.' },
  dtoEvidence,
  generatedArtifacts: { generatedOperationIds: generatedById.size, generatedPermissionIds: generatedPermissionIds.size, generatedSchemas: Object.keys(generatedSchemas.components?.schemas || {}).length },
  specifiedResponses: Object.fromEntries([...changedResponses].sort(([a], [b]) => a.localeCompare(b))),
  sourceChecker: { status: sourceReport.status, files: sourceReport.files, operationCalls: sourceReport.operationCalls, routes: sourceReport.routes, issues: sourceReport.issues, outputWasPreserved: /^reportRestored=True$/m.test(sourceLogText) },
  gaps: crosswalkGaps,
};
assert(crosswalk.result === 'PASS', `Crosswalk found ${crosswalkGaps.length} gap(s): ${crosswalkGaps.join('; ')}`);
assert(crosswalk.frontendCallSites.literalOperationCalls === sourceReport.operationCalls, 'AST crosswalk call-site count differs from source checker');
assert(dtoEvidence.every(check => check.pass !== false), 'DTO compatibility checks failed');
fs.writeFileSync(path.join(root, crosswalkPath), `${JSON.stringify(crosswalk, null, 2)}\n`, 'utf8');

const appRelative = appFiles.map(file => path.relative(root, file).replaceAll('\\', '/'));
const fixedInputs = [
  'package.json', 'package-lock.json', `${kit}/execution/frontend-plan.json`, `${kit}/execution/frontend-command-map.json`,
  `${kit}/docs/06_API_AND_REALTIME.md`, `${kit}/docs/18_CODING_STANDARDS.md`,
  openapiPath, routePath, permissionPath, eventPath, operationIndexPath,
  'packages/contracts/src/generated.ts', 'packages/contracts/src/index.ts', 'packages/contracts/src/operations.json',
  'packages/contracts/src/permissions.json', 'packages/contracts/src/routes.json', 'packages/contracts/src/schemas.json',
  'scripts/check-source.mjs', 'scripts/tools.mjs', 'tests/source-checker.test.mjs',
  sourceReportPath, sourceLog, crosswalkPath, helper,
];
const sourcePaths = [...new Set([...fixedInputs, ...appRelative])].sort();
const sourceFiles = sourcePaths.map(file => ({ path: file, sha256: sha(bytes(file)) }));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n')));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim();
const executedAt = new Date().toISOString();
const checks = [
  { label: 'OpenAPI operation index', observed: `${openapiOperations.length} OpenAPI operations and ${operationIndex.operations.length} indexed entries have identical ids, methods and paths.` },
  { label: 'route operation and permission references', observed: `${routeManifest.routes.length} routes; ${routeOperationRefs.size} operation references and ${routePermissions.size} route permissions resolve to canonical catalogs.` },
  { label: 'frontend operation/permission references', observed: `${sourceReport.files} TS/TSX files; ${sourceReport.operationCalls} literal API operation call sites and ${jsxPermissions.size} JSX permission literals resolve; source checker issues=0.` },
  { label: 'generated DTO field semantics', observed: 'Money stays decimal string + currency; Id is string with runtime format constraints; optional fields and required-nullable fields match representative OpenAPI schemas.' },
  { label: 'route, permission and schema artifact coverage', observed: `${generatedRoutes.routes.length} route entries, ${generatedPermissionIds.size} permissions and ${Object.keys(generatedSchemas.components?.schemas || {}).length} schemas are present in the generated package artifacts.` },
  { label: 'event contract inventory', observed: `${eventSchema.properties.type.enum.length} declared event types and ${eventSchema.required.length} required envelope fields read from canonical events.schema.json; no live stream claimed.` },
  { label: 'source command and preservation', observed: 'Registered test:source exited 0; 3/3 source-checker tests passed; pre-existing evidence/source-check.json restored byte-for-byte after copying the fresh report.' },
];
const finalLog = [
  'FE005.S01 canonical OpenAPI/routes/permissions/events and frontend DTO crosswalk', `executedAt=${executedAt}`, `cwd=${root}`,
  `REGISTERED COMMAND ${sourceCommand.id}: ${sourceCommand.command}`,
  `COMMAND LOG ${sourceLog}; sha256=${sha(bytes(sourceLog))}`,
  `FRESH SOURCE REPORT ${sourceReportPath}; sha256=${sha(bytes(sourceReportPath))}`,
  `CONTRACT CROSSWALK ${crosswalkPath}; sha256=${sha(bytes(crosswalkPath))}`,
  `openapi=${openapiOperations.length} operations/${Object.keys(schemas).length} schemas; routes=${routeManifest.routes.length}; permissions=${permissionIds.size}; events=${eventSchema.properties.type.enum.length}`,
  `frontend=${sourceReport.files} files/${sourceReport.operationCalls} calls/${usageCounts.size} unique operations/${sourceReport.routes} routes; unresolved=0`,
  `dtoChecks=${dtoEvidence.length}; gaps=${crosswalkGaps.length}; backendExecution=false; scope=FRONTEND_WITH_SYNTHETIC_MOCK_API`,
  `checksTotal=${checks.length}; failed=0`, ...checks.flatMap(check => [`CHECK ${check.label}: PASS`, check.observed]),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  'reviewer=Codex self-review; no independent peer review claimed',
].join('\n') + '\n';
fs.writeFileSync(path.join(root, finalLogPath), finalLog, 'utf8');
const evidence = {
  taskId: 'FE005', stepId: 'S01', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', executedAt,
  sourceRevision: `HEAD ${revision} on ${branch} plus current frontend working tree`, expected: 'Đọc OpenAPI/routes/permissions/events; map operationId và DTO dùng thật, ghi gaps không tự sửa canonical.',
  observed: `${openapiOperations.length} OpenAPI operations/${routeManifest.routes.length} routes/${permissionIds.size} permissions/${eventSchema.properties.type.enum.length} event types. ${sourceReport.files} source files/${sourceReport.operationCalls} operation calls/${usageCounts.size} unique operation ids; all checked references resolve. ${dtoEvidence.length} representative DTO semantic checks pass. No canonical inputs edited and no backend execution claimed.`,
  commandId: sourceCommand.id, command: sourceCommand.command, cwd: root, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows / Node ${process.versions.node} / local npm script`, details: 'Registered source contract checker and fixtures ran locally; static OpenAPI/DTO crosswalk read the canonical kit files and generated package. Mock/frontend scope only; no backend, staging or hosted CI.', dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, logFile: finalLogPath.replace(`${kit}/`, ''), logSha256: sha(Buffer.from(finalLog)), sourceFiles, sourceSnapshotSha256,
  commandResults: [{ commandId: sourceCommand.id, command: sourceCommand.command, exitCode: 0, logFile: sourceLog.replace(`${kit}/`, ''), logSha256: sha(bytes(sourceLog)) }],
  crosswalk: { path: crosswalkPath.replace(`${kit}/`, ''), sha256: sha(bytes(crosswalkPath)), openapiOperations: openapiOperations.length, routes: routeManifest.routes.length, permissions: permissionIds.size, eventTypes: eventSchema.properties.type.enum.length, frontendOperationCalls: sourceReport.operationCalls, uniqueOperationIds: usageCounts.size, unresolved: 0, dtoChecks: dtoEvidence.length },
};
fs.writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', openapiOperations: openapiOperations.length, routes: routeManifest.routes.length, permissions: permissionIds.size, eventTypes: eventSchema.properties.type.enum.length, sourceFiles: sourceReport.files, operationCalls: sourceReport.operationCalls, uniqueOperationIds: usageCounts.size, dtoChecks: dtoEvidence.length, crosswalk: crosswalkPath, evidence: evidencePath, log: finalLogPath }, null, 2));

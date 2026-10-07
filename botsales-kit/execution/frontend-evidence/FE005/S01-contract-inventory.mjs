import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const read = relative => JSON.parse(fs.readFileSync(path.join(repo, relative), 'utf8'));
const api = read('botsales-kit/contracts/openapi.json');
const routes = read('botsales-kit/contracts/route-manifest.json');
const permissions = read('botsales-kit/contracts/permission-catalog.json');
const events = read('botsales-kit/contracts/events.schema.json');
const generatedOperations = read('packages/contracts/src/operations.json');
const sourceCheck = read('evidence/source-check.json');
const wanted = ['listProducts', 'createProduct', 'updateProduct', 'listCategories', 'getCategory', 'uploadFile', 'createProductImport', 'getJob', 'commitProductImport', 'listServiceCases', 'getCashflow', 'getProfitLoss'];
const all = Object.entries(api.paths ?? {}).flatMap(([route, item]) => Object.entries(item).map(([method, operation]) => ({ route, method: method.toUpperCase(), operation })).filter(entry => entry.operation?.operationId));
const operationMap = new Map(all.map(entry => [entry.operation.operationId, entry]));
const summary = operation => {
  const entry = operationMap.get(operation);
  if (!entry) return { operationId: operation, found: false };
  const parameters = [...(api.paths[entry.route].parameters ?? []), ...(entry.operation.parameters ?? [])].map(parameter => ({ name: parameter.name, in: parameter.in, required: Boolean(parameter.required), schema: parameter.schema?.type ?? parameter.schema?.$ref ?? 'unspecified' }));
  const media = content => Object.fromEntries(Object.entries(content ?? {}).map(([type, definition]) => [type, definition.schema?.$ref ?? definition.schema?.type ?? 'unspecified']));
  return {
    operationId: operation,
    method: entry.method,
    path: entry.route,
    parameters,
    requestBody: media(entry.operation.requestBody?.content),
    responses: Object.fromEntries(Object.entries(entry.operation.responses ?? {}).map(([status, response]) => [status, media(response.content)])),
    generatedQueryParameters: generatedOperations[operation]?.queryParameters ?? [],
  };
};
const errors = [];
if (sourceCheck.status !== 'PASS' || sourceCheck.files !== 53 || sourceCheck.operationCalls !== 207 || sourceCheck.routes !== 54 || sourceCheck.issues.length) errors.push('Current source checker is not the expected clean 53/207/54 result');
if (all.length !== 210) errors.push(`Canonical OpenAPI operation count ${all.length} is unexpected`);
if (Object.keys(generatedOperations).length !== 210) errors.push('Generated operation registry is not 210 entries');
for (const operation of wanted) if (!operationMap.has(operation)) errors.push(`Selected operation is missing from canonical OpenAPI: ${operation}`);
if (generatedOperations.listServiceCases?.queryParameters?.some(parameter => parameter.name === 'customerId')) errors.push('Generated contract unexpectedly added service-case customerId filtering');
if (!generatedOperations.getCashflow?.queryParameters?.some(parameter => parameter.name === 'from' && parameter.required)) errors.push('Cashflow required query contract changed; re-review finance integration');
const report = {
  scope: 'Current frontend operation references and canonical frontend contracts; no API/provider execution',
  apiVersion: api.info?.version,
  apiBasePath: api.servers?.[0]?.url,
  canonicalOperations: all.length,
  generatedOperations: Object.keys(generatedOperations).length,
  sourceCheck: { files: sourceCheck.files, operationCalls: sourceCheck.operationCalls, routes: sourceCheck.routes, issues: sourceCheck.issues.length, status: sourceCheck.status },
  routeManifestShape: { rootKeys: Object.keys(routes), itemCount: Array.isArray(routes) ? routes.length : undefined },
  permissionCatalogShape: { rootKeys: Object.keys(permissions) },
  eventSchemaShape: { rootKeys: Object.keys(events), definitionCount: Object.keys(events.$defs ?? events.definitions ?? {}).length },
  selectedOperations: Object.fromEntries(wanted.map(operation => [operation, summary(operation)])),
  verifiedContractLimits: [
    'listServiceCases does not define customerId query filtering; detail UI may only filter the bounded response and must label the result incomplete.',
    'getCashflow requires from, to and timezone; finance UI must supply them in its own task and FE005 must not invent a default reporting period.',
    'No missing endpoint is added by this inventory.',
  ],
  status: errors.length ? 'FAIL' : 'PASS',
  issues: errors,
};
const output = path.join(repo, 'botsales-kit/execution/frontend-evidence/FE005/S01-operation-map-current-refresh.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: path.relative(repo, output), status: report.status, apiVersion: report.apiVersion, canonicalOperations: all.length, generatedOperations: Object.keys(generatedOperations).length, sourceCheck: report.sourceCheck, selectedOperations: wanted.map(operation => [operation, Boolean(operationMap.has(operation))]), issues: errors }, null, 2));
if (errors.length) process.exitCode = 1;

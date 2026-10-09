import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../BotSalesAI_Frontend');
const read = relative => {
  const kitRelative = relative.startsWith('botsales-kit/');
  const base = kitRelative ? path.resolve(repo, '..', 'botsales-kit') : repo;
  const file = kitRelative ? relative.slice('botsales-kit/'.length) : relative;
  return JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'));
};
const api = read('botsales-kit/contracts/openapi.json');
const routes = read('botsales-kit/contracts/route-manifest.json');
const generated = read('packages/contracts/src/operations.json');
const source = read('evidence/source-check.json');
const expectedRoutes = {
  R09: { path: '/s/:shopId/products', permission: 'catalog.read' },
  R10: { path: '/s/:shopId/products/new', permission: 'catalog.write' },
  R11: { path: '/s/:shopId/products/:productId', permission: 'catalog.read' },
  R12: { path: '/s/:shopId/categories', permission: 'catalog.read' },
  R13: { path: '/s/:shopId/imports', permission: 'catalog.import' },
  R14: { path: '/s/:shopId/imports/:jobId', permission: 'catalog.import' },
};
const expectedPermissions = {
  listProducts: 'catalog.read', createProduct: 'catalog.write', updateProduct: 'catalog.write', archiveProduct: 'catalog.write',
  listCategories: 'catalog.read', getCategory: 'catalog.read', createCategory: 'catalog.write', updateCategory: 'catalog.write', archiveCategory: 'catalog.write',
  uploadFile: null, getFile: null, createProductImport: 'catalog.import', commitProductImport: 'catalog.import',
  getProduct: 'catalog.read', listJobs: 'jobs.read', getJob: 'jobs.read',
};
const paths = new Map();
for (const [route, methods] of Object.entries(api.paths ?? {})) for (const [method, operation] of Object.entries(methods)) paths.set(operation.operationId, { route, method, operation });
const failures = [];
const checks = [];
const check = (name, pass, details) => { checks.push({ name, status: pass ? 'PASS' : 'FAIL', details }); if (!pass) failures.push(name); };
const routeMap = Object.fromEntries((routes.routes ?? []).filter(route => Object.hasOwn(expectedRoutes, route.id)).map(route => [route.id, route]));
check('six canonical route IDs and paths', Object.entries(expectedRoutes).every(([id, expected]) => routeMap[id]?.path === expected.path && routeMap[id]?.readPermission === expected.permission), Object.keys(expectedRoutes));
const operationIds = Object.keys(expectedPermissions);
check('sixteen canonical and generated operation IDs', operationIds.every(id => paths.has(id) && Object.hasOwn(generated, id)), operationIds);
check('operation permissions match canonical contract', operationIds.every(id => (paths.get(id)?.operation['x-permission'] ?? null) === expectedPermissions[id]), expectedPermissions);
const parameterRefs = id => paths.get(id)?.operation.parameters?.map(item => item.$ref).filter(Boolean) ?? [];
check('versioned updates require canonical If-Match', ['updateProduct','updateCategory'].every(id => parameterRefs(id).includes('#/components/parameters/IfMatch')), ['updateProduct','updateCategory']);
const schemas = api.components.schemas;
check('product payload requires variants and image IDs', ['variants','imageFileIds'].every(field => schemas.ProductWrite.required?.includes(field)), schemas.ProductWrite.required);
check('variant payload has positive price and no cost field', schemas.VariantWrite.properties.price?.$ref === '#/components/schemas/PositiveMoney' && !Object.hasOwn(schemas.VariantWrite.properties, 'cost'), Object.keys(schemas.VariantWrite.properties));
check('import payloads require dry-run token confirmation', ['fileId','mapping','duplicateStrategy','dryRun'].every(field => schemas.ImportRequest.required?.includes(field)) && ['validationToken','confirmValidRowsOnly'].every(field => schemas.ImportCommit.required?.includes(field)), { request: schemas.ImportRequest.required, commit: schemas.ImportCommit.required });
const canonicalRouteCount = routes.routes?.length ?? 0;
check('current React route/operation checker is clean', source.status === 'PASS' && source.files > 0 && source.operationCalls >= operationIds.length && source.routes === canonicalRouteCount && source.issues.length === 0, { files: source.files, operationCalls: source.operationCalls, routes: source.routes, canonicalRoutes: canonicalRouteCount, status: source.status });
const report = { scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', apiVersion: api.info.version, routeManifestVersion: routes.version, status: failures.length ? 'FAIL' : 'PASS', routes: Object.keys(expectedRoutes).length, operations: operationIds.length, checks, issues: failures };
const output = path.join(path.dirname(fileURLToPath(import.meta.url)), 'S01-contract-map.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

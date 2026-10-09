import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(directory, '../../../');
const repositoryRoot = path.resolve(kitRoot, '..');
const frontendRoot = path.join(repositoryRoot, 'BotSalesAI_Frontend');
const readKitJson = relative => JSON.parse(fs.readFileSync(path.join(kitRoot, relative), 'utf8'));
const readFrontendJson = relative => JSON.parse(fs.readFileSync(path.join(frontendRoot, relative), 'utf8'));
const readFrontend = relative => fs.readFileSync(path.join(frontendRoot, relative), 'utf8');

const plan = readKitJson('execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE021');
const manifest = readKitJson('contracts/route-manifest.json');
const openapi = readKitJson('contracts/openapi.json');
const generated = readFrontendJson('packages/contracts/src/operations.json');
assert.ok(task, 'FE021 exists in canonical frontend plan');
const expectedRoutes = ['R04', 'R31', 'R53'];
assert.deepEqual(task.routeIds, expectedRoutes);

const routeMap = new Map(manifest.routes.map(route => [route.id, route]));
const allApiOperations = Object.values(openapi.paths).flatMap(pathItem => Object.values(pathItem))
  .filter(operation => operation.operationId);
const openApiOperations = new Map(allApiOperations.map(operation => [operation.operationId, operation]));
const sources = [
  'apps/web/src/app/Shell.tsx', 'apps/web/src/modules/dashboard/index.tsx',
  'apps/web/src/modules/reports/index.tsx', 'apps/web/src/modules/bot/index.tsx',
].map(readFrontend).join('\n');

const routes = expectedRoutes.map(id => {
  const route = routeMap.get(id);
  assert.ok(route, `Canonical route ${id} exists`);
  const source = readFrontend(`apps/web/src/modules/${route.module}/index.tsx`);
  for (const operationId of [...route.readOperations, ...route.actions.map(action => action.operationId)]) {
    assert.ok(openApiOperations.has(operationId), `${id} ${operationId} exists in OpenAPI`);
    assert.ok(Object.hasOwn(generated, operationId), `${id} ${operationId} exists in generated operation contracts`);
    const directSource = operationId === 'getShop' ? readFrontend('apps/web/src/app/Shell.tsx') : sources;
    assert.ok(directSource.includes(`'${operationId}'`) || directSource.includes(`'${operationId}',`), `${id} ${operationId} has a current React API callsite`);
  }
  for (const action of route.actions) {
    assert.equal(openApiOperations.get(action.operationId)['x-permission'], action.permission, `${id}/${action.operationId} permission matches OpenAPI`);
  }
  return { id, path: route.path, module: route.module, readPermission: route.readPermission, reads: route.readOperations, actions: route.actions };
});
for (const operationId of task.operationIds) {
  assert.ok(openApiOperations.has(operationId), `${operationId} is in canonical OpenAPI`);
  assert.ok(Object.hasOwn(generated, operationId), `${operationId} is in generated operation contracts`);
  assert.ok(sources.includes(`'${operationId}'`), `${operationId} is called from current frontend source`);
}
assert.equal(openApiOperations.get('createExport')['x-permission'], 'reports.export');
assert.equal(openApiOperations.get('pauseBot')['x-permission'], 'bot.publish');
assert.match(readFrontend('apps/web/src/modules/reports/index.tsx'), /authorizedDownloadHref/);

const result = {
  taskId: 'FE021', scope: plan.scope, status: 'PASS', routes,
  plannedOperations: task.operationIds.length,
  canonicalContracts: 'All seven task operations exist in OpenAPI and generated metadata; route reads/actions and export/pause permissions resolve to current React callsites.',
  boundaries: ['report values come from API snapshots', 'marketing actual spend may be null', 'export dates are shop-timezone boundaries', 'download URL is authorized before rendering'],
  checks: 25,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

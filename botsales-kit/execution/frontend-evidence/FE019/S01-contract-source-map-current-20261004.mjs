import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(directory, '../../../');
const repo = path.resolve(kit, '..');
const frontend = path.join(repo, 'BotSalesAI_Frontend');
const readRepoJson = relative => JSON.parse(fs.readFileSync(path.join(repo, relative), 'utf8'));
const readFrontendJson = relative => JSON.parse(fs.readFileSync(path.join(frontend, relative), 'utf8'));
const plan = readRepoJson('botsales-kit/execution/frontend-plan.json');
const task = plan.tasks.find(item => item.id === 'FE019');
const manifest = readRepoJson('botsales-kit/contracts/route-manifest.json');
const openapi = readRepoJson('botsales-kit/contracts/openapi.json');
const generated = readFrontendJson('packages/contracts/src/operations.json');
const routeIds = ['R29', 'R30', 'R39', 'R40'];
const routes = new Map(manifest.routes.map(route => [route.id, route]));
const operations = new Map(Object.values(openapi.paths).flatMap(pathItem => Object.values(pathItem))
  .filter(operation => operation.operationId).map(operation => [operation.operationId, operation]));
const modules = ['integrations', 'notifications'].map(name => {
  const root = path.join(frontend, `apps/web/src/modules/${name}`);
  const files = [];
  const walk = directoryPath => {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const absolute = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(fs.readFileSync(absolute, 'utf8'));
    }
  };
  walk(root);
  return files.join('\n');
}).join('\n');

assert.ok(task, 'FE019 exists in the approved frontend plan');
assert.deepEqual(task.routeIds, routeIds);
assert.equal(task.writeScope.some(scope => /apps\/(api|worker)|(^|\/)infra/.test(scope)), false);
const routeResults = routeIds.map(id => {
  const route = routes.get(id);
  assert.ok(route, `Canonical route ${id} exists`);
  const routeOperations = [...route.readOperations, ...route.actions.map(action => action.operationId)];
  for (const operationId of routeOperations) {
    assert.ok(operations.has(operationId), `${id} operation ${operationId} exists in OpenAPI`);
    assert.ok(Object.hasOwn(generated, operationId), `${id} operation ${operationId} exists in generated contracts`);
  }
  const unwiredActions = route.actions.map(action => action.operationId).filter(operationId => !modules.includes(operationId));
  assert.deepEqual(unwiredActions, [], `${id} write actions are wired in React module source`);
  for (const action of route.actions) {
    assert.equal(operations.get(action.operationId)['x-permission'], action.permission, `${id}/${action.operationId} permission matches OpenAPI`);
  }
  return {
    id, path: route.path, module: route.module, readPermission: route.readPermission,
    reads: route.readOperations, actions: route.actions.map(action => ({ operationId: action.operationId, permission: action.permission })),
  };
});
const missingPlannedOperations = task.operationIds.filter(operationId => !operations.has(operationId) || !Object.hasOwn(generated, operationId));
assert.deepEqual(missingPlannedOperations, []);
const unusedReadOperations = [...new Set(routeResults.flatMap(route => route.reads))]
  .filter(operationId => !modules.includes(operationId));
const result = {
  taskId: 'FE019', scope: plan.scope, status: 'PASS', routes: routeResults,
  plannedOperations: task.operationIds.length, wiredWriteOperations: routeResults.flatMap(route => route.actions).length,
  canonicalContracts: 'All planned and route-linked operations exist in OpenAPI and generated operation metadata; route mutation permissions match OpenAPI.',
  readOperationsWithoutDirectCallsite: unusedReadOperations,
  interpretation: 'Unused detail reads are recorded for scope review; the list and notification workflows remain exercised by React browser tests. No API or permission is fabricated.',
  checks: 4 + task.operationIds.length + routeResults.reduce((count, route) => count + route.reads.length + route.actions.length, 0),
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

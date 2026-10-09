import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(path, 'utf8');
const routeManifest = JSON.parse(read('../botsales-kit/contracts/route-manifest.json'));
const openapi = JSON.parse(read('../botsales-kit/contracts/openapi.json'));
const operations = JSON.parse(read('packages/contracts/src/operations.json'));
const moduleSource = read('apps/web/src/modules/operations/index.tsx');
const mockSource = read('apps/web/src/mocks/fulfillment.ts');
const serviceSource = read('apps/web/src/mocks/service.ts');

test('FE020 source stays mapped to canonical operations, permissions, and safe missing-schedule boundary', () => {
    const routes = new Map(routeManifest.routes.map(route => [route.id, route]));
    assert.deepEqual(routes.get('R37')?.readOperations, ['getOperationsSummary', 'listWorkItems']);
    assert.equal(routes.get('R37')?.actions.find(action => action.operationId === 'updateWorkItem')?.permission, 'operations.manage');
    assert.deepEqual(routes.get('R38')?.readOperations, ['listApprovals', 'getApproval']);
    assert.equal(routes.get('R38')?.actions.find(action => action.operationId === 'decideApproval')?.permission, 'approvals.decide');
    assert.deepEqual(routes.get('R52')?.readOperations, ['listDigests', 'getOperationsSummary']);
    assert.equal(routes.get('R52')?.actions.find(action => action.operationId === 'controlAutomation')?.permission, 'bot.pause');

    for (const routeId of ['R37', 'R38', 'R52']) {
        for (const action of routes.get(routeId)?.actions || []) {
            assert.equal(operations[action.operationId]?.permission, action.permission, `${routeId} ${action.operationId} permission matches generated contract`);
            const openApiOperation = Object.values(openapi.paths).flatMap(path => Object.values(path)).find(operation => operation.operationId === action.operationId);
            assert.equal(openApiOperation?.['x-permission'], action.permission, `${routeId} ${action.operationId} permission matches canonical OpenAPI`);
        }
    }

    for (const id of ['claimWorkItem', 'controlAutomation', 'decideApproval', 'getApproval', 'getOperationsSummary', 'listApprovals', 'listDigests', 'listWorkItems', 'updateWorkItem']) {
        assert.ok(operations[id], `${id} is present in generated operation metadata`);
        const openApiOperation = Object.values(openapi.paths).flatMap(path => Object.values(path)).find(operation => operation.operationId === id);
        assert.ok(openApiOperation, `${id} is present in canonical OpenAPI`);
    }
    assert.match(moduleSource, /useApi\('getApproval'/);
    assert.match(moduleSource, /expectedVersion: approval\.version/);
    assert.match(moduleSource, /intentHash: approval\.intentHash/);
    assert.match(moduleSource, /approval\.policyVersion/);
    assert.match(moduleSource, /approval\.resourceVersion/);
    assert.match(moduleSource, /approval\.requestedBy/);
    assert.match(moduleSource, /task\.allowedActions\.filter/);
    assert.match(moduleSource, /QueryState query=\{list\}/);
    assert.match(moduleSource, /QueryState query=\{health\}/);
    assert.match(moduleSource, /useCommand\('controlAutomation'/);
    assert.match(moduleSource, /Chưa có API tạo\/sửa lịch bản tin/);
    assert.equal(Object.entries(openapi.paths).some(([path, methods]) => path.includes('/digests') && Object.values(methods).some(operation => operation.operationId?.startsWith('create') || operation.operationId?.startsWith('update'))), false);
});

test('FE020 mock enforces work-item capabilities and keeps integration readiness unknown', () => {
    assert.match(mockSource, /strings\(task\.allowedActions\)/);
    assert.match(mockSource, /allowedActions\.includes\(action\)/);
    assert.match(mockSource, /notification\.allowedActions\).*includes\('acknowledge'\)/);
    assert.match(mockSource, /strings\(task\.allowedActions\)\.includes\('claim'\)/);
    assert.match(mockSource, /CAPABILITY_UNAVAILABLE/);
    assert.match(mockSource, /task\.kind === 'prepare_order' \? \['block'\] : \['complete', 'block'\]/);
    assert.match(serviceSource, /status: 'unknown', checkedAt: null/);
    assert.match(serviceSource, /Chưa có backend và kiểm tra tích hợp thật/);
});

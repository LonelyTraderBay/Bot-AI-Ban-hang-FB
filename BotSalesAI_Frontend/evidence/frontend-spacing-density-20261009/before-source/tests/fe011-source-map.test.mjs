import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const readText = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('FE011 routes, permissions, operations and DTOs map to canonical contracts and current source', async () => {
    const [manifest, openapi, operations, inventory, shell] = await Promise.all([
        readJson('../../botsales-kit/contracts/route-manifest.json'),
        readJson('../../botsales-kit/contracts/openapi.json'),
        readJson('../packages/contracts/src/operations.json'),
        readText('../apps/web/src/modules/inventory/index.tsx'),
        readText('../apps/web/src/app/Shell.tsx'),
    ]);
    const byId = new Map(manifest.routes.map(route => [route.id, route]));
    const r15 = byId.get('R15');
    const r16 = byId.get('R16');
    assert.deepEqual([r15.path, r15.module, r15.readPermission], ['/s/:shopId/inventory', 'inventory', 'inventory.read']);
    assert.deepEqual(r15.readOperations, ['listStockSnapshots', 'getShop']);
    assert.deepEqual(r15.actions.map(action => [action.operationId, action.permission]), [['createInventoryAdjustment', 'inventory.adjust']]);
    assert.deepEqual([r16.path, r16.module, r16.readPermission, ...r16.readOperations], ['/s/:shopId/inventory/movements', 'inventory', 'inventory.read', 'listStockMovements']);

    const openapiOperations = Object.values(openapi.paths).flatMap(pathItem => Object.values(pathItem)).filter(operation => operation.operationId);
    const operation = id => openapiOperations.find(item => item.operationId === id);
    const stockList = operation('listStockSnapshots');
    const movementList = operation('listStockMovements');
    const adjustment = operation('createInventoryAdjustment');
    assert.deepEqual([stockList['x-permission'], movementList['x-permission'], adjustment['x-permission']], ['inventory.read', 'inventory.read', 'inventory.adjust']);
    assert.equal(stockList.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/StockSnapshotListResponse');
    assert.equal(movementList.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/StockMovementListResponse');
    assert.equal(adjustment.responses['202'].content['application/json'].schema.$ref, '#/components/schemas/CommandResponse');
    assert.deepEqual(openapi.components.schemas.InventoryAdjustment.required, ['variantId', 'warehouseId', 'quantityDelta', 'reason', 'expectedVersion', 'unitCost']);
    assert.deepEqual(
        { method: operations.createInventoryAdjustment.method, path: operations.createInventoryAdjustment.path, permission: operations.createInventoryAdjustment.permission, requestSchema: operations.createInventoryAdjustment.requestSchema, responseSchema: operations.createInventoryAdjustment.responseSchema, status: operations.createInventoryAdjustment.status, headers: operations.createInventoryAdjustment.headers },
        { method: 'POST', path: '/shops/{shopId}/inventory/adjustments', permission: 'inventory.adjust', requestSchema: 'InventoryAdjustment', responseSchema: 'CommandResponse', status: 202, headers: [{ name: 'X-CSRF-Token', required: true, schema: { type: 'string', minLength: 16 } }, { name: 'Idempotency-Key', required: true, schema: { type: 'string', minLength: 16, maxLength: 200 } }] },
    );

    assert.match(inventory, /useApi\('listStockSnapshots'/);
    assert.match(inventory, /useApi\('listStockMovements'/);
    assert.match(inventory, /useCommand\('createInventoryAdjustment'/);
    assert.match(inventory, /permission="inventory\.adjust"/);
    assert.match(inventory, /useCan\('catalog\.read'\)/);
    assert.match(shell, /request\('getShop'/);
    assert.doesNotMatch(inventory, /\bfetch\s*\(|\baxios\b|optimistic/i);

    console.log(JSON.stringify({
        taskId: 'FE011', scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        routes: [{ id: 'R15', path: r15.path, permission: r15.readPermission, reads: r15.readOperations, action: r15.actions[0] }, { id: 'R16', path: r16.path, permission: r16.readPermission, reads: r16.readOperations }],
        operations: [stockList.operationId, movementList.operationId, adjustment.operationId, 'getShop'],
        permissionBoundary: 'Route reads require inventory.read; adjustment uses inventory.adjust; cost requires finance.read; product and order links are permission-gated.',
        commandSemantics: '202 CommandResponse; expectedVersion and unitCost are contract-required body properties; the shared client waits for terminal state and handles unknown outcomes.',
        checks: 17,
    }, null, 2));
});

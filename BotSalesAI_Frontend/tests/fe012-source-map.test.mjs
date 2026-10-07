import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const readText = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('FE012 routes, operations, permissions and DTO limits map to canonical contracts and orders source', async () => {
    const [manifest, openapi, operations, orders, shell, fulfillment, commandRecovery, mockFulfillment, seed, router, knownGaps] = await Promise.all([
        readJson('../../botsales-kit/contracts/route-manifest.json'),
        readJson('../../botsales-kit/contracts/openapi.json'),
        readJson('../packages/contracts/src/operations.json'),
        readText('../apps/web/src/modules/orders/index.tsx'),
        readText('../apps/web/src/app/Shell.tsx'),
        readText('../apps/web/src/modules/fulfillment/index.tsx'),
        readText('../apps/web/src/app/CommandRecovery.tsx'),
        readText('../apps/web/src/mocks/fulfillment.ts'),
        readJson('../apps/web/src/mocks/seed.json'),
        readText('../apps/web/src/app/router.tsx'),
        readText('../docs/KNOWN_GAPS.md'),
    ]);
    const byId = new Map(manifest.routes.map(route => [route.id, route]));
    const r17 = byId.get('R17');
    const r18 = byId.get('R18');
    const r19 = byId.get('R19');
    const r43 = byId.get('R43');
    assert.deepEqual([r17.path, r17.readPermission, ...r17.readOperations], ['/s/:shopId/orders', 'orders.read', 'listOrders']);
    assert.deepEqual([r18.path, r18.readPermission, ...r18.readOperations], ['/s/:shopId/orders/new', 'orders.write', 'listCustomers', 'listProducts', 'getShop']);
    assert.equal(r19.readPermission, 'orders.read');
    assert.deepEqual([r43.path, r43.module, r43.readPermission, ...r43.readOperations], ['/s/:shopId/returns', 'orders', 'orders.read', 'listReturnCases', 'getReturnCase']);
    assert.deepEqual(r43.actions.map(action => [action.operationId, action.permission]), [['createReturnCase', 'orders.return'], ['inspectReturn', 'inventory.adjust']]);

    const schemas = openapi.components.schemas;
    assert.deepEqual(schemas.OrderDraft.required, ['customerId', 'conversationId', 'warehouseId', 'lines', 'notes', 'paymentMethod', 'shippingAddressId']);
    assert.deepEqual([schemas.OrderDraft.properties.lines.maxItems, schemas.OrderLineInput.properties.quantity.minimum, schemas.OrderLineInput.properties.quantity.maximum, schemas.OrderDraft.properties.notes.maxLength], [100, 1, 1_000_000, 2_000]);
    assert.deepEqual(schemas.ConfirmOrder.required, ['expectedVersion', 'quoteId', 'customerConfirmationId']);
    assert.deepEqual(schemas.CustomerConfirmationRequest.required, ['quoteId', 'quoteHash', 'quoteVersion', 'customerIdentityId', 'sourceMessageId']);
    assert.deepEqual([schemas.ReturnCaseCreate.properties.reason.maxLength, schemas.ReturnInspection.properties.lines.items.properties.acceptedQuantity.minimum], [1_000, 0]);

    assert.deepEqual(
        ['createOrder', 'updateOrderDraft', 'quoteOrder', 'recordCustomerConfirmation', 'confirmOrder', 'cancelOrder', 'createReturnCase', 'inspectReturn'].map(id => [id, operations[id].permission, operations[id].requestSchema, operations[id].responseSchema, operations[id].status]),
        [
            ['createOrder', 'orders.write', 'OrderDraft', 'OrderResponse', 201],
            ['updateOrderDraft', 'orders.write', 'OrderDraftPatch', 'OrderResponse', 200],
            ['quoteOrder', 'orders.write', null, 'OrderQuoteResponse', 200],
            ['recordCustomerConfirmation', 'orders.write', 'CustomerConfirmationRequest', 'CustomerConfirmationResponse', 200],
            ['confirmOrder', 'orders.confirm', 'ConfirmOrder', 'CommandResponse', 202],
            ['cancelOrder', 'orders.write', 'VersionedReason', 'CommandResponse', 202],
            ['createReturnCase', 'orders.return', 'ReturnCaseCreate', 'ReturnCaseResponse', 201],
            ['inspectReturn', 'inventory.adjust', 'ReturnInspection', 'ReturnCaseResponse', 200],
        ],
    );
    assert.deepEqual(operations.listCustomers.queryParameters.map(item => item.name), ['limit', 'cursor', 'q', 'status', 'sort']);
    assert.deepEqual(operations.listProducts.queryParameters.map(item => item.name), ['limit', 'cursor', 'q', 'status', 'sort', 'categoryId']);

    for (const operationId of ['listOrders', 'getOrder', 'listCustomers', 'listProducts', 'listConversations', 'createOrder', 'updateOrderDraft', 'quoteOrder', 'recordCustomerConfirmation', 'confirmOrder', 'cancelOrder', 'listReturnCases', 'getReturnCase', 'createReturnCase', 'inspectReturn', 'payOrder', 'refundOrder'])
        assert.ok(orders.includes(`'${operationId}'`), `orders module must use ${operationId}`);
    assert.match(shell, /request\('getShop'/);
    assert.match(fulfillment, /useCommand\('handoverShipment'/);
    assert.match(commandRecovery, /request\('getCommand'/);
    assert.match(mockFulfillment, /acceptedQuantity <= num\(line\.quantity\)/);
    assert.match(mockFulfillment, /BigInt\(acceptedQuantity\)/);
    const inspectionOrder = seed.orders.find(order => order.id === 'DH-DEMO-RETURN-02');
    const inspectionReturn = seed.returns.find(item => item.id === 'seed-returncase-10036');
    assert.deepEqual([inspectionOrder?.fulfillmentState, inspectionOrder?.lines[0]?.quantity, inspectionReturn?.state, inspectionReturn?.lines[0]?.quantity], ['delivered', 2, 'received', 2]);
    assert.match(orders, /q: customerSearch\.trim\(\)/);
    assert.match(orders, /q: productSearch\.trim\(\)/);
    assert.match(orders, /useCan\('customers\.read'\)/);
    assert.match(orders, /useCan\('catalog\.read'\)/);
    assert.match(orders, /disabled=\{!confirmation \|\| quoteExpired \|\| confirmationExpired\}/);
    assert.match(orders, /useCommand\('quoteOrder', \['getOrder'\]\)/);
    assert.match(orders, /permission="orders\.confirm" allowedActions=\{order\.allowedActions\} action="confirm"/);
    assert.match(orders, /useCommand\('confirmOrder'/);
    assert.match(orders, /useCommand\('cancelOrder'/);
    assert.match(orders, /useCommand\('createReturnCase'/);
    assert.match(orders, /useApi\('getReturnCase'/);
    assert.match(orders, /useCommand\('inspectReturn', \['listReturnCases', 'getReturnCase'/);
    assert.match(orders, /expectedVersion: inspectionCase\.version/);
    assert.doesNotMatch(orders, /\/addresses\b|createShippingAddress|updateShippingAddress/);
    assert.match(knownGaps, /địa chỉ giao hàng|shipping address/i);
    assert.match(router, /simulateCustomerConfirmation/);
    assert.doesNotMatch(orders, /\bfetch\s*\(|\baxios\b|optimistic/i);

    console.log(JSON.stringify({
        taskId: 'FE012', scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        routes: [r17.id, r18.id, r19.id, r43.id],
        operations: ['listOrders', 'getOrder', 'getShop', 'listCustomers', 'listProducts', 'listConversations', 'createOrder', 'updateOrderDraft', 'quoteOrder', 'recordCustomerConfirmation', 'confirmOrder', 'cancelOrder', 'listReturnCases', 'getReturnCase', 'createReturnCase', 'inspectReturn', 'getCommand', 'handoverShipment', 'payOrder', 'refundOrder'],
        contractEvidence: 'OrderDraft carries required IDs and 1..100 lines, integer quantity 1..1000000 and notes up to 2000; confirmation requires quote hash/version and customer message evidence; return inspection is line-scoped.',
        permissionBoundary: 'Customer/product pickers are enabled only with read capability; write actions follow orders.write, orders.confirm, orders.return and inventory.adjust.',
        limitations: 'No address CRUD endpoint is introduced; shippingAddressId remains an external verified ID and mock confirmation is only a demo simulation.',
        checks: 35,
    }, null, 2));
});

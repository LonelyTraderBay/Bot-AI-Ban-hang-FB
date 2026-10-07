import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const readText = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('FE013 routes, permissions, DTOs and state transitions map to canonical contracts and fulfillment source', async () => {
    const [manifest, openapi, operations, fulfillment, mockFulfillment, orders, shell, router] = await Promise.all([
        readJson('../../botsales-kit/contracts/route-manifest.json'),
        readJson('../../botsales-kit/contracts/openapi.json'),
        readJson('../packages/contracts/src/operations.json'),
        readText('../apps/web/src/modules/fulfillment/index.tsx'),
        readText('../apps/web/src/mocks/fulfillment.ts'),
        readText('../apps/web/src/modules/orders/index.tsx'),
        readText('../apps/web/src/app/Shell.tsx'),
        readText('../apps/web/src/app/router.tsx'),
    ]);
    const checks = [];
    const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks.push(label); };
    const ok = (condition, label) => { assert.ok(condition, label); checks.push(label); };
    const match = (source, pattern, label) => { assert.match(source, pattern, label); checks.push(label); };
    const byId = new Map(manifest.routes.map(route => [route.id, route]));
    const prep = byId.get('R41');
    const shipment = byId.get('R42');

    eq([prep.path, prep.module, prep.readPermission, ...prep.readOperations], ['/s/:shopId/fulfillment', 'fulfillment', 'fulfillment.read', 'listPrepJobs', 'getPrepJob'], 'R41 is the canonical preparation route');
    eq(prep.actions.map(action => [action.operationId, action.permission]), [['pickPrepLine', 'fulfillment.write'], ['packPrepJob', 'fulfillment.write']], 'R41 mutation capabilities come from the route manifest');
    eq([shipment.path, shipment.module, shipment.readPermission, ...shipment.readOperations], ['/s/:shopId/shipments', 'fulfillment', 'fulfillment.read', 'listShipments', 'getShipment'], 'R42 reads list and detail shipment resources');
    eq(shipment.actions.map(action => [action.operationId, action.permission]), [['createShipment', 'fulfillment.write'], ['handoverShipment', 'fulfillment.handover'], ['recordShipmentEvent', 'fulfillment.write']], 'R42 action capabilities come from the route manifest');

    const operationContract = (id, expected) => {
        const operation = operations[id];
        eq([operation.permission, operation.requestSchema, operation.responseSchema, operation.status], expected, `${id} operation contract`);
        const pathItem = Object.values(openapi.paths).flatMap(item => Object.values(item)).find(item => item.operationId === id);
        ok(pathItem, `${id} exists in canonical OpenAPI`);
        eq(pathItem['x-permission'], expected[0], `${id} OpenAPI permission matches generated registry`);
    };
    operationContract('getWorkItem', ['operations.read', null, 'WorkItemResponse', 200]);
    operationContract('claimWorkItem', ['operations.claim', 'ClaimWorkRequest', 'WorkItemResponse', 200]);
    operationContract('pickPrepLine', ['fulfillment.write', 'PickLineRequest', 'PrepJobResponse', 200]);
    operationContract('packPrepJob', ['fulfillment.write', 'VersionRequest', 'PrepJobResponse', 200]);
    operationContract('createShipment', ['fulfillment.write', 'ShipmentCreate', 'ShipmentResponse', 201]);
    operationContract('handoverShipment', ['fulfillment.handover', 'VersionRequest', 'CommandResponse', 202]);
    operationContract('recordShipmentEvent', ['fulfillment.write', 'ShipmentEventWrite', 'ShipmentResponse', 200]);

    const schemas = openapi.components.schemas;
    eq(schemas.ClaimWorkRequest.required, ['expectedVersion'], 'claim requires the current WorkItem version');
    eq(schemas.PickLineRequest.required, ['expectedVersion', 'orderLineId', 'scannedSku', 'pickedQuantity', 'issueReason'], 'pick binds current version, line, scanned SKU and issue');
    eq([schemas.PickLineRequest.properties.scannedSku.maxLength, schemas.PickLineRequest.properties.pickedQuantity.minimum], [100, 0], 'pick SKU and quantity bounds are contract-defined');
    eq(schemas.ShipmentCreate.required, ['orderId', 'warehouseId', 'carrierId', 'orderLineIds'], 'shipment creation requires explicit order and carrier fields');
    eq(schemas.ShipmentEventWrite.required, ['expectedVersion', 'externalEventId', 'eventType', 'occurredAt', 'evidenceRef'], 'carrier events require a version, unique source ID, time and evidence');
    eq(schemas.Shipment.properties.state.enum, ['planned', 'label_pending', 'unknown', 'label_ready', 'handed_over', 'in_transit', 'part_delivered', 'delivered', 'failed', 'returning', 'returned', 'cancelled'], 'shipment lifecycle uses canonical states');

    for (const id of ['listPrepJobs', 'getPrepJob', 'getWorkItem', 'claimWorkItem', 'pickPrepLine', 'packPrepJob', 'listShipments', 'getShipment', 'createShipment', 'handoverShipment', 'recordShipmentEvent'])
        match(fulfillment, new RegExp(`(?:useApi|useCommand)\\('${id}'`), `fulfillment UI calls ${id}`);
    match(fulfillment, /membership\.permissions\.includes\('operations\.claim'\)/, 'claim is hidden without operations.claim');
    match(fulfillment, /workItem\.allowedActions\.includes\('claim'\)/, 'claim follows current WorkItem allowedActions');
    match(fulfillment, /expectedVersion: shipment\.version/, 'shipment mutations use detail resource version');
    match(fulfillment, /externalEventId: externalEventId\.trim\(\)[\s\S]*occurredAt: occurredAtInstant[\s\S]*evidenceRef: evidenceRef\.trim\(\)/, 'shipment event sends shop-timezone-resolved instant and human evidence');
    match(mockFulfillment, /ensure\(rows\(prep\.lines\)\.every\(l => l\.requiredQuantity === l\.pickedQuantity && !l\.hasIssue\)/, 'mock pack rejects partial or unresolved picks');
    match(mockFulfillment, /ensure\(!rows\(shipment\.events\)\.some\(e => e\.externalEventId === body\.externalEventId\)/, 'mock rejects duplicate carrier event IDs');
    match(mockFulfillment, /shipment\.state = 'handed_over'[\s\S]*order\.fulfillmentState = 'dispatched'/, 'handover is separate from delivery state');
    match(mockFulfillment, /order\.paymentMethod === 'cod'/, 'delivery does not imply COD payment was received');
    match(orders, /order\.allowedActions\.includes\('request_return'\)/, 'return obligation remains sourced by the order allowedActions');
    match(shell, /'warehouse'/, 'warehouse role is represented in mock permission selection');
    match(router, /FulfillmentPage[\s\S]*ShipmentsPage/, 'both route pages use the fulfillment module entry points');
    ok(!/\bfetch\s*\(|\baxios\b/.test(fulfillment), 'feature UI uses the shared API boundary');

    console.log(JSON.stringify({
        taskId: 'FE013',
        scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        routes: ['R41', 'R42'],
        operations: ['listPrepJobs', 'getPrepJob', 'getWorkItem', 'claimWorkItem', 'pickPrepLine', 'packPrepJob', 'listShipments', 'getShipment', 'createShipment', 'handoverShipment', 'recordShipmentEvent'],
        permissionBoundary: 'fulfillment.read gates route data, operations.claim gates WorkItem claim, fulfillment.write gates picks/pack/events/shipment creation, and fulfillment.handover gates stock-consuming handover.',
        stateBoundary: 'Claim/pick/pack/handover/delivery/payment remain separate states; return eligibility continues to come from the order API.',
        checks: checks.length,
    }, null, 2));
});

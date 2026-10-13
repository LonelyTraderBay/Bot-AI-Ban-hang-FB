import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const readText = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('FE014 procurement routes, permissions, DTOs and current source follow canonical contracts', async () => {
    const [manifest, openapi, operations, procurement, mock, routeMap] = await Promise.all([
        readJson('../../botsales-kit/contracts/route-manifest.json'),
        readJson('../../botsales-kit/contracts/openapi.json'),
        readJson('../packages/contracts/src/operations.json'),
        readText('../apps/web/src/modules/procurement/index.tsx'),
        readText('../apps/web/src/mocks/procurement.ts'),
        readText('../../botsales-kit/execution/frontend-evidence/FE014/S01-route-operation-map.md'),
    ]);
    const checks = [];
    const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks.push(label); };
    const ok = (condition, label) => { assert.ok(condition, label); checks.push(label); };
    const match = (source, pattern, label) => { assert.match(source, pattern, label); checks.push(label); };
    const routes = new Map(manifest.routes.map(route => [route.id, route]));
    const expectedRoutes = [
        ['R44', '/s/:shopId/suppliers', ['listSuppliers', 'getSupplier', 'listSupplierOffers'], 'procurement.read'],
        ['R45', '/s/:shopId/replenishment', ['listPurchaseSuggestions', 'listReorderRules'], 'procurement.read'],
        ['R46', '/s/:shopId/purchases', ['listPurchaseOrders', 'getPurchaseOrder'], 'procurement.read'],
        ['R47', '/s/:shopId/receipts', ['listGoodsReceipts', 'getGoodsReceipt'], 'procurement.read'],
    ];
    for (const [id, routePath, reads, permission] of expectedRoutes) {
        const route = routes.get(id);
        eq([route.path, route.module, route.readPermission, ...route.readOperations], [routePath, 'procurement', permission, ...reads], `${id} route contract`);
        ok(routeMap.includes(`${id} \`${routePath}\``), `${id} is documented in the task map`);
    }

    const operationIds = [
        'createSupplier', 'updateSupplier', 'setSupplierStatus', 'createSupplierOffer',
        'evaluateReorder', 'createReorderRule', 'updateReorderRule', 'createPurchaseOrder',
        'requestPurchaseApproval', 'sendPurchaseOrder', 'confirmPurchaseOrder',
        'createGoodsReceipt', 'postGoodsReceipt',
    ];
    for (const id of operationIds) {
        const operation = operations[id];
        ok(operation, `${id} exists in generated operation registry`);
        const pathItem = Object.values(openapi.paths).flatMap(item => Object.values(item)).find(item => item.operationId === id);
        ok(pathItem, `${id} exists in canonical OpenAPI`);
        eq(pathItem['x-permission'], operation.permission, `${id} permission matches OpenAPI`);
        match(procurement, new RegExp(`(?:useApi|useCommand)\\('${id}'`), `procurement UI calls ${id}`);
    }
    for (const id of ['listSuppliers', 'getSupplier', 'listSupplierOffers', 'listPurchaseSuggestions', 'listReorderRules', 'listPurchaseOrders', 'getPurchaseOrder', 'listGoodsReceipts', 'getGoodsReceipt'])
        match(procurement, new RegExp(`useApi\\('${id}'`), `${id} is read through the shared API hook`);

    const schemas = openapi.components.schemas;
    eq(schemas.PurchaseCreate.required, ['supplierId', 'warehouseId', 'suggestionId', 'lines'], 'purchase create requires explicit supplier, warehouse, suggestion and lines');
    eq(schemas.PurchaseCreate.properties.lines.items.required, ['variantId', 'supplierOfferId', 'quantity'], 'purchase lines use supplier offer and integer quantity');
    eq([schemas.SupplierOffer.properties.minimumQuantity.minimum, schemas.SupplierOffer.properties.packSize.minimum], [1, 1], 'supplier MOQ and pack size must be positive');
    eq(schemas.PurchaseSend.required, ['expectedVersion', 'approvalId', 'intentHash'], 'send binds current version and exact approval hash');
    eq(schemas.GoodsReceiptCreate.required, ['purchaseOrderId', 'expectedPurchaseVersion', 'sourceDocumentRef', 'lines'], 'receipt create binds PO version and source document');
    eq(schemas.GoodsReceiptCreate.properties.lines.items.required, ['purchaseLineId', 'acceptedQuantity', 'rejectedQuantity', 'reason'], 'receipt records accepted and rejected quantities per PO line');

    match(procurement, /const lines = poLines\.map\(/, 'purchase editor sends all selected lines');
    match(procurement, /Number\.isInteger\([\s\S]*minimumQuantity[\s\S]*packSize/, 'purchase editor validates integer MOQ and pack-size constraints');
    match(procurement, /useApi\('getGoodsReceipt'/, 'receipt posting loads the latest receipt version');
    match(procurement, /useApi\('getPurchaseOrder'/, 'receipt drafting loads the current purchase-order version');
    match(procurement, /p\.intentHash/, 'purchase send binds the approved intent hash');
    match(procurement, /useSyncExternalStore\(subscribeIntents, intentSnapshot[\s\S]*sendPurchaseOrder/, 'unresolved send intent is observed reactively by the purchase detail');
    match(procurement, /disabled=\{unresolvedSend\}[\s\S]*Gửi đơn mua/, 'purchase send action disappears while a prior result remains unresolved');
    match(procurement, /if \(error instanceof UnknownResultError\) setAction\(null\)/, 'unknown send closes its confirmation dialog and preserves the error in the purchase detail');
    match(procurement, /permission="procurement\.send"/, 'send permission is distinct from purchase write');
    match(procurement, /Không bao gồm quyền chuyển tiền|không cho phép tự chuyển tiền/, 'purchase actions do not imply payment permission');
    match(mock, /p\.warehouseId === rule\.warehouseId/, 'reorder projection scopes active PO quantities to warehouse and SKU');
    match(mock, /Quy tắc min-max; đã trừ hàng đang đặt\. Không phải dự báo AI\./, 'mock discloses rule-based suggestion without invented forecast confidence');
    match(mock, /policy\.kind === 'procurement' && policy\.enabled && !!policy\.limitAmount/, 'mock auto-send requires an active, limited procurement budget in the current shop');
    match(mock, /ensure\(supplier\.status === 'approved'/, 'mock rejects unapproved suppliers for purchase');
    match(mock, /ensure\(num\(l\.quantity\) >= num\(offer\.minimumQuantity\) && num\(l\.quantity\) % num\(offer\.packSize\) === 0/, 'mock enforces supplier MOQ and pack-size constraints');
    match(mock, /ensure\(p\.status === 'approved' && a\.status === 'approved'[\s\S]*a\.resourceVersion === p\.version/, 'mock rejects stale or mismatched purchase approval');
    match(mock, /ensure\(receipt\.status === 'draft'/, 'mock rejects receipt replay after posting');
    match(mock, /const count = num\(line\.acceptedQuantity\)[\s\S]*if \(count > 0\)[\s\S]*amount \+= value/, 'only accepted receipt quantity increases stock and payable amount');
    ok(!/\bfetch\s*\(|\baxios\b/.test(procurement), 'procurement module uses the shared transport boundary');
    ok(!operations.updatePurchaseOrder && !operations.updateSupplierOffer, 'the source contract exposes no purchase/offer edit operation; no endpoint is invented');

    console.log(JSON.stringify({ taskId: 'FE014', scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routes: expectedRoutes.map(([id]) => id), operations: operationIds.length, checks: checks.length }, null, 2));
});

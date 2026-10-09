import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';
import { setupServer } from 'msw/node';

const BASE_URL = 'http://localhost:3000';

function operationUrl(operations, operationId, pathValues = {}, query = {}) {
    const operation = operations[operationId];
    assert(operation, `Unknown operation ${operationId}`);
    const route = operation.path.replace(/\{([^}]+)\}/g, (_, key) => {
        assert(pathValues[key], `${operationId} needs path parameter ${key}`);
        return encodeURIComponent(pathValues[key]);
    });
    const url = new URL(`/api/v2${route}`, BASE_URL);
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
    return url;
}

function validateEvent(event, schema) {
    for (const field of schema.required) assert(Object.hasOwn(event, field), `Event misses ${field}`);
    assert.equal(event.schemaVersion, schema.properties.schemaVersion.const);
    assert(schema.properties.type.enum.includes(event.type));
    assert.match(event.shopId, new RegExp(schema.$defs.Id.pattern));
    assert.match(event.resourceId, new RegExp(schema.$defs.Id.pattern));
    assert(Number.isInteger(event.sequence) && event.sequence >= 0);
    assert(Number.isFinite(Date.parse(event.occurredAt)));
}

export async function runMockNetworkScenarios({ root = process.cwd() } = {}) {
    const operations = JSON.parse(fs.readFileSync(path.join(root, 'packages/contracts/src/operations.json'), 'utf8'));
    const eventSchema = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/events.schema.json'), 'utf8'));
    const routeManifest = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/route-manifest.json'), 'utf8'));
    const featureCatalog = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/feature-catalog.json'), 'utf8'));
    const permissionCatalog = JSON.parse(fs.readFileSync(path.join(root, '../botsales-kit/contracts/permission-catalog.json'), 'utf8'));
    const vite = await createServer({
        configFile: path.join(root, 'apps/web/vite.config.ts'),
        mode: 'demo',
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error',
    });
    let server;
    const checks = [];
    const run = async (name, scenario) => {
        try {
            await scenario();
            checks.push({ name, status: 'PASS' });
        } catch (error) {
            checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) });
        }
    };

    try {
        const { handlers } = await vite.ssrLoadModule('/apps/web/src/mocks/handlers.ts');
        const service = await vite.ssrLoadModule('/apps/web/src/mocks/service.ts');
        const database = await vite.ssrLoadModule('/apps/web/src/mocks/database.ts');
        const { assertSchema } = await vite.ssrLoadModule('/apps/web/src/shared/api/validation.ts');
        for (const handler of handlers) handler.info.path = new URL(handler.info.path, BASE_URL).href;
        server = setupServer(...handlers);
        server.listen({ onUnhandledRequest: 'error' });

        const request = (operationId, { path: pathValues = {}, query, body, headers = {}, signal } = {}) => {
            const operation = operations[operationId];
            const requestHeaders = new Headers(headers);
            if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
            return fetch(operationUrl(operations, operationId, pathValues, query), {
                method: operation.method,
                headers: requestHeaders,
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
                ...(signal ? { signal } : {}),
            });
        };
        const json = async response => response.status === 204 ? undefined : response.json();
        const reset = () => service.resetService();
        const csrf = async () => (await (await request('getCsrfToken')).json()).data.csrfToken;
        const writeHeaders = (token, key) => ({ 'X-CSRF-Token': token, 'Idempotency-Key': key });

        await run('Registers every canonical HTTP operation and reports the custom SSE endpoint', async () => {
            const expected = Object.keys(operations).filter(id => id !== 'subscribeEvents').length + 1;
            assert.equal(handlers.length, expected);
            assert(handlers.some(handler => handler.info.path.endsWith('/shops/:shopId/events')));
        });

        await run('Loads the service worker only in demo mode and guards production from mock activation', async () => {
            const main = fs.readFileSync(path.join(root, 'apps/web/src/main.tsx'), 'utf8');
            const viteConfig = fs.readFileSync(path.join(root, 'apps/web/vite.config.ts'), 'utf8');
            assert.match(main, /if\s*\(__MOCK__\)[\s\S]*?import\('\.\/mocks\/browser'\)/);
            assert.match(viteConfig, /const mocks\s*=\s*mode\s*===\s*'demo'/);
            assert.match(viteConfig, /mode\s*===\s*'production'[\s\S]*?VITE_ENABLE_MOCKS\s*===\s*'true'/);
            assert.match(fs.readFileSync(path.join(root, 'apps/web/src/app/Shell.tsx'), 'utf8'), /Dữ liệu mô phỏng/);
        });

        await run('Covers the canonical route, feature, shop, and role catalogs', async () => {
            const routeIds = routeManifest.routes.map(route => route.id);
            assert.equal(routeIds.length, 54);
            assert.equal(new Set(routeIds).size, routeIds.length);
            assert.equal(featureCatalog.features.length, 64);
            assert(featureCatalog.features.every(feature => feature.routeIds.every(routeId => routeIds.includes(routeId))));
            assert.deepEqual(new Set(database.db.shops.map(shop => shop.id)), new Set(['shop-demo', 'shop-second']));
            for (const [role, expectedPermissions] of Object.entries(permissionCatalog.rolePresets)) {
                service.setRole(role);
                assert.deepEqual([...database.grantedPermissions(role)].sort(), [...expectedPermissions].sort(), `Permission drift for ${role}`);
            }
            service.resetService();
            assert(permissionCatalog.rolePresets.owner.every(permission => database.db.members.find(member => member.shopId === 'shop-demo' && member.roles.includes('owner'))?.permissions.includes(permission)));
            assert(permissionCatalog.rolePresets.warehouse.every(permission => database.db.members.find(member => member.shopId === 'shop-demo' && member.roles.includes('warehouse'))?.permissions.includes(permission)));
        });

        await run('Returns schema-valid, paginated data and rejects stale cursors', async () => {
            reset();
            const first = await request('listProducts', { path: { shopId: 'shop-demo' }, query: { limit: 2 } });
            assert.equal(first.status, 200);
            const pageOne = await json(first);
            assertSchema('ProductListResponse', pageOne);
            assert.equal(pageOne.data.length, 2);
            assert.equal(pageOne.page.hasMore, true);
            const second = await request('listProducts', { path: { shopId: 'shop-demo' }, query: { limit: 2, cursor: pageOne.page.nextCursor } });
            const pageTwo = await json(second);
            assertSchema('ProductListResponse', pageTwo);
            assert.equal(second.status, 200);
            assert.notEqual(pageOne.data[0].id, pageTwo.data[0].id);
            const invalid = await request('listProducts', { path: { shopId: 'shop-demo' }, query: { cursor: 'missing-cursor' } });
            assert.equal(invalid.status, 422);
            assert.equal((await json(invalid)).code, 'INVALID_CURSOR');
        });

        await run('Pages through a deterministic large dataset without dropping or duplicating rows', async () => {
            reset();
            const original = database.all('products', 'shop-demo');
            const template = structuredClone(original[0]);
            for (let index = 0; index < 125; index++) {
                const product = structuredClone(template);
                product.id = `net-product-${String(index).padStart(3, '0')}`;
                product.name = `Sản phẩm phân trang ${String(index + 1).padStart(3, '0')}`;
                product.variants = product.variants.map((variant, variantIndex) => ({
                    ...variant,
                    id: `net-variant-${String(index).padStart(3, '0')}-${variantIndex}`,
                    productId: product.id,
                    sku: `NET-${String(index).padStart(3, '0')}-${variantIndex}`,
                }));
                database.db.products.push(product);
            }
            const expectedTotal = original.length + 125;
            const firstResponse = await request('listProducts', { path: { shopId: 'shop-demo' }, query: { limit: 100 } });
            const firstPage = await json(firstResponse);
            assertSchema('ProductListResponse', firstPage);
            assert.equal(firstPage.data.length, 100);
            assert.equal(firstPage.page.total, expectedTotal);
            assert.equal(firstPage.page.hasMore, true);
            const secondResponse = await request('listProducts', { path: { shopId: 'shop-demo' }, query: { limit: 100, cursor: firstPage.page.nextCursor } });
            const secondPage = await json(secondResponse);
            assertSchema('ProductListResponse', secondPage);
            const ids = [...firstPage.data, ...secondPage.data].map(product => product.id);
            assert.equal(ids.length, expectedTotal);
            assert.equal(new Set(ids).size, expectedTotal);
            assert.equal(secondPage.data.length, expectedTotal - 100);
            assert.equal(secondPage.page.hasMore, false);
            reset();
            assert.equal(database.all('products', 'shop-demo').length, original.length);
        });

        await run('Scopes reads to the requested shop and role permissions', async () => {
            reset();
            const source = database.all('products', 'shop-demo')[0];
            const crossShop = await request('getProduct', { path: { shopId: 'shop-second', productId: source.id } });
            assert.equal(crossShop.status, 404);
            const permitted = await request('listProducts', { path: { shopId: 'shop-second' } });
            assert.equal(permitted.status, 200);
            service.setRole('viewer');
            const denied = await request('listFinanceEntries', { path: { shopId: 'shop-demo' } });
            assert.equal(denied.status, 403);
            service.setRole('owner');
        });

        await run('Maps request validation, CSRF, and missing If-Match to contract errors', async () => {
            reset();
            const token = await csrf();
            const invalidBody = await request('createCategory', {
                path: { shopId: 'shop-demo' }, body: {}, headers: writeHeaders(token, 'network-invalid-body'),
            });
            assert.equal(invalidBody.status, 422);
            const missingCsrf = await request('createCategory', {
                path: { shopId: 'shop-demo' }, body: { name: 'Thiếu CSRF', parentId: null }, headers: { 'Idempotency-Key': 'network-no-csrf' },
            });
            assert.equal(missingCsrf.status, 403);
            assert.equal((await json(missingCsrf)).code, 'CSRF_INVALID');
            const product = database.all('products', 'shop-demo')[0];
            const missingVersion = await request('updateProduct', {
                path: { shopId: 'shop-demo', productId: product.id }, body: { description: product.description },
                headers: writeHeaders(token, 'network-no-version'),
            });
            assert.equal(missingVersion.status, 428);
        });

        await run('Creates a product with schema-complete variants through HTTP', async () => {
            reset();
            const token = await csrf();
            const response = await request('createProduct', {
                path: { shopId: 'shop-demo' },
                body: {
                    name: 'Sản phẩm HTTP mới', description: 'Fixture kiểm tra tạo sản phẩm qua MSW.',
                    categoryId: null, status: 'draft', imageFileIds: [],
                    variants: [{ sku: 'NETWORK-CREATE-001', name: 'Mặc định', options: {}, price: { amount: '150000', currency: 'VND' }, active: true }],
                },
                headers: writeHeaders(token, 'network-create-product'),
            });
            const created = await json(response);
            assert.equal(response.status, 201);
            assertSchema('ProductResponse', created);
            const variant = created.data.variants[0];
            assert.equal(variant.shopId, 'shop-demo');
            assert.equal(variant.productId, created.data.id);
            assert.equal(variant.version, 1);
            assert(database.all('stock', 'shop-demo').some(stock => stock.variantId === variant.id));
        });

        await run('Preserves idempotency and exposes stale and unknown mutation outcomes over HTTP', async () => {
            reset();
            const token = await csrf();
            const body = { name: 'Danh mục network', parentId: null };
            const headers = writeHeaders(token, 'network-category-once');
            const first = await request('createCategory', { path: { shopId: 'shop-demo' }, body, headers });
            const created = await json(first);
            assert.equal(first.status, 201);
            const duplicate = await request('createCategory', { path: { shopId: 'shop-demo' }, body, headers });
            assert.equal((await json(duplicate)).data.id, created.data.id);
            const conflict = await request('createCategory', {
                path: { shopId: 'shop-demo' }, body: { name: 'Nội dung khác', parentId: null }, headers,
            });
            assert.equal(conflict.status, 409);

            const stock = database.all('stock', 'shop-demo')[0];
            const adjustment = { variantId: stock.variantId, warehouseId: stock.warehouseId, quantityDelta: -1, reason: 'Kiểm tra unknown', expectedVersion: stock.version, unitCost: null };
            service.setFault('stale');
            const stale = await request('createInventoryAdjustment', {
                path: { shopId: 'shop-demo' }, body: adjustment, headers: writeHeaders(token, 'network-stale'),
            });
            assert.equal(stale.status, 412);
            service.setFault('unknown');
            const unknown = await request('createInventoryAdjustment', {
                path: { shopId: 'shop-demo' }, body: adjustment, headers: writeHeaders(token, 'network-unknown'),
            });
            assert.equal(unknown.status, 202);
            const unknownBody = await json(unknown);
            assertSchema('CommandResponse', unknownBody);
            assert.equal(unknownBody.data.status, 'unknown');
        });

        await run('Resets records, role, faults, idempotency keys, sequence, and fixed clock deterministically', async () => {
            reset();
            const token = await csrf();
            const body = { name: 'Danh mục reset ổn định', parentId: null };
            const headers = writeHeaders(token, 'reset-repeatable');
            const firstCreated = await json(await request('createCategory', { path: { shopId: 'shop-demo' }, body, headers }));
            assert.equal(firstCreated.data.id, 'category-10001');
            assert.equal(firstCreated.data.createdAt, '2026-09-29T14:00:01.000Z');
            service.setRole('viewer');
            service.setFault('error');
            reset();
            const repeated = await json(await request('createCategory', { path: { shopId: 'shop-demo' }, body, headers }));
            assert.deepEqual(repeated.data, firstCreated.data);
            assert.equal(database.grantedPermissions('owner').length, permissionCatalog.rolePresets.owner.length);
            const recovered = await request('getDashboard', { path: { shopId: 'shop-demo' } });
            assert.equal(recovered.status, 200);
            assert.equal(database.all('categories', 'shop-demo').filter(category => category.name === body.name).length, 1);
        });

        await run('Returns observable transient and empty states without fabricating records', async () => {
            reset();
            service.setFault('error');
            const unavailable = await request('getDashboard', { path: { shopId: 'shop-demo' } });
            assert.equal(unavailable.status, 503);
            assert.equal((await json(unavailable)).code, 'SIMULATED_FAILURE');
            service.setFault('empty');
            const empty = await request('listProducts', { path: { shopId: 'shop-demo' } });
            const emptyBody = await json(empty);
            assert.equal(empty.status, 200);
            assertSchema('ProductListResponse', emptyBody);
            assert.equal(emptyBody.data.length, 0);
            assert.equal(emptyBody.page.total, 0);
        });

        await run('Aborted delayed reads do not leak into the next request', async () => {
            reset();
            service.setFault('slow');
            const controller = new AbortController();
            const pending = request('listProducts', { path: { shopId: 'shop-demo' }, signal: controller.signal });
            setTimeout(() => controller.abort(), 20);
            await assert.rejects(pending, error => error?.name === 'AbortError');
            await new Promise(resolve => setTimeout(resolve, 1550));
            const recovered = await request('listProducts', { path: { shopId: 'shop-demo' } });
            assert.equal(recovered.status, 200);
            assert.equal((await json(recovered)).data.length, 8);
        });

        await run('Streams only the authorized shop and emits events matching the canonical v2 schema', async () => {
            reset();
            const controller = new AbortController();
            let reader;
            try {
                const stream = await request('subscribeEvents', { path: { shopId: 'shop-demo' }, signal: controller.signal });
                assert.equal(stream.status, 200);
                assert.match(stream.headers.get('content-type') || '', /text\/event-stream/);
                reader = stream.body.getReader();
                const initial = await reader.read();
                assert.match(new TextDecoder().decode(initial.value), /mock-stream/);
                const token = await csrf();
                const secondShopStock = database.all('stock', 'shop-second')[0];
                await request('createInventoryAdjustment', {
                    path: { shopId: 'shop-second' }, body: { variantId: secondShopStock.variantId, warehouseId: secondShopStock.warehouseId, quantityDelta: -1, reason: 'Chỉ đổi shop hai', expectedVersion: secondShopStock.version, unitCost: null }, headers: writeHeaders(token, 'network-other-shop'),
                });
                const firstShopStock = database.all('stock', 'shop-demo')[0];
                await request('createInventoryAdjustment', {
                    path: { shopId: 'shop-demo' }, body: { variantId: firstShopStock.variantId, warehouseId: firstShopStock.warehouseId, quantityDelta: -1, reason: 'Tạo event shop một', expectedVersion: firstShopStock.version, unitCost: null }, headers: writeHeaders(token, 'network-event-shop'),
                });
                const eventChunk = await reader.read();
                const text = new TextDecoder().decode(eventChunk.value);
                assert.match(text, /data: /);
                const data = text.split('\n').find(line => line.startsWith('data: '));
                const event = JSON.parse(data.slice('data: '.length));
                assert.equal(event.shopId, 'shop-demo');
                validateEvent(event, eventSchema);
            } finally {
                controller.abort();
                await reader?.cancel().catch(() => undefined);
            }
        });

        reset();
        const result = { status: checks.every(check => check.status === 'PASS') ? 'PASS' : 'FAIL', handlers: handlers.length, checks };
        return result;
    } finally {
        server?.close();
        await vite.close();
    }
}

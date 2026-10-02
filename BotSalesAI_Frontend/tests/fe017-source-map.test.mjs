import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const readText = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const routes = readJson('botsales-kit/contracts/route-manifest.json').routes;
const openapi = readJson('botsales-kit/contracts/openapi.json');
const operations = Object.fromEntries(Object.values(openapi.paths).flatMap(methods => Object.values(methods))
    .filter(operation => operation.operationId)
    .map(operation => [operation.operationId, operation]));
const moduleSource = readText('apps/web/src/modules/knowledge/index.tsx');
const mockService = readText('apps/web/src/mocks/service.ts');
const mockFiles = readText('apps/web/src/mocks/files.ts');
const mockKnowledge = readText('apps/web/src/mocks/auxiliary.ts');
const labels = readText('apps/web/src/shared/model/labels.ts');

test('FE017 R23-R25 operations and action permissions match canonical routes', () => {
    const expected = {
        R23: ['listKnowledge', 'getFile', 'createKnowledge', 'uploadFile'],
        R24: ['getKnowledge', 'listKnowledgeRevisions', 'getKnowledgeRevision', 'updateKnowledge', 'createKnowledgeRevision', 'submitKnowledgeReview', 'publishKnowledge', 'retireKnowledge', 'restoreKnowledgeRevision'],
        R25: ['listFeedback', 'reviewFeedback'],
    };
    for (const [routeId, operationIds] of Object.entries(expected)) {
        const route = routes.find(candidate => candidate.id === routeId);
        assert.ok(route, `${routeId} is registered`);
        for (const operationId of operationIds) assert.ok(operations[operationId], `${operationId} exists`);
    }
    assert.equal(routes.find(route => route.id === 'R23').readPermission, 'knowledge.read');
    assert.equal(routes.find(route => route.id === 'R24').readPermission, 'knowledge.read');
    assert.equal(routes.find(route => route.id === 'R25').readPermission, 'knowledge.read');
    assert.equal(operations.createKnowledge['x-permission'], 'knowledge.write');
    assert.equal(operations.publishKnowledge['x-permission'], 'knowledge.publish');
    assert.equal(operations.reviewFeedback['x-permission'], 'knowledge.write');
    assert.match(operations.uploadFile.description, /knowledge_source.*knowledge\.write/);
    for (const operationId of expected.R23.concat(expected.R24, expected.R25)) {
        assert.match(moduleSource, new RegExp(`use(?:Api|Command)\\('${operationId}'`), `${operationId} is connected in the knowledge module`);
    }
    assert.match(moduleSource, /fd\.append\('purpose', 'knowledge_source'\)/);
    assert.match(moduleSource, /useApi\('getFile'/);
});

test('FE017 uses the user-approved permission and lifecycle UI substitute without inventing a Knowledge DTO field', () => {
    const fileUpload = openapi.components.schemas.FileUpload;
    assert.deepEqual(fileUpload.required, ['file', 'purpose']);
    assert.deepEqual(fileUpload.properties.purpose.enum, ['product_image', 'product_import', 'knowledge_source']);
    const knowledge = openapi.components.schemas.Knowledge;
    assert.ok(knowledge.properties.status);
    assert.equal(knowledge.properties.allowedActions, undefined, 'do not invent an uncontracted action property');
    assert.match(moduleSource, /permission="knowledge\.publish"/);
    assert.match(moduleSource, /disabled=\{k\.status !== 'ready_for_review'\}/);
    assert.match(mockService, /knowledge_source: 'knowledge\.write'/);
    assert.match(mockFiles, /Cần chỉ định mục đích tải tệp hợp lệ/);
    assert.match(moduleSource, /file\.data\.data\.status/);
    assert.match(labels, /quarantined: 'Đang cách ly'/);
    assert.match(labels, /ready: 'Sẵn sàng'/);
    assert.doesNotMatch(moduleSource, /dangerouslySetInnerHTML/);
});

test('FE017 price and availability source preview uses separately permissioned canonical APIs', () => {
    assert.equal(operations.listProducts['x-permission'], 'catalog.read');
    assert.equal(operations.listStockSnapshots['x-permission'], 'inventory.read');
    assert.match(moduleSource, /useCan\('catalog\.read'\)/);
    assert.match(moduleSource, /useCan\('inventory\.read'\)/);
    assert.match(moduleSource, /useApi\('listProducts'/);
    assert.match(moduleSource, /useApi\('listStockSnapshots'/);
    assert.match(moduleSource, /row\.variant\.price/);
    assert.match(moduleSource, /row\.snapshot\?\.available/);
    assert.match(moduleSource, /dateTime\(row\.snapshot\.asOf/);
    assert.match(moduleSource, /Nguồn API được truy vấn riêng với nội dung tri thức/);
});

test('FE017 mock keeps published revisions immutable and feedback approval creates a draft revision', () => {
    assert.match(mockKnowledge, /Bản đã xuất bản bất biến; hãy tạo revision mới/);
    assert.match(mockKnowledge, /Chỉ có thể gửi bản nháp để đánh giá/);
    assert.match(mockKnowledge, /knowledgeDraftId = k\.id/);
    assert.match(mockKnowledge, /k\.draftRevisionId = revision\.id/);
    assert.match(mockKnowledge, /revision\.draftRevisionId = revision\.id/);
    assert.match(mockKnowledge, /evaluation\.knowledgeRevisionId === body\.revisionId/);
});

console.log(JSON.stringify({ taskId: 'FE017', scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', routes: ['R23', 'R24', 'R25'], operations: 15, unresolvedContractField: 'Knowledge.allowedActions', checks: 4 }));

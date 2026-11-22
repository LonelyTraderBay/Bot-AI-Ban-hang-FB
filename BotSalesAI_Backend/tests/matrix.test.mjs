import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { Controller, Get, Module } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { checkSource, readInputs } from '../scripts/matrix-source.mjs';
import { checkRegistration } from '../scripts/matrix-runtime.mjs';
import { importViolations } from '../scripts/check-boundaries.mjs';
import { ContractOperation, registeredRoutes } from '../apps/api/dist/http/operations.js';

const workspace = fileURLToPath(new URL('..', import.meta.url));
const repository = fileURLToPath(new URL('../..', import.meta.url));
const original = readInputs(repository);
const source = checkSource(original);
const health = [{ method: 'GET', path: '/health/live' }, { method: 'GET', path: '/health/ready' }];
const operation = {
    id: 'listProducts', cases: [{ id: 'P0-08', file: 'tests/http.test.mjs' }],
};
const enabled = { milestone: 'BE-02', operations: [operation] };
const catalogRoute = { method: 'GET', path: '/shops/{shopId}/products', operationId: operation.id, handler: 'Catalog.list' };

function hasIssue(result, pattern) {
    assert.ok(result.some(message => pattern.test(message)), JSON.stringify(result, null, 2));
}

test('matrix matches canonical IDs and reports only the documented historical event duplicate', () => {
    assert.deepEqual(source.issues, []);
    assert.equal(source.counts.operations, original.sources.index.operations.length);
    assert.equal(source.counts.screens, original.sources.routes.routes.length);
    assert.deepEqual(source.knownGaps.map(issue => [issue.id, issue.owner]),
        [['journal.updated', 'BE-10']]);
});

test('matrix rejects missing, duplicate and wrong method/path rows', () => {
    const row = original.plan.split(/\r?\n/).find(line => line.startsWith('|\x20\x60getCsrfToken\x60 |'));
    assert.ok(row);
    const run = substitute => checkSource({ ...original, plan: original.plan.replace(row, () => substitute) }).issues;
    hasIssue(run(''), /API matrix: missing getCsrfToken/);
    hasIssue(run(row + '\n' + row), /API matrix: duplicate getCsrfToken/);
    hasIssue(run(row.replace('GET /auth/csrf', 'POST /auth/csrf')), /getCsrfToken method\/path/);
});

test('matrix rejects an unknown BE owner and drift in the recorded fingerprint', () => {
    const edited = original.plan.replace('GET /auth/csrf\x60 | [BE-04](#be-04)', 'GET /auth/csrf\x60 | [BE-99](#be-99)');
    const changed = { ...original.hashes, 'contracts/openapi.json': '0'.repeat(64) };
    const issues = checkSource({ ...original, plan: edited, hashes: changed }).issues;
    hasIssue(issues, /getCsrfToken: unknown BE owner.*BE-99/);
    hasIssue(issues, /SHA-256 contracts\/openapi.json/);
});

test('matrix rejects promoting R19 combo lookup to a bootstrap read', () => {
    const row = original.plan.split(/\r?\n/).find(line => line.startsWith('| R19 '));
    assert.ok(row);
    const changed = row.replace('\x60getCommand\x60 |', '\x60getCommand\x60, \x60listPromotions\x60 |')
        .replace('\x60recordCustomerConfirmation\x60, \x60listPromotions\x60 |', '\x60recordCustomerConfirmation\x60 |');
    const issues = checkSource({ ...original, plan: original.plan.replace(row, () => changed) }).issues;
    hasIssue(issues, /R19 bootstrap reads/);
    hasIssue(issues, /R19: listPromotions is a conditional lookup/);
});

test('matrix rejects new scenario gaps and new or repeated event duplicates', () => {
    const inputs = structuredClone(original);
    inputs.sources.routes.routes[0].acceptanceScenarioIds.push('SC2-MISSING');
    const types = inputs.sources.events.properties.type.enum;
    types.push('journal.updated', types.find(type => type !== 'journal.updated'));
    const issues = checkSource(inputs).issues;
    hasIssue(issues, /Untracked acceptance gap: R01\/SC2-MISSING/);
    hasIssue(issues, /Untracked duplicate event: journal.updated/);
    assert.ok(issues.filter(issue => issue.startsWith('Untracked duplicate event:')).length >= 2);
});

test('registration accepts health-only BE-02 and rejects hidden product handlers', () => {
    const empty = { milestone: 'BE-02', operations: [] };
    assert.deepEqual(checkRegistration(source, empty, health, workspace), []);
    const issues = checkRegistration(source, empty, [...health, catalogRoute, { method: 'POST', path: '/orders', handler: 'Order.write' }], workspace);
    hasIssue(issues, /Registered operation outside enabled scope: listProducts/);
    hasIssue(issues, /missing ContractOperation on POST \/orders/);
});

test('registration rejects duplicate handlers, wrong methods and missing handlers', () => {
    const result = checkRegistration(source, enabled, [...health, catalogRoute, catalogRoute, { ...catalogRoute, method: 'POST' }], workspace);
    hasIssue(result, /Duplicate HTTP registration: GET \/shops\/\{shopId\}\/products/);
    hasIssue(result, /Duplicate operation registration: listProducts/);
    hasIssue(result, /listProducts: expected GET.*got POST/);
    hasIssue(checkRegistration(source, enabled, health, workspace), /Missing HTTP registration: listProducts/);
});

test('only the exact provider callback methods are exempt from product operation registration', () => {
    const path = '/integrations/meta/messenger/webhook';
    const callback = { method: 'GET', path, handler: 'MetaMessengerController.challenge' };
    const telegram = { method: 'POST', path: '/integrations/telegram/updates', handler: 'TelegramWebhookController.update' };
    const routes = [...health, catalogRoute, callback, { ...callback, method: 'POST' }, telegram];
    assert.deepEqual(checkRegistration(source, enabled, routes, workspace), []);
    hasIssue(checkRegistration(source, enabled, [...routes, { ...callback, method: 'PATCH' }], workspace), /missing ContractOperation on PATCH/);
    hasIssue(checkRegistration(source, enabled, [...routes, { ...callback, path: '/integrations/other/webhook' }], workspace), /missing ContractOperation on GET/);
    hasIssue(checkRegistration(source, enabled, [...routes, { ...telegram, method: 'GET' }], workspace), /missing ContractOperation on GET/);
});

test('registration rejects enabled scope without a mapped executable case', () => {
    const scope = { milestone: 'BE-99', operations: [{ id: operation.id, cases: [] }, {
        id: 'getProduct', cases: [{ id: 'P0-99', file: 'tests/no-file.test.mjs' }],
    }] };
    const issues = checkRegistration(source, scope, health, workspace);
    hasIssue(issues, /Unknown milestone: BE-99/);
    hasIssue(issues, /Enabled operation has no executable case: listProducts/);
    hasIssue(issues, /unknown verification case P0-99/);
    hasIssue(issues, /missing test file for P0-99/);
});

test('discovery measures real Nest route decorators and operation metadata', async () => {
    class Catalog {
        list() { return []; }
    }
    const descriptor = Object.getOwnPropertyDescriptor(Catalog.prototype, 'list');
    Get('products')(Catalog.prototype, 'list', descriptor);
    ContractOperation(operation.id)(Catalog.prototype, 'list', descriptor);
    Controller('shops/:shopId')(Catalog);
    class FixtureModule {}
    Module({ imports: [DiscoveryModule], controllers: [Catalog] })(FixtureModule);
    const app = await NestFactory.create(FixtureModule, { logger: false, abortOnError: false });
    try {
        await app.init();
        const actual = registeredRoutes(app);
        assert.deepEqual(actual, [catalogRoute]);
        assert.deepEqual(checkRegistration(source, enabled, [...health, ...actual], workspace), []);
    } finally {
        await app.close();
    }
});

test('boundary check permits a public port and blocks frontend and private module imports', () => {
    const importer = 'BotSalesAI_Backend/apps/api/src/modules/inventory/facade.ts';
    const code = [
        "import './stock.repo.js';",
        "import '../catalog/index.js';",
        "import '../catalog/private/catalog.repo.js';",
        "import('@botsales/web');",
        "import '../../../../../../BotSalesAI_Frontend/apps/web/src/mock.js';",
    ].join('\n');
    const issues = importViolations(repository, importer, code);
    assert.equal(issues.length, 3);
    hasIssue(issues, /cross-module private import/);
    hasIssue(issues, /frontend import @botsales\/web/);
    hasIssue(issues, /frontend import.*BotSalesAI_Frontend/);
});

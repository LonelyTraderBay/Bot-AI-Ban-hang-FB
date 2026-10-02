import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { findGeneratedDrift, loadContractBundle, renderGenerated, validateContractBundle } from '../../scripts/generate.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('canonical contracts validate and generate the API base path from OpenAPI', () => {
    const bundle = loadContractBundle(root);
    assert.deepEqual(validateContractBundle(bundle), []);
    const outputs = renderGenerated(bundle);
    assert.match(outputs['packages/contracts/src/generated.ts'], /API_BASE_PATH = "\/api\/v2"/);
    assert.match(outputs['packages/contracts/src/index.ts'], /export \{ API_BASE_PATH \}/);
    assert.deepEqual(findGeneratedDrift(outputs, root), []);
});

test('generated operation registry preserves required and optional query parameter metadata', () => {
    const bundle = loadContractBundle(root);
    const outputs = renderGenerated(bundle);
    const operations = JSON.parse(outputs['packages/contracts/src/operations.json']);

    assert.deepEqual(operations.getCashflow.queryParameters, [
        { name: 'from', required: true },
        { name: 'to', required: true },
        { name: 'timezone', required: true },
    ]);
    assert.deepEqual(operations.listOrders.queryParameters.find(parameter => parameter.name === 'customerId'), {
        name: 'customerId', required: false,
    });
    assert.equal(operations.listServiceCases.queryParameters.some(parameter => parameter.name === 'customerId'), false);
});

test('rejects unresolved schema references before generation', () => {
    const bundle = structuredClone(loadContractBundle(root));
    delete bundle.api.components.schemas.Money;
    const issues = validateContractBundle(bundle);
    assert(issues.some(issue => issue.includes('unresolved reference #/components/schemas/Money')));
});

test('rejects missing API version and a server URL outside same-origin path form', () => {
    const bundle = structuredClone(loadContractBundle(root));
    delete bundle.api.info.version;
    bundle.api.servers[0].url = 'https://api.example.test/v2';
    const issues = validateContractBundle(bundle);
    assert(issues.some(issue => issue.includes('info.version is required')));
    assert(issues.some(issue => issue.includes('same-origin absolute-path server URL')));
});

test('rejects route-to-operation drift without rewriting the canonical manifest', () => {
    const bundle = structuredClone(loadContractBundle(root));
    bundle.routes.globalOperations.push('missingOperation');
    assert(validateContractBundle(bundle).some(issue => issue.includes('unknown global operation missingOperation')));
});

test('detects a stale generated file and accepts it after regeneration', () => {
    const temporaryRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-generator-')));
    try {
        const outputs = { 'generated.ts': 'fresh output\n' };
        const destination = path.join(temporaryRoot, 'generated.ts');
        fs.writeFileSync(destination, outputs['generated.ts']);
        assert.deepEqual(findGeneratedDrift(outputs, temporaryRoot), []);
        fs.writeFileSync(destination, 'manually changed output\n');
        assert.deepEqual(findGeneratedDrift(outputs, temporaryRoot), ['generated.ts']);
        fs.writeFileSync(destination, outputs['generated.ts']);
        assert.deepEqual(findGeneratedDrift(outputs, temporaryRoot), []);
    }
    finally {
        const safeRoot = fs.realpathSync(os.tmpdir());
        assert(temporaryRoot.startsWith(`${safeRoot}${path.sep}`), 'Refusing to clean a fixture outside the OS temp directory');
        fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
});

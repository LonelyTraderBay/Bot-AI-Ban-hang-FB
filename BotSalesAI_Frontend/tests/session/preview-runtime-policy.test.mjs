import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { startDemoServer } from './demo-server.mjs';

const tests = path.resolve(import.meta.dirname, '..');
function specs(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(dir, entry.name);
        return entry.isDirectory() ? specs(file) : file.endsWith('.spec.ts') ? [file] : [];
    });
}

test('browser specs with absolute dev source URLs explicitly keep every demo server in dev mode', () => {
    let checked = 0;
    for (const file of specs(tests)) {
        const source = fs.readFileSync(file, 'utf8');
        if (!/['"`]\/(?:src|@fs|@vite)\//.test(source) && !file.endsWith('demo-server-cache-isolation.spec.ts')) continue;
        const calls = source.match(/startDemoServer\s*\(/g) ?? [];
        if (!calls.length) continue;
        checked++;
        const explicit = source.match(/startDemoServer\(\{\s*runtime:\s*'dev'/g) ?? [];
        assert.equal(explicit.length, calls.length, path.relative(tests, file) + ' requires explicit dev runtime');
    }
    assert.ok(checked > 10, 'the source/fixture/cache regression inventory must remain covered');
    console.log('DEV_RUNTIME_SPECS=' + checked);
});

function withEnv(values, run) {
    const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
    Object.assign(process.env, values);
    return Promise.resolve().then(run).finally(() => {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    });
}

test('runtime selection rejects invalid values and explicit source mode overrides the CI default', () => withEnv({
    BOTSALES_E2E_RUNTIME: 'preview', BOTSALES_SHARED_DEMO_URL: 'http://127.0.0.1:1234', BOTSALES_SHARED_PREVIEW_URL: 'http://127.0.0.1:5678',
}, async () => {
    assert.throws(() => startDemoServer({ runtime: 'unknown' }), /runtime must be dev or preview/);
    const built = await startDemoServer(), source = await startDemoServer({ runtime: 'dev' });
    assert.equal(built.runtime, 'preview'); assert.equal(built.url, 'http://127.0.0.1:5678');
    assert.equal(source.runtime, 'dev'); assert.equal(source.url, 'http://127.0.0.1:1234');
    await built.close(); await source.close();
}));

test('both shared runtimes reject non-loopback, non-origin and non-HTTP URLs', () => withEnv({}, () => {
    for (const runtime of ['dev', 'preview']) {
        const key = runtime === 'dev' ? 'BOTSALES_SHARED_DEMO_URL' : 'BOTSALES_SHARED_PREVIEW_URL';
        const previous = process.env[key];
        try {
            for (const url of ['https://127.0.0.1:1234', 'http://example.com', 'http://127.0.0.1:1234/path', 'http://user:pass@127.0.0.1:1234']) {
                process.env[key] = url;
                assert.throws(() => startDemoServer({ runtime }), /loopback HTTP origin/);
            }
        } finally {
            if (previous === undefined) delete process.env[key]; else process.env[key] = previous;
        }
    }
}));

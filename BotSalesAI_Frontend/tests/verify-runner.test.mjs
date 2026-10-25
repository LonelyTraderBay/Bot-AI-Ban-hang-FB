import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { runVerification } from '../scripts/run-verify.mjs';

const source = ['test:source', 'boundaries', 'lint', 'typecheck', 'test:domain', 'test', 'build'];
const ui = ['test:layout', 'test:visual-tokens', 'test:ui-composition'];

test('verification overlaps independent lanes but keeps generation, lane order and final evidence barriers', { timeout: 2000 }, async () => {
    const calls = [];
    let releaseSource;
    const sourceStarted = new Promise(resolve => { releaseSource = resolve; });
    const result = await runVerification(async script => {
        calls.push(script);
        if (script === 'test:source') await sourceStarted;
        if (script === 'test:layout') {
            assert.ok(calls.includes('test:source'));
            releaseSource();
        }
        if (script === 'test:evidence') {
            assert.ok(calls.includes('build'));
            assert.ok(calls.includes('test:ui-composition'));
        }
        return 0;
    });
    assert.equal(result, 0);
    assert.deepEqual(calls.filter(name => source.includes(name)), source);
    assert.deepEqual(calls.filter(name => ui.includes(name)).sort(), ui.slice().sort());
    assert.deepEqual(calls.filter(name => ui.slice(1).includes(name)), ui.slice(1));
    assert.equal(calls[0], 'generate:check');
    assert.equal(calls.at(-1), 'test:evidence');
    assert.equal(calls.length, 12);
    assert.equal(new Set(calls).size, 12);
});

test('failed generation starts no lane or evidence gate', async () => {
    const calls = [];
    assert.equal(await runVerification(async script => { calls.push(script); return 7; }), 1);
    assert.deepEqual(calls, ['generate:check']);
});

test('source failure stops its lane, finishes UI diagnostics and rejects evidence', async () => {
    const calls = [];
    assert.equal(await runVerification(async script => { calls.push(script); return script === 'lint' ? 9 : 0; }), 1);
    assert.deepEqual(calls.filter(name => source.includes(name)), source.slice(0, 3));
    assert.deepEqual(calls.filter(name => ui.includes(name)).sort(), ui.slice().sort());
    assert.ok(!calls.includes('test:evidence'));
});

test('layout failure still finishes other diagnostics and rejects evidence', async () => {
    const calls = [];
    assert.equal(await runVerification(async script => { calls.push(script); return script === 'test:layout' ? 9 : 0; }), 1);
    assert.deepEqual(calls.filter(name => source.includes(name)), source);
    assert.deepEqual(calls.filter(name => ui.includes(name)).sort(), ui.slice().sort());
    assert.ok(!calls.includes('test:evidence'));
});

test('layout and composition audits overlap behind the generation barrier', { timeout: 2000 }, async () => {
    let releaseLayout;
    const compositionStarted = new Promise(resolve => { releaseLayout = resolve; });
    assert.equal(await runVerification(async script => {
        if (script === 'test:layout') await compositionStarted;
        if (script === 'test:ui-composition') releaseLayout();
        return 0;
    }), 0);
});

test('third-lane failure stops composition but finishes source/layout and rejects evidence', async () => {
    const calls = [];
    assert.equal(await runVerification(async script => { calls.push(script); return script === 'test:visual-tokens' ? 9 : 0; }), 1);
    assert.deepEqual(calls.filter(name => source.includes(name)), source);
    assert.ok(calls.includes('test:layout'));
    assert.ok(!calls.includes('test:ui-composition'));
    assert.ok(!calls.includes('test:evidence'));
});

test('final evidence failure cannot become successful verification', async () => {
    const calls = [];
    assert.equal(await runVerification(async script => { calls.push(script); return script === 'test:evidence' ? 9 : 0; }), 1);
    assert.equal(calls.at(-1), 'test:evidence');
    assert.equal(calls.length, 12);
});

test('the real CLI through a directory alias preserves child failure and rejects final evidence', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-runner-'));
    assert.equal(path.dirname(fs.realpathSync(root)), fs.realpathSync(os.tmpdir()));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const events = path.join(root, 'events.jsonl');
    const cli = path.join(root, 'npm-fixture.cjs');
    fs.writeFileSync(cli, `const fs=require('node:fs');const name=process.argv[3];
fs.appendFileSync(process.env.VERIFY_TEST_EVENTS,JSON.stringify(name)+'\\n');
if(name==='test:layout'){console.error('VERIFY_EXPECTED_CHILD_FAILURE');process.exitCode=7;}`);
    const entry = path.join(root, 'entry');
    const alias = path.join(root, 'entry-alias');
    fs.mkdirSync(entry);
    assert.equal(path.dirname(fs.realpathSync(entry)), fs.realpathSync(root));
    fs.copyFileSync(fileURLToPath(new URL('../scripts/run-verify.mjs', import.meta.url)), path.join(entry, 'run-verify.mjs'));
    fs.symlinkSync(entry, alias, 'junction');
    assert.equal(fs.realpathSync(alias), fs.realpathSync(entry));
    const result = spawnSync(process.execPath, [path.join(alias, 'run-verify.mjs')], {
        env: { ...process.env, npm_execpath: cli, VERIFY_TEST_EVENTS: events },
        encoding: 'utf8', windowsHide: true, timeout: 20_000,
    });
    assert.equal(result.status, 1, result.error?.message || result.stderr);
    assert.match(result.stdout, /VERIFY_EXPECTED_CHILD_FAILURE/);
    const calls = fs.readFileSync(events, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(calls[0], 'generate:check');
    assert.deepEqual(calls.filter(name => source.includes(name)), source);
    assert.deepEqual(calls.filter(name => ui.includes(name)).sort(), ui.slice().sort());
    assert.ok(!calls.includes('test:evidence'));
});

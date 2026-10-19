import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkRepository, inspectEntries, parseIndex } from './check-repository-hygiene.mjs';

const entries = (...paths) => paths.map(file => ({ path: file, stage: 0 }));

test('parses NUL-delimited index paths without losing whitespace or merge stages', () => {
    const oid = 'a'.repeat(40);
    const parsed = parseIndex(`100644 ${oid} 0\tfile with spaces.md\0` + `100644 ${oid} 2\tline\nbreak.md\0`);
    assert.equal(parsed[0].path, 'file with spaces.md');
    assert.equal(parsed[1].path, 'line\nbreak.md');
    assert.equal(parsed[1].stage, 2);
    assert.equal(inspectEntries(parsed)[0].rule, 'unmerged-index');
    assert.throws(() => parseIndex('invalid\0'), /Cannot parse/);
});

test('allows application source, evidence images and partial historical source captures', () => {
    assert.deepEqual(inspectEntries(entries(
        'BotSalesAI_Frontend/package.json', 'botsales-kit/contracts/openapi.json',
        'BotSalesAI_Frontend/apps/web/src/app/Shell.tsx',
        'BotSalesAI_Frontend/evidence/review/before.png',
        'BotSalesAI_Frontend/evidence/review/trace.zip',
        'BotSalesAI_Frontend/evidence/entrypoints-before/BotSalesAI_Frontend/README.md',
        'BotSalesAI_Frontend/evidence/clean-install/BotSalesAI_Frontend/package.json',
    )), []);
});

test('rejects tracked dependency, cache and disposable output paths including nested copies', () => {
    const files = [
        'BotSalesAI_Frontend/node_modules/pkg/index.js',
        'BotSalesAI_Frontend/evidence/run/__pycache__/audit.pyc',
        'scripts/check.pyo', 'BotSalesAI_Frontend/apps/web/dist/index.html',
        'BotSalesAI_Frontend/apps/web/dist-demo/index.html',
        'BotSalesAI_Frontend/test-results/trace.zip',
        'BotSalesAI_Frontend/coverage/summary.json',
        'BotSalesAI_Frontend/playwright-report/index.html',
        '.repo-scratch/copied.js',
    ];
    const found = inspectEntries(entries(...files));
    assert.equal(found.length, files.length);
    assert.ok(found.every(row => row.rule === 'generated-payload'));
});

test('rejects real environment values and allows the repository example naming convention', () => {
    const found = inspectEntries(entries('.env', 'apps/.env.local', 'apps/.env.production', '.env.example', 'apps/.env.live.example'));
    assert.deepEqual(found.map(row => row.path).sort(), ['.env', 'apps/.env.local', 'apps/.env.production']);
    assert.ok(found.every(row => row.rule === 'environment-values'));
});

test('rejects complete nested frontend/kit copies while retaining the real workspaces', () => {
    const prefix = 'BotSalesAI_Frontend/evidence/clean-install-r2/';
    const found = inspectEntries(entries('BotSalesAI_Frontend/package.json', 'botsales-kit/contracts/openapi.json',
        `${prefix}BotSalesAI_Frontend/package.json`, `${prefix}botsales-kit/contracts/openapi.json`));
    assert.equal(found.length, 1);
    assert.equal(found[0].rule, 'nested-workspace');
    assert.equal(found[0].path, `${prefix}BotSalesAI_Frontend/package.json`);
});

test('rejects numeric shell output and nonportable paths', () => {
    const found = inspectEntries(entries('BotSalesAI_Frontend/0', 'BotSalesAI_Frontend/1', 'BotSalesAI_Frontend/123', '../escape.txt', 'C:/absolute.txt', 'bad\\path.txt'));
    assert.equal(found.filter(row => row.rule === 'shell-output').length, 3);
    assert.equal(found.filter(row => row.rule === 'nonportable-path').length, 3);
});

test('checks the actual Git index and distinguishes staged policy checks from clean checkout checks', t => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'botsales-hygiene-'));
    t.after(() => {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith('botsales-hygiene-'));
        rmSync(root, { recursive: true, force: true });
    });
    const git = args => execFileSync('git', args, { cwd: root, stdio: 'pipe' });
    git(['init', '--quiet']);
    writeFileSync(path.join(root, 'README.md'), 'Fixture\n');
    git(['add', '--', 'README.md']);
    assert.equal(checkRepository(root).status, 'PASS');
    assert.equal(checkRepository(root, { requireClean: true }).status, 'FAIL');
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgSign=false', 'commit', '--quiet', '-m', 'Fixture']);
    assert.equal(checkRepository(root, { requireClean: true }).status, 'PASS');
    mkdirSync(path.join(root, 'BotSalesAI_Frontend', 'node_modules', 'pkg'), { recursive: true });
    writeFileSync(path.join(root, 'BotSalesAI_Frontend', 'node_modules', 'pkg', 'index.js'), 'export {};\n');
    git(['add', '--', '.']);
    assert.equal(checkRepository(root).violations[0].rule, 'generated-payload');
    writeFileSync(path.join(root, '.gitignore'), readFileSync(new URL('../../.gitignore', import.meta.url)));
    const ignored = git(['check-ignore', '--no-index', '--',
        'BotSalesAI_Frontend/0', 'BotSalesAI_Frontend/1',
        'BotSalesAI_Frontend/evidence/review/clean-install-r2/BotSalesAI_Frontend/package.json',
    ]).toString().trim().split(/\r?\n/);
    assert.equal(ignored.length, 3);
    for (const file of ['BotSalesAI_Frontend/evidence/review/before.png',
        'BotSalesAI_Frontend/evidence/clean-install/BotSalesAI_Frontend/package.json'])
        assert.throws(() => git(['check-ignore', '--no-index', '--', file]), error => error.status === 1);
});

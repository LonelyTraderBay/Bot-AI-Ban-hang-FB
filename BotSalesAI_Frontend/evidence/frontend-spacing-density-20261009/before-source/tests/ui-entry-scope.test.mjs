import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';
import { auditUiEntryScope } from '../scripts/ui-entry-scope.mjs';
import { require as projectRequire } from '../scripts/tools.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-entry-scope-'));
let sequence = 0;
after(() => { assert.ok(path.resolve(temporary).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)); fs.rmSync(temporary, { recursive: true, force: true }); });
function fixture(kind) {
    const root = path.join(temporary, String(++sequence));
    prepareUiSourceProject(root);
    fs.mkdirSync(path.join(root, 'apps/web/src/modules'), { recursive: true });
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.copyFileSync('scripts/layout-exceptions.schema.json', path.join(root, 'scripts/layout-exceptions.schema.json'));
    fs.writeFileSync(path.join(root, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }));
    const html = path.join(root, 'apps/web/index.html');
    if (kind === 'missing-html') fs.unlinkSync(html);
    if (kind === 'missing-style') fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<head>', '<head><link rel=stylesheet href="/src/missing.css">'));
    if (kind === 'inline-style') fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<body>', '<body style="padding: 16px">'));
    if (kind === 'alias-mismatch') {
        const vite = path.join(root, 'apps/web/vite.config.ts');
        fs.writeFileSync(vite, fs.readFileSync(vite, 'utf8').replace("'./src'", "'./wrong-source'"));
    }
    return root;
}
for (const gate of ['check-layout', 'check-visual-tokens', 'check-ui-composition']) for (const kind of ['missing-html', 'missing-style', 'inline-style', 'alias-mismatch']) test(`${gate} rejects ${kind} at the UI entry boundary`, () => {
    const run = spawnSync(process.execPath, [path.resolve(`scripts/${gate}.mjs`), '--json'], { cwd: fixture(kind), encoding: 'utf8', windowsHide: true });
    assert.equal(run.error, undefined);
    assert.notEqual(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout + run.stderr, /entry|HTML|asset|alias/i);
});
test('DOM entry inspection never executes an inline script and detects decoded attributes', context => {
    const root = fixture();
    const html = path.join(root, 'apps/web/index.html');
    const observed = context.mock.method(console, 'log', () => {});
    const { JSDOM } = projectRequire('jsdom');
    const control = new JSDOM('<script>console.log("BOTSALES_ENTRY_CONTROL")</script>', { runScripts: 'dangerously' });
    control.window.close();
    assert.ok(observed.mock.calls.some(call => call.arguments.includes('BOTSALES_ENTRY_CONTROL')));
    observed.mock.resetCalls();
    fs.writeFileSync(html, '<!doctype html><body style="padding&#58;16px"><script>console.log("BOTSALES_ENTRY_EXECUTED")</script></body>');
    const report = auditUiEntryScope(root, { paths: {}, baseUrl: path.join(root, 'apps/web') });
    assert.ok(!observed.mock.calls.some(call => call.arguments.includes('BOTSALES_ENTRY_EXECUTED')));
    assert.ok(report.issues.some(row => row.message.includes('inline HTML')));
});

test('manifest icons are resolved and malformed manifest data fails closed', () => {
    const root = fixture();
    const publicRoot = path.join(root, 'apps/web/public');
    fs.mkdirSync(publicRoot, { recursive: true });
    const manifest = path.join(publicRoot, 'manifest.webmanifest');
    fs.writeFileSync(manifest, JSON.stringify({ icons: [{ src: '/missing.png' }] }));
    const html = path.join(root, 'apps/web/index.html');
    fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('<head>', '<head><link rel=manifest href=/manifest.webmanifest>'));
    const config = { paths: { '@/*': ['src/*'], '@botsales/tokens': ['../../packages/design-tokens/src/index.ts'] }, baseUrl: path.join(root, 'apps/web') };
    assert.ok(auditUiEntryScope(root, config).issues.some(row => row.message.includes('missing.png')));
    fs.writeFileSync(manifest, '{');
    assert.ok(auditUiEntryScope(root, config).issues.some(row => row.message.includes('Manifest parse error')));
});

test('data and remote module sources cannot stand in for a scanned script entry', () => {
    const root = fixture();
    for (const src of ['data:text/javascript,alert(1)', 'https://invalid.example/main.js']) {
        fs.writeFileSync(path.join(root, 'apps/web/index.html'), `<!doctype html><script type=module src="${src}"></script>`);
        assert.ok(auditUiEntryScope(root, { paths: {} }).issues.some(row => row.message.includes('first-party script')));
    }
});

test('an unused alias map cannot prove the exported Vite configuration', () => {
    const root = fixture();
    const vite = path.join(root, 'apps/web/vite.config.ts');
    fs.writeFileSync(vite, fs.readFileSync(vite, 'utf8').replace('export default', 'const unused =') + '\nexport default {};');
    const report = auditUiEntryScope(root, { paths: { '@/*': ['src/*'] }, baseUrl: path.join(root, 'apps/web') });
    assert.ok(report.issues.some(row => row.message.includes('Vite alias map')));
});

test('a Vite HTML generator cannot inject an unscanned stylesheet through a hook', () => {
    const root = fixture();
    const vite = path.join(root, 'apps/web/vite.config.ts');
    fs.appendFileSync(vite, '\nconst plugin = { transformIndexHtml() { return "<style>body{padding:99px}</style>"; } };');
    const report = auditUiEntryScope(root, { paths: {} });
    assert.ok(report.issues.some(row => row.message.includes('generated source mapping')));
});

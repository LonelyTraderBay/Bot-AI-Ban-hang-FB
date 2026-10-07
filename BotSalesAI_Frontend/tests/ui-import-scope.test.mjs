import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';
import { auditUiImportScope } from '../scripts/ui-import-scope.mjs';
import { require as projectRequire } from '../scripts/tools.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-import-scope-'));
let sequence = 0;
after(() => { assert.ok(path.resolve(temporary).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`)); fs.rmSync(temporary, { recursive: true, force: true }); });
function fixture(source = 'export {};') {
    const root = path.join(temporary, String(++sequence));
    prepareUiSourceProject(root);
    fs.mkdirSync(path.join(root, 'apps/web/src/modules'), { recursive: true });
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.copyFileSync('scripts/layout-exceptions.schema.json', path.join(root, 'scripts/layout-exceptions.schema.json'));
    fs.writeFileSync(path.join(root, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }));
    const file = path.join(root, 'apps/web/src/entry.tsx');
    fs.writeFileSync(file, source);
    return { root, file };
}
for (const gate of ['check-layout', 'check-visual-tokens', 'check-ui-composition']) for (const [name, source] of [
    ['relative missing import', "import './missing';"],
    ['aliased missing import', "export * from '@/missing';"],
    ['missing CSS import', "import './missing.css';"],
    ['opaque dynamic import', 'const target = window.location.hash; import(target);'],
]) test(`${gate} fails closed for ${name}`, () => {
    const { root } = fixture(source);
    const run = spawnSync(process.execPath, [path.resolve(`scripts/${gate}.mjs`), '--json'], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.equal(run.error, undefined);
    assert.notEqual(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout + run.stderr, /import|scope/i);
});
test('scope follows a canonical package alias and classifies data assets separately', () => {
    const { root, file } = fixture("import { tokens } from '@botsales/tokens'; import './data.json';");
    fs.writeFileSync(path.join(root, 'apps/web/src/data.json'), '{}');
    const report = auditUiImportScope(root, [file]);
    assert.deepEqual(report.issues, []);
    assert.ok(report.files.includes(path.join(root, 'packages/design-tokens/src/index.ts')));
    assert.deepEqual(report.assets, [path.join(root, 'apps/web/src/data.json')]);
});
test('scope follows CSS imports and rejects a missing nested stylesheet', () => {
    const { root, file } = fixture("import './local.css';");
    fs.writeFileSync(path.join(root, 'apps/web/src/local.css'), '@import "./missing.css";');
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('missing.css')));
});
test('missing and malformed tsconfig cannot silently supply default resolution', () => {
    const { root, file } = fixture();
    const config = path.join(root, 'apps/web/tsconfig.json');
    fs.unlinkSync(config);
    assert.ok(auditUiImportScope(root, [file]).issues.length);
    fs.writeFileSync(config, '{"compilerOptions":');
    assert.ok(auditUiImportScope(root, [file]).issues.length);
});

test('scope rejects discovered script sources omitted by the compiler config', () => {
    const { root, file } = fixture();
    const hidden = path.join(root, 'apps/web/src/hidden.tsx');
    fs.writeFileSync(hidden, 'export {};');
    const config = path.join(root, 'apps/web/tsconfig.json');
    const value = JSON.parse(fs.readFileSync(config, 'utf8'));
    value.include = ['src/entry.tsx'];
    fs.writeFileSync(config, JSON.stringify(value));
    assert.ok(auditUiImportScope(root, [file, hidden]).issues.some(row => row.message.includes('excluded')));
});

test('config includes are discovered even when a package source has no app import yet', () => {
    const { root, file } = fixture();
    const added = path.join(root, 'packages/design-tokens/src/added.ts');
    fs.writeFileSync(added, 'export {};');
    assert.ok(auditUiImportScope(root, [file]).files.includes(added));
});

test('a first-party import cannot silently claim source outside the project', () => {
    const { root, file } = fixture();
    const outside = path.join(temporary, 'outside.ts');
    fs.writeFileSync(outside, 'export {};');
    const specifier = path.relative(path.dirname(file), outside).split(path.sep).join('/');
    fs.writeFileSync(file, `import '${specifier}';`);
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('escapes project')));
});

test('malformed CSS and unhandled stylesheet languages cannot be classified as harmless data', () => {
    const { root, file } = fixture("import './broken.css'; import './custom.scss';");
    fs.writeFileSync(path.join(root, 'apps/web/src/broken.css'), '.x { color: red;');
    fs.writeFileSync(path.join(root, 'apps/web/src/custom.scss'), '$size: 16px;');
    const messages = auditUiImportScope(root, [file]).issues.map(row => row.message);
    assert.ok(messages.some(message => message.includes('CSS parse error')));
    assert.ok(messages.some(message => message.includes('Unsupported stylesheet')));
});

test('CSS asset URLs resolve with queries and fragments and reject missing files', () => {
    const { root, file } = fixture("import './assets.css';");
    const css = path.join(root, 'apps/web/src/assets.css');
    const font = path.join(root, 'apps/web/src/font.woff2');
    fs.writeFileSync(font, 'Synthetic file-presence fixture, not a valid font or a render PASS.');
    fs.writeFileSync(css, '@font-face {src:url("./font.woff2?v=1#test")}');
    const valid = auditUiImportScope(root, [file]);
    assert.deepEqual(valid.issues, []);
    assert.ok(valid.assets.includes(font));
    fs.writeFileSync(css, '.x { background-image:url(./missing.png) }');
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('missing.png')));
});

test('native service worker scripts enter the source closure and missing URLs fail', () => {
    const { root, file } = fixture("navigator.serviceWorker.register('/push.js');");
    const worker = path.join(root, 'apps/web/public/push.js');
    fs.mkdirSync(path.dirname(worker), { recursive: true });
    fs.writeFileSync(worker, 'self.addEventListener("push", () => {});');
    assert.ok(auditUiImportScope(root, [file]).files.includes(worker));
    fs.unlinkSync(worker);
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('push.js')));
});

test('Vite BASE_URL sample downloads enter asset coverage and missing samples fail', () => {
    const { root, file } = fixture("export const link = <a href={import.meta.env.BASE_URL + 'samples/products.csv'}>CSV</a>;");
    const sample = path.join(root, 'apps/web/public/samples/products.csv');
    fs.mkdirSync(path.dirname(sample), { recursive: true });
    fs.writeFileSync(sample, 'sku,name\nDEMO,Synthetic sample\n');
    assert.ok(auditUiImportScope(root, [file]).assets.includes(sample));
    fs.unlinkSync(sample);
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('products.csv')));
});

test('a declared MSW worker has a vendor owner and rejects modifications', () => {
    const { root, file } = fixture("export const options = { serviceWorker: { url: '/mockServiceWorker.js' } };");
    const worker = path.join(root, 'apps/web/public/mockServiceWorker.js');
    const installed = path.join(path.dirname(projectRequire.resolve('msw/package.json')), 'lib/mockServiceWorker.js');
    fs.mkdirSync(path.dirname(worker), { recursive: true });
    fs.copyFileSync(installed, worker);
    const valid = auditUiImportScope(root, [file]);
    assert.deepEqual(valid.issues, []);
    assert.ok(valid.assets.includes(worker));
    assert.ok(!valid.files.includes(worker));
    fs.appendFileSync(worker, '\n// Unauthorized vendor modification.\n');
    assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('vendor source')));
});

test('CommonJS and TypeScript import-equals cannot hide missing first-party modules', () => {
    for (const source of ["const view = require('./missing.cjs');", "import view = require('./missing');"]) {
        const { root, file } = fixture(source);
        assert.ok(auditUiImportScope(root, [file]).issues.some(row => row.message.includes('missing')));
    }
});

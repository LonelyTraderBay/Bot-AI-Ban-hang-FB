import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { typescript } from '../scripts/tools.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-compiler-contract-'));
const source = fs.readFileSync('scripts/tools.mjs', 'utf8');
let sequence = 0;
after(() => {
    assert.ok(path.resolve(temporary).startsWith(`${path.resolve(os.tmpdir())}${path.sep}`));
    fs.rmSync(temporary, { recursive: true, force: true });
});

function installCompiler(root, { version = '5.9.2', actualVersion = version } = {}) {
    const directory = path.join(root, 'node_modules/typescript');
    fs.mkdirSync(path.join(directory, 'lib'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ name: 'typescript', version, main: 'index.cjs' }));
    fs.writeFileSync(path.join(directory, 'index.cjs'), `module.exports = { version: ${JSON.stringify(actualVersion)} };`);
    fs.writeFileSync(path.join(directory, 'lib/tsc.js'), '// Synthetic executable path; not a real compiler or a typecheck PASS.\n');
}

async function fixture({ install = true, version, actualVersion, ancestor = false, pin = '5.9.2', missingExecutable = false } = {}) {
    const parent = path.join(temporary, String(++sequence));
    const root = path.join(parent, 'project');
    fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ type: 'module', devDependencies: { typescript: pin } }));
    fs.writeFileSync(path.join(root, 'scripts/tools.mjs'), source);
    if (install) installCompiler(ancestor ? parent : root, { version, actualVersion });
    if (missingExecutable) fs.unlinkSync(path.join(root, 'node_modules/typescript/lib/tsc.js'));
    return { root, tools: await import(pathToFileURL(path.join(root, 'scripts/tools.mjs'))) };
}

test('uses the installed project compiler and the pinned version in this checkout', () => {
    const compiler = typescript();
    assert.equal(compiler.ts.version, JSON.parse(fs.readFileSync('package.json', 'utf8')).devDependencies.typescript);
    assert.equal(compiler.source, 'project dependency');
    assert.ok(fs.existsSync(compiler.path));
});

test('accepts a local compiler whose manifest, module and executable match the project', async () => {
    const { root, tools } = await fixture();
    const compiler = tools.typescript();
    assert.equal(compiler.ts.version, '5.9.2');
    assert.equal(compiler.source, 'project dependency');
    assert.ok(compiler.path.startsWith(path.join(root, 'node_modules/typescript')));
});

for (const [name, options] of [
    ['missing local compiler', { install: false }],
    ['different installed package version', { version: '5.9.1' }],
    ['module version differs from its manifest', { actualVersion: '5.8.3' }],
    ['ancestor compiler silently resolved outside this project', { ancestor: true }],
    ['missing compiler executable', { missingExecutable: true }],
    ['unpinned project compiler requirement', { pin: '^5.9.2' }],
]) test(`fails closed for ${name} without selecting a global fallback`, async () => {
    const { tools } = await fixture(options);
    assert.throws(() => tools.typescript(), error => error.code === 'ERR_PROJECT_TYPESCRIPT');
});

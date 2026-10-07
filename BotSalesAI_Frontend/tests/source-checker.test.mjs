import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { hasForbiddenLiteralColor, isModuleSourceFile } from '../scripts/source-policy.mjs';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-source-checker-'));
const checkerPath = path.resolve('scripts/check-source.mjs');

function writeFixture(source) {
    const files = {
        'packages/contracts/src/operations.json': '{}',
        'packages/contracts/src/permissions.json': JSON.stringify({ permissions: [] }),
        'packages/contracts/src/routes.json': JSON.stringify({ routes: [] }),
        'packages/design-tokens/src/tokens.json': JSON.stringify({ colors: { canvas: '#111111' } }),
        'docs/route-implementation.json': '[]',
        'apps/web/public/manifest.webmanifest': JSON.stringify({ background_color: '#111111', theme_color: '#111111' }),
        'apps/web/src/modules/fixture/index.tsx': source,
        'apps/web/src/app/outside.tsx': "export function Outside() { return <div data-sample='#ABCDEF' />; }",
    };
    for (const [relativePath, contents] of Object.entries(files)) {
        const file = path.join(fixtureRoot, relativePath);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, contents);
    }
}

function runChecker() {
    return spawnSync(process.execPath, [checkerPath, '--root', fixtureRoot], { encoding: 'utf8', windowsHide: true });
}

test('module path classification accepts Windows and POSIX spellings, but excludes app files', () => {
    assert.equal(isModuleSourceFile('C:\\fixture-root', 'C:\\fixture-root\\apps\\web\\src\\modules\\catalog\\index.tsx'), true);
    assert.equal(isModuleSourceFile('C:/fixture-root', 'C:/fixture-root/apps/web/src/modules/catalog/index.tsx'), true);
    assert.equal(isModuleSourceFile('/fixture-root', '/fixture-root/apps/web/src/modules/catalog/index.tsx'), true);
    assert.equal(isModuleSourceFile('/fixture-root', '/fixture-root/apps/web/src/app/index.tsx'), false);
    assert.equal(hasForbiddenLiteralColor("theme: '#abcdef'"), true);
    assert.equal(hasForbiddenLiteralColor("theme: 'palette.canvas'"), false);
});

test('the source-checker CLI rejects a prohibited color literal in a module', () => {
    writeFixture("export function FixturePage() { return <div data-tone='#FF0000' />; }\n");
    const result = runChecker();
    assert.equal(result.status, 1, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.files, 2);
    assert.ok(report.issues.some(issue => issue.includes('Literal color outside source tokens') && issue.includes('apps') && issue.includes('modules')));
});

test('the source-checker CLI accepts a token-based module and leaves app-level colors outside the rule', () => {
    writeFixture('export function FixturePage() { return <div className="surface" />; }\n');
    const result = runChecker();
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const report = JSON.parse(result.stdout);
    assert.equal(report.status, 'PASS');
    assert.equal(report.files, 2);
    assert.deepEqual(report.issues, []);
});

after(() => {
    const actualRoot = fs.realpathSync(fixtureRoot);
    const actualTemp = fs.realpathSync(os.tmpdir());
    const relativeRoot = path.relative(actualTemp, actualRoot);
    assert.ok(relativeRoot.startsWith('botsales-source-checker-'), `Fixture escaped the owned temp directory: ${actualRoot}`);
    assert.equal(path.isAbsolute(relativeRoot), false);
    assert.notEqual(relativeRoot, '..');
    assert.ok(!relativeRoot.startsWith(`..${path.sep}`));
    fs.rmSync(actualRoot, { recursive: true, force: true });
});

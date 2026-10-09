import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { typescript } from '../scripts/tools.mjs';
import { createUiBindings } from '../scripts/ui-bindings.mjs';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';

const { ts } = typescript();
function fixture(t, source, extra = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-bindings-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    prepareUiSourceProject(root);
    const files = {
        'packages/design-tokens/src/index.ts': 'export const tokens = { space: { lg: 16 } }; export const colors = { primary: "#fff" };',
        'apps/web/src/shared/ui/layout.ts': 'export const layoutSx = { form: { fieldGap: { gap: 2 } } };',
        'apps/web/src/shared/ui/composition.tsx': 'export function FormFields() { return null; }',
        'apps/web/src/probe.tsx': source,
        ...extra,
    };
    for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), content);
    }
    const probe = path.join(root, 'apps/web/src/probe.tsx');
    const bindings = createUiBindings(root, [probe]);
    const results = new Map();
    function visit(node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text.startsWith('result')) results.set(node.name.text, bindings.reference(node.initializer));
        ts.forEachChild(node, visit);
    }
    visit(bindings.source(probe));
    return results;
}
test('canonical renamed import and constant alias preserve owner and path', t => {
    const values = fixture(t, 'import { tokens as T } from "@botsales/tokens"; const local = T.space; const result = local.lg;');
    assert.deepEqual(values.get('result'), { owner: 'tokens', exportName: 'tokens', path: ['space', 'lg'] });
});
test('namespace and literal element access resolve canonical exports', t => {
    const values = fixture(t, 'import * as L from "./shared/ui/layout"; const result = L["layoutSx"]["form"].fieldGap;');
    assert.deepEqual(values.get('result'), { owner: 'layout', exportName: 'layoutSx', path: ['form', 'fieldGap'] });
});
test('barrel re-export resolves original component identity', t => {
    const values = fixture(t, 'import { Fields as Alias } from "./barrel"; const result = Alias;', { 'apps/web/src/barrel.ts': 'export { FormFields as Fields } from "./shared/ui/composition";' });
    assert.deepEqual(values.get('result'), { owner: 'composition', exportName: 'FormFields', path: [] });
});
test('parameter shadow does not inherit canonical import trust', t => {
    const values = fixture(t, 'import { tokens } from "@botsales/tokens"; function f(tokens: any) { const resultShadow = tokens.space.lg; } const resultReal = tokens.space.lg;');
    assert.equal(values.get('resultShadow'), null);
    assert.equal(values.get('resultReal').owner, 'tokens');
});
test('fake trusted names and a module named visual are not canonical', t => {
    const values = fixture(t, 'import { visualSx } from "./fake/visual"; const tokens = { space: { lg: 99 } }; const resultName = tokens.space.lg; const resultSuffix = visualSx.radius;', { 'apps/web/src/fake/visual.ts': 'export const visualSx = { radius: 99 };' });
    assert.equal(values.get('resultName'), null);
    assert.equal(values.get('resultSuffix'), null);
});
test('mutable aliases, opaque keys and cyclic locals are not proven canonical', t => {
    const values = fixture(t, 'import { tokens } from "@botsales/tokens"; let mutable = tokens; const key = Math.random(); const a = b; const b = a; const resultMutable = mutable.space; const resultOpaque = tokens[key]; const resultCycle = a;');
    for (const value of values.values()) assert.equal(value, null);
});
test('destructured constant and safe type syntax preserve provenance', t => {
    const values = fixture(t, 'import { tokens } from "@botsales/tokens"; const { space: S } = tokens; const result = (S.lg as number) satisfies number;');
    assert.deepEqual(values.get('result'), { owner: 'tokens', exportName: 'tokens', path: ['space', 'lg'] });
});
test('installed MUI renamed styled resolves while local styled does not', t => {
    const values = fixture(t, 'import { styled as factory } from "@mui/material/styles"; const resultReal = factory; function f(styled: any) { const resultFake = styled; }', {
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/styles/index.d.ts': 'export declare function styled(value: unknown): unknown;',
    });
    assert.deepEqual(values.get('resultReal'), { owner: 'mui', exportName: 'styled', path: [] });
    assert.equal(values.get('resultFake'), null);
});
test('JavaScript workers remain in the Program import closure', t => {
    const values = fixture(t, 'import { workerValue } from "./worker.js"; const result = workerValue;', { 'apps/web/src/worker.js': 'import { tokens } from "@botsales/tokens"; export const workerValue = tokens.space.lg;' });
    assert.deepEqual(values.get('result'), { owner: 'tokens', exportName: 'tokens', path: ['space', 'lg'] });
});
test('malformed element access is unproven rather than crashing the resolver', t => {
    const values = fixture(t, 'import { tokens } from "@botsales/tokens"; const result = tokens[];');
    assert.equal(values.get('result'), null);
});
test('a tsconfig alias cannot label another dependency as genuine MUI', t => {
    const values = fixture(t, 'import { styled } from "@mui/material/styles"; const result = styled;', {
        'apps/web/tsconfig.json': JSON.stringify({ compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', baseUrl: '.', paths: { '@mui/material/styles': ['../../node_modules/foreign/index.d.ts'] } }, include: ['src', '../../packages/design-tokens/src'] }),
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/index.d.ts': 'export {};',
        'node_modules/foreign/package.json': JSON.stringify({ name: 'foreign', types: 'index.d.ts' }),
        'node_modules/foreign/index.d.ts': 'export declare function styled(value: unknown): unknown;',
    });
    assert.equal(values.get('result'), null);
});
test('MUI re-export through a first-party barrel keeps library identity', t => {
    const values = fixture(t, 'import { Row } from "./barrel"; const result = Row;', {
        'apps/web/src/barrel.ts': 'export { Stack as Row } from "@mui/material";',
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/index.d.ts': 'export declare function Stack(props: any): any;',
    });
    assert.deepEqual(values.get('result'), { owner: 'mui', exportName: 'Stack', path: [] });
});
test('constant property-key aliases preserve canonical element access', t => {
    const values = fixture(t, 'import * as L from "./shared/ui/layout"; const key = "layoutSx" as const; const alias = key; const result = L[alias].form.fieldGap;');
    assert.deepEqual(values.get('result'), { owner: 'layout', exportName: 'layoutSx', path: ['form', 'fieldGap'] });
});

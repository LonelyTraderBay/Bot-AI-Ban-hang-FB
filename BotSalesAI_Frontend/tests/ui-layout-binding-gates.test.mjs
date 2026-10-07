import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';

function audit(t, source, extras = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-layout-bindings-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    prepareUiSourceProject(root);
    const files = {
        'apps/web/src/modules/probe/index.tsx': source,
        'apps/web/src/shared/ui/layout.ts': fs.readFileSync('apps/web/src/shared/ui/layout.ts', 'utf8'),
        'apps/web/src/shared/ui/theme.ts': fs.readFileSync('apps/web/src/shared/ui/theme.ts', 'utf8'),
        'apps/web/src/app/tokens.css': fs.readFileSync('apps/web/src/app/tokens.css', 'utf8'),
        'scripts/layout-exceptions.json': JSON.stringify({ version: 1, exceptions: [] }),
        'scripts/layout-exceptions.schema.json': fs.readFileSync('scripts/layout-exceptions.schema.json', 'utf8'),
        // Controlled library declarations only; actual workspace gates remain a separate check.
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/index.d.ts': 'export declare function Stack(props: any): any; export declare function Box(props: any): any; export declare function GlobalStyles(props: any): any;',
        'node_modules/@mui/material/styles/index.d.ts': 'export type SxProps<T> = any; export interface Theme {} export declare function createTheme(options: any): any; export declare function styled(value: unknown): (style: unknown) => unknown;',
        'node_modules/react-hook-form/package.json': JSON.stringify({ name: 'react-hook-form', types: 'index.d.ts' }),
        'node_modules/react-hook-form/index.d.ts': 'export declare function Controller(props: any): any; export declare function useForm(): any;',
        'node_modules/react/package.json': JSON.stringify({ name: 'react', types: 'index.d.ts' }),
        'node_modules/react/index.d.ts': 'export declare function createElement(type: any, props: any, ...children: any[]): any; export declare function cloneElement(element: any, props: any): any;',
        'node_modules/react/jsx-runtime.d.ts': 'export declare function jsx(type: any, props: any): any; export declare function jsxs(type: any, props: any): any;',
        'node_modules/react/jsx-dev-runtime.d.ts': 'export declare function jsxDEV(type: any, props: any): any;',
        'node_modules/@emotion/react/package.json': JSON.stringify({ name: '@emotion/react', types: 'index.d.ts' }),
        'node_modules/@emotion/react/index.d.ts': 'export declare function css(...styles: any[]): any; export declare function Global(props: any): any;',
        ...extras,
    };
    for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), content);
    }
    const result = spawnSync(process.execPath, [path.resolve('scripts/check-layout.mjs'), '--root', root, '--json'], { encoding: 'utf8' });
    assert.ok(result.stdout, result.stderr);
    return { ...JSON.parse(result.stdout), exit: result.status };
}
test('canonical writes through casts and aliases fail outside style expressions', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const alias = layoutSx.form.fieldGap; (alias as any).gap += 1; delete (layoutSx as any).form;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'CANONICAL_UI_MUTATION').length, 2);
});
test('Object.assign cannot mutate canonical data but can copy to a fresh object', t => {
    const bad = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; Object.assign(layoutSx.form.fieldGap, { gap: 99 });');
    assert.equal(bad.exit, 1, JSON.stringify(bad.findings));
    assert.ok(bad.findings.some(issue => issue.code === 'CANONICAL_UI_MUTATION'));
    const good = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = Object.assign({}, layoutSx.form.fieldGap); void copy;');
    assert.equal(good.exit, 0);
});
test('layout gate rejects raw spacing on const alias of MUI component', t => {
    const report = audit(t, 'import { Stack } from "@mui/material"; const Alias = Stack; export const UI = () => <Alias gap={99}/>;');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.value === '99'));
});
test('canonical mutation gate follows global mutator aliases and reflection', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const write = Object.assign; write(layoutSx.form.fieldGap, { gap: 99 }); Reflect.set(layoutSx.form.fieldGap, "gap", 99); Object.defineProperty(layoutSx.form.fieldGap, "gap", { value: 99 });');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'CANONICAL_UI_MUTATION').length, 3);
});
test('local mutator names do not acquire global mutation identity', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const Object = { assign: (_value: unknown) => 1 }; const Reflect = { set: (_value: unknown) => 1 }; Object.assign(layoutSx.form.fieldGap); Reflect.set(layoutSx.form.fieldGap);');
    assert.equal(report.exit, 0);
});
test('destructured mutators and call/apply retain canonical mutation checks', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const { assign: write } = Object; write(layoutSx.form.fieldGap, { gap: 99 }); Object.assign.call(null, layoutSx.form.fieldGap, { gap: 99 }); const args = [layoutSx.form.fieldGap, { gap: 99 }]; Object.assign.apply(null, args);');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'CANONICAL_UI_MUTATION').length, 3);
});
test('global mutator call/apply can copy canonical values into fresh objects', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; Object.assign.call(null, {}, layoutSx.form.fieldGap); Object.assign.apply(null, [{}, layoutSx.form.fieldGap]);');
    assert.equal(report.exit, 0);
});
test('mutable aliases with possible canonical destinations fail closed', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; let first: any = layoutSx.form.fieldGap; first.gap = 99; let later: any = {}; later = layoutSx.form.fieldGap; later.gap = 99;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('opaque apply arguments fail closed while unrelated mutable data stays valid', t => {
    const bad = audit(t, 'export function write(args: any[]) { Object.assign.apply(null, args); }');
    assert.equal(bad.exit, 1);
    assert.ok(bad.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
    const good = audit(t, 'let local = { gap: 1 }; local.gap = 2; Object.assign(local, { gap: 3 });');
    assert.equal(good.exit, 0);
});
test('canonical references inside containers and destructured aliases cannot be mutated', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const box = { fields: layoutSx.form.fieldGap }; box.fields.gap = 99; const { fields: alias } = box; alias.gap = 99;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('independent shallow copies of scalar canonical fields remain mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const box = { fields: { ...layoutSx.form.fieldGap } }; box.fields.gap = 99; const { fields: alias } = box; alias.gap = 98;');
    assert.equal(report.exit, 0);
});
test('array references and nested destructuring preserve canonical write provenance', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const list = [layoutSx.form.fieldGap]; list[0].gap = 99; const box = { outer: { fields: layoutSx.form.fieldGap } }; const { outer: { fields: alias } } = box; alias.gap = 98;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('array destinations distinguish independent elements from canonical references', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const list = [{ gap: 1 }, layoutSx.form.fieldGap]; list[0].gap = 2;');
    assert.equal(report.exit, 0);
});
test('array destructuring, dynamic indices and spread cannot hide canonical references', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const list = [{ gap: 1 }, layoutSx.form.fieldGap]; const [, alias] = list; alias.gap = 99; export function write(index: number) { list[index].gap = 99; } const spread = [...list]; spread[1].gap = 99;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 3);
});
test('dynamic indices and destructuring of independent arrays stay mutable', t => {
    const report = audit(t, 'const list = [{ gap: 1 }, { gap: 2 }]; const [, alias] = list; alias.gap = 99; export function write(index: number) { list[index].gap = 98; } const spread = [...list]; spread[1].gap = 97;');
    assert.equal(report.exit, 0);
});
test('function parameters cannot hide canonical mutation across source files', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; import { change } from "../../helper"; function local(value: any) { value.gap = 99; } local(layoutSx.form.fieldGap); change(layoutSx.form.fieldGap);', {
        'apps/web/src/helper.ts': 'export function change(value: any) { Object.assign(value, { gap: 99 }); }',
    });
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('read-only helpers and mutations of unrelated arguments remain valid', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function read(value: any) { return value.gap; } function change(value: any) { value.gap = 2; } read(layoutSx.form.fieldGap); change({ gap: 1 });');
    assert.equal(report.exit, 0);
});
test('returned canonical references remain protected across helper boundaries', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; import { identity } from "../../helper"; const pick = () => layoutSx.form.fieldGap; pick().gap = 99; const alias = identity(layoutSx.form.fieldGap); alias.gap = 98;', {
        'apps/web/src/helper.ts': 'export function identity(value: any) { return value; }',
    });
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('helper returns of fresh scalar copies do not retain canonical destination identity', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const clone = () => ({ ...layoutSx.form.fieldGap }); const copy = clone(); copy.gap = 99; function local() { const unused = () => layoutSx.form.fieldGap; void unused; return { gap: 1 }; } local().gap = 98;');
    assert.equal(report.exit, 0);
});
test('destructured object parameters cannot mutate canonical arguments', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change({ outer: { fields: alias } }: any) { alias.gap = 99; } change({ outer: { fields: layoutSx.form.fieldGap } });');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
});
test('destructured object parameters retain independent argument mutability', t => {
    const report = audit(t, 'function change({ outer: { fields: alias } }: any) { alias.gap = 99; } change({ outer: { fields: { gap: 1 } } });');
    assert.equal(report.exit, 0);
});
test('default parameter and binding initializers cannot hide canonical mutations', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change(value: any = layoutSx.form.fieldGap) { value.gap = 99; } function nested({ fields = layoutSx.form.fieldGap }: any = {}) { fields.gap = 98; } change(); nested();');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('fresh default parameter and binding copies remain mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change(value: any = { ...layoutSx.form.fieldGap }) { value.gap = 99; } function nested({ fields = { ...layoutSx.form.fieldGap } }: any = {}) { fields.gap = 98; } change(); nested();');
    assert.equal(report.exit, 0);
});
test('rest parameters retain canonical argument write provenance', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change(label: string, ...values: any[]) { values[1].gap = 99; } change("probe", { gap: 1 }, layoutSx.form.fieldGap);');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
});
test('rest parameters distinguish independent positions from canonical siblings', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change(...values: any[]) { values[0].gap = 99; } change({ gap: 1 }, layoutSx.form.fieldGap);');
    assert.equal(report.exit, 0);
});
test('finite spread arguments preserve shifted positional and rest destinations', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const args = [{ gap: 1 }, layoutSx.form.fieldGap]; function change(first: any, second: any) { second.gap = 99; } function rest(label: string, ...values: any[]) { values[1].gap = 98; } change(...args); rest("probe", ...args);');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('finite spread expansion keeps independent argument positions mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const args = [{ gap: 1 }, layoutSx.form.fieldGap]; function change(first: any, second: any) { first.gap = 99; void second; } function rest(label: string, ...values: any[]) { values[0].gap = 98; void label; } change(...args); rest("probe", ...args);');
    assert.equal(report.exit, 0);
});
test('opaque spreads keep positional mutation destinations unknown', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function change(value: any) { value.gap = 99; } export function invoke(values: any[]) { change(...values, layoutSx.form.fieldGap); }');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
});
test('opaque spreads into read-only helpers do not invent mutation findings', t => {
    const report = audit(t, 'function read(value: any) { return value.gap; } export function invoke(values: any[]) { return read(...values); }');
    assert.equal(report.exit, 0);
});
test('array parameter patterns retain canonical positions including nested object arrays', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function first([value]: any) { value.gap = 99; } function nested({ list: [, alias] }: any) { alias.gap = 98; } first([layoutSx.form.fieldGap]); nested({ list: [{ gap: 1 }, layoutSx.form.fieldGap] });');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('array parameter patterns retain independent bound element mutability', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function first([value]: any) { value.gap = 99; } function nested({ list: [alias] }: any) { alias.gap = 98; } first([{ gap: 1 }, layoutSx.form.fieldGap]); nested({ list: [{ gap: 1 }, layoutSx.form.fieldGap] });');
    assert.equal(report.exit, 0);
});
test('layout gate rejects parameter shadow of canonical layout name', t => {
    const report = audit(t, 'import { Box } from "@mui/material"; import { layoutSx } from "../../shared/ui/layout"; export function UI(layoutSx: any) { return <Box sx={layoutSx.form.fieldGap}/>; }');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code.startsWith('UNKNOWN')));
});
test('layout gate follows genuine renamed styled factory', t => {
    const report = audit(t, 'import { styled as factory } from "@mui/material/styles"; export const UI = factory("div")({ gap: 99 });');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.value === '99'));
});
test('layout gate accepts canonical namespace, element access and barrel alias', t => {
    const report = audit(t, 'import { Box } from "@mui/material"; import * as L from "../../barrel"; const fields = L["spacing"].form.fieldGap; export const UI = () => <Box sx={fields}/>;', { 'apps/web/src/barrel.ts': 'export { layoutSx as spacing } from "./shared/ui/layout";' });
    assert.equal(report.status, 'PASS');
    assert.equal(report.exit, 0);
});
test('layout gate does not mistake local component named Stack for MUI', t => {
    const report = audit(t, 'export function UI(Stack: any) { return <Stack gap={99}/>; }');
    assert.equal(report.status, 'PASS'); // This identity check does not certify the unknown component implementation.
});
test('layout gate inspects renamed installed Emotion css tag', t => {
    const report = audit(t, 'import { css as styleTag } from "@emotion/react"; export const style = styleTag`padding: 99px;`;', {
        'node_modules/@emotion/react/package.json': JSON.stringify({ name: '@emotion/react', types: 'index.d.ts' }),
        'node_modules/@emotion/react/index.d.ts': 'export declare function css(value: TemplateStringsArray): unknown;',
    });
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'STYLED_CSS_SPACING_LITERAL'), JSON.stringify(report.findings));
});
test('layout gate preserves genuine aliased Controller field forwarding', t => {
    const report = audit(t, 'import { Controller as FieldController } from "react-hook-form"; import { Box } from "@mui/material"; export const UI = () => <FieldController render={({field: control}) => <Box {...control}/>}/>;');
    assert.equal(report.status, 'PASS');
});
test('a same-named local Controller cannot exempt an unknown prop spread', t => {
    const report = audit(t, 'import { Controller } from "react-hook-form"; import { Box } from "@mui/material"; export function UI(Controller: any) { return <Controller render={({field}) => <Box {...field}/>}/>; }');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_STYLE_SOURCE'));
});
test('genuine useForm registration survives property and destructured aliases', t => {
    const report = audit(t, 'import { useForm as makeForm } from "react-hook-form"; import { Box } from "@mui/material"; const form = makeForm(); const {register: r} = makeForm(); const alias = r; export const UI = () => <><Box {...form.register("a")}/><Box {...alias("b")}/></>;');
    assert.equal(report.status, 'PASS');
});
test('a function named register cannot exempt injected style props', t => {
    const report = audit(t, 'import { Box } from "@mui/material"; const register = () => ({ style: { padding: 99 } }); export const UI = () => <Box {...register()}/>;');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.value === '99'));
});
test('a bridge callback parameter cannot impersonate its private factor binding', t => {
    const bridge = fs.readFileSync('apps/web/src/shared/ui/layout.ts', 'utf8') + '\nexport const fake = (factor: any) => ({ sx: { padding: factor.lg } });';
    const report = audit(t, 'export {};', { 'apps/web/src/shared/ui/layout.ts': bridge });
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_SPACING_VALUE'));
});
test('opaque namespace component selection remains a strict binding failure', t => {
    const report = audit(t, 'import * as MUI from "@mui/material"; const key = Math.random() ? "Box" : "Stack"; const Alias = MUI[key]; export const UI = () => <Alias gap={99}/>;');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_UI_BINDING'));
});
test('opaque namespace factory cannot hide style arguments', t => {
    const report = audit(t, 'import * as MUI from "@mui/material/styles"; const key = Math.random() ? "styled" : "other"; const factory = MUI[key]; export const UI = factory("div")({ padding: 99 });');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_UI_BINDING'));
});
test('MUI re-export cannot hide raw spacing behind a first-party barrel', t => {
    const report = audit(t, 'import { Row } from "../../barrel"; export const UI = () => <Row gap={99}/>;', { 'apps/web/src/barrel.ts': 'export { Stack as Row } from "@mui/material";' });
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.value === '99'));
});
test('destructuring assignments cannot hide canonical write targets', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; [(layoutSx as any).form.fieldGap.gap] = [99]; ({ value: (layoutSx as any).form.fieldGap.gap } = { value: 98 });');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'CANONICAL_UI_MUTATION').length, 2);
});
test('destructuring assignments can update independent copied destinations', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = { ...layoutSx.form.fieldGap }; [copy.gap] = [99]; ({ value: copy.gap } = { value: 98 });');
    assert.equal(report.exit, 0);
});
test('object rest retains nested canonical references while copying the outer object', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const { ...rest } = layoutSx.form; rest.fieldGap.gap = 99;');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
});
test('rest scalar copies and replacement of container references stay mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const { ...rest } = layoutSx.form.fieldGap; rest.gap = 99; const box = { fields: layoutSx.form.fieldGap }; box.fields = { gap: 98 };');
    assert.equal(report.exit, 0);
});
test('shallow object spread preserves canonical child references and last-writer order', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = { ...layoutSx.form }; const alias = copy; alias.fieldGap.gap = 99; const overwritten = { fieldGap: { gap: 1 }, ...layoutSx.form }; overwritten.fieldGap.gap = 98;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('shallow spread with a later independent override stays mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = { ...layoutSx.form, fieldGap: { gap: 1 } }; copy.fieldGap.gap = 99; const scalar = { ...layoutSx.form.fieldGap }; scalar.gap = 98;');
    assert.equal(report.exit, 0);
});
test('exported mutable aliases retain assignments from their declaring file', t => {
    const report = audit(t, 'import { value } from "../../helper"; import * as H from "../../helper"; value.gap = 99; H.value.gap = 98;', {
        'apps/web/src/helper.ts': 'import { layoutSx } from "./shared/ui/layout"; export let value: any = {}; value = layoutSx.form.fieldGap;',
    });
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('exported independent mutable data does not acquire canonical provenance', t => {
    const report = audit(t, 'import { value } from "../../helper"; value.gap = 99;', {
        'apps/web/src/helper.ts': 'export let value: any = {}; value = { gap: 1 };',
    });
    assert.equal(report.exit, 0);
});
test('literal computed keys retain canonical container and parameter provenance', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const key = "fields"; const box = { fields: layoutSx.form.fieldGap }; box[key].gap = 99; function change({ [key]: alias }: any) { alias.gap = 98; } change(box);');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('literal computed keys do not taint independent selected properties', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const key = "local"; const box = { fields: layoutSx.form.fieldGap, local: { gap: 1 } }; box[key].gap = 99; function change({ [key]: alias }: any) { alias.gap = 98; } change(box);');
    assert.equal(report.exit, 0);
});
test('Object.assign shallow copies retain canonical nested reference provenance', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const assign = Object.assign; const copy = assign({}, layoutSx.form); copy.fieldGap.gap = 99; const later = Object.assign({}, { fieldGap: { gap: 1 } }, layoutSx.form); later.fieldGap.gap = 98;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('Object.assign later independent overrides and scalar copies stay mutable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = Object.assign({}, layoutSx.form, { fieldGap: { gap: 1 } }); copy.fieldGap.gap = 99; const scalar = Object.assign({}, layoutSx.form.fieldGap); scalar.gap = 98;');
    assert.equal(report.exit, 0);
});
test('union and dynamic property selections retain possible canonical destinations', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const box = { fields: layoutSx.form.fieldGap, local: { gap: 1 } }; export function union(key: "fields" | "local") { box[key].gap = 99; } export function dynamic(key: string) { box[key].gap = 98; }');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('finite union property selections exclude canonical siblings not in the key set', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const box = { fields: layoutSx.form.fieldGap, local: { gap: 1 }, other: { gap: 2 } }; export function change(key: "local" | "other") { box[key].gap = 99; }');
    assert.equal(report.exit, 0);
});
test('union selection over Object.assign output retains canonical child provenance', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const copy = Object.assign({}, layoutSx.form); export function change(key: "fieldGap" | "sectionGap") { copy[key].gap = 99; }');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION'));
});
test('union selection over independent Object.assign output remains mutable', t => {
    const report = audit(t, 'const copy = Object.assign({}, { first: { gap: 1 }, second: { gap: 2 } }); export function change(key: "first" | "second") { copy[key].gap = 99; }');
    assert.equal(report.exit, 0);
});
test('Reflect.set call/apply checks the target argument rather than the assigned value', t => {
    const direct = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; Reflect.set(layoutSx.form.fieldGap, "gap", 1);');
    assert.equal(direct.exit, 1);
    const bad = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; Reflect.set.call(null, layoutSx.form.fieldGap, "gap", 1); Reflect.set.apply(null, [layoutSx.form.fieldGap, "gap", 1]);');
    assert.equal(bad.exit, 1, JSON.stringify(bad.findings));
    assert.equal(bad.findings.filter(issue => issue.code === 'CANONICAL_UI_MUTATION').length, 2);
    const good = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; const target = {}; Reflect.set.call(null, target, "style", layoutSx.form.fieldGap); Reflect.set.apply(null, [target, "style", layoutSx.form.fieldGap]);');
    assert.equal(good.exit, 0);
});
test('aliased React createElement checks MUI and native style objects', t => {
    const report = audit(t, 'import { createElement as h } from "react"; import { Box } from "@mui/material"; const mui = h(Box, { gap: 99 }); const native = h("div", { style: { padding: 12 } }); void mui; void native;');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(finding => finding.property === 'gap' && finding.value === '99'));
    assert.ok(report.findings.some(finding => finding.property === 'padding' && finding.value === '12'));
});
test('GlobalStyles.styles is checked and local createElement names stay local', t => {
    const bad = audit(t, 'import { GlobalStyles } from "@mui/material"; export const UI = () => <GlobalStyles styles={{ body: { margin: 99 } }}/>;');
    assert.equal(bad.exit, 1);
    const local = audit(t, 'export function createElement(_type: string, props: any) { return props; } createElement("div", { gap: 99 });');
    assert.equal(local.exit, 0);
});
test('React JSX runtime factories cannot bypass MUI or native style checks', t => {
    const report = audit(t, 'import { jsx as make, jsxs } from "react/jsx-runtime"; import { jsxDEV } from "react/jsx-dev-runtime"; import { Box } from "@mui/material"; make(Box, { gap: 99 }); jsxs("div", { style: { padding: 12 } }); jsxDEV(Box, { margin: 8 });');
    assert.equal(report.exit, 1);
    assert.ok(report.findings.some(finding => finding.property === 'gap' && finding.value === '99'));
    assert.ok(report.findings.some(finding => finding.property === 'padding' && finding.value === '12'));
    assert.ok(report.findings.some(finding => finding.property === 'margin' && finding.value === '8'));
});
test('React cloneElement checks the cloned MUI element and preserves native props', t => {
    const bad = audit(t, 'import { cloneElement as clone } from "react"; import { Box } from "@mui/material"; const original = <Box />; clone(original, { gap: 99 }); clone(<Box />, { margin: 8 });');
    assert.equal(bad.exit, 1);
    assert.ok(bad.findings.some(finding => finding.property === 'gap' && finding.value === '99'));
    assert.ok(bad.findings.some(finding => finding.property === 'margin' && finding.value === '8'));
    const good = audit(t, 'import { cloneElement } from "react"; const original = <div />; cloneElement(original, { id: "result", "aria-label": "result", onClick() {} });');
    assert.equal(good.exit, 0, JSON.stringify(good.findings));
    const nativeStyle = audit(t, 'import { cloneElement } from "react"; cloneElement(<div />, { style: { padding: 12 } });');
    assert.equal(nativeStyle.exit, 1);
    assert.ok(nativeStyle.findings.some(finding => finding.property === 'padding' && finding.value === '12'));
    const unknown = audit(t, 'import { cloneElement } from "react"; declare const element: unknown; cloneElement(element, { gap: 99 });');
    assert.equal(unknown.exit, 1);
    assert.ok(unknown.findings.some(finding => finding.code === 'UNKNOWN_UI_BINDING'));
});
test('Emotion css props and object factories are inspected with native CSS semantics', t => {
    const bad = audit(t, 'import { css as makeCss } from "@emotion/react"; import { Box } from "@mui/material"; export const UI = () => <><Box css={{ gap: 99 }} /><Box css={makeCss({ margin: 12 })} /></>;');
    assert.equal(bad.exit, 1);
    assert.ok(bad.findings.some(finding => finding.property === 'gap' && finding.value === '99'));
    assert.ok(bad.findings.some(finding => finding.property === 'margin' && finding.value === '12'));
    const good = audit(t, 'import { css } from "@emotion/react"; import { layoutCss } from "../../shared/ui/layout"; export const UI = () => <div css={css({ padding: layoutCss.cellInset })} />;');
    assert.equal(good.exit, 0, JSON.stringify(good.findings));
    const mismatched = audit(t, 'import { GlobalStyles } from "@mui/material"; import { layoutSx } from "../../shared/ui/layout"; export const UI = () => <GlobalStyles styles={{ body: { gap: layoutSx.form.fieldGap.gap } }} />;');
    assert.equal(mismatched.exit, 1);
    assert.ok(mismatched.findings.some(finding => finding.code === 'SEMANTIC_ROLE_MISMATCH'));
});
test('Inline style elements in JSX, React factories, DOM and the HTML entry fail closed', t => {
    const jsxTag = audit(t, 'export const UI = () => <style>{".probe { margin: 12px; }"}</style>;');
    assert.equal(jsxTag.exit, 1);
    assert.ok(jsxTag.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const reactFactory = audit(t, 'import { createElement } from "react"; createElement("style", null, ".probe { margin: 12px; }");');
    assert.equal(reactFactory.exit, 1);
    assert.ok(reactFactory.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const jsxFactory = audit(t, 'import { jsx } from "react/jsx-runtime"; jsx("style", { children: ".probe { margin: 12px; }" });');
    assert.equal(jsxFactory.exit, 1);
    assert.ok(jsxFactory.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const cloneFactory = audit(t, 'import { cloneElement } from "react"; cloneElement(<style />, { children: ".probe { margin: 12px; }" });');
    assert.equal(cloneFactory.exit, 1);
    assert.ok(cloneFactory.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const domFactory = audit(t, 'const style = document.createElement("style"); document.head.append(style);');
    assert.equal(domFactory.exit, 1);
    assert.ok(domFactory.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const html = audit(t, 'export {};', { 'apps/web/index.html': '<!doctype html><html><head><style>.probe { margin: 12px; }</style></head><body><div id="root"></div></body></html>' });
    assert.equal(html.exit, 1);
    assert.ok(html.findings.some(finding => finding.code === 'INLINE_STYLE_TAG_SOURCE'));
    const htmlAttribute = audit(t, 'export {};', { 'apps/web/index.html': '<!doctype html><html><body><div style="margin: 12px"></div></body></html>' });
    assert.equal(htmlAttribute.exit, 1);
    assert.ok(htmlAttribute.findings.some(finding => finding.code === 'INLINE_STYLE_ATTRIBUTE_SOURCE'));
    const comment = audit(t, 'export {};', { 'apps/web/index.html': '<!-- <style>.probe{gap:12px}</style> <div style="gap:12px"></div> --><script type="module" src="/src/scope-entry.ts"></script>' });
    assert.equal(comment.exit, 0, JSON.stringify(comment.findings));
});
test('DOM CSSOM spacing writes use semantic roles and reject opaque style strings', t => {
    const bad = audit(t, 'const node = document.createElement("div"); node.style.gap = "12px"; node.style.setProperty("padding", "12px"); node.style.cssText = "margin: 12px"; node.setAttribute("style", "padding: 12px");');
    assert.equal(bad.exit, 1);
    assert.ok(bad.findings.some(finding => finding.property === 'gap' && finding.value === '"12px"'));
    assert.ok(bad.findings.some(finding => finding.property === 'padding' && finding.value === '"12px"'));
    assert.ok(bad.findings.some(finding => finding.code === 'INLINE_STYLE_TEXT_MUTATION'));
    const good = audit(t, 'import { layoutCss } from "../../shared/ui/layout"; const node = document.createElement("div"); node.style.padding = layoutCss.cellInset; node.style.setProperty("padding", layoutCss.cellInset);');
    assert.equal(good.exit, 0, JSON.stringify(good.findings));
});
test('HTML parsing and runtime stylesheet mutation cannot bypass the imported CSS boundary', t => {
    const html = audit(t, `
        const target = document.createElement('div');
        target.innerHTML = '<style>.probe { margin: 12px }</style>';
        target.insertAdjacentHTML('beforeend', '<style>.probe { gap: 12px }</style>');
        document.write('<style>.probe { padding: 12px }</style>');
        const unsafe = <div dangerouslySetInnerHTML={{ __html: '<style>.probe { margin: 12px }</style>' }} />;
        void unsafe;
    `);
    assert.equal(html.exit, 1, JSON.stringify(html.findings));
    assert.ok(html.findings.some(finding => finding.code === 'DYNAMIC_HTML_STYLE_SOURCE'));

    const stylesheet = audit(t, `
        const style = document.createElement('style');
        style.append('.probe { margin: 12px }');
        const sheet = new CSSStyleSheet();
        sheet.insertRule('.probe { gap: 12px }');
        document.adoptedStyleSheets.push(sheet);
    `);
    assert.equal(stylesheet.exit, 1, JSON.stringify(stylesheet.findings));
    assert.ok(stylesheet.findings.some(finding => finding.code === 'DYNAMIC_STYLE_SOURCE'));
});
test('spacing shorthand values and responsive breakpoints preserve token and unit provenance', t => {
    const responsive = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: { xs: layoutSx.form.fieldGap.gap, md: layoutSx.form.inlineGap.gap }, margin: '0 auto' }} />;
    `);
    assert.equal(responsive.exit, 0, JSON.stringify(responsive.findings));

    const responsiveArray = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: [layoutSx.form.fieldGap.gap, layoutSx.form.inlineGap.gap, layoutSx.form.fieldGap.gap, layoutSx.form.inlineGap.gap, layoutSx.form.fieldGap.gap] }} />;
    `);
    assert.equal(responsiveArray.exit, 0, JSON.stringify(responsiveArray.findings));

    const unknownBreakpoint = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: { mobile: layoutSx.form.fieldGap.gap } }} />;
    `);
    assert.equal(unknownBreakpoint.exit, 1, JSON.stringify(unknownBreakpoint.findings));
    assert.ok(unknownBreakpoint.findings.some(finding => finding.code === 'UNKNOWN_BREAKPOINT_KEY'));

    const longBreakpointArray = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: [layoutSx.form.fieldGap.gap, layoutSx.form.fieldGap.gap, layoutSx.form.fieldGap.gap, layoutSx.form.fieldGap.gap, layoutSx.form.fieldGap.gap, layoutSx.form.fieldGap.gap] }} />;
    `);
    assert.equal(longBreakpointArray.exit, 1, JSON.stringify(longBreakpointArray.findings));
    assert.ok(longBreakpointArray.findings.some(finding => finding.code === 'UNKNOWN_BREAKPOINT_ARRAY'));

    const customBreakpoint = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: { compact: layoutSx.form.fieldGap.gap } }} />;
    `, {
        'apps/web/src/shared/ui/theme.ts': `import { createTheme } from '@mui/material/styles'; export const theme = createTheme({ breakpoints: { values: { xs: 0, compact: 320, md: 768 } } });`,
    });
    assert.equal(customBreakpoint.exit, 0, JSON.stringify(customBreakpoint.findings));

    const unknownTheme = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        export const UI = () => <Box sx={{ gap: { compact: layoutSx.form.fieldGap.gap } }} />;
    `, { 'apps/web/src/shared/ui/theme.ts': 'export const theme = {};' });
    assert.equal(unknownTheme.exit, 1, JSON.stringify(unknownTheme.findings));
    assert.ok(unknownTheme.findings.some(finding => finding.code === 'UNKNOWN_BREAKPOINT_SOURCE'));

    const invalidAuto = audit(t, `
        import { Box } from '@mui/material';
        export const UI = () => <Box sx={{ gap: 'auto', padding: 'auto', margin: 'auto' }} />;
    `);
    assert.equal(invalidAuto.exit, 1);
    assert.equal(invalidAuto.findings.filter(finding => finding.code === 'SPACING_LITERAL').length, 2);

    const computed = audit(t, `
        import { Box } from '@mui/material';
        import { layoutSx } from '../../shared/ui/layout';
        const doubled = layoutSx.form.fieldGap.gap * 2;
        export const UI = () => <Box sx={{ gap: doubled, padding: layoutSx.form.fieldGap.gap + 1 }} />;
    `);
    assert.equal(computed.exit, 1);
    assert.equal(computed.findings.filter(finding => finding.code === 'UNKNOWN_SPACING_VALUE').length, 2);

    const css = '<!doctype html><html><head><link rel="stylesheet" href="/src/app/probe.css"></head><body><script type="module" src="/src/scope-entry.ts"></script></body></html>';
    const canonicalCss = audit(t, 'export {};', {
        'apps/web/index.html': css,
        'apps/web/src/app/probe.css': '.good { padding: var(--space-lg) var(--space-md); padding-inline: var(--space-sm) var(--space-lg); margin: 0 auto; gap: 0px var(--space-xs); }',
    });
    assert.equal(canonicalCss.exit, 0, JSON.stringify(canonicalCss.findings));

    const unprovenCss = audit(t, 'export {};', {
        'apps/web/index.html': css,
        'apps/web/src/app/probe.css': '.bad { padding: var(--space-lg) var(--space-unknown); margin-inline: var(--space-sm, 8px); gap: calc(var(--space-md) * 2); padding-top: 8px; gap: auto; } .alias { --local-space: var(--space-lg); gap: var(--local-space); }',
    });
    assert.equal(unprovenCss.exit, 1);
    assert.ok(unprovenCss.findings.filter(finding => finding.code === 'CSS_SPACING_LITERAL').length >= 6);
});
test('function return producers cannot hide canonical children behind spreads', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function getForm() { return layoutSx.form; } function wrap() { return { fieldGap: layoutSx.form.fieldGap }; } const first = { ...getForm() }; first.fieldGap.gap = 99; const second = { ...wrap() }; second.fieldGap.gap = 98;');
    assert.equal(report.exit, 1);
    assert.equal(report.findings.filter(issue => issue.code === 'UNKNOWN_CANONICAL_UI_MUTATION').length, 2);
});
test('producer spreads keep later independent child overrides writable', t => {
    const report = audit(t, 'import { layoutSx } from "../../shared/ui/layout"; function getForm() { return layoutSx.form; } const copy = { ...getForm(), fieldGap: { gap: 1 } }; copy.fieldGap.gap = 99;');
    assert.equal(report.exit, 0);
});

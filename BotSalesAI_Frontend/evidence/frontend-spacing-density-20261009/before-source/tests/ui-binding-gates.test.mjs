import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';
import { auditComposition } from '../scripts/check-ui-composition.mjs';
import { auditAppDesignSource } from '../scripts/check-visual-tokens.mjs';

function project(t, probe, extras = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-binding-gates-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    prepareUiSourceProject(root);
    const files = {
        'packages/design-tokens/src/index.ts': 'export const tokens = { fontSizes: { body: 14 } }; export const colors = { accent: "#fff", info: "#aaa" };',
        'apps/web/src/shared/ui/layout.ts': 'export const layoutSx = { form: { fieldGap: { gap: 2 } } };',
        'apps/web/src/shared/ui/composition.tsx': 'export function FormFields() { return null; }',
        'apps/web/src/modules/probe/index.tsx': probe,
        // Controlled library declarations for resolver tests only, not actual MUI/typecheck evidence.
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/index.d.ts': 'export declare function Stack(props: any): any; export declare function Box(props: any): any;',
        'node_modules/@mui/material/styles/index.d.ts': 'export declare function styled(value: unknown): (style: unknown) => unknown;',
        ...extras,
    };
    for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        fs.writeFileSync(path.join(root, file), content);
    }
    return root;
}
test('production composition gate detects const MUI alias and namespace layout role', t => {
    const root = project(t, 'import { Stack } from "@mui/material"; import * as L from "../../shared/ui/layout"; const Alias = Stack; export const UI = () => <Alias sx={L["layoutSx"].form.fieldGap}/>;');
    const report = auditComposition(root);
    assert.equal(report.status, 'FAIL');
    assert.ok(report.issues.some(issue => issue.rule === 'composition.shared-owner'));
});
test('production composition gate closes aliased barrel API props', t => {
    const root = project(t, 'import { Fields } from "../../barrel"; const Alias = Fields; export const UI = () => <Alias gap={99}/>;', { 'apps/web/src/barrel.ts': 'export { FormFields as Fields } from "./shared/ui/composition";' });
    assert.ok(auditComposition(root).issues.some(issue => issue.rule === 'composition.override'));
});
test('production composition gate does not mistake shadowed local component for shared API', t => {
    const root = project(t, 'import { FormFields } from "../../shared/ui/composition"; export function UI(FormFields: any) { return <FormFields gap={99}/>; }');
    const report = auditComposition(root);
    assert.equal(report.status, 'PASS'); // Its visual styles still belong to other gates, not this API identity.
});
test('production composition gate keeps valid canonical barrel consumer', t => {
    const root = project(t, 'import { Fields } from "../../barrel"; export const UI = () => <Fields aria-label="Fields"/>;', { 'apps/web/src/barrel.ts': 'export { FormFields as Fields } from "./shared/ui/composition";' });
    assert.equal(auditComposition(root).status, 'PASS');
});
test('production visual gate rejects pretrusted-name spoof and parameter shadow', t => {
    const root = project(t, 'import { Box } from "@mui/material"; import { tokens } from "@botsales/tokens"; const colors = { accent: "#abc" }; export function UI(tokens: any) { return <Box sx={{ color: colors.accent, fontSize: tokens.fontSizes.body }}/>; }');
    const report = auditAppDesignSource({ root });
    assert.equal(report.status, 'FAIL');
    assert.ok(report.findings.some(issue => issue.category === 'palette'));
    assert.ok(report.findings.some(issue => issue.category === 'typography'));
});
test('production visual gate rejects a fake canonical module suffix', t => {
    const root = project(t, 'import { Box } from "@mui/material"; import { visualSx } from "../../fake/visual"; export const UI = () => <Box sx={{ fontSize: visualSx.body }}/>;', { 'apps/web/src/fake/visual.ts': 'export const visualSx = { body: 99 };' });
    assert.ok(auditAppDesignSource({ root }).findings.some(issue => issue.code === 'UNKNOWN_VISUAL_SOURCE'));
});
test('production visual gate inspects renamed genuine styled factory', t => {
    const root = project(t, 'import { styled as factory } from "@mui/material/styles"; export const UI = factory("div")({ fontSize: 99 });');
    assert.ok(auditAppDesignSource({ root }).findings.some(issue => issue.code === 'RAW_VISUAL_LITERAL'));
});
test('production visual gate preserves canonical barrel aliases and finite palette selection', t => {
    const root = project(t, 'import { Box } from "@mui/material"; import { T, C } from "../../barrel"; const palette = [C.accent, C.info]; export const UI = ({index}: any) => <Box sx={{ color: palette[index], fontSize: T.fontSizes.body }}/>;', { 'apps/web/src/barrel.ts': 'export { tokens as T, colors as C } from "@botsales/tokens";' });
    assert.equal(auditAppDesignSource({ root }).status, 'PASS');
});
test('production visual gate rejects raw values hidden in a finite palette', t => {
    const root = project(t, 'import { Box } from "@mui/material"; import { colors } from "@botsales/tokens"; const palette = [colors.accent, "#abc"]; export const UI = ({index}: any) => <Box sx={{ color: palette[index] }}/>;');
    assert.equal(auditAppDesignSource({ root }).status, 'FAIL');
});
test('production visual gate does not follow a global alias through parameter shadow', t => {
    const root = project(t, 'import { Box } from "@mui/material"; import { colors } from "@botsales/tokens"; const foreground = colors.accent; export function UI(foreground: any) { return <Box sx={{ color: foreground }}/>; }');
    assert.ok(auditAppDesignSource({ root }).findings.some(issue => issue.code === 'UNKNOWN_VISUAL_SOURCE'));
});
test('production composition geometry cannot resolve a shadowed global variable', t => {
    const root = project(t, 'import { FormFields } from "../../shared/ui/composition"; const geometry = { width: 320 }; export function UI(geometry: any) { return <FormFields geometry={geometry}/>; }');
    assert.ok(auditComposition(root).issues.some(issue => issue.rule === 'composition.geometry-unknown'));
});
test('finite semantic prop types do not grant trust to a different same-named parameter', t => {
    const root = project(t, 'import { Box } from "@mui/material"; export function Good(props: {color: "primary.main" | "error.main"}) { return <Box sx={{color: props.color}}/>; } export function Bad(props: any) { return <Box sx={{color: props.color}}/>; }');
    const report = auditAppDesignSource({ root });
    assert.equal(report.findings.filter(issue => issue.category === 'palette').length, 1);
});
test('opaque namespace composition selection cannot bypass closed props', t => {
    const root = project(t, 'import * as UI from "../../shared/ui/composition"; const key = Math.random() ? "FormFields" : "FieldGroup"; const Fields = UI[key]; export const Page = () => <Fields gap={99}/>;');
    assert.ok(auditComposition(root).issues.some(issue => issue.rule === 'composition.binding-unknown'));
});
test('opaque namespace style factory remains a visual binding failure', t => {
    const root = project(t, 'import * as MUI from "@mui/material/styles"; const key = Math.random() ? "styled" : "other"; const factory = MUI[key]; export const UI = factory("div")({ fontSize: 99 });');
    assert.ok(auditAppDesignSource({ root }).findings.some(issue => issue.code === 'UNKNOWN_VISUAL_SOURCE'));
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { after, beforeEach, test } from 'node:test';
import { prepareUiSourceProject } from './fixtures/ui-source-project.mjs';

const fixtureRoot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-layout-checker-')), 'fixture');
const checkerPath = path.resolve('scripts/check-layout.mjs');
const schemaPath = path.resolve('scripts/layout-exceptions.schema.json');
const validBridge = `import { tokens } from '@botsales/tokens';
const factor = {
  zero: 0,
  xs: tokens.space.xs / tokens.space.sm,
  sm: tokens.space.sm / tokens.space.sm,
  md: tokens.space.md / tokens.space.sm,
  lg: tokens.space.lg / tokens.space.sm,
  xl: tokens.space.xl / tokens.space.sm,
  xxl: tokens.space.xxl / tokens.space.sm,
  xxxl: tokens.space.xxxl / tokens.space.sm,
} as const;
export const layoutSx = { page: { gutter: { px: { xs: factor.lg, md: factor.xl } } }, form: { fieldGap: { gap: factor.lg } } };
const cssPixel = value => \`\${value}px\`;
export const layoutCss = { table: { cellInset: \`\${cssPixel(tokens.space.md)} \${cssPixel(tokens.space.lg)}\` } };
`;

function resetFixture() {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
    prepareUiSourceProject(fixtureRoot);
    fs.mkdirSync(path.join(fixtureRoot, 'apps/web/src/modules/fixture'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'apps/web/src/shared/ui'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'apps/web/src/app'), { recursive: true });
    fs.mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
    fs.copyFileSync(schemaPath, path.join(fixtureRoot, 'scripts/layout-exceptions.schema.json'));
    fs.writeFileSync(path.join(fixtureRoot, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }, null, 2));
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/layout.ts'), validBridge);
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/theme.ts'), `import { createTheme } from '@mui/material/styles'; export const theme = createTheme({ breakpoints: { values: { xs: 0, sm: 480, md: 768, lg: 1280, xl: 1920 } } });`);
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/tokens.css'), ':root { --space-md: 16px; }\n');
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/fixture.css'), 'body { margin: 0; }\n');
    fs.mkdirSync(path.join(fixtureRoot, 'node_modules/@mui/material/styles'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'node_modules/@mui/material/package.json'), JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }));
    fs.writeFileSync(path.join(fixtureRoot, 'node_modules/@mui/material/index.d.ts'), 'export declare function Box(props: any): any; export declare function Stack(props: any): any; export declare function TextField(props: any): any;');
    fs.writeFileSync(path.join(fixtureRoot, 'node_modules/@mui/material/styles/index.d.ts'), 'export declare function createTheme(options: any): any; export declare function styled(value: unknown): (style: unknown) => unknown;');
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/components.tsx'), 'export function Panel(props: any) { return null; }');
    fs.mkdirSync(path.join(fixtureRoot, 'node_modules/react-hook-form'), { recursive: true });
    fs.writeFileSync(path.join(fixtureRoot, 'node_modules/react-hook-form/package.json'), JSON.stringify({ name: 'react-hook-form', types: 'index.d.ts' }));
    fs.writeFileSync(path.join(fixtureRoot, 'node_modules/react-hook-form/index.d.ts'), 'export declare function Controller(props: any): any; export declare function useForm(): any;');
}

function writeSource(source) {
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/modules/fixture/index.tsx'), `import { Panel } from '../../shared/ui/components';\n${source}`);
}

function runChecker({ strict = true } = {}) {
    const args = [checkerPath, '--root', fixtureRoot, '--json'];
    if (!strict) args.push('--report');
    return spawnSync(process.execPath, args, { encoding: 'utf8', windowsHide: true });
}

function reportOf(result) {
    assert.ok(result.stdout, result.stderr || 'Checker returned no JSON output');
    return JSON.parse(result.stdout);
}

function exception({ selector = '.skip-link', value = '12px', property = 'padding' } = {}) {
    return {
        id: 'FIXTURE-A11Y',
        path: 'apps/web/src/app/fixture.css',
        selector,
        property,
        value,
        category: 'A11Y_MECHANISM',
        reason: 'Fixture checks a narrowly scoped keyboard-focus mechanism.',
        evidence: 'tests/layout-checker.test.mjs positive exception fixture',
        owner: 'fixture accessibility owner',
        reviewTrigger: 'Remove when the keyboard-focus mechanism is migrated and reverified.',
    };
}

beforeEach(resetFixture);

test('accepts semantic bridge roles, the closed token-derived factor map, geometry, and reset values', () => {
    writeSource(`import { Box, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
const { register } = useForm();
import { layoutSx, layoutCss } from '../../shared/ui/layout';
export function Good() {
  return <><Box sx={layoutSx.page.gutter} /><Box sx={{ ...layoutSx.page.gutter, width: 320, minHeight: 0, margin: 0 }} />
    <Stack gap={layoutSx.form.fieldGap.gap} style={{ padding: layoutCss.table.cellInset }} /><TextField {...register('field')} />
    <Controller render={({ field }) => <TextField {...field} />} /></>;
}
`);
    const result = runChecker();
    const report = reportOf(result);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(report.status, 'PASS');
    assert.deepEqual(report.findings, []);
});

test('rejects a CSS spacing role without a declared shared owner', () => {
    writeSource(`import { Box } from '@mui/material';
import { layoutCss } from '../../shared/ui/layout';
export function Bad() { return <Box style={{ padding: layoutCss.table.denseCellInset }} />; }
`);
    const result = runChecker();
    const report = reportOf(result);
    assert.equal(result.status, 1);
    assert.equal(report.counts.SEMANTIC_ROLE_MISMATCH, 1);
    assert.ok(report.findings[0].message.includes('denseCellInset'));
});

test('rejects scale-conforming and off-scale literals in sx, responsive leaves, named and namespace MUI System props', () => {
    writeSource(`import { Box, Stack } from '@mui/material';
import * as Mui from '@mui/material';
export function Bad() { return <><Box sx={{ p: 2, gap: { xs: 1, md: 2.25 }, width: 320 }} /><Stack gap={3} /><Mui.Stack gap={4} /><Box {...{ sx: { padding: 1 } }} /></>; }
`);
    const result = runChecker();
    const report = reportOf(result);
    assert.equal(result.status, 1);
    assert.equal(report.counts.SPACING_LITERAL, 6);
    assert.ok(report.findings.every(finding => finding.code === 'SPACING_LITERAL'));
});

test('follows local aliases and style callbacks; rejects theme spacing helpers and preset overrides', () => {
    writeSource(`import { Box } from '@mui/material';
import { layoutSx, layoutCss } from '../../shared/ui/layout';
import { styled } from '@mui/material/styles';
const localGap = 2;
const localStyles = { gap: localGap };
const callback = theme => ({ mt: theme.spacing(2) });
const makeStyles = () => ({ marginTop: 3 });
const recursiveStyles = () => recursiveStyles();
const Styled = styled('div')({ padding: 4, width: 200 });
const StyledTemplate = styled.div\`padding: 8px; min-height: 0;\`;
const dynamicKey = 'padding';
export function Bad() { return <><Box sx={localStyles} /><Box sx={callback} /><Styled />
  <StyledTemplate /><Box sx={makeStyles()} /><Box sx={recursiveStyles()} /><Box sx={{ [dynamicKey]: 2 }} />
  <Box sx={{ ...layoutSx.form.fieldGap, gap: layoutSx.page.sectionGap.gap }} />
  <Box sx={{ gap: layoutCss.table.cellInset }} />
  <Box sx={{ p: layoutSx.form.fieldGap.gap }} /></>; }
`);
    const result = runChecker();
    const report = reportOf(result);
    assert.equal(result.status, 1);
    assert.ok(report.findings.some(finding => finding.code === 'SPACING_ALIAS_LITERAL'));
    assert.ok(report.findings.some(finding => finding.code === 'UNKNOWN_SPACING_VALUE'));
    assert.ok(report.findings.some(finding => finding.code === 'SEMANTIC_ROLE_OVERRIDE'));
    assert.ok(report.findings.some(finding => finding.file.endsWith('index.tsx') && finding.property === 'padding' && finding.code === 'SPACING_LITERAL'));
    assert.ok(report.findings.some(finding => finding.code === 'SEMANTIC_ROLE_MISMATCH'));
    assert.ok(report.findings.some(finding => finding.code === 'STYLE_HELPER_CYCLE'));
    assert.ok(report.findings.some(finding => finding.code === 'UNKNOWN_STYLE_KEY'));
    assert.ok(report.findings.some(finding => finding.code === 'STYLED_CSS_SPACING_LITERAL'));
});

test('scans nested slotProps but does not confuse event handlers or geometric dimensions with spacing', () => {
    writeSource(`import { TextField } from '@mui/material';
const nestedPaperSlot = { sx: { px: 3 } };
export function Bad() { return <TextField sx={{ minWidth: 0, width: 240 }} slotProps={{
      paper: nestedPaperSlot, dialog: { sx: { p: 2 } }, input: { onBlur: () => { /* behavior */ } }
    }} />; }
`);
    const result = runChecker();
    const report = reportOf(result);
    assert.equal(result.status, 1);
    assert.equal(report.counts.SPACING_LITERAL, 2);
    assert.equal(report.counts.UNKNOWN_STYLE_SOURCE, undefined);
});

test('keeps Panel geometry inspectable and rejects spacing hidden in its geometry prop', () => {
    writeSource(`export function Good() { return <><Panel geometry={{ display: { xs: 'none', lg: 'block' }, flexDirection: 'column', height: '100%', gridColumn: { xs: 'auto', xl: '1 / -1' } }} />
  <Panel bodyMode="inset" beforeGap="section" afterGap="section" /></>; }
`);
    let report = reportOf(runChecker());
    assert.equal(report.status, 'PASS', JSON.stringify(report.findings));

    writeSource('export function Bad() { return <Panel geometry={{ display: "grid", p: 2 }} />; }\n');
    report = reportOf(runChecker());
    assert.equal(report.status, 'FAIL');
    assert.equal(report.counts.PANEL_GEOMETRY_SPACING_FORBIDDEN, 1);

    writeSource('const geometry = makeGeometry(); export function Unknown() { return <Panel geometry={geometry} />; }\n');
    report = reportOf(runChecker());
    assert.equal(report.status, 'FAIL');
    assert.equal(report.counts.PANEL_GEOMETRY_SOURCE_UNKNOWN, 1);
});

test('accepts only an exact CSS exception and reports stale or mismatched exception scope', () => {
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/fixture.css'), '.skip-link { padding: 12px; } .card { margin: 24px; } .surface { gap: var(--space-md); }\n');
    fs.writeFileSync(path.join(fixtureRoot, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [exception()] }, null, 2));
    writeSource('export function Geometry() { return <div style={{ width: 24 }} />; }\n');
    const exact = runChecker();
    const exactReport = reportOf(exact);
    assert.equal(exact.status, 1);
    assert.deepEqual(exactReport.exceptionsUsed, ['FIXTURE-A11Y']);
    assert.ok(exactReport.findings.some(finding => finding.file.endsWith('fixture.css') && finding.property === 'margin' && finding.value === '24px'));
    assert.ok(!exactReport.findings.some(finding => finding.property === 'padding'));

    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/fixture.css'), '.surface { gap: var(--space-not-generated); }\n');
    const missingToken = reportOf(runChecker());
    assert.ok(missingToken.findings.some(finding => finding.code === 'CSS_SPACING_LITERAL' && finding.value === 'var(--space-not-generated)'));

    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/fixture.css'), '.other { padding: 12px; }\n');
    const mismatch = reportOf(runChecker());
    assert.ok(mismatch.counts.EXCEPTION_SCOPE_MISMATCH >= 1);
    assert.ok(mismatch.counts.EXCEPTION_UNUSED >= 1);
});

test('rejects malformed TypeScript, malformed CSS, bad exception schema, and raw values in the bridge', () => {
    writeSource('export function Broken( { return <div />; }\n');
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/app/fixture.css'), '.broken { padding: 4px;\n');
    let report = reportOf(runChecker());
    assert.ok(report.counts.PARSE_ERROR >= 2);

    resetFixture();
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/layout.ts'), validBridge.replace('gap: factor.lg', 'gap: 3'));
    writeSource(`import { Box } from '@mui/material'; export function Bad() { return <Box sx={{ gap: 2 }} />; }`);
    report = reportOf(runChecker());
    assert.ok(report.counts.BRIDGE_RAW_VALUE >= 1);

    resetFixture();
    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/layout.ts'), validBridge.replace('${cssPixel(tokens.space.md)}', '12px'));
    report = reportOf(runChecker());
    assert.ok(report.counts.BRIDGE_CSS_TOKEN_INVALID >= 1);

    resetFixture();
    fs.writeFileSync(path.join(fixtureRoot, 'scripts/layout-exceptions.json'), '{"version": 9, "exceptions": []}');
    report = reportOf(runChecker());
    assert.ok(report.counts.EXCEPTION_REGISTRY_INVALID >= 1);
});

test('rejects canonical pixel tokens used as MUI factors and an altered bridge factor table', () => {
    writeSource(`import { Box } from '@mui/material'; import { tokens } from '@botsales/tokens';
import { layoutSx } from '../../shared/ui/layout';
export function Bad() { return <><Box sx={{ p: tokens.space.lg }} /><Box style={{ padding: layoutSx.form.fieldGap.gap }} /></>; }
`);
    let report = reportOf(runChecker());
    assert.ok(report.counts.UNIT_MISMATCH >= 1);
    assert.ok(report.counts.SEMANTIC_ROLE_MISMATCH >= 1);

    fs.writeFileSync(path.join(fixtureRoot, 'apps/web/src/shared/ui/layout.ts'), validBridge.replace('md: tokens.space.md / tokens.space.sm', 'md: 99'));
    report = reportOf(runChecker());
    assert.ok(report.counts.BRIDGE_FACTOR_MAP_INVALID >= 1);
});

test('report mode inventories migration debt without turning findings into PASS', () => {
    writeSource(`import { Box } from '@mui/material'; export function Bad() { return <Box sx={{ p: 2 }} />; }`);
    const result = runChecker({ strict: false });
    const report = reportOf(result);
    assert.equal(result.status, 0);
    assert.equal(report.status, 'FAIL');
    assert.equal(report.counts.SPACING_LITERAL, 1);
    assert.deepEqual(report.migrationDebt.byComponent, [{ key: 'module:fixture', findings: 1, counts: { SPACING_LITERAL: 1 } }]);
    assert.deepEqual(report.migrationDebt.byFile, [{ key: 'apps/web/src/modules/fixture/index.tsx', findings: 1, counts: { SPACING_LITERAL: 1 } }]);
});

after(() => {
    const actualRoot = fs.realpathSync(fixtureRoot);
    const actualTemp = fs.realpathSync(os.tmpdir());
    const relativeRoot = path.relative(actualTemp, actualRoot);
    assert.ok(relativeRoot.startsWith('botsales-layout-checker-'), `Fixture escaped the owned temp directory: ${actualRoot}`);
    assert.equal(path.isAbsolute(relativeRoot), false);
    assert.notEqual(relativeRoot, '..');
    assert.ok(!relativeRoot.startsWith(`..${path.sep}`));
    fs.rmSync(actualRoot, { recursive: true, force: true });
});

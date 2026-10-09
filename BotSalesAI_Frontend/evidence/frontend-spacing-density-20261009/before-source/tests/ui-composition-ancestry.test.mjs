import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createUiBindings } from '../scripts/ui-bindings.mjs';
import { inspectComposition } from '../scripts/check-ui-composition.mjs';

function inspect(t, source, extras = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-composition-ancestry-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const files = {
        'apps/web/tsconfig.json': JSON.stringify({
            compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', baseUrl: '.', strict: false },
            include: ['src', '../../packages/design-tokens/src'],
        }),
        'apps/web/src/shared/ui/layout.ts': `export const layoutSx = { form: { fieldGap: { gap: 2 } }, surface: { inset: { p: 2 }, contentGap: { gap: 1 } } } as const;`,
        'apps/web/src/shared/ui/composition.tsx': `export function FormFields(props: any) { return null; } export function SurfaceContent(props: any) { return null; } export function ActionGroup(props: any) { return null; } export function PageSections(props: any) { return null; } export function SectionGrid(props: any) { return null; }`,
        'apps/web/src/shared/ui/components.tsx': `export function Panel(props: any) { return null; } export function EditDialog(props: any) { return null; } export function QueryState(props: any) { return props.children; }`,
        'apps/web/src/shared/ui/index.ts': `export { Panel as Surface } from './components'; export { FormFields as Fields } from './composition';`,
        'apps/web/src/modules/probe.tsx': source,
        'node_modules/@mui/material/package.json': JSON.stringify({ name: '@mui/material', types: 'index.d.ts' }),
        'node_modules/@mui/material/index.d.ts': `export declare function Stack(props: any): any; export declare function Box(props: any): any; export declare function Paper(props: any): any;`,
        'node_modules/react/package.json': JSON.stringify({ name: 'react', types: 'index.d.ts', exports: { '.': { types: './index.d.ts' }, './jsx-runtime': { types: './jsx-runtime.d.ts' } } }),
        'node_modules/react/index.d.ts': `export declare function createElement(type: any, props: any, ...children: any[]): any; export declare const Fragment: any;`,
        'node_modules/react/jsx-runtime.d.ts': `export declare function jsx(type: any, props: any): any; export declare function jsxs(type: any, props: any): any; export declare const Fragment: any;`,
        'node_modules/react-dom/package.json': JSON.stringify({ name: 'react-dom', types: 'index.d.ts' }),
        'node_modules/react-dom/index.d.ts': `export declare function createPortal(children: any, container: any): any;`,
        ...extras,
    };
    for (const [file, content] of Object.entries(files)) {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    }
    const sourcePath = path.join(root, 'apps/web/src/modules/probe.tsx');
    const bindings = createUiBindings(root, [sourcePath]);
    return inspectComposition(source, 'apps/web/src/modules/probe.tsx', bindings, sourcePath);
}

test('P10/P15 catch alias and neutral-wrapper duplicate insets through fragments and conditionals', t => {
    const result = inspect(t, `import {Panel} from '../shared/ui/components';
        import {FormFields as Fields, FormFields} from '../shared/ui/composition';
        const mode = 'inset' as const;
        export function UI({show}: {show: boolean}) { return <Panel bodyMode={mode}><><div>{show ? <Fields bodyMode={mode}/> : <FormFields bodyMode="inset"/>}</div></></Panel>; }`);
    assert.equal(result.issues.filter(issue => issue.rule === 'composition.double-inset').length, 2, JSON.stringify(result));
});

test('P20 resolves shared composition identities through a barrel and const component aliases', t => {
    const result = inspect(t, `import {Surface as Panel, Fields} from '../shared/ui';
        const Alias = Fields;
        export function UI() { return <Panel bodyMode="inset"><div><Alias bodyMode="inset"/></div></Panel>; }`);
    assert.ok(result.issues.some(issue => issue.rule === 'composition.double-inset'));
});

test('P11/P13 catch static element access roles on every MUI surface, including Paper', t => {
    const result = inspect(t, `import {Paper} from '@mui/material'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return <Paper sx={layoutSx['form']['fieldGap']}/>; }`);
    assert.ok(result.issues.some(issue => issue.rule === 'composition.shared-owner'));
});

test('P12 checks React createElement and JSX-runtime element factories', t => {
    const result = inspect(t, `import {createElement as make} from 'react'; import {jsx} from 'react/jsx-runtime';
        import {Stack} from '@mui/material'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return <>{make(Stack, {sx: layoutSx.form.fieldGap})}{jsx(Stack, {sx: layoutSx.surface.contentGap})}</>; }`);
    assert.equal(result.issues.filter(issue => issue.rule === 'composition.shared-owner').length, 2, JSON.stringify(result));
});

test('P14 resolves bodyMode literal aliases and fails closed when ownership is unknown', t => {
    const resolved = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        const mode = 'inset' as const; export function UI() { return <Panel bodyMode={mode}><FormFields bodyMode={mode}/></Panel>; }`);
    assert.ok(resolved.issues.some(issue => issue.rule === 'composition.double-inset'));

    const unknown = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        declare const externalMode: string; const mode = externalMode; export function UI() { return <Panel bodyMode="inset"><FormFields bodyMode={mode}/></Panel>; }`);
    assert.ok(unknown.issues.some(issue => issue.rule === 'composition.ownership-unknown'));

    const unknownPanel = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        declare const externalMode: string; export function UI() { return <Panel bodyMode={externalMode}><FormFields/></Panel>; }`);
    assert.ok(unknownPanel.issues.some(issue => issue.rule === 'composition.ownership-unknown'));
});

test('checks Panel ancestry when React elements are created natively', t => {
    const result = inspect(t, `import {createElement} from 'react'; import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        export function UI() { return createElement(Panel, {bodyMode: 'inset'}, createElement(FormFields, {bodyMode: 'inset'})); }`);
    assert.ok(result.issues.some(issue => issue.rule === 'composition.double-inset'));
});

test('keeps independent nested surfaces and portaled dialogs as separate owners', t => {
    const nested = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        export function UI() { return <Panel bodyMode="inset"><Panel bodyMode="inset"><FormFields/></Panel></Panel>; }`);
    assert.deepEqual(nested.issues, []);

    const portal = inspect(t, `import {Panel, EditDialog} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        import {createPortal} from 'react-dom'; export function UI() { return <Panel bodyMode="inset"><EditDialog>{createPortal(<FormFields bodyMode="inset"/>, document.body)}</EditDialog></Panel>; }`);
    assert.deepEqual(portal.issues, []);
});

test('accepts finite bodyMode branches and every mode in the public component contracts', t => {
    const valid = inspect(t, `import {Panel} from '../shared/ui/components';
        import {FormFields, ActionGroup, PageSections} from '../shared/ui/composition';
        declare const showOrders: boolean;
        export function UI() { return <PageSections><Panel bodyMode={showOrders ? 'flush' : 'inset'}><FormFields/></Panel>
            <Panel><ActionGroup bodyMode="header"/></Panel>
            <Panel bodyMode="inset"><FormFields bodyMode="outlined"/></Panel></PageSections>; }`);
    assert.deepEqual(valid.issues, [], JSON.stringify(valid));

    const invalid = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        declare const externalMode: string; export function UI() { return <Panel bodyMode={externalMode}><FormFields/></Panel>; }`);
    assert.ok(invalid.issues.some(issue => issue.rule === 'composition.ownership-unknown'));

    const duplicate = inspect(t, `import {Panel} from '../shared/ui/components'; import {FormFields} from '../shared/ui/composition';
        declare const showOrders: boolean; export function UI() { return <Panel bodyMode={showOrders ? 'flush' : 'inset'}><FormFields bodyMode="inset"/></Panel>; }`);
    assert.ok(duplicate.issues.some(issue => issue.rule === 'composition.double-inset'));
});

test('stops inherited gap ownership at Panels and independent bordered surfaces', t => {
    const result = inspect(t, `import {Panel} from '../shared/ui/components';
        import {FormFields, SurfaceContent, PageSections} from '../shared/ui/composition';
        import {Box, Paper} from '@mui/material'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return <PageSections><Panel><FormFields beforeGap="surface"/></Panel>
            <Paper variant="outlined"><SurfaceContent beforeGap="surface"/></Paper>
            <Panel bodyMode="inset"><Box sx={[layoutSx.surface.inset, {border: 1}]}><SurfaceContent/></Box></Panel>
        </PageSections>; }`);
    assert.deepEqual(result.issues, [], JSON.stringify(result));

    const duplicate = inspect(t, `import {Panel} from '../shared/ui/components'; import {SurfaceContent} from '../shared/ui/composition';
        import {Box} from '@mui/material'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return <Panel bodyMode="inset"><Box sx={[layoutSx.surface.inset, {border: 1}]}><SurfaceContent bodyMode="inset"/></Box></Panel>; }`);
    assert.ok(duplicate.issues.some(issue => issue.rule === 'composition.double-inset'), JSON.stringify(duplicate));
});

test('tracks gaps through fragments, conditions and ready QueryState, but not inside DOM wrappers', t => {
    const result = inspect(t, `import {PageSections, ActionGroup} from '../shared/ui/composition';
        import {QueryState} from '../shared/ui/components';
        declare const query: any; declare const show: boolean;
        export function UI() { return <><PageSections><>{show && <ActionGroup beforeGap="form"/>}</></PageSections>
            <PageSections><QueryState query={query}><ActionGroup beforeGap="form"/></QueryState></PageSections>
            <PageSections><div><ActionGroup beforeGap="form"/></div></PageSections></>; }`);
    assert.equal(result.issues.filter(issue => issue.rule === 'composition.double-boundary').length, 2, JSON.stringify(result));
});

test('applies the same finite modes and wrapper boundaries to native React factories', t => {
    const result = inspect(t, `import {createElement} from 'react'; import {PageSections, ActionGroup} from '../shared/ui/composition';
        import {Panel, QueryState} from '../shared/ui/components'; declare const query: any; declare const show: boolean;
        export function UI() { return createElement('main', null,
            createElement(PageSections, null, createElement('div', null, createElement(ActionGroup, {beforeGap: 'form'}))),
            createElement(PageSections, null, createElement(QueryState, {query}, createElement(ActionGroup, {beforeGap: 'form'}))),
            createElement(Panel, {bodyMode: show ? 'flush' : 'inset'}, createElement(ActionGroup, {bodyMode: 'header'}))); }`);
    assert.equal(result.issues.filter(issue => issue.rule === 'composition.double-boundary').length, 1, JSON.stringify(result));
    assert.equal(result.issues.filter(issue => issue.rule === 'composition.ownership-unknown').length, 0, JSON.stringify(result));

    const unknown = inspect(t, `import {createElement} from 'react'; import {Panel} from '../shared/ui/components';
        import {FormFields} from '../shared/ui/composition'; declare const mode: string;
        export function UI() { return createElement(Panel, {bodyMode: mode}, createElement(FormFields)); }`);
    assert.ok(unknown.issues.some(issue => issue.rule === 'composition.ownership-unknown'));
});

test('recognizes native outlined Paper and nested Box surface inset boundaries', t => {
    const result = inspect(t, `import {createElement} from 'react'; import {Paper, Box} from '@mui/material';
        import {Panel} from '../shared/ui/components'; import {SurfaceContent} from '../shared/ui/composition'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return createElement(Panel, {bodyMode: 'inset'},
            createElement(Paper, {variant: 'outlined', sx: layoutSx.surface.inset}, createElement(SurfaceContent)),
            createElement(Box, {sx: [layoutSx.surface.inset, {border: 1}]}, createElement(SurfaceContent))); }`);
    assert.deepEqual(result.issues, [], JSON.stringify(result));

    const duplicate = inspect(t, `import {createElement} from 'react'; import {Paper} from '@mui/material';
        import {Panel} from '../shared/ui/components'; import {SurfaceContent} from '../shared/ui/composition'; import {layoutSx} from '../shared/ui/layout';
        export function UI() { return createElement(Panel, {bodyMode: 'inset'}, createElement(Paper, {variant: 'outlined', sx: layoutSx.surface.inset}, createElement(SurfaceContent, {bodyMode: 'inset'}))); }`);
    assert.ok(duplicate.issues.some(issue => issue.rule === 'composition.double-inset'), JSON.stringify(duplicate));
});

test('fails closed when an unresolved custom wrapper obscures a semantic gap owner', t => {
    const result = inspect(t, `import {PageSections, ActionGroup} from '../shared/ui/composition'; import {UnknownWrapper} from './unknown-wrapper';
        export function UI() { return <PageSections><UnknownWrapper><ActionGroup beforeGap="form"/></UnknownWrapper></PageSections>; }`, {
        'apps/web/src/modules/unknown-wrapper.tsx': `export function UnknownWrapper({children}: {children: unknown}) { return children as any; }`,
    });
    assert.ok(result.issues.some(issue => issue.rule === 'composition.ownership-unknown'), JSON.stringify(result));
});

test('rejects unsupported placement and rhythm values while accepting finite aliases and branches', t => {
    const valid = inspect(t, `import {ActionGroup, SectionGrid} from '../shared/ui/composition';
        declare const compact: boolean; const placement = 'form' as const;
        export function UI() { return <><ActionGroup beforeGap={placement}/><SectionGrid columns="1fr" rhythm={compact ? 'content' : 'section'}/></>; }`);
    assert.deepEqual(valid.issues, [], JSON.stringify(valid));

    const invalid = inspect(t, `import {ActionGroup, SectionGrid} from '../shared/ui/composition';
        declare const placement: string; export function UI() { return <><ActionGroup beforeGap={placement}/><SectionGrid columns="1fr" rhythm="arbitrary"/></>; }`);
    assert.equal(invalid.issues.filter(issue => issue.rule === 'composition.value-unknown').length, 2, JSON.stringify(invalid));
});

test('rejects unsupported finite values through React element factories', t => {
    const invalid = inspect(t, `import {createElement} from 'react'; import {SurfaceContent, ActionGroup} from '../shared/ui/composition';
        export function UI() { return [createElement(SurfaceContent, {afterGap: 'section'}), createElement(ActionGroup, {density: 'spacious'})]; }`);
    assert.equal(invalid.issues.filter(issue => issue.rule === 'composition.value-unknown').length, 2, JSON.stringify(invalid));

    const valid = inspect(t, `import {createElement} from 'react'; import {ActionGroup} from '../shared/ui/composition';
        declare const comfortable: boolean;
        export function UI() { return createElement(ActionGroup, {density: comfortable ? 'comfortable' : 'compact'}); }`);
    assert.deepEqual(valid.issues, [], JSON.stringify(valid));
});

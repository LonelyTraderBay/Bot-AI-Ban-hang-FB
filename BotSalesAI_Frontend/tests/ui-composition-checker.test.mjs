import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectComposition } from '../scripts/check-ui-composition.mjs';

test('accepts semantic composition, closed geometry and business-specific MUI primitives', () => {
    const result = inspectComposition(`import { FormFields, ActionGroup, SectionGrid } from '../../shared/ui/composition'; import { TextField, Box } from '@mui/material'; const UI=()=> <><FormFields component="form" noValidate><TextField label="Name"/></FormFields><ActionGroup beforeGap="form"/><SectionGrid columns={{xs:'1fr',lg:'2fr 1fr'}} geometry={{minWidth:0}}/><Box width={240}/></>;`);
    assert.deepEqual(result.issues, []);
});

test('rejects rebuilding each shared spacing owner at a consumer', () => {
    for (const [role, tag] of [['form.fieldGap', 'Stack'], ['form.inlineGap', 'Stack'], ['surface.contentGap', 'Stack'], ['actions.inlineGap', 'Stack'], ['page.sectionGap', 'Stack'], ['grid.gutter', 'Box']]) {
        const result = inspectComposition(`import { ${tag} } from '@mui/material'; import { layoutSx } from '../../shared/ui/layout'; const UI=()=> <${tag} sx={layoutSx.${role}}/>;`);
        assert.equal(result.issues[0]?.rule, 'composition.shared-owner', role);
    }
    for (const [role, tag] of [['form.fieldGap', 'Box'], ['grid.gutter', 'Stack']]) {
        assert.equal(inspectComposition(`import { ${tag} } from '@mui/material'; import { layoutSx } from '../../shared/ui/layout'; const UI=()=> <${tag} sx={layoutSx.${role}}/>;`).issues[0]?.rule, 'composition.shared-owner');
    }
});

test('follows aliases, local style variables, object spreads and namespace imports', () => {
    const result = inspectComposition(`import * as MUI from '@mui/material'; import * as Layout from '../../shared/ui/layout'; const fields = { ...Layout.layoutSx.form.fieldGap }; const UI=()=> <MUI.Stack sx={fields}/>;`);
    assert.equal(result.issues[0]?.rule, 'composition.shared-owner');
    const aliases = inspectComposition(`import { Stack as Row } from '@mui/material'; import { layoutSx as spacing } from '../../shared/ui/layout'; const UI=()=> <Row sx={[spacing.actions.inlineGap,{minWidth:0}]}/>;`);
    assert.equal(aliases.issues[0]?.rule, 'composition.shared-owner');
});

test('rejects direct and spread spacing overrides on semantic components', () => {
    const result = inspectComposition(`import { FormFields as Fields } from '../../shared/ui/composition'; import * as UI from '../../shared/ui/composition'; const Page=()=> <><Fields sx={{gap:2}} style={{padding:4}} gap={3} aria-live="polite" data-unknown="value"/><UI.ActionGroup {...props}/></>;`);
    assert.deepEqual(result.issues.map(item => item.rule), ['composition.override', 'composition.override', 'composition.override', 'composition.unknown-prop', 'composition.unknown-prop', 'composition.unknown-spread']);
});

test('rejects spacing or opaque spreads hidden in geometry', () => {
    const result = inspectComposition(`import { FormFields } from '../../shared/ui/composition'; const UI=()=> <FormFields geometry={{maxWidth:760,padding:24,...other}}/>;`);
    assert.deepEqual(result.issues.map(item => item.rule), ['composition.geometry-spacing', 'composition.geometry-spread']);
});

test('allows the canonical owner implementation and fails closed on malformed source', () => {
    const source = `import { Stack } from '@mui/material'; import { layoutSx } from './layout'; const UI=()=> <Stack sx={layoutSx.form.fieldGap}/>;`;
    assert.equal(inspectComposition(source, 'apps/web/src/shared/ui/composition.tsx').issues.length, 0);
    assert.equal(inspectComposition(source, 'apps/web/src/shared/ui/copied.tsx').issues[0]?.rule, 'composition.shared-owner');
    assert.ok(inspectComposition('const UI=()=> <FormFields').issues.some(item => item.rule === 'composition.parse'));
});

test('rejects duplicated parent boundary and duplicated Panel inset', () => {
    const source = `import * as UI from '../../shared/ui/composition'; import { Panel } from '../../shared/ui/components'; const Page=()=> <><UI.PageSections><UI.ActionGroup beforeGap="form"/></UI.PageSections><Panel bodyMode="inset"><UI.FormFields bodyMode="inset"/></Panel></>;`;
    assert.deepEqual(inspectComposition(source).issues.map(item => item.rule), ['composition.double-boundary', 'composition.double-inset']);
});

test('checks default MUI imports and fails closed for opaque geometry', () => {
    const source = `import Stack from '@mui/material/Stack'; import { layoutSx } from '../../shared/ui/layout'; import { FormFields } from '../../shared/ui/composition'; const Page=()=> <><Stack sx={layoutSx.form.fieldGap}/><FormFields geometry={condition ? a : b}/></>;`;
    assert.deepEqual(inspectComposition(source).issues.map(item => item.rule), ['composition.shared-owner', 'composition.geometry-unknown']);
});

test('distinguishes content grids from flex flows when reporting the shared owner', () => {
    const result=inspectComposition(`import { Box } from '@mui/material'; import { layoutSx } from '../../shared/ui/layout'; const cards={display:'grid',...layoutSx.surface.contentGap}; const UI=()=> <Box sx={cards}/>;`);
    assert.match(result.issues[0]?.message, /SectionGrid rhythm="content"/);
});

test('rejects page spacing for paired fields and peer Panels without a section gap owner', () => {
    const pairedFields = inspectComposition(`import {PageSections} from '../../shared/ui/composition'; import {TextField} from '@mui/material';
        const Page=()=> <PageSections direction={{xs:'column',sm:'row'}}><TextField label="From"/><TextField label="To"/></PageSections>;`);
    assert.deepEqual(pairedFields.issues.map(issue => issue.rule), ['composition.semantic-role']);

    const joinedPanels = inspectComposition(`import {Panel} from '../../shared/ui/components'; const Page=()=> <><Panel/><Panel/></>;`);
    assert.deepEqual(joinedPanels.issues.map(issue => issue.rule), ['composition.missing-sibling-gap']);

    const ownedPanels = inspectComposition(`import {PageSections} from '../../shared/ui/composition'; import {Panel} from '../../shared/ui/components';
        const Page=()=> <PageSections><Panel/><Panel/></PageSections>;`);
    assert.deepEqual(ownedPanels.issues, []);

    const explicitBoundary = inspectComposition(`import {Panel} from '../../shared/ui/components'; const Page=()=> <><Panel/><Panel beforeGap="section"/></>;`);
    assert.deepEqual(explicitBoundary.issues, []);

    const wrappedPanel = inspectComposition(`import {PageSections} from '../../shared/ui/composition'; import {Panel} from '../../shared/ui/components'; declare const showPreview: boolean;
        function Preview() { return <Panel/>; }
        const Page=()=> <>{showPreview ? <Preview/> : <Panel/>}<Panel/></>;`);
    assert.deepEqual(wrappedPanel.issues.map(issue => issue.rule), ['composition.missing-sibling-gap']);

    const wrappedOwnedPanels = inspectComposition(`import {PageSections} from '../../shared/ui/composition'; import {Panel} from '../../shared/ui/components'; declare const showPreview: boolean;
        function Preview() { return <Panel/>; }
        const Page=()=> <PageSections>{showPreview ? <Preview/> : <Panel/>}<Panel/></PageSections>;`);
    assert.deepEqual(wrappedOwnedPanels.issues, []);

    const alternativePanels = inspectComposition(`import {Panel} from '../../shared/ui/components'; declare const showRules: boolean;
        const Page=()=> <>{showRules ? <Panel/> : <Panel/>}<div/></>;`);
    assert.deepEqual(alternativePanels.issues, []);
});

test('related sibling gaps belong to ActionGroup comfortable density, not consumer Stack styles', () => {
    const invalid = inspectComposition(`import {Stack} from '@mui/material'; import {layoutSx} from '../../shared/ui/layout';
        const UI=()=> <Stack sx={layoutSx.actions.relatedLinksGap}/>;`);
    assert.equal(invalid.issues[0]?.rule, 'composition.shared-owner');
    assert.match(invalid.issues[0]?.message, /ActionGroup/);

    const valid = inspectComposition(`import {ActionGroup} from '../../shared/ui/composition';
        const UI=()=> <ActionGroup density="comfortable"><a href="/products">Products</a><a href="/inventory">Inventory</a></ActionGroup>;`);
    assert.deepEqual(valid.issues, []);

    const unknown = inspectComposition(`import {ActionGroup} from '../../shared/ui/composition'; const UI=()=> <ActionGroup density="spacious"/>;`);
    assert.ok(unknown.issues.some(issue => issue.rule === 'composition.value-unknown'));
});

test('density profiles are finite and new spacing paths retain the shared owner', () => {
    const valid = inspectComposition(`import { FormFields, SurfaceContent, PageSections } from '../../shared/ui/composition'; import { Panel, EditDialog } from '../../shared/ui/components'; const UI=()=> <><FormFields density="compact"/><SurfaceContent rhythm="dividedRows"/><PageSections rhythm="major"/><Panel density="comfortable"/><EditDialog density="comfortable"/></>;`);
    assert.deepEqual(valid.issues, []);
    for (const [name, prop] of [['FormFields','density'],['SurfaceContent','rhythm'],['PageSections','rhythm'],['Panel','density'],['EditDialog','density']]) {
        for (const value of ['"unknown"','{choice}']) {
            const result = inspectComposition(`import { ${name} } from '../../shared/ui/${['Panel','EditDialog'].includes(name)?'components':'composition'}'; const UI=()=> <${name} ${prop}=${value}/>;`);
            assert.ok(result.issues.some(issue => issue.rule === 'composition.value-unknown'), name + ' ' + value);
        }
    }
    for (const role of ['form.compactFieldGap','page.majorSectionGap','detail.dividedListGap']) {
        const result = inspectComposition(`import { Stack } from '@mui/material'; import { layoutSx } from '../../shared/ui/layout'; const UI=()=> <Stack sx={layoutSx.${role}}/>;`);
        assert.equal(result.issues[0]?.rule, 'composition.shared-owner', role);
    }
});

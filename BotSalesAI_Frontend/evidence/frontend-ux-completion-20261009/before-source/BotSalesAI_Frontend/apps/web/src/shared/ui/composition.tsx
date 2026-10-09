import type { CSSProperties, FormEventHandler, Ref } from 'react';
import { Box, Stack } from '@mui/material';
import type { BoxProps, StackProps } from '@mui/material';
import { layoutSx } from './layout';
import { visualSx } from './visual';

type Responsive<T> = T | Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', T>>;
type Geometry = {
    width?: Responsive<CSSProperties['width']>;
    minWidth?: Responsive<CSSProperties['minWidth']>;
    maxWidth?: Responsive<CSSProperties['maxWidth']>;
    height?: Responsive<CSSProperties['height']>;
    minHeight?: Responsive<CSSProperties['minHeight']>;
    flex?: CSSProperties['flex'];
    gridColumn?: Responsive<CSSProperties['gridColumn']>;
};
type DataAttributes = { 'data-testid'?: string; 'data-draft-clean'?: string };
type FlowProps = Pick<StackProps, 'children' | 'direction' | 'alignItems' | 'justifyContent' | 'flexWrap' | 'id' | 'role' | 'aria-label' | 'aria-labelledby' | 'aria-describedby'> & DataAttributes & { geometry?: Geometry };

// Geometry forwarding is explicit for the static source gates; spacing stays at named owners.

type FormFieldsProps = FlowProps & {
    density?: 'compact' | 'comfortable';
    bodyMode?: 'flush' | 'inset' | 'outlined';
    beforeGap?: 'surface';
    afterGap?: 'section';
} & ({ component: 'form'; noValidate?: boolean; onSubmit?: FormEventHandler<HTMLFormElement>; ref?: Ref<HTMLFormElement> } | { component?: 'div'; noValidate?: never; onSubmit?: never; ref?: Ref<HTMLDivElement> });

/** Form-level rhythm. Native form submission, refs and draft attributes are retained. */
export function FormFields({ bodyMode = 'flush', density = 'comfortable', beforeGap, afterGap, geometry, ...props }: FormFieldsProps) {
    const sx = [density === 'compact' ? layoutSx.form.compactFieldGap : layoutSx.form.fieldGap, layoutSx.composition.childBoundaries, bodyMode !== 'flush' && layoutSx.surface.inset, bodyMode === 'outlined' && { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.dialog }, beforeGap === 'surface' && layoutSx.surface.sectionBefore, afterGap === 'section' && layoutSx.page.sectionAfter, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }];
    if (props.component === 'form') return <Stack component="form" noValidate={props.noValidate} onSubmit={props.onSubmit} ref={props.ref} children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="form-fields" data-ui-rhythm={density} sx={sx}/>;
    return <Stack ref={props.ref} children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="form-fields" data-ui-rhythm={density} sx={sx}/>;
}

/** Compact controls belonging to the same field or filter group. */
export function FieldGroup({ bodyMode = 'flush', geometry, ...props }: FlowProps & { bodyMode?: 'flush' | 'toolbar' }) {
    return <Stack children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="field-group" sx={[layoutSx.form.inlineGap, layoutSx.composition.childBoundaries, bodyMode === 'toolbar' && layoutSx.toolbar.inset, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }]}/>;
}

/** Related content inside a surface; each supported appearance has live consumers. */
export function SurfaceContent({ bodyMode = 'flush', rhythm = 'content', beforeGap, afterGap, geometry, ...props }: FlowProps & {
    bodyMode?: 'flush' | 'inset' | 'insetDivider' | 'compactOutlined' | 'compactControlOutlined';
    rhythm?: 'content' | 'dividedRows';
    beforeGap?: 'surface';
    afterGap?: 'notice';
}) {
    return <Stack children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="surface-content" data-ui-rhythm={rhythm} sx={[rhythm === 'dividedRows' ? layoutSx.detail.dividedListGap : layoutSx.surface.contentGap, layoutSx.composition.childBoundaries, (bodyMode === 'inset' || bodyMode === 'insetDivider') && layoutSx.surface.inset, bodyMode === 'insetDivider' && { borderBottom: 1, borderColor: 'divider' }, (bodyMode === 'compactOutlined' || bodyMode === 'compactControlOutlined') && layoutSx.surface.compactInset, bodyMode === 'compactOutlined' && { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.large }, bodyMode === 'compactControlOutlined' && { border: 1, borderColor: 'divider', borderRadius: visualSx.radius.control }, beforeGap === 'surface' && layoutSx.surface.sectionBefore, afterGap === 'notice' && layoutSx.notice.afterGap, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }]}/>;
}

/** Related actions use a finite density; placement is semantic, never pixels. */
export function ActionGroup({ direction = 'row', bodyMode = 'flush', density = 'compact', beforeGap, afterGap, geometry, ...props }: FlowProps & {
    bodyMode?: 'flush' | 'header';
    density?: 'compact' | 'comfortable';
    beforeGap?: 'form' | 'surface' | 'detail';
    afterGap?: 'section' | 'notice';
}) {
    const spacing = density === 'comfortable' ? layoutSx.actions.relatedLinksGap : layoutSx.actions.inlineGap;
    return <Stack children={props.children} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="action-group" data-ui-rhythm={density} direction={direction} sx={[spacing, layoutSx.composition.childBoundaries, bodyMode === 'header' && layoutSx.surface.headerInset, bodyMode === 'header' && { borderBottom: 1, borderColor: 'divider' }, beforeGap === 'form' && layoutSx.actions.beforeGap, beforeGap === 'surface' && layoutSx.surface.sectionBefore, beforeGap === 'detail' && layoutSx.detail.relatedContentGap, afterGap === 'section' && layoutSx.page.sectionAfter, afterGap === 'notice' && layoutSx.notice.afterGap, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }]}/>;
}

/** A page's sibling sections. Panel inset and internal field gaps retain their own owners. */
export function PageSections({ rhythm = 'section', beforeGap, geometry, shrinkChildren, ...props }: FlowProps & { rhythm?: 'section' | 'major'; beforeGap?: 'section'; shrinkChildren?: boolean }) {
    return <Stack children={props.children} direction={props.direction} alignItems={props.alignItems} justifyContent={props.justifyContent} flexWrap={props.flexWrap} id={props.id} role={props.role} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="page-sections" data-ui-rhythm={rhythm} sx={[rhythm === 'major' ? layoutSx.page.majorSectionGap : layoutSx.page.sectionGap, layoutSx.composition.childBoundaries, beforeGap === 'section' && layoutSx.page.sectionBefore, shrinkChildren === true && { '& > *': { minWidth: 0 } }, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }]}/>;
}

type SectionGridProps = Pick<BoxProps, 'children' | 'id' | 'role' | 'aria-label' | 'alignItems'> & DataAttributes & {
    columns: Responsive<CSSProperties['gridTemplateColumns']>;
    geometry?: Geometry;
    shrinkChildren?: boolean;
    rhythm?: 'section' | 'content';
};

/** Column geometry may follow the workflow; the gutter is always owned here. */
export function SectionGrid({ columns, geometry, shrinkChildren, rhythm = 'section', ...props }: SectionGridProps) {
    return <Box children={props.children} id={props.id} role={props.role} aria-label={props['aria-label']} alignItems={props.alignItems} data-testid={props['data-testid']} data-draft-clean={props['data-draft-clean']} data-ui-composition="section-grid" data-ui-rhythm={rhythm} sx={[rhythm === 'section' ? layoutSx.grid.gutter : layoutSx.surface.contentGap, layoutSx.composition.childBoundaries, { display: 'grid', gridTemplateColumns: columns }, shrinkChildren === true && { '& > *': { minWidth: 0 } }, { width: geometry?.width, minWidth: geometry?.minWidth, maxWidth: geometry?.maxWidth, height: geometry?.height, minHeight: geometry?.minHeight, flex: geometry?.flex, gridColumn: geometry?.gridColumn }]}/>;
}

import type { SxProps, Theme } from '@mui/material/styles';
import { tokens } from '@botsales/tokens';

type LayoutSx = SxProps<Theme>;
type CssPixel = `${number}px`;
type LayoutSxContract = {
    page: { majorSectionGap: LayoutSx; gutter: LayoutSx; contentInsetBlock: LayoutSx; sectionGap: LayoutSx; sectionBefore: LayoutSx; sectionAfter: LayoutSx };
    composition: { childBoundaries: LayoutSx };
    pageHeader: { titleDescriptionGap: LayoutSx; columnsGap: LayoutSx; afterGap: LayoutSx; actionsGap: LayoutSx };
    surface: { comfortableInset: LayoutSx; comfortableHeaderInset: LayoutSx; comfortableBodyInsetAfterHeader: LayoutSx; inset: LayoutSx; compactInset: LayoutSx; compactContentGap: LayoutSx; headerInset: LayoutSx; bodyInsetAfterHeader: LayoutSx; sectionBefore: LayoutSx; titleDescriptionGap: LayoutSx; headerFlowGap: LayoutSx; contentGap: LayoutSx };
    form: { compactFieldGap: LayoutSx; fieldGap: LayoutSx; inlineGap: LayoutSx; pairedFields: LayoutSx };
    actions: { inlineGap: LayoutSx; beforeGap: LayoutSx; relatedLinksGap: LayoutSx; linkTarget: LayoutSx };
    grid: { gutter: LayoutSx };
    stats: { gutter: LayoutSx; afterGap: LayoutSx; titleGap: LayoutSx; valueGap: LayoutSx; noteGap: LayoutSx };
    code: { inlineGap: LayoutSx };
    table: { mobileHintInset: LayoutSx };
    lookup: { loadMoreRow: LayoutSx };
    toolbar: { inset: LayoutSx; controlGap: LayoutSx };
    pager: { inset: LayoutSx; actionsGap: LayoutSx };
    empty: { insetBlock: LayoutSx; insetInline: LayoutSx; contentGap: LayoutSx };
    notice: { afterGap: LayoutSx; contentGap: LayoutSx };
    dialog: { compactInset: LayoutSx; inset: LayoutSx; viewportMargin: LayoutSx; descriptionAfterGap: LayoutSx; actionsInset: LayoutSx; actionsGap: LayoutSx };
    auth: { surfaceInset: LayoutSx; brandMarkGap: LayoutSx; brandTitleGap: LayoutSx };
    footer: { insetInline: LayoutSx; insetBlock: LayoutSx };
    shell: { headerHeight: LayoutSx; mainFill: LayoutSx; demoBanner: LayoutSx; demoToolsBefore: LayoutSx; statusBanner: LayoutSx; pageFallbackInset: LayoutSx; centeredFallback: LayoutSx; demoControls: LayoutSx; demoControl: LayoutSx; demoToggle: LayoutSx; searchIconInset: LayoutSx; footerContent: LayoutSx };
    navigation: { brandInset: LayoutSx; brandGap: LayoutSx; brandMarkShape: LayoutSx; shopInset: LayoutSx; listInset: LayoutSx; groupGap: LayoutSx; groupLabelInset: LayoutSx; groupLabelGap: LayoutSx; itemGap: LayoutSx; itemInsetBlock: LayoutSx; itemShape: LayoutSx; accountInset: LayoutSx; accountGap: LayoutSx };
    inbox: { paneInset: LayoutSx; bubbleInset: LayoutSx; messageContentGap: LayoutSx; messageMetaGap: LayoutSx; messageGroupGap: LayoutSx; composerInset: LayoutSx; composerActionGap: LayoutSx; composerControlsBeforeGap: LayoutSx; listInset: LayoutSx; listContentGap: LayoutSx; unreadCountInset: LayoutSx; listStatusBeforeGap: LayoutSx; contextInset: LayoutSx };
    report: { contextGap: LayoutSx; listSurfaceInset: LayoutSx; listMarkerInset: LayoutSx; listItemGap: LayoutSx; chartViewportInset: LayoutSx; emptyStateInset: LayoutSx; subheadingAfterGap: LayoutSx };
    dashboard: { groupInset: LayoutSx; sectionGap: LayoutSx; heroTitleFlow: LayoutSx; heroDescriptionGap: LayoutSx; actionTarget: LayoutSx; metricValueGap: LayoutSx; footerFlow: LayoutSx };
    detail: { dividedListGap: LayoutSx; rowInsetBlock: LayoutSx; valueGap: LayoutSx; relatedItemGap: LayoutSx; relatedItemInset: LayoutSx; relatedContentGap: LayoutSx };
    query: { stateGap: LayoutSx; sectionPending: LayoutSx };
};

// MUI consumes factors; every factor is derived from the canonical 8px base.
// Keep this scale private. Consumers select named semantic roles below.
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

const cssPixel = (value: number): CssPixel => `${value}px`;

export const layoutSx = {
    page: {
        majorSectionGap: { gap: factor.xl },
        gutter: { px: { xs: factor.lg, md: factor.xl } },
        contentInsetBlock: { py: factor.lg },
        sectionGap: { gap: factor.lg },
        sectionBefore: { mt: factor.lg },
        sectionAfter: { mb: factor.lg },
    },
    composition: {
        // The parent owns the gap. Legacy notices/headers must not add a second boundary.
        childBoundaries: { '&.MuiStack-root > *, &.MuiBox-root > *': { marginTop: factor.zero, marginBottom: factor.zero } },
    },
    pageHeader: {
        titleDescriptionGap: { mt: factor.sm },
        columnsGap: { gap: factor.lg },
        afterGap: { mb: factor.lg },
        actionsGap: { gap: factor.sm, flexWrap: 'wrap' },
    },
    surface: {
        comfortableInset: { p: { xs: factor.lg, md: factor.xl } },
        comfortableHeaderInset: { px: { xs: factor.lg, md: factor.xl }, pt: { xs: factor.lg, md: factor.xl }, pb: factor.lg },
        comfortableBodyInsetAfterHeader: { px: { xs: factor.lg, md: factor.xl }, pb: { xs: factor.lg, md: factor.xl } },
        inset: { p: { xs: factor.md, md: factor.lg } },
        compactInset: { p: factor.md },
        compactContentGap: { gap: factor.sm },
        headerInset: { px: { xs: factor.md, md: factor.lg }, pt: { xs: factor.md, md: factor.lg }, pb: factor.md },
        bodyInsetAfterHeader: { px: { xs: factor.md, md: factor.lg }, pb: { xs: factor.md, md: factor.lg } },
        sectionBefore: { mt: factor.lg },
        titleDescriptionGap: { mt: factor.xs },
        headerFlowGap: { gap: factor.lg, flexWrap: 'wrap' },
        contentGap: { gap: factor.md },
    },
    form: {
        compactFieldGap: { gap: factor.md },
        fieldGap: { gap: factor.lg },
        inlineGap: { gap: factor.sm },
        pairedFields: { gap: factor.sm, my: factor.md },
    },
    actions: {
        inlineGap: { gap: factor.sm, flexWrap: 'wrap' },
        beforeGap: { mt: factor.lg },
        relatedLinksGap: { gap: factor.md, flexWrap: 'wrap' },
        linkTarget: { minHeight: tokens.layout.touchTarget, px: factor.lg, py: factor.sm, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
    },
    grid: { gutter: { gap: factor.lg } },
    stats: {
        gutter: { gap: factor.lg },
        afterGap: { mb: factor.lg },
        titleGap: { gap: factor.sm },
        valueGap: { mt: factor.sm },
        noteGap: { mt: factor.xs },
    },
    code: { inlineGap: { gap: factor.xs } },
    table: { mobileHintInset: { px: factor.lg, pt: factor.sm } },
    lookup: { loadMoreRow: { gap: factor.sm, px: factor.sm, mt: factor.xs } },
    toolbar: {
        inset: { p: factor.md },
        controlGap: { gap: factor.sm },
    },
    pager: {
        inset: { p: factor.md },
        actionsGap: { gap: factor.sm, flexWrap: 'wrap' },
    },
    empty: {
        insetBlock: { py: { xs: factor.xl, md: factor.xxl } },
        insetInline: { px: factor.lg },
        contentGap: { gap: factor.lg },
    },
    notice: {
        afterGap: { mb: factor.md },
        contentGap: { mt: factor.sm },
    },
    dialog: {
        compactInset: { p: factor.lg },
        inset: { p: { xs: factor.lg, md: factor.xl } },
        viewportMargin: { mx: { xs: factor.lg, md: factor.xxl } },
        descriptionAfterGap: { mb: factor.lg },
        actionsInset: { p: factor.md },
        actionsGap: { gap: factor.sm, flexWrap: 'wrap' },
    },
    auth: {
        surfaceInset: { p: { xs: factor.xl, md: factor.xxl } },
        brandMarkGap: { gap: factor.md },
        brandTitleGap: { mt: factor.xxl },
    },
    footer: {
        insetInline: { px: { xs: factor.lg, md: factor.xl } },
        insetBlock: { py: factor.sm },
    },
    shell: {
        headerHeight: { minHeight: { xs: tokens.layout.headerMobile, md: tokens.layout.headerDesktop } },
        mainFill: { flex: 1 },
        demoBanner: { px: { xs: factor.lg, md: factor.xl }, pt: factor.lg },
        demoToolsBefore: { mt: factor.md },
        statusBanner: { mx: { xs: factor.lg, md: factor.xl }, mt: factor.sm },
        pageFallbackInset: { px: { xs: factor.lg, md: factor.xl }, py: factor.lg },
        centeredFallback: { minHeight: '100vh', display: 'grid', placeItems: 'center', px: { xs: factor.lg, md: factor.xl }, py: factor.lg },
        demoControls: { gap: factor.sm, flexWrap: 'wrap' },
        demoControl: { flex: { xs: '0 1 auto', sm: '1 1 18em' }, minWidth: 'min(100%, 18em)', maxWidth: '100%', '& .MuiInputBase-root': { minHeight: tokens.layout.touchTarget } },
        demoToggle: { minHeight: tokens.layout.touchTarget, px: factor.zero },
        searchIconInset: { mr: factor.sm },
        footerContent: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: factor.sm },
    },
    navigation: {
        brandInset: { px: factor.lg, py: factor.lg },
        brandGap: { gap: factor.md },
        brandMarkShape: { borderRadius: tokens.radius.dialog / tokens.radius.control },
        shopInset: { px: factor.lg, mb: factor.sm },
        listInset: { px: factor.sm, pb: factor.lg },
        groupGap: { mt: factor.xs },
        groupLabelInset: { px: factor.md },
        groupLabelGap: { mb: factor.xs },
        itemGap: { mb: factor.xs },
        itemInsetBlock: { py: factor.sm },
        itemShape: { borderRadius: tokens.radius.card / tokens.radius.control },
        accountInset: { p: factor.md },
        accountGap: { gap: factor.sm },
    },
    inbox: {
        paneInset: { p: factor.md },
        bubbleInset: { p: factor.md },
        messageContentGap: { gap: factor.xs },
        messageMetaGap: { gap: factor.sm },
        messageGroupGap: { gap: factor.md },
        composerInset: { p: factor.md },
        composerActionGap: { gap: factor.sm },
        composerControlsBeforeGap: { mt: factor.sm },
        // MUI ListItemButton defaults use a higher-specificity root selector for padding/display flow.
        // Scope these semantic row roles to that stable utility class so the documented 16/12 values win.
        listInset: { '&.MuiListItemButton-root': { p: factor.md } },
        listContentGap: { '&.MuiListItemButton-root': { gap: factor.md } },
        unreadCountInset: { px: factor.sm },
        listStatusBeforeGap: { mt: factor.sm },
        contextInset: { p: { xs: factor.md, md: factor.lg } },
    },
    report: {
        contextGap: { gap: factor.md },
        listSurfaceInset: { p: factor.lg },
        listMarkerInset: { pl: factor.lg },
        listItemGap: { gap: factor.md },
        chartViewportInset: { p: factor.lg },
        emptyStateInset: { p: factor.lg },
        subheadingAfterGap: { mb: factor.sm },
    },
    dashboard: {
        groupInset: { p: { xs: factor.xl, md: factor.xxl } },
        sectionGap: { gap: factor.lg },
        heroTitleFlow: { mt: factor.sm, mb: factor.sm },
        heroDescriptionGap: { mt: factor.lg },
        actionTarget: { minHeight: tokens.layout.touchTarget, px: factor.md, py: factor.sm, gap: factor.sm, flexWrap: 'wrap' },
        metricValueGap: { mt: factor.xs },
        footerFlow: { mt: factor.lg, gap: factor.lg },
    },
    detail: {
        dividedListGap: { gap: factor.zero },
        rowInsetBlock: { py: factor.sm },
        valueGap: { gap: factor.md },
        relatedItemGap: { gap: factor.md },
        relatedItemInset: { p: factor.md },
        relatedContentGap: { mt: factor.sm },
    },
    query: { stateGap: { gap: factor.lg }, sectionPending: { minHeight: 240 } },
} as const satisfies LayoutSxContract;

export const layoutCss = {
    form: { labelAfterGap: cssPixel(tokens.space.xs) },
    table: {
        cellInset: `${cssPixel(tokens.space.sm)} ${cssPixel(tokens.space.md)}`,
    },
} as const;

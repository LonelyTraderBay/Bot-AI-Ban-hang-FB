import type { SxProps, Theme } from '@mui/material/styles';
import { colors, tokens } from '@botsales/tokens';

type LayoutSx = SxProps<Theme>;
type CssPixel = `${number}px`;
type LayoutSxContract = {
    page: { majorSectionGap: LayoutSx; gutter: LayoutSx; contentInsetBlock: LayoutSx; sectionGap: LayoutSx; sectionBefore: LayoutSx; sectionAfter: LayoutSx };
    composition: { childBoundaries: LayoutSx };
    pageHeader: { titleDescriptionGap: LayoutSx; columnsGap: LayoutSx; afterGap: LayoutSx; actionsGap: LayoutSx };
    surface: { comfortableInset: LayoutSx; comfortableHeaderInset: LayoutSx; comfortableBodyInsetAfterHeader: LayoutSx; inset: LayoutSx; compactInset: LayoutSx; compactContentGap: LayoutSx; headerInset: LayoutSx; bodyInsetAfterHeader: LayoutSx; sectionBefore: LayoutSx; titleDescriptionGap: LayoutSx; headerFlowGap: LayoutSx; contentGap: LayoutSx };
    form: { compactFieldGap: LayoutSx; fieldGap: LayoutSx; inlineGap: LayoutSx; standardWidth: LayoutSx; transactionWidth: LayoutSx };
    actions: { inlineGap: LayoutSx; beforeGap: LayoutSx; relatedLinksGap: LayoutSx; linkTarget: LayoutSx; compactFace: LayoutSx };
    grid: { gutter: LayoutSx };
    stats: { gutter: LayoutSx; compactGutter: LayoutSx; strip: LayoutSx; afterGap: LayoutSx; titleGap: LayoutSx; valueGap: LayoutSx; noteGap: LayoutSx };
    code: { inlineGap: LayoutSx };
    table: { mobileHintInset: LayoutSx; compactCardInset: LayoutSx; reconciliationCell: LayoutSx; reconciliationActionCell: LayoutSx; reconciliationAmount: LayoutSx; compactDataCell: LayoutSx };
    lookup: { loadMoreRow: LayoutSx };
    toolbar: { inset: LayoutSx; controlGap: LayoutSx };
    pager: { inset: LayoutSx; actionsGap: LayoutSx };
    empty: { insetBlock: LayoutSx; insetInline: LayoutSx; contentGap: LayoutSx };
    notice: { afterGap: LayoutSx; contentGap: LayoutSx };
    dialog: { compactInset: LayoutSx; inset: LayoutSx; viewportMargin: LayoutSx; compactWidth: LayoutSx; descriptionAfterGap: LayoutSx; actionsInset: LayoutSx; actionsGap: LayoutSx };
    auth: { surfaceInset: LayoutSx; brandMarkGap: LayoutSx; brandTitleGap: LayoutSx };
    footer: { insetInline: LayoutSx; insetBlock: LayoutSx };
    shell: { headerHeight: LayoutSx; mainFill: LayoutSx; statusBanner: LayoutSx; pageFallbackInset: LayoutSx; centeredFallback: LayoutSx; searchIconInset: LayoutSx };
    navigation: { brandInset: LayoutSx; brandGap: LayoutSx; brandMarkShape: LayoutSx; shopInset: LayoutSx; listInset: LayoutSx; groupGap: LayoutSx; groupLabelInset: LayoutSx; groupLabelGap: LayoutSx; itemGap: LayoutSx; itemInsetBlock: LayoutSx; itemShape: LayoutSx; accountInset: LayoutSx; accountGap: LayoutSx };
    inbox: { paneInset: LayoutSx; bubbleInset: LayoutSx; messageContentGap: LayoutSx; messageMetaGap: LayoutSx; messageGroupGap: LayoutSx; composerInset: LayoutSx; composerActionGap: LayoutSx; composerControlsBeforeGap: LayoutSx; listInset: LayoutSx; listContentGap: LayoutSx; unreadCountInset: LayoutSx; listStatusBeforeGap: LayoutSx; contextInset: LayoutSx };
    report: { contextGap: LayoutSx; listSurfaceInset: LayoutSx; listMarkerInset: LayoutSx; listItemGap: LayoutSx; chartViewportInset: LayoutSx; emptyStateInset: LayoutSx; subheadingAfterGap: LayoutSx };
    dashboard: { actionTarget: LayoutSx; footerFlow: LayoutSx; summaryRowInset: LayoutSx };
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
const pageGutter = { px: factor.sm };
const pageInset = { ...pageGutter, py: factor.sm };

export const layoutSx = {
    page: {
        majorSectionGap: { gap: factor.xl },
        gutter: pageGutter,
        contentInsetBlock: { py: factor.sm },
        sectionGap: { gap: factor.lg },
        sectionBefore: { mt: factor.lg },
        sectionAfter: { mb: factor.lg },
    },
    composition: {
        // The parent owns the gap. Legacy notices/headers must not add a second boundary.
        childBoundaries: { '&.MuiStack-root > *, &.MuiBox-root > *': { marginTop: factor.zero, marginBottom: factor.zero } },
    },
    pageHeader: {
        titleDescriptionGap: { mt: factor.xs },
        columnsGap: { gap: factor.lg },
        afterGap: { mb: factor.md },
        actionsGap: { gap: factor.sm, flexWrap: 'wrap' },
    },
    surface: {
        comfortableInset: { p: { xs: factor.lg, md: factor.xl } },
        comfortableHeaderInset: { px: { xs: factor.lg, md: factor.xl }, pt: { xs: factor.lg, md: factor.xl }, pb: factor.lg },
        comfortableBodyInsetAfterHeader: { px: { xs: factor.lg, md: factor.xl }, pb: { xs: factor.lg, md: factor.xl } },
        inset: { p: { xs: factor.md, md: factor.lg } },
        compactInset: { p: factor.md },
        compactContentGap: { gap: factor.sm },
        headerInset: { px: factor.md, pt: factor.md, pb: factor.md },
        bodyInsetAfterHeader: { px: factor.md, pb: factor.md },
        sectionBefore: { mt: factor.lg },
        titleDescriptionGap: { mt: factor.xs },
        headerFlowGap: { gap: factor.lg, flexWrap: 'wrap' },
        contentGap: { gap: factor.md },
    },
    form: {
        standardWidth: { maxWidth: '56rem' },
        transactionWidth: { maxWidth: '64rem' },
        compactFieldGap: { gap: factor.md },
        fieldGap: { gap: factor.lg },
        inlineGap: { gap: factor.sm },
    },
    actions: {
        inlineGap: { gap: factor.sm, flexWrap: 'wrap' },
        beforeGap: { mt: factor.lg },
        relatedLinksGap: { gap: factor.md, flexWrap: 'wrap' },
        linkTarget: { minHeight: tokens.layout.touchTarget, px: factor.lg, py: factor.sm, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
        compactFace: {
            minHeight: tokens.layout.touchTarget, position: 'relative', isolation: 'isolate',
            '&.MuiButton-contained, &.MuiButton-contained:hover, &.MuiButton-contained.Mui-disabled': { backgroundColor: 'transparent', boxShadow: 'none' },
            '&::before': { content: '""', position: 'absolute', zIndex: -1,
                insetBlock: cssPixel((tokens.layout.touchTarget - 32) / 2), insetInline: 0,
                borderRadius: cssPixel(tokens.radius.control), backgroundColor: 'primary.main' },
            '&:hover::before': { backgroundColor: 'primary.dark' },
            '&.Mui-disabled::before': { backgroundColor: 'action.disabledBackground' },
            '&.MuiButton-outlined, &.MuiButton-outlined:hover, &.MuiButton-outlined.Mui-disabled': {
                border: 0, backgroundColor: 'transparent',
            },
            '&.MuiButton-outlined::before': { border: '1px solid', borderColor: colors.borderControl, backgroundColor: colors.input },
            '&.MuiButton-outlined:hover::before': { backgroundColor: 'action.selected' },
            '&.MuiButton-outlined.Mui-disabled::before': { borderColor: 'divider', backgroundColor: 'action.disabledBackground' },
        },
    },
    grid: { gutter: { gap: factor.lg } },
    stats: {
        gutter: { gap: factor.lg },
        compactGutter: { gap: { xs: factor.md, md: factor.lg } },
        strip: { '& > [data-ui-stat]': {
            px: factor.sm, py: factor.xs, minWidth: 0, minHeight: tokens.layout.touchTarget,
            display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)', alignItems: 'center', columnGap: factor.xs,
            '& > [data-ui-stat-value]': { mt: factor.zero },
            '& > [data-ui-stat-note]': { gridColumn: '1 / -1' },
        } },
        afterGap: { mb: factor.lg },
        titleGap: { gap: factor.sm },
        valueGap: { mt: factor.sm },
        noteGap: { mt: factor.xs },
    },
    code: { inlineGap: { gap: factor.xs } },
    table: {
        mobileHintInset: { px: factor.sm, pt: factor.xs },
        compactCardInset: { p: factor.sm },
        reconciliationCell: { pl: factor.xs, pr: factor.sm, py: factor.xs },
        reconciliationActionCell: { px: factor.zero },
        reconciliationAmount: { width: '100%', justifyContent: 'flex-end', pl: factor.xs, pr: factor.sm, fontVariantNumeric: 'tabular-nums', textDecoration: 'underline dotted' },
        compactDataCell: { py: factor.zero, height: cssPixel(tokens.layout.touchTarget) },
    },
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
        compactWidth: { maxWidth: cssPixel(tokens.layout.compactDialogWidth), width: `calc(100% - ${cssPixel(tokens.space.lg * 2)})`, mx: factor.lg },
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
        insetInline: pageGutter,
        insetBlock: { py: factor.sm },
    },
    shell: {
        headerHeight: { minHeight: { xs: tokens.layout.headerMobile, md: tokens.layout.headerDesktop } },
        mainFill: { flex: 1 },
        statusBanner: { mx: factor.sm, mt: factor.sm },
        pageFallbackInset: pageInset,
        centeredFallback: { minHeight: '100dvh', display: 'grid', placeItems: 'center', ...pageInset },
        searchIconInset: { mr: factor.sm },
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
        contextInset: { px: { xs: factor.md, md: factor.lg }, pb: { xs: factor.md, md: factor.lg } },
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
        actionTarget: { minHeight: tokens.layout.touchTarget, px: factor.md, py: factor.sm, gap: factor.sm, flexWrap: 'wrap' },
        footerFlow: { mt: factor.lg, gap: factor.lg },
        summaryRowInset: { px: factor.md, py: factor.xs },
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

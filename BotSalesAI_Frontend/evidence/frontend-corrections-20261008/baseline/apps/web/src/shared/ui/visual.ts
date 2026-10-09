import { tokens } from '@botsales/tokens';

/** Named, theme-backed visual roles for UI consumers. Keep raw design values in the canonical token source. */
export const visualSx = {
    typography: {
        fontWeight: {
            regular: tokens.fontWeights.regular,
            semibold: tokens.fontWeights.semibold,
            strong: tokens.fontWeights.strong,
            bold: tokens.fontWeights.bold,
            display: tokens.fontWeights.display,
            extraBold: tokens.fontWeights.extraBold,
        },
        letterSpacing: {
            pageTitle: `${tokens.letterSpacing.pageTitle}px`,
            overline: tokens.letterSpacing.overline,
            dashboardOverline: tokens.letterSpacing.dashboardOverline,
        },
        dashboardTitle: {
            fontSize: {
                xs: tokens.fontSizes.dashboardTitleCompact,
                md: tokens.fontSizes.dashboardTitleWide,
            },
        },
    },
    radius: {
        control: tokens.radius.control / tokens.radius.control,
        dialog: tokens.radius.dialog / tokens.radius.control,
        bubble: tokens.radius.bubble / tokens.radius.control,
        large: tokens.radius.large / tokens.radius.control,
        hero: tokens.radius.hero / tokens.radius.control,
    },
} as const;

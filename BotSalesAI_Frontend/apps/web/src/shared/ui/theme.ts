import { createTheme } from '@mui/material/styles';
import { colors, tokens } from '@botsales/tokens';
import { layoutCss } from './layout';
export const theme = createTheme({
    palette: {
        mode: 'dark', primary: { main: colors.accent, light: colors.accentHover, dark: colors.accentPressed, contrastText: colors.onAccent }, secondary: { main: colors.info },
        background: { default: colors.canvas, paper: colors.surface }, text: { primary: colors.textPrimary, secondary: colors.textSecondary },
        divider: colors.borderDecorative, success: { main: colors.success }, warning: { main: colors.warning }, error: { main: colors.danger }, info: { main: colors.info },
        action: { hover: colors.hover, selected: colors.selected, disabled: colors.textMuted, disabledBackground: colors.raised }
    },
    typography: {
        fontFamily: tokens.fontFamily, fontSize: tokens.fontSizes.body,
        body1: { fontSize: tokens.fontSizes.body, lineHeight: tokens.lineHeights.body }, body2: { fontSize: tokens.fontSizes.body, lineHeight: tokens.lineHeights.body }, subtitle1: { fontSize: tokens.fontSizes.bodyComfortable, lineHeight: tokens.lineHeights.body }, caption: { fontSize: tokens.fontSizes.meta, lineHeight: tokens.lineHeights.body },
        h4: { fontSize: tokens.fontSizes.pageTitle, fontWeight: tokens.fontWeights.display, lineHeight: tokens.lineHeights.display, letterSpacing: `${tokens.letterSpacing.pageTitle}px` }, h5: { fontSize: tokens.fontSizes.sectionTitle, fontWeight: tokens.fontWeights.bold, lineHeight: tokens.lineHeights.section }, h6: { fontSize: tokens.fontSizes.sectionTitle, fontWeight: tokens.fontWeights.strong, lineHeight: tokens.lineHeights.subsection },
        button: { textTransform: 'none', fontWeight: tokens.fontWeights.strong }
    },
    spacing: tokens.space.sm,
    shape: { borderRadius: tokens.radius.control },
    breakpoints: { values: { xs: 0, sm: tokens.breakpoints.mobileMaxExclusive, md: tokens.breakpoints.tabletMin, lg: tokens.breakpoints.desktopMin, xl: tokens.breakpoints.desktopMin } },
    components: {
        MuiCssBaseline: { styleOverrides: {
                body: { margin: 0, colorScheme: 'dark', backgroundColor: colors.canvas }, '*': { boxSizing: 'border-box' }, 'a': { color: colors.accent }, ':focus-visible': { outline: `${tokens.focusRing.width}px solid ${colors.accent}`, outlineOffset: tokens.focusRing.globalOffset }, '::selection': { background: colors.selected, color: colors.textPrimary }, '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: `${tokens.motion.reducedMotionMs}ms !important`, transitionDuration: `${tokens.motion.reducedMotionMs}ms !important`, scrollBehavior: 'auto !important' } }, '@media (forced-colors: active)': { ':focus-visible': { outlineColor: 'Highlight' }, button: { border: '1px solid ButtonText' } }
            } },
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
                root: { minHeight: tokens.layout.touchTarget, borderRadius: tokens.radius.control, '&.Mui-focusVisible': { outline: `${tokens.focusRing.width}px solid ${colors.accent}`, outlineOffset: tokens.focusRing.controlOffset }, '&.MuiButton-contained.Mui-disabled': { color: colors.textPrimary, backgroundColor: colors.raised, opacity: 1, boxShadow: 'none' } }, containedPrimary: { '&:hover': { backgroundColor: colors.accentHover }, '&:active': { backgroundColor: colors.accentPressed } }, outlined: { borderColor: colors.borderControl }
            } },
        MuiIconButton: { styleOverrides: { root: { minWidth: tokens.layout.touchTarget, minHeight: tokens.layout.touchTarget, '&.Mui-focusVisible': { outline: `${tokens.focusRing.width}px solid ${colors.accent}`, outlineOffset: tokens.focusRing.controlOffset } } } },
        MuiListItemButton: { styleOverrides: { root: { '&.Mui-focusVisible': { outline: `${tokens.focusRing.width}px solid ${colors.accent}`, outlineOffset: tokens.focusRing.controlOffset } } } },
        MuiPaper: { defaultProps: { elevation: tokens.elevation.flat }, styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: colors.borderDecorative } } },
        MuiAvatar: { styleOverrides: { root: { minWidth: `calc(${tokens.lineHeights.body}em + ${tokens.space.xs}px)`, minHeight: `calc(${tokens.lineHeights.body}em + ${tokens.space.xs}px)` } } },
        MuiOutlinedInput: { styleOverrides: { root: { background: colors.input, borderRadius: tokens.radius.control, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.textSecondary }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.accent, borderWidth: 2 } }, notchedOutline: { borderColor: colors.borderControl }, input: { fontSize: tokens.fontSizes.body, '&::placeholder': { color: colors.textMuted, opacity: 1 } } } },
        MuiInputLabel: { styleOverrides: { root: { color: colors.textSecondary, whiteSpace: 'normal', overflowWrap: 'anywhere', textOverflow: 'clip', maxWidth: 'calc(100% - 28px)' } } },
        MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: tokens.fontSizes.meta, lineHeight: tokens.lineHeights.body } } },
        MuiTableCell: { styleOverrides: { root: { borderColor: colors.borderDecorative, padding: layoutCss.table.cellInset }, head: { color: colors.textSecondary, fontSize: tokens.fontSizes.meta, fontWeight: tokens.fontWeights.strong, background: colors.input } } },
        MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { background: colors.hover } } } },
        MuiChip: { defaultProps: { size: 'small' }, styleOverrides: { root: { borderRadius: tokens.radius.control, fontWeight: tokens.fontWeights.semibold, fontSize: tokens.fontSizes.meta } } },
        MuiAlert: { styleOverrides: {
            root: { borderRadius: tokens.radius.control },
            standardSuccess: { color: colors.success, backgroundColor: colors.successSurface, '& .MuiAlert-icon': { color: 'inherit' } },
            standardWarning: { color: colors.warning, backgroundColor: colors.warningSurface, '& .MuiAlert-icon': { color: 'inherit' } },
            standardError: { color: colors.danger, backgroundColor: colors.dangerSurface, '& .MuiAlert-icon': { color: 'inherit' } },
            standardInfo: { color: colors.info, backgroundColor: colors.infoSurface, '& .MuiAlert-icon': { color: 'inherit' } },
        } },
        MuiDialog: { styleOverrides: { paper: { border: `1px solid ${colors.borderDecorative}`, borderRadius: tokens.radius.dialog } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontSize: tokens.fontSizes.meta, backgroundColor: colors.elevated } } },
        MuiMenuItem: { styleOverrides: { root: { minHeight: tokens.layout.touchTarget, '&.Mui-selected': { backgroundColor: colors.selected }, '&.Mui-selected:hover': { backgroundColor: colors.hover } } } },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', minHeight: tokens.space.xxxl } } },
    },
});

import { createTheme } from '@mui/material/styles';
import { colors, tokens } from '@botsales/tokens';
export const theme = createTheme({
    palette: {
        mode: 'dark', primary: { main: colors.accent, light: colors.accentHover, dark: colors.accentPressed, contrastText: colors.onAccent }, secondary: { main: colors.info },
        background: { default: colors.canvas, paper: colors.surface }, text: { primary: colors.textPrimary, secondary: colors.textSecondary },
        divider: colors.borderDecorative, success: { main: colors.success }, warning: { main: colors.warning }, error: { main: colors.danger }, info: { main: colors.info },
        action: { hover: colors.hover, selected: colors.selected, disabled: colors.textMuted, disabledBackground: colors.raised }
    },
    typography: {
        fontFamily: tokens.fontFamily, fontSize: tokens.fontSizes.body,
        body1: { fontSize: tokens.fontSizes.body, lineHeight: 1.5 }, body2: { fontSize: tokens.fontSizes.body, lineHeight: 1.5 }, subtitle1: { fontSize: tokens.fontSizes.bodyComfortable, lineHeight: 1.5 }, caption: { fontSize: tokens.fontSizes.meta, lineHeight: 1.5 },
        h4: { fontSize: tokens.fontSizes.pageTitle, fontWeight: 750, lineHeight: 1.2, letterSpacing: '-.6px' }, h5: { fontSize: tokens.fontSizes.sectionTitle, fontWeight: 700, lineHeight: 1.3 }, h6: { fontSize: tokens.fontSizes.sectionTitle, fontWeight: 650, lineHeight: 1.35 },
        button: { textTransform: 'none', fontWeight: 650 }
    },
    spacing: tokens.space.sm,
    shape: { borderRadius: tokens.radius.control },
    breakpoints: { values: { xs: 0, sm: tokens.breakpoints.mobileMaxExclusive, md: tokens.breakpoints.tabletMin, lg: tokens.breakpoints.desktopMin, xl: tokens.breakpoints.desktopMin } },
    components: {
        MuiCssBaseline: { styleOverrides: {
                body: { margin: 0, colorScheme: 'dark', backgroundColor: colors.canvas }, '*': { boxSizing: 'border-box' }, 'a': { color: colors.accent }, ':focus-visible': { outline: `2px solid ${colors.accent}`, outlineOffset: 3 }, '::selection': { background: colors.selected, color: colors.textPrimary }, '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: `${tokens.motion.reducedMotionMs}ms !important`, transitionDuration: `${tokens.motion.reducedMotionMs}ms !important`, scrollBehavior: 'auto !important' } }, '@media (forced-colors: active)': { ':focus-visible': { outlineColor: 'Highlight' }, button: { border: '1px solid ButtonText' } }
            } },
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
                root: { minHeight: tokens.layout.touchTarget, borderRadius: tokens.radius.control, '&.Mui-focusVisible': { outline: `2px solid ${colors.accent}`, outlineOffset: 2 } }, containedPrimary: { '&:hover': { backgroundColor: colors.accentHover }, '&:active': { backgroundColor: colors.accentPressed } }, outlined: { borderColor: colors.borderControl }
            } },
        MuiIconButton: { styleOverrides: { root: { minWidth: tokens.layout.touchTarget, minHeight: tokens.layout.touchTarget, '&.Mui-focusVisible': { outline: `2px solid ${colors.accent}`, outlineOffset: 2 } } } },
        MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: colors.borderDecorative } } },
        MuiOutlinedInput: { styleOverrides: { root: { background: colors.input, borderRadius: tokens.radius.control, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: colors.textSecondary }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: colors.accent, borderWidth: 2 } }, notchedOutline: { borderColor: colors.borderControl }, input: { fontSize: tokens.fontSizes.body, '&::placeholder': { color: colors.textMuted, opacity: 1 } } } },
        MuiInputLabel: { styleOverrides: { root: { color: colors.textSecondary } } },
        MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: tokens.fontSizes.meta, lineHeight: 1.5 } } },
        MuiTableCell: { styleOverrides: { root: { borderColor: colors.borderDecorative, padding: `${tokens.space.md}px ${tokens.space.lg}px` }, head: { color: colors.textSecondary, fontSize: tokens.fontSizes.meta, fontWeight: 650, background: colors.input } } },
        MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { background: colors.hover } } } },
        MuiChip: { defaultProps: { size: 'small' }, styleOverrides: { root: { borderRadius: tokens.radius.control, fontWeight: 600, fontSize: tokens.fontSizes.meta } } },
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

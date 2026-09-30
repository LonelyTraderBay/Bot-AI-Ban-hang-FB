import { createTheme } from '@mui/material/styles';
import { colors, tokens } from '@botsales/tokens';
export const theme = createTheme({
    palette: {
        mode: 'dark', primary: { main: colors.accent, contrastText: colors.onAccent }, secondary: { main: colors.info },
        background: { default: colors.canvas, paper: colors.surface }, text: { primary: colors.textPrimary, secondary: colors.textSecondary },
        divider: colors.borderDecorative, success: { main: colors.success }, warning: { main: colors.warning }, error: { main: colors.danger }, info: { main: colors.info }
    },
    typography: {
        fontFamily: tokens.fontFamily, fontSize: 14, h4: { fontSize: 28, fontWeight: 750, letterSpacing: '-.6px' }, h5: { fontSize: 22, fontWeight: 700 }, h6: { fontSize: 17, fontWeight: 650 }, button: { textTransform: 'none', fontWeight: 650 }
    },
    shape: { borderRadius: tokens.radius.control },
    breakpoints: { values: { xs: 0, sm: 600, md: 768, lg: 1280, xl: 1536 } },
    components: {
        MuiCssBaseline: { styleOverrides: {
                body: { margin: 0, colorScheme: 'dark' }, '*': { boxSizing: 'border-box' }, 'a': { color: colors.accent }, ':focus-visible': { outline: `2px solid ${colors.accent}`, outlineOffset: 3 }, '::selection': { background: colors.selected, color: colors.accent }, '@media (prefers-reduced-motion: reduce)': { '*': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important' } }, '@media (forced-colors: active)': { button: { border: '1px solid ButtonText' } }
            } },
        MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
                root: { minHeight: 44, borderRadius: 8 }, containedPrimary: { '&:hover': { backgroundColor: colors.accentHover }, '&:active': { backgroundColor: colors.accentPressed } }, outlined: { borderColor: colors.borderControl }
            } },
        MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' }, outlined: { borderColor: colors.borderDecorative } } },
        MuiOutlinedInput: { styleOverrides: { root: { background: colors.input, borderRadius: 8 }, notchedOutline: { borderColor: colors.borderControl }, input: { fontSize: 14 } } },
        MuiInputLabel: { styleOverrides: { root: { color: colors.textSecondary } } },
        MuiTableCell: { styleOverrides: { root: { borderColor: colors.borderDecorative, padding: '15px 18px' }, head: { color: colors.textSecondary, fontSize: 12, fontWeight: 650, background: colors.input } } },
        MuiTableRow: { styleOverrides: { root: { '&.MuiTableRow-hover:hover': { background: colors.hover } } } },
        MuiChip: { defaultProps: { size: 'small' }, styleOverrides: { root: { borderRadius: 6, fontWeight: 600, fontSize: 12 } } },
        MuiDialog: { styleOverrides: { paper: { border: `1px solid ${colors.borderDecorative}`, borderRadius: tokens.radius.dialog } } },
        MuiTooltip: { styleOverrides: { tooltip: { fontSize: 12, backgroundColor: colors.elevated } } },
        MuiTab: { styleOverrides: { root: { textTransform: 'none', minHeight: 48 } } },
    },
});

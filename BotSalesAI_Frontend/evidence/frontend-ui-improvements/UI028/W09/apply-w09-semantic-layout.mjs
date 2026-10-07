import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const edits = [
    ['apps/web/src/app/Shell.tsx', [
        ["import { colors } from '@botsales/tokens';", "import { colors, tokens } from '@botsales/tokens';\nimport { layoutSx } from '@/shared/ui/layout';"],
        ["return <Box sx={{ maxWidth: 560, m: '12vh auto', p: 3 }}><Alert severity=\"error\">Không thể kết nối API phiên đăng nhập. Kiểm tra dịch vụ hoặc mạng; ứng dụng không tự chuyển sang dữ liệu mô phỏng.</Alert><Button sx={{ mt: 2 }} onClick={() => void refresh()}>Thử lại</Button></Box>;", "return <Box sx={layoutSx.shell.centeredFallback}><Stack sx={[layoutSx.query.stateGap, { width: '100%', maxWidth: 560 }]}><Alert severity=\"error\">Không thể kết nối API phiên đăng nhập. Kiểm tra dịch vụ hoặc mạng; ứng dụng không tự chuyển sang dữ liệu mô phỏng.</Alert><Button onClick={() => void refresh()}>Thử lại</Button></Stack></Box>;"],
        ["return <Box sx={{ p: 4 }}><Alert severity=\"error\">Bạn không có quyền truy cập cửa hàng này.</Alert><Button component={RouterLink} to=\"/workspaces\">Chọn cửa hàng</Button></Box>;", "return <Box sx={layoutSx.shell.pageFallbackInset}><Stack sx={layoutSx.query.stateGap}><Alert severity=\"error\">Bạn không có quyền truy cập cửa hàng này.</Alert><Button component={RouterLink} to=\"/workspaces\">Chọn cửa hàng</Button></Stack></Box>;"],
        ["return <Box sx={{ p: 4 }}><Alert severity=\"error\">{shopQuery.error?.message || error?.message || 'Không đọc được cửa hàng'}</Alert><Button onClick={() => shopQuery.refetch()}>Thử lại</Button></Box>;", "return <Box sx={layoutSx.shell.pageFallbackInset}><Stack sx={layoutSx.query.stateGap}><Alert severity=\"error\">{shopQuery.error?.message || error?.message || 'Không đọc được cửa hàng'}</Alert><Button onClick={() => shopQuery.refetch()}>Thử lại</Button></Stack></Box>;"],
        ["gap={1.2} sx={{ px: 2.5, py: 3 }}", "sx={[layoutSx.navigation.brandGap, layoutSx.navigation.brandInset]}"],
        ["<Typography sx={{ fontWeight: 800, fontSize: 19 }}>BotSales", "<Typography variant=\"h6\" sx={{ fontWeight: 800 }}>BotSales"],
        ["sx={{ px: 2, mb: 1 }}", "sx={layoutSx.navigation.shopInset}"],
        ["sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: 2 }}", "sx={[{ flex: 1, overflowY: 'auto' }, layoutSx.navigation.listInset] }"],
        ["<Box key={group.label} sx={{ mt: 2 }}><Typography sx={{ px: 1.5, color: colors.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: 1.2, mb: .7 }}>{group.label}</Typography>", "<Box key={group.label} sx={layoutSx.navigation.groupGap}><Typography variant=\"overline\" sx={[layoutSx.navigation.groupLabelInset, layoutSx.navigation.groupLabelGap, { color: colors.textMuted }]}>{group.label}</Typography>"],
        ["sx={{\n        borderRadius: 1.5, py: .8, mb: .3, '&.Mui-selected': { bgcolor: colors.selected, color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: colors.selected }\n    }}", "sx={[layoutSx.navigation.itemInsetBlock, layoutSx.navigation.itemGap, {\n        borderRadius: 1.5, '&.Mui-selected': { bgcolor: colors.selected, color: 'primary.main' }, '&.Mui-selected:hover': { bgcolor: colors.selected }\n    }]}"],
        ["primaryTypographyProps={{ fontSize: 13, fontWeight: active ? 650 : 450 }}", "primaryTypographyProps={{ variant: 'body2', fontWeight: active ? 'medium' : 'regular' }}"],
        ["spacing={1.1} sx={{ p: 2 }}", "sx={[layoutSx.navigation.accountInset, layoutSx.navigation.accountGap]}"],
        ["sx={{ minWidth: 0, flex: 1 }}><Paper square component=\"header\" sx={{ position: 'sticky', top: 0, zIndex: 1100, borderBottom: 1, borderColor: 'divider', bgcolor: colors.canvas }}><Stack direction=\"row\" alignItems=\"center\" justifyContent=\"space-between\" gap={1} sx={{ minHeight: 64, px: { xs: 2, md: 4 } }}>", "sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}><Paper square component=\"header\" sx={[layoutSx.shell.headerHeight, { position: 'sticky', top: 0, zIndex: 1100, borderBottom: 1, borderColor: 'divider', bgcolor: colors.canvas }]}><Stack direction=\"row\" alignItems=\"center\" justifyContent=\"space-between\" sx={layoutSx.page.gutter}>"] ,
        ["<Stack direction=\"row\" alignItems=\"center\" gap={1}><IconButton", "<Stack direction=\"row\" alignItems=\"center\" sx={layoutSx.actions.inlineGap}><IconButton"],
        ["<Box component=\"span\" sx={{ mx: 1 }}> / </Box>", "<Box component=\"span\"> / </Box>"],
        ["<Stack direction=\"row\" alignItems=\"center\" gap={1.5}><TextField", "<Stack direction=\"row\" alignItems=\"center\" sx={layoutSx.toolbar.controlGap}><TextField"],
        ["sx={{ mr: 1, color: 'text.secondary' }}", "sx={[layoutSx.shell.searchIconInset, { color: 'text.secondary' }]}"],
        ["fontSize: 14 }}>{session.user.displayName[0]}", "fontSize: tokens.fontSizes.body }}>{session.user.displayName[0]}"],
        ["sx={{ px: { xs: 2, md: 4 }, pt: 2 }}", "sx={layoutSx.shell.demoBanner}"],
        ["sx={{ m: 2 }}", "sx={layoutSx.shell.statusBanner}", 2],
        ["sx={{ m: 2 }}", "sx={layoutSx.shell.statusBanner}"],
        ["sx={{ p: { xs: 2, md: 4 }, outline: 'none', minHeight: '80vh' }}", "sx={[layoutSx.page.gutter, layoutSx.shell.mainFill, { outline: 'none' }]}"],
        ["<Box component=\"footer\" sx={{ px: 4, py: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', gap: 2 }}>", "<Box component=\"footer\" sx={[layoutSx.footer.insetInline, layoutSx.footer.insetBlock, layoutSx.shell.footerContent, { borderTop: 1, borderColor: 'divider' }]}>"] ,
        ["const controlSx = { '& .MuiInputBase-root': { minHeight: 44 }, '& .MuiInputBase-input, & .MuiSelect-select': { fontSize: 12 } };", "const controlSx = layoutSx.shell.demoControl;"],
        ["return <Box sx={{ mt: 1 }}>\n        <Button", "return <Box sx={layoutSx.shell.demoToolsBefore}>\n        <Button"],
        ["sx={{ display: { xs: 'inline-flex', md: 'none' }, minHeight: 44, px: 0 }}", "sx={[layoutSx.shell.demoToggle, { display: { xs: 'inline-flex', md: 'none' } }]}"],
        ["gap={1} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap=\"wrap\" sx={{ display: { xs: mobileExpanded ? 'flex' : 'none', md: 'flex' } }}>", "alignItems={{ xs: 'stretch', sm: 'center' }} sx={[layoutSx.shell.demoControls, { display: { xs: mobileExpanded ? 'flex' : 'none', md: 'flex' } }]}>"] ,
        ["sx={{ ...controlSx, minWidth: 150 }}", "sx={[controlSx, { minWidth: 150 }]}"],
        ["sx={{ ...controlSx, minWidth: 190 }}", "sx={[controlSx, { minWidth: 190 }]}"],
        ["sx={{ ...controlSx, minWidth: 210 }}", "sx={[controlSx, { minWidth: 210 }]}"],
    ]],
    ['apps/web/src/app/ScopeEvents.tsx', [
        ["import { assertSchema } from '@/shared/api/validation';", "import { assertSchema } from '@/shared/api/validation';\nimport { layoutSx } from '@/shared/ui/layout';"],
        ["sx={{ mx: 2, mt: 1 }}", "sx={layoutSx.shell.statusBanner}"],
    ]],
    ['apps/web/src/app/CommandRecovery.tsx', [
        ["import { CopyableCode } from '@/shared/ui/components';", "import { CopyableCode } from '@/shared/ui/components';\nimport { layoutSx } from '@/shared/ui/layout';"],
        ["<Box sx={{ mx: { xs: 2, md: 4 }, mt: 2 }}>", "<Box sx={layoutSx.shell.statusBanner}>"] ,
        ["<Stack spacing={.5} sx={{ my: 1 }}>", "<Stack sx={layoutSx.query.stateGap}>"] ,
        ["<Stack key={x.intentId} direction=\"row\" alignItems=\"center\" gap={1} flexWrap=\"wrap\">", "<Stack key={x.intentId} direction=\"row\" alignItems=\"center\" flexWrap=\"wrap\" sx={layoutSx.actions.inlineGap}>"] ,
    ]],
    ['apps/web/src/app/feedback.tsx', [
        ["import { EditDialog } from '@/shared/ui/components';", "import { EditDialog } from '@/shared/ui/components';\nimport { layoutSx } from '@/shared/ui/layout';"],
        ["<Stack gap={2}>", "<Stack sx={layoutSx.form.fieldGap}>"] ,
    ]],
    ['apps/web/src/app/router.tsx', [
        ["import Shell from './Shell';", "import Shell from './Shell';\nimport { layoutSx } from '@/shared/ui/layout';"],
        ["function Loading() { return <Box sx={{ p: 3 }} role=\"status\"><LinearProgress aria-label=\"Đang tải màn hình\" /></Box>; }", "function Loading({ inset = false }: { inset?: boolean }) { return <Box sx={inset ? layoutSx.shell.pageFallbackInset : undefined} role=\"status\"><LinearProgress aria-label=\"Đang tải màn hình\" /></Box>; }"],
        ["const page = <Suspense fallback={<Loading />}>", "const page = <Suspense fallback={<Loading inset />}>"] ,
        ["sx={{ p: 4, outline: 'none' }}", "sx={shopScoped ? [{ outline: 'none' }] : [layoutSx.shell.pageFallbackInset, { outline: 'none' }]}", 2],
        ["sx={{ my: 2 }}", "sx={layoutSx.notice.afterGap}"],
        ["<Stack direction=\"row\" gap={1}>", "<Stack direction=\"row\" sx={layoutSx.actions.inlineGap}>"] ,
        ["sx={{ p: 4, outline: 'none' }}", "sx={[layoutSx.shell.pageFallbackInset, { outline: 'none' }]}"],
    ]],
];

for (const [relativePath, replacements] of edits) {
    const file = path.join(root, relativePath);
    let source = fs.readFileSync(file, 'utf8');
    for (const [before, after, expected = 1] of replacements) {
        const count = source.split(before).length - 1;
        if (count !== expected) throw new Error(`${relativePath}: expected ${expected} occurrence(s), found ${count}: ${before.slice(0, 100)}`);
        source = source.replace(before, after);
    }
    fs.writeFileSync(file, source);
}
console.log('Applied UI028.W09 semantic-layout replacements to Shell, router, feedback, ScopeEvents and CommandRecovery.');

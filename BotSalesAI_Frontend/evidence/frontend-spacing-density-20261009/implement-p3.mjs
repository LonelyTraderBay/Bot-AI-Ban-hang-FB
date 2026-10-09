import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..'), edits=[];
function edit(file,replacements){let source=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');for(const [a,b]of replacements){if(!source.includes(a))throw Error('Missing '+file+': '+a);source=source.replaceAll(a,b);}edits.push([file,source]);}
edit('apps/web/src/shared/ui/layout.ts',[
 ['page: { gutter: LayoutSx;', 'page: { majorSectionGap: LayoutSx; gutter: LayoutSx;'],
 ['surface: { inset: LayoutSx;', 'surface: { comfortableInset: LayoutSx; comfortableHeaderInset: LayoutSx; comfortableBodyInsetAfterHeader: LayoutSx; inset: LayoutSx;'],
 ['form: { fieldGap: LayoutSx;', 'form: { compactFieldGap: LayoutSx; fieldGap: LayoutSx;'],
 ['dialog: { inset: LayoutSx;', 'dialog: { compactInset: LayoutSx; inset: LayoutSx;'],
 ['page: {\n        gutter:', 'page: {\n        majorSectionGap: { gap: factor.xl },\n        gutter:'],
 ['contentInsetBlock: { py: factor.xl }','contentInsetBlock: { py: factor.lg }'],
 ['sectionGap: { gap: factor.xl }','sectionGap: { gap: factor.lg }'],
 ['sectionBefore: { mt: factor.xl }','sectionBefore: { mt: factor.lg }'],
 ['sectionAfter: { mb: factor.xl }','sectionAfter: { mb: factor.lg }'],
 ['afterGap: { mb: factor.xl }','afterGap: { mb: factor.lg }'],
 ['surface: {\n        inset: { p: { xs: factor.lg, md: factor.xl } },', 'surface: {\n        comfortableInset: { p: { xs: factor.lg, md: factor.xl } },\n        comfortableHeaderInset: { px: { xs: factor.lg, md: factor.xl }, pt: { xs: factor.lg, md: factor.xl }, pb: factor.lg },\n        comfortableBodyInsetAfterHeader: { px: { xs: factor.lg, md: factor.xl }, pb: { xs: factor.lg, md: factor.xl } },\n        inset: { p: { xs: factor.md, md: factor.lg } },'],
 ['headerInset: { px: { xs: factor.lg, md: factor.xl }, pt: { xs: factor.lg, md: factor.xl }, pb: factor.lg }','headerInset: { px: { xs: factor.md, md: factor.lg }, pt: { xs: factor.md, md: factor.lg }, pb: factor.md }'],
 ['bodyInsetAfterHeader: { px: { xs: factor.lg, md: factor.xl }, pb: { xs: factor.lg, md: factor.xl } }','bodyInsetAfterHeader: { px: { xs: factor.md, md: factor.lg }, pb: { xs: factor.md, md: factor.lg } }'],
 ['form: {\n        fieldGap:', 'form: {\n        compactFieldGap: { gap: factor.md },\n        fieldGap:'],
 ['beforeGap: { mt: factor.xl }','beforeGap: { mt: factor.lg }'],
 ['grid: { gutter: { gap: factor.xl } }','grid: { gutter: { gap: factor.lg } }'],
 ['valueGap: { mt: factor.md }','valueGap: { mt: factor.sm }'],
 ['noteGap: { mt: factor.sm }','noteGap: { mt: factor.xs }'],
 ['insetBlock: { py: { xs: factor.xxl, md: factor.xxxl } }','insetBlock: { py: { xs: factor.xl, md: factor.xxl } }'],
 ['afterGap: { mb: factor.lg },\n        contentGap: { mt: factor.sm }','afterGap: { mb: factor.md },\n        contentGap: { mt: factor.sm }'],
 ['dialog: {\n        inset:', 'dialog: {\n        compactInset: { p: factor.lg },\n        inset:'],
 ['actionsInset: { p: factor.lg }','actionsInset: { p: factor.md }'],
 ['insetBlock: { py: factor.lg }','insetBlock: { py: factor.sm }'],
 ['pageFallbackInset: { px: { xs: factor.lg, md: factor.xl }, py: factor.xl }','pageFallbackInset: { px: { xs: factor.lg, md: factor.xl }, py: factor.lg }'],
 ["centeredFallback: { minHeight: '100vh', display: 'grid', placeItems: 'center', px: { xs: factor.lg, md: factor.xl }, py: factor.xl }", "centeredFallback: { minHeight: '100vh', display: 'grid', placeItems: 'center', px: { xs: factor.lg, md: factor.xl }, py: factor.lg }"],
 ['brandInset: { px: factor.lg, py: factor.xl }','brandInset: { px: factor.lg, py: factor.lg }'],
 ['accountInset: { p: factor.lg }','accountInset: { p: factor.md }'],
 ['paneInset: { p: factor.lg }','paneInset: { p: factor.md }'],
 ['composerInset: { p: factor.lg }','composerInset: { p: factor.md }'],
 ["listInset: { '&.MuiListItemButton-root': { p: factor.lg } }", "listInset: { '&.MuiListItemButton-root': { p: factor.md } }"],
 ['contextInset: { p: { xs: factor.lg, md: factor.xl } }','contextInset: { p: { xs: factor.md, md: factor.lg } }'],
 ['contextGap: { gap: factor.lg }','contextGap: { gap: factor.md }'],
 ['listSurfaceInset: { p: factor.xl }','listSurfaceInset: { p: factor.lg }'],
 ['emptyStateInset: { p: factor.xl }','emptyStateInset: { p: factor.lg }'],
]);
edit('apps/web/src/shared/ui/composition.tsx',[
 ["type FormFieldsProps = FlowProps & {", "type FormFieldsProps = FlowProps & {\n    density?: 'compact' | 'comfortable';"],
 ["export function FormFields({ bodyMode = 'flush',", "export function FormFields({ bodyMode = 'flush', density = 'comfortable',"],
 ['const sx = [layoutSx.form.fieldGap,', "const sx = [density === 'compact' ? layoutSx.form.compactFieldGap : layoutSx.form.fieldGap,"],
 ['data-ui-composition="form-fields" sx={sx}', 'data-ui-composition="form-fields" data-ui-rhythm={density} sx={sx}'],
 ['export function PageSections({ beforeGap,', "export function PageSections({ rhythm = 'section', beforeGap,"],
 ["FlowProps & { beforeGap?: 'section'; shrinkChildren?: boolean }", "FlowProps & { rhythm?: 'section' | 'major'; beforeGap?: 'section'; shrinkChildren?: boolean }"],
 ['data-ui-composition="page-sections" sx={[layoutSx.page.sectionGap,', 'data-ui-composition="page-sections" data-ui-rhythm={rhythm} sx={[rhythm === \'major\' ? layoutSx.page.majorSectionGap : layoutSx.page.sectionGap,'],
]);
edit('apps/web/src/shared/ui/components.tsx',[
 ["action, bodyMode = 'flush', beforeGap", "action, bodyMode = 'flush', density = 'compact', beforeGap"],
 ["bodyMode?: 'inset' | 'flush';", "bodyMode?: 'inset' | 'flush';\n    density?: 'compact' | 'comfortable';"],
 ['? <Box sx={title ? layoutSx.surface.bodyInsetAfterHeader : layoutSx.surface.inset}>{children}</Box>', "? <Box sx={title ? (density === 'comfortable' ? layoutSx.surface.comfortableBodyInsetAfterHeader : layoutSx.surface.bodyInsetAfterHeader) : (density === 'comfortable' ? layoutSx.surface.comfortableInset : layoutSx.surface.inset)}>{children}</Box>"],
 ['return <Paper variant="outlined" sx={[\n', 'return <Paper variant="outlined" data-ui-density={density} sx={[\n'],
 ['sx={[layoutSx.surface.headerInset, layoutSx.surface.headerFlowGap]}', "sx={[density === 'comfortable' ? layoutSx.surface.comfortableHeaderInset : layoutSx.surface.headerInset, layoutSx.surface.headerFlowGap]}"],
 ['allowEditsWhileBusy = false }: {','allowEditsWhileBusy = false, density = \'compact\' }: {'],
 ['    dirtyGuard?: boolean;','    dirtyGuard?: boolean;\n    density?: \'compact\' | \'comfortable\';'],
 ["sx={{ display: 'flex', alignItems: 'flex-start' }}", "sx={[density === 'comfortable' ? layoutSx.dialog.inset : layoutSx.dialog.compactInset, { display: 'flex', alignItems: 'flex-start' }]}"],
 ['dividers sx={layoutSx.dialog.inset}', "dividers sx={density === 'comfortable' ? layoutSx.dialog.inset : layoutSx.dialog.compactInset}"],
 ['return <EditDialog open={open} title={title}', 'return <EditDialog density="comfortable" open={open} title={title}'],
]);
edit('apps/web/src/shared/ui/draft-conflict.tsx',[[ '<EditDialog open title="Đối chiếu thay đổi"', '<EditDialog density="comfortable" open title="Đối chiếu thay đổi"' ]]);
edit('apps/web/src/modules/catalog/index.tsx',[[ '<FormFields ><TextField label="Tên"', '<FormFields density="compact"><TextField label="Tên"' ]]);
edit('apps/web/src/modules/knowledge/index.tsx',[
 ['<Panel title="Nội dung & nguồn"', '<Panel density="comfortable" title="Nội dung & nguồn"'],
 ['<PageSections beforeGap="section">', '<PageSections rhythm="major" beforeGap="section">'],
]);
edit('scripts/check-ui-composition.mjs',[
 ["'form.fieldGap': 'FormFields',", "'form.fieldGap': 'FormFields',\n    'form.compactFieldGap': 'FormFields',"],
 ["'page.sectionGap': 'PageSections',", "'page.sectionGap': 'PageSections',\n    'page.majorSectionGap': 'PageSections',"],
 ["Panel: { beforeGap:", "Panel: { density: new Set(['compact', 'comfortable']), beforeGap:"],
 ["FormFields: { beforeGap:", "FormFields: { density: new Set(['compact', 'comfortable']), beforeGap:"],
 ["PageSections: { beforeGap:", "EditDialog: { density: new Set(['compact', 'comfortable']) },\n    PageSections: { rhythm: new Set(['section', 'major']), beforeGap:"],
 ["FormFields: new Set([...flowKeys, 'bodyMode',", "FormFields: new Set([...flowKeys, 'density', 'bodyMode',"],
 ["PageSections: new Set([...flowKeys, 'beforeGap'", "PageSections: new Set([...flowKeys, 'rhythm', 'beforeGap'"],
]);
for(const [file,source]of edits)fs.writeFileSync(path.join(root,file),source);
console.log('P3/4 operational rhythm implemented; reading, major groups, complex forms and confirmations retain explicit profiles.');

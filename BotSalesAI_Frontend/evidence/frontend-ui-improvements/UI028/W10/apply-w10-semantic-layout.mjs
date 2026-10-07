import fs from 'node:fs';

const replaceExactly = (source, before, after, file) => {
    const count = source.split(before).length - 1;
    if (count !== 1) throw new Error(`${file}: expected one occurrence, found ${count}: ${before}`);
    return source.replace(before, after);
};

const importsPath = 'apps/web/src/modules/catalog/imports.tsx';
let imports = fs.readFileSync(importsPath, 'utf8');
[
    ["import { useScope } from '../../shared/model/scope';\n", "import { useScope } from '../../shared/model/scope';\nimport { layoutSx } from '../../shared/ui/layout';\n"],
    ['<Panel title="Tệp & ánh xạ">', '<Panel title="Tệp & ánh xạ" bodyMode="inset">'],
    ['<Box sx={{ p: 3, maxWidth: 850 }}>', '<Box sx={{ width: \'100%\', maxWidth: 850, minWidth: 0 }}>'],
    ['<Stack gap={2}>', '<Stack sx={layoutSx.form.fieldGap}>'],
    ["<Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ xs: 'stretch', sm: 'center' }}>", `<Stack direction={{ xs: 'column', sm: 'row' }} sx={layoutSx.form.inlineGap} alignItems={{ xs: 'stretch', sm: 'center' }}>`],
    ["<Stack key={index} direction={{ xs: 'column', sm: 'row' }} gap={1}>", "<Stack key={index} direction={{ xs: 'column', sm: 'row' }} sx={layoutSx.form.inlineGap}>"]
].forEach(([before, after]) => { imports = replaceExactly(imports, before, after, importsPath); });
imports = replaceExactly(imports, '<Panel title={j.id} action={<Status value={j.status}/>}><Box sx={{ p: 3 }}>', '<Panel title={j.id} action={<Status value={j.status}/>} bodyMode="inset"><Stack sx={layoutSx.form.fieldGap}>', importsPath);
imports = replaceExactly(imports, '<Alert severity="info" sx={{ my: 2 }}>Xác nhận chỉ nhập những dòng đã hợp lệ.', '<Alert severity="info">Xác nhận chỉ nhập những dòng đã hợp lệ.', importsPath);
imports = replaceExactly(imports, '</RouteLink></Box></Panel>', '</RouteLink></Stack></Panel>', importsPath);
fs.writeFileSync(importsPath, imports);

const catalogPath = 'apps/web/src/modules/catalog/index.tsx';
let catalog = fs.readFileSync(catalogPath, 'utf8');
[
    ["import { useScope, useCan } from '@/shared/model/scope';\n", "import { useScope, useCan } from '@/shared/model/scope';\nimport { layoutSx } from '@/shared/ui/layout';\n"],
    ["<Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>", "<Stack direction={{ xs: 'column', sm: 'row' }} sx={layoutSx.toolbar.controlGap}>"] ,
    ["<Stack spacing={0.5} sx={{ minWidth: { xs: '100%', sm: 240 } }}>", "<Stack sx={[layoutSx.form.inlineGap, { minWidth: { xs: '100%', sm: 240 } }]}>"] ,
    ['<Panel title="Thông tin bán hàng"><Stack spacing={2.5} sx={{ p: 3 }}>', '<Panel title="Thông tin bán hàng" bodyMode="inset"><Stack sx={layoutSx.form.fieldGap}>'],
    ["<Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems={{ xs: 'stretch', sm: 'start' }}>", `<Stack direction={{ xs: 'column', sm: 'row' }} sx={layoutSx.form.inlineGap} alignItems={{ xs: 'stretch', sm: 'center' }}>`] ,
    ["<Stack spacing={1} sx={{ flex: 1, minWidth: 0, width: '100%' }}>", "<Stack sx={[layoutSx.form.inlineGap, { flex: 1, minWidth: 0, width: '100%' }]}>"] ,
    ["sx={{ flex: 1, minWidth: 0, mt: { xs: 0, sm: 4 } }}", "sx={{ flex: 1, minWidth: 0 }}"],
    ['<Panel title="Biến thể và giá" beforeGap={"section"}', '<Panel title="Biến thể và giá" bodyMode="inset" beforeGap={"section"}'],
    ['<Stack spacing={2} sx={{ p: 3 }}>{fieldArray.fields.map', '<Stack sx={layoutSx.form.fieldGap}>{fieldArray.fields.map'],
    ["direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems=", "direction={{ xs: 'column', md: 'row' }} sx={layoutSx.form.inlineGap} alignItems="],
    ['<Panel title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý." beforeGap={"section"}>', '<Panel title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý." bodyMode="inset" beforeGap={"section"}>'],
    ['<Stack gap={2} sx={{ p: 3 }}>', '<Stack sx={layoutSx.form.fieldGap}>'],
    ['<Stack key={fileId} direction="row" gap={1}>', '<Stack key={fileId} direction="row" sx={layoutSx.actions.inlineGap}>'],
    ['<Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>', '<Stack direction="row" sx={[layoutSx.actions.beforeGap, layoutSx.actions.inlineGap, { justifyContent: "space-between" }]} >'],
    ['<Stack gap={2}><TextField label="Tên"', '<Stack sx={layoutSx.form.fieldGap}><TextField label="Tên"'],
].forEach(([before, after]) => { catalog = replaceExactly(catalog, before, after, catalogPath); });
fs.writeFileSync(catalogPath, catalog);
console.log(JSON.stringify({ status: 'APPLIED', files: [catalogPath, importsPath], roleOwners: ['form.fieldGap', 'form.inlineGap', 'toolbar.controlGap', 'actions.inlineGap', 'actions.beforeGap', 'surface bodyMode=inset'] }));

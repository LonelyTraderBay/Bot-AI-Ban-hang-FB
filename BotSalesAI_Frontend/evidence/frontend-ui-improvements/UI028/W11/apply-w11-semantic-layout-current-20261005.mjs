import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const directory = path.join(root, 'evidence/frontend-ui-improvements/UI028/W11');
const source = path.join(root, 'apps/web/src/modules/orders/index.tsx');
const baseline = JSON.parse(fs.readFileSync(path.join(directory, 'render-before-source-edit-stable-current-20261005.json'), 'utf8'));
const sourceKey = 'apps/web/src/modules/orders/index.tsx';
const hash = createHash('sha256').update(fs.readFileSync(source)).digest('hex');
if (hash !== baseline.sourceSha256[sourceKey]) throw new Error('Orders source changed after the immutable W11 baseline; refusing to apply patch.');

let text = fs.readFileSync(source, 'utf8');
const replaceOnce = (oldText, newText, label) => {
    const count = text.split(oldText).length - 1;
    if (count !== 1) throw new Error(`${label}: expected one source match, found ${count}`);
    text = text.replace(oldText, newText);
};
const replaceAfter = (marker, oldText, newText, label) => {
    const start = text.indexOf(marker);
    if (start < 0) throw new Error(`${label}: marker not found`);
    const index = text.indexOf(oldText, start + marker.length);
    if (index < 0) throw new Error(`${label}: source expression not found after marker`);
    text = `${text.slice(0, index)}${newText}${text.slice(index + oldText.length)}`;
};

replaceOnce("import { getDemoAddressOptions } from './demo-address-preview';", "import { layoutSx } from '@/shared/ui/layout';\nimport { getDemoAddressOptions } from './demo-address-preview';", 'layout role import');
replaceOnce('    return <Stack gap={3}>', '    return <Stack sx={layoutSx.page.sectionGap}>', 'draft page group gap');
replaceOnce('<Panel title="Người mua và giao hàng" bodyMode="inset"><Stack gap={2}>', '<Panel title="Người mua và giao hàng" bodyMode="inset"><Stack sx={layoutSx.form.fieldGap}>', 'buyer form field gap');
replaceOnce("<Stack direction={{ xs: 'column', md: 'row' }} gap={2}>", "<Stack direction={{ xs: 'column', md: 'row' }} sx={layoutSx.form.fieldGap}>", 'warehouse/address row gap');
replaceOnce('<Panel title="Sản phẩm đặt mua" subtitle=', '<Panel title="Sản phẩm đặt mua" bodyMode="inset" subtitle=', 'product surface body ownership');
replaceAfter('<Panel title="Sản phẩm đặt mua"', '<Stack gap={2} sx={{ p: 3 }}>', '<Stack sx={layoutSx.form.fieldGap}>', 'product form body spacing');
replaceOnce("<Stack key={line.key} direction={{ xs: 'column', sm: 'row' }} gap={2}>", "<Stack key={line.key} direction={{ xs: 'column', sm: 'row' }} sx={layoutSx.form.fieldGap}>", 'product and quantity row gap');
replaceOnce('<Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 3 }}>', '<Stack direction="row" sx={[layoutSx.actions.inlineGap, layoutSx.page.sectionAfter]}>', 'detail states and version row');
replaceOnce("<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>", "<Box sx={[layoutSx.grid.gutter, { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }]}>", 'detail panels grid gutter');
replaceOnce('<Box sx={{ p: 3, textAlign: \'right\' }}>', '<Box sx={[layoutSx.surface.inset, { textAlign: \'right\' }]}>', 'order total inset');
replaceOnce('<Panel title="Thông tin xử lý"><Box sx={{ px: 3, pb: 2 }}>', '<Panel title="Thông tin xử lý" bodyMode="inset"><Box>', 'order metadata panel inset ownership');
replaceOnce('<Stack direction="row" gap={1.5} flexWrap="wrap" sx={{ mt: 3 }}>', '<Stack direction="row" sx={[layoutSx.actions.inlineGap, layoutSx.actions.beforeGap]}>', 'order action group');
replaceOnce('beforeGap={"section"}><Stack gap={2} sx={{ p: 3 }}>', 'bodyMode="inset" beforeGap="section"><Stack sx={layoutSx.query.stateGap}>', 'quote panel body and state spacing');
replaceOnce('<Stack direction="row" gap={1} flexWrap="wrap">', '<Stack direction="row" sx={layoutSx.actions.inlineGap}>', 'quote consent actions');
replaceOnce('<ErrorNotice error={record.error}/><Stack gap={2}>', '<ErrorNotice error={record.error}/><Stack sx={layoutSx.form.fieldGap}>', 'customer evidence form gap');
replaceOnce('<ErrorNotice error={pay.error || refund.error}/><Stack gap={2}>', '<ErrorNotice error={pay.error || refund.error}/><Stack sx={layoutSx.form.fieldGap}>', 'payment evidence form gap');
replaceOnce('<Alert severity="warning" sx={{ mb: 2 }}>Cần quyền orders.read', '<Alert severity="warning" sx={layoutSx.notice.afterGap}>Cần quyền orders.read', 'returns permission notice gap');
replaceAfter('<ErrorNotice error={create.error}/>', '<Stack gap={2}>', '<Stack sx={layoutSx.form.fieldGap}>', 'return request form gap');
replaceOnce('<Stack gap={1}><ErrorNotice error={orders.error}/>', '<Stack sx={layoutSx.form.inlineGap}><ErrorNotice error={orders.error}/>', 'order lookup error/action gap');
replaceAfter('<ErrorNotice error={inspect.error}/>', '<Stack gap={2}>', '<Stack sx={layoutSx.form.fieldGap}>', 'return inspection form gap');
replaceOnce('<Stack gap={1}><ErrorNotice error={selectedReturn.error}/>', '<Stack sx={layoutSx.form.inlineGap}><ErrorNotice error={selectedReturn.error}/>', 'return detail retry gap');
replaceOnce('<Stack key={line.orderLineId} gap={1}>', '<Stack key={line.orderLineId} sx={layoutSx.form.inlineGap}>', 'inspection line field gap');

fs.writeFileSync(source, text, 'utf8');
console.log(JSON.stringify({ status: 'PATCH_APPLIED', file: path.relative(root, source), beforeSha256: hash, afterSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex'), replacements: 22 }, null, 2));

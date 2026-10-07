import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'apps/web/src/modules/operations/index.tsx';
const baseline = 'f228f311285d9361ea9ba5a0117b8d03a6d02e00edf1baffddeba647ec4a59ba';
const bytes = fs.readFileSync(file);
const sha256 = value => createHash('sha256').update(value).digest('hex');
if (sha256(bytes) !== baseline) throw new Error('W21 baseline hash mismatch; refusing to edit.');
let source = bytes.toString('utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
function replaceExact(before, after, expected = 1) {
    const matches = source.split(before).length - 1;
    if (matches !== expected) throw new Error(`Expected ${expected} match(es), found ${matches}: ${before}`);
    source = source.replaceAll(before, after);
}

replaceExact(`import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';${eol}`, `import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';${eol}import { layoutSx } from '../../shared/ui/layout';${eol}`);
replaceExact('<Alert severity="info" sx={{ mb: 2 }}>', '<Alert severity="info" sx={layoutSx.notice.afterGap}>', 2);
replaceExact("<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, gap: 3 }}>", "<Box sx={[layoutSx.grid.gutter, { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' } }]}> ".trimEnd());
replaceExact('<Stack gap={1.5} sx={{ p: 2, borderBottom: 1, borderColor: \'divider\' }} data-testid="operation-exceptions">', '<Stack sx={[layoutSx.surface.inset, layoutSx.surface.contentGap, { borderBottom: 1, borderColor: \'divider\' }]} data-testid="operation-exceptions">');
replaceExact('<Stack direction={{ xs: \'column\', sm: \'row\' }} justifyContent="space-between" alignItems={{ xs: \'stretch\', sm: \'center\' }} gap={1.5}>', '<Stack direction={{ xs: \'column\', sm: \'row\' }} justifyContent="space-between" alignItems={{ xs: \'stretch\', sm: \'center\' }} sx={layoutSx.surface.headerFlowGap}>');
replaceExact('<Stack direction="row" flexWrap="wrap">', '<Stack direction="row" sx={layoutSx.actions.inlineGap}>');
replaceExact("sx={{ alignSelf: 'center', ml: 1 }}", "sx={{ alignSelf: 'center' }}");
replaceExact('<Stack gap={2}>', '<Stack sx={layoutSx.form.fieldGap}>', 2);
replaceExact('<Stack gap={1}><ErrorNotice error={members.error}/>', '<Stack sx={layoutSx.surface.contentGap}><ErrorNotice error={members.error}/>');
replaceExact('<Panel title="Xem thử ủy quyền" subtitle="Bản xem trước cục bộ để nghiệm thu giao diện; không cấp quyền hiệu lực.">\n            <Stack gap={2} sx={{ p: 3 }}>', '<Panel title="Xem thử ủy quyền" subtitle="Bản xem trước cục bộ để nghiệm thu giao diện; không cấp quyền hiệu lực." bodyMode="inset">\n            <Stack sx={layoutSx.surface.contentGap}>');
replaceExact('<Stack direction={{ xs: \'column\', sm: \'row\' }} gap={2}>', '<Stack direction={{ xs: \'column\', sm: \'row\' }} sx={layoutSx.grid.gutter}>');
replaceExact('<Panel title="Bản tin điều hành">', '<Panel title="Bản tin điều hành" bodyMode="inset">');
replaceExact('<Stack gap={2} sx={{ p: 3 }}>\n                        {list.data?.data.map', '<Stack sx={layoutSx.surface.contentGap}>\n                        {list.data?.data.map');
replaceExact('<Box key={digest.id} sx={{ p: 2, border: 1, borderColor: \'divider\', borderRadius: 2 }}>', '<Box key={digest.id} sx={[layoutSx.detail.relatedItemInset, { border: 1, borderColor: \'divider\', borderRadius: 2 }]}>');
replaceExact('<Stack direction="row" justifyContent="space-between" gap={2}><Stack>', '<Stack direction="row" justifyContent="space-between" sx={layoutSx.surface.headerFlowGap}><Stack>');
replaceExact("sx={{ whiteSpace: 'pre-wrap', mt: 2 }}", "sx={[layoutSx.surface.sectionBefore, { whiteSpace: 'pre-wrap' }]}");
replaceExact('<Panel title="Trạng thái phụ thuộc">', '<Panel title="Trạng thái phụ thuộc" bodyMode="inset">');
replaceExact('<Stack sx={{ p: 3 }}>\n                        {health.data?.data.health.map', '<Stack>\n                        {health.data?.data.health.map');
replaceExact('<Box key={check.component} sx={{ mb: 3 }}>', '<Box key={check.component} sx={layoutSx.page.sectionAfter}>');
replaceExact("sx={{ mt: 1 }}>{check.reason", "sx={layoutSx.detail.relatedContentGap}>{check.reason");
replaceExact('<Alert severity="info" sx={{ m: 2 }}>Chỉ hiển thị lịch sử', '<Alert severity="info" sx={layoutSx.surface.sectionBefore}>Chỉ hiển thị lịch sử');
replaceExact('<Panel title="Phục hồi & sẵn sàng triển khai" subtitle="Bảng kiểm hiển thị rõ những điều chưa được xác minh trong bản frontend demo." beforeGap={"section"}>\n            <Stack gap={2} sx={{ p: 3 }} data-testid="readiness-preview">', '<Panel title="Phục hồi & sẵn sàng triển khai" subtitle="Bảng kiểm hiển thị rõ những điều chưa được xác minh trong bản frontend demo." beforeGap={"section"} bodyMode="inset">\n            <Stack sx={layoutSx.surface.contentGap} data-testid="readiness-preview">');
replaceExact("<Box key={criterion} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', py: 1, borderBottom: 1, borderColor: 'divider' }}>", "<Box key={criterion} sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock, { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }]}> ".trimEnd());
replaceExact('<Panel title="Quyền dừng vai trò AI" subtitle="Lệnh được mô phỏng theo version của từng vai trò; tiếp tục không đồng nghĩa hệ thống đã sẵn sàng." beforeGap={"section"}>', '<Panel title="Quyền dừng vai trò AI" subtitle="Lệnh được mô phỏng theo version của từng vai trò; tiếp tục không đồng nghĩa hệ thống đã sẵn sàng." beforeGap={"section"} bodyMode="inset">');
replaceExact('<Stack gap={1} sx={{ p: 2 }}>', '<Stack sx={layoutSx.detail.relatedItemGap}>');
replaceExact("<Box key={role.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', py: 1, borderBottom: 1, borderColor: 'divider' }}>", "<Box key={role.id} sx={[layoutSx.detail.valueGap, layoutSx.detail.rowInsetBlock, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }]}> ".trimEnd());

fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({ file, baselineSha256: baseline, afterSha256: sha256(fs.readFileSync(file)), semanticMigrationScript: true }));

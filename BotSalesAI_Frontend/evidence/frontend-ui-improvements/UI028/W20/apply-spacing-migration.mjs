import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'apps/web/src/modules/notifications/index.tsx';
const baseline = 'b5b78947f8d0b370ec66adef252ee0bdd25ef1dd2967f1aab2a661da02774bc8';
const bytes = fs.readFileSync(file);
const sha256 = value => createHash('sha256').update(value).digest('hex');
if (sha256(bytes) !== baseline) throw new Error('W20 baseline hash mismatch; refusing to edit.');
let source = bytes.toString('utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';
function replaceExact(before, after, expected = 1) {
    const matches = source.split(before).length - 1;
    if (matches !== expected) throw new Error(`Expected ${expected} match(es), found ${matches}: ${before}`);
    source = source.replaceAll(before, after);
}

replaceExact(`import { colors } from '@botsales/tokens';${eol}`, `import { colors } from '@botsales/tokens';${eol}import { layoutSx } from '../../shared/ui/layout';${eol}`);
replaceExact('<QueryState query={list}><Stack gap={2} sx={{ p: 3 }}>', '<QueryState query={list}><Stack sx={[layoutSx.surface.inset, layoutSx.surface.contentGap]}>');
replaceExact('<Box key={n.id} sx={{\n        p: 2.5,', '<Box key={n.id} sx={[layoutSx.surface.inset, {\n        ');
replaceExact("    }}><Stack direction={{ xs: 'column', md: 'row' }}", "    }]}><Stack direction={{ xs: 'column', md: 'row' }}");
replaceExact('<Stack direction={{ xs: \'column\', md: \'row\' }} justifyContent="space-between" gap={2}>', '<Stack direction={{ xs: \'column\', md: \'row\' }} justifyContent="space-between" sx={layoutSx.surface.contentGap}>');
replaceExact('<Stack direction="row" gap={2}><NotificationsActiveRounded', '<Stack direction="row" sx={layoutSx.surface.contentGap}><NotificationsActiveRounded');
replaceExact("sx={{ color: 'primary.main', mt: .5 }}", "sx={{ color: 'primary.main' }}");
replaceExact('<Box><Typography variant="h6">{n.title}</Typography><Typography color="text.secondary" sx={{ my: 1 }}>{n.safeBody}</Typography><Stack direction="row" gap={1} flexWrap="wrap">', '<Box><Typography variant="h6">{n.title}</Typography><Typography color="text.secondary" sx={layoutSx.pageHeader.titleDescriptionGap}>{n.safeBody}</Typography><Stack direction="row" sx={[layoutSx.detail.relatedContentGap, layoutSx.actions.inlineGap]}>');
replaceExact("sx={{ display: 'block', mt: 1 }}", "sx={[layoutSx.detail.relatedContentGap, { display: 'block' }]}");
replaceExact('<Stack justifyContent="center" gap={1}>', '<Stack justifyContent="center" sx={layoutSx.surface.contentGap}>');
replaceExact("<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, gap: 3, minWidth: 0, '& > *': { minWidth: 0 } }}>", "<Box sx={[layoutSx.grid.gutter, { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' }, minWidth: 0, '& > *': { minWidth: 0 } }]}> ".trimEnd());
replaceExact('<Stack gap={3} sx={{ minWidth: 0, \'& > *\': { minWidth: 0 } }}>', '<Stack sx={[layoutSx.page.sectionGap, { minWidth: 0, \'& > *\': { minWidth: 0 } }]}>' );
replaceExact('<Panel title="Thiết bị nhận thông báo">', '<Panel title="Thiết bị nhận thông báo" bodyMode="inset">');
replaceExact('<Stack sx={{ p: 3 }} gap={2}>', '<Stack sx={layoutSx.surface.contentGap}>');
replaceExact('<Stack direction="row" gap={2} alignItems="center">', '<Stack direction="row" sx={layoutSx.surface.contentGap} alignItems="center">');
replaceExact('<Stack gap={1} sx={{ px: 3, pb: 2 }}><ErrorNotice error={devices.error}/>', '<Stack sx={layoutSx.surface.contentGap}><ErrorNotice error={devices.error}/>');
replaceExact('<Panel title="Telegram dự phòng"><Stack gap={2} sx={{ p: 3 }}>', '<Panel title="Telegram dự phòng" bodyMode="inset"><Stack sx={layoutSx.surface.contentGap}>');
replaceExact('<Panel title="Quy tắc nhận và nhắc việc"><QueryState query={policy}><Stack gap={2} sx={{ p: 3 }}>', '<Panel title="Quy tắc nhận và nhắc việc" bodyMode="inset"><QueryState query={policy}><Stack sx={layoutSx.form.fieldGap}>');
replaceExact('<Stack gap={1}><ErrorNotice error={members.error}/>', '<Stack sx={layoutSx.surface.contentGap}><ErrorNotice error={members.error}/>');
replaceExact('<Stack direction="row" gap={2}><TextField type="time"', '<Stack direction="row" sx={layoutSx.grid.gutter}><TextField type="time"');
replaceExact('sx={{ mt: 3 }}>Chống gửi lặp', 'sx={layoutSx.page.sectionBefore}>Chống gửi lặp');

fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({ file, baselineSha256: baseline, afterSha256: sha256(fs.readFileSync(file)), semanticMigrations: 25 }));

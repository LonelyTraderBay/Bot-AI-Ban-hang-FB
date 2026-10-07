import fs from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'apps/web/src/modules/integrations/index.tsx';
const baseline = 'de8a8c8407b80792e2b8c3b25d5a31dc8239a99654f3df254f2685e9a4d2f44b';
const sourceBytes = fs.readFileSync(file);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
if (sha256(sourceBytes) !== baseline) throw new Error('W19 source differs from the preserved pre-edit working-tree hash.');
let source = sourceBytes.toString('utf8');
const eol = source.includes('\r\n') ? '\r\n' : '\n';

function replaceExact(before, after, expected = 1) {
    const matches = source.split(before).length - 1;
    if (matches !== expected) throw new Error(`Expected ${expected} occurrence(s), found ${matches}: ${before}`);
    source = source.replaceAll(before, after);
}

replaceExact(`import { useState } from 'react';${eol}`, `import { useState } from 'react';${eol}import { layoutSx } from '../../shared/ui/layout';${eol}`);
replaceExact('<Alert severity="info" sx={{ mb: 2 }}>', '<Alert severity="info" sx={layoutSx.notice.afterGap}>');
replaceExact('<Stack gap={3}>', '<Stack sx={layoutSx.page.sectionGap}>');
replaceExact('title={c.name} action={', 'title={c.name} bodyMode="inset" action={', 2);
replaceExact('<Box sx={{ p: 3 }}>', '<Box>', 2);
replaceExact('<Stack gap={1} direction="row" sx={{ my: 2 }} flexWrap="wrap">', '<Stack direction="row" sx={[layoutSx.surface.sectionBefore, layoutSx.notice.afterGap, layoutSx.actions.inlineGap]}>');
replaceExact('<Alert severity="warning" key={w} sx={{ mb: 2 }}>', '<Alert severity="warning" key={w} sx={layoutSx.notice.afterGap}>');
replaceExact('<Stack direction="row" gap={1} flexWrap="wrap">', '<Stack direction="row" sx={layoutSx.actions.inlineGap}>');
replaceExact("<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>", "<Box sx={[layoutSx.grid.gutter, { display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }]}>");
replaceExact('<Stack gap={1} sx={{ my: 2 }}>', '<Stack sx={[layoutSx.surface.sectionBefore, layoutSx.notice.afterGap, layoutSx.surface.contentGap]}>');
replaceExact('<Stack direction="row" gap={1}>', '<Stack direction="row" sx={layoutSx.actions.inlineGap}>');
replaceExact('<Stack gap={2}>', '<Stack sx={layoutSx.form.fieldGap}>');

fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({ file, beforeSha256: baseline, afterSha256: sha256(fs.readFileSync(file)), spacingLiteralReplacements: 13 }));

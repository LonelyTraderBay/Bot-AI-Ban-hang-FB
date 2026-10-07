import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourcePath = path.join(root, 'apps/web/src/modules/bot/index.tsx');
const expectedBefore = 'c7336421c40188823de27438a11d282a5e88980a815fe8729cef5a3fe34aa57c';
const hash = value => createHash('sha256').update(value).digest('hex');
const before = fs.readFileSync(sourcePath, 'utf8');
if (hash(before) !== expectedBefore) throw new Error(`W18 source changed since baseline: ${hash(before)}`);

const edits = [
    {
        label: 'import shared semantic layout roles',
        count: 1,
        from: "import { dateTime } from '../../shared/model/format';",
        to: "import { dateTime } from '../../shared/model/format';\nimport { layoutSx } from '../../shared/ui/layout';",
    },
    {
        label: 'R26 panel inset owner', count: 1,
        from: '<Panel title="Cấu hình hiện hành" action={<Status value={b.status}/>}><Box sx={{ p: 3 }}>',
        to: '<Panel title="Cấu hình hiện hành" action={<Status value={b.status}/>} bodyMode="inset"><Box>',
    },
    {
        label: 'R26 instruction paragraph before/after roles', count: 1,
        from: "<Typography sx={{ whiteSpace: 'pre-wrap', my: 3 }}>",
        to: "<Typography sx={[layoutSx.page.sectionBefore, layoutSx.page.sectionAfter, { whiteSpace: 'pre-wrap' }]}>",
    },
    {
        label: 'R26 action group roles', count: 1,
        from: '<Stack direction="row" gap={1} sx={{ mt: 2 }} flexWrap="wrap">',
        to: '<Stack direction="row" sx={[layoutSx.actions.inlineGap, layoutSx.actions.beforeGap]}>',
    },
    {
        label: 'R26, R28 and R51 field groups', count: 5,
        from: '<Stack gap={2}>',
        to: '<Stack sx={layoutSx.form.fieldGap}>',
    },
    {
        label: 'R27 responsive panel grid gap', count: 1,
        from: "<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>",
        to: "<Box sx={[{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }, layoutSx.grid.gutter]}>",
    },
    {
        label: 'R27 form panel inset owner', count: 1,
        from: '<Panel title="Câu hỏi thử"><Box component="form" sx={{ p: 3 }} onSubmit=',
        to: '<Panel title="Câu hỏi thử" bodyMode="inset"><Box component="form" onSubmit=',
    },
    {
        label: 'R27 conditional form separation and field gap', count: 1,
        from: '<Stack gap={2} sx={{ mt: config.data ? 2 : 0 }}>',
        to: '<Stack sx={[layoutSx.form.fieldGap, ...(config.data ? [layoutSx.surface.sectionBefore] : [])]}>',
    },
    {
        label: 'R27 result panel inset owner', count: 1,
        from: '<Panel title="Kết quả có nguồn"><Box sx={{ p: 3 }}>',
        to: '<Panel title="Kết quả có nguồn" bodyMode="inset"><Box>',
    },
    {
        label: 'R27 sources heading separation', count: 1,
        from: '<Typography variant="subtitle2" sx={{ mt: 2 }}>Nguồn</Typography>',
        to: '<Typography variant="subtitle2" sx={layoutSx.surface.sectionBefore}>Nguồn</Typography>',
    },
    {
        label: 'R27 source chips use shared inline-code gap', count: 1,
        from: '{result.sources.map(s => <Chip key={s.type + s.id} label={`${s.type} / ${s.id}`} sx={{ m: .5 }} />)}',
        to: '{result.sources.length > 0 && <Stack direction="row" sx={[layoutSx.code.inlineGap, { flexWrap: \'wrap\' }]}>{result.sources.map(s => <Chip key={s.type + s.id} label={`${s.type} / ${s.id}`} />)}</Stack>}',
    },
    {
        label: 'R27 warning separation role', count: 1,
        from: '<Alert key={w} severity="warning" sx={{ mt: 2 }}>{w}</Alert>',
        to: '<Alert key={w} severity="warning" sx={layoutSx.surface.sectionBefore}>{w}</Alert>',
    },
    {
        label: 'R28 synthetic-only banner after-gap role', count: 1,
        from: '<Alert severity="warning" sx={{ mb: 2 }}>Chế độ mô phỏng chỉ kiểm quy trình, không đánh giá chất lượng mô hình AI thật.</Alert>',
        to: '<Alert severity="warning" sx={layoutSx.notice.afterGap}>Chế độ mô phỏng chỉ kiểm quy trình, không đánh giá chất lượng mô hình AI thật.</Alert>',
    },
    {
        label: 'R51 four-role grid gap', count: 1,
        from: "<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' }, gap: 2 }}>",
        to: "<Box sx={[{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' } }, layoutSx.grid.gutter]}>",
    },
    {
        label: 'R51 role card inset owner', count: 1,
        from: '<Panel key={r.id} title={roleNames[r.kind]} action={<Status value={r.status}/>}><Box sx={{ p: 3 }}>',
        to: '<Panel key={r.id} title={roleNames[r.kind]} action={<Status value={r.status}/>} bodyMode="inset"><Box>',
    },
    {
        label: 'R51 tool chips use shared inline-code gap and inset spacing', count: 1,
        from: '<Stack gap={1} direction="row" flexWrap="wrap" sx={{ my: 2 }}>',
        to: '<Stack direction="row" sx={[layoutSx.code.inlineGap, layoutSx.surface.sectionBefore, layoutSx.notice.afterGap, { flexWrap: \'wrap\' }]}>',
    },
    {
        label: 'R51 action group gap role', count: 1,
        from: '<Stack direction="row" gap={1}>',
        to: '<Stack direction="row" sx={layoutSx.actions.inlineGap}>',
    },
    {
        label: 'R51 failover preview panel inset owner', count: 1,
        from: '<Panel title="Chi phí AI & dự phòng nhà cung cấp" beforeGap={"section"}>',
        to: '<Panel title="Chi phí AI & dự phòng nhà cung cấp" beforeGap={"section"} bodyMode="inset">',
    },
    {
        label: 'R51 failover preview content gap', count: 1,
        from: '<Stack gap={1.5} sx={{ p: 3 }} data-testid="provider-failover-preview">',
        to: '<Stack sx={layoutSx.surface.contentGap} data-testid="provider-failover-preview">',
    },
];

let updated = before;
for (const edit of edits) {
    const count = updated.split(edit.from).length - 1;
    if (count !== edit.count) throw new Error(`${edit.label}: expected ${edit.count} match(es), found ${count}`);
    updated = updated.replace(edit.from, edit.to);
}

fs.writeFileSync(sourcePath, updated, 'utf8');
console.log(JSON.stringify({
    task: 'UI028.W18',
    owner: sourcePath,
    beforeSha256: hash(before),
    afterSha256: hash(updated),
    replacements: edits.map(({ label, count }) => ({ label, count })),
    bytesBefore: Buffer.byteLength(before),
    bytesAfter: Buffer.byteLength(updated),
}));

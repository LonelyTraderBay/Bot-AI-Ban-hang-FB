import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { ColumnMapping } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';
import { ConfirmDialog, DataTable, DetailLine, ErrorNotice, MutationButton, PageHeader, Panel, QueryState, RouteLink, Status } from '../../shared/ui/components';
export function ImportsPage() {
    const { shop } = useScope();
    const nav = useNavigate();
    const upload = useCommand('uploadFile', []), dry = useCommand('createProductImport', []);
    const [file, setFile] = useState<File | null>(null), [strategy, setStrategy] = useState<'reject' | 'update_existing'>('reject'), [mapping, setMapping] = useState<ColumnMapping[]>([
        { sourceColumn: 'sku', targetField: 'sku' }, { sourceColumn: 'name', targetField: 'name' }, { sourceColumn: 'price', targetField: 'price' }, { sourceColumn: 'description', targetField: 'description' }, { sourceColumn: 'currency', targetField: 'currency' }
    ]);
    const targets: ColumnMapping['targetField'][] = ['sku', 'name', 'description', 'category', 'price', 'currency', 'variantName'];
    return <><PageHeader title="Nhập dữ liệu sản phẩm" subtitle="Tải tệp → ánh xạ cột → kiểm tra trước → xác nhận các dòng hợp lệ."/><Panel title="Tệp & ánh xạ"><Box sx={{ p: 3, maxWidth: 850 }}><ErrorNotice error={upload.error || dry.error}/><Stack gap={2}><Button variant="outlined" component="label">{file ? file.name : 'Chọn CSV UTF-8'}<input hidden type="file" accept=".csv,text/csv" onChange={e => setFile(e.target.files?.[0] || null)}/></Button><Typography variant="body2" color="text.secondary">Mẫu có sẵn trong samples/products.csv. XLSX chưa có parser được chốt; chuyển sang CSV, không đổi đuôi tệp.</Typography>{mapping.map((m, i) => <Stack key={i} direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField label="Tên cột trong tệp" value={m.sourceColumn} onChange={e => setMapping(mapping.map((v, j) => j === i ? { ...v, sourceColumn: e.target.value } : v))} sx={{ flex: 1 }}/><TextField select label="Trường sản phẩm" value={m.targetField} onChange={e => { const value = targets.find(t => t === e.target.value); if (value)
        setMapping(mapping.map((v, j) => j === i ? { ...v, targetField: value } : v)); }} sx={{ minWidth: 190 }}>{targets.map(t => <MenuItem value={t} key={t}>{t}</MenuItem>)}</TextField><Button color="error" onClick={() => setMapping(mapping.filter((_, j) => j !== i))}>Bỏ</Button></Stack>)}<Button onClick={() => setMapping([...mapping, { sourceColumn: '', targetField: 'variantName' }])}>Thêm cột</Button><TextField select label="Khi trùng SKU" value={strategy} onChange={e => setStrategy(e.target.value === 'update_existing' ? 'update_existing' : 'reject')}><MenuItem value="reject">Từ chối dòng trùng</MenuItem><MenuItem value="update_existing">Cập nhật SKU có sẵn sau xác nhận</MenuItem></TextField><MutationButton permission="catalog.import" variant="contained" busy={upload.pending || dry.pending} disabled={!file || mapping.some(m => !m.sourceColumn)} onClick={async () => { if (!file)
        return; try {
        const fd = new FormData();
        fd.append('file', file);
        const f = await upload.execute({ form: fd });
        const r = await dry.execute({ body: { fileId: f.data.id, mapping, duplicateStrategy: strategy, dryRun: true } });
        nav(`/s/${shop.id}/imports/${r.data.id}`);
    }
    catch { /* visible */ } }}>Kiểm tra trước khi nhập</MutationButton></Stack></Box></Panel></>;
}
export function ImportResultPage() {
    const { shop } = useScope();
    const { jobId = '' } = useParams();
    const job = useApi('getJob', { path: { jobId } });
    const commit = useCommand('commitProductImport', ['getJob', 'listProducts', 'listStockSnapshots']);
    const [confirm, setConfirm] = useState(false);
    const j = job.data?.data;
    return <><PageHeader title="Kết quả kiểm tra tệp" subtitle="Không nhập dữ liệu âm thầm khi còn lỗi; token kiểm tra gắn với phiên bản dữ liệu."/><QueryState query={job}>{j && <Panel title={j.id} action={<Status value={j.status}/>}><Box sx={{ p: 3 }}><ErrorNotice error={commit.error}/><DetailLine label="Đã xử lý">{j.completed} / {j.total ?? 'Chưa rõ'}</DetailLine><DetailLine label="Lỗi">{j.errorCount}</DetailLine><DataTable rows={j.rowErrors.map((e, i) => ({ ...e, key: String(i) }))} rowKey={e => e.key} columns={[{ key: 'row', label: 'Dòng', render: e => e.row }, { key: 'field', label: 'Cột', render: e => e.field }, { key: 'message', label: 'Lỗi', render: e => e.message }]}/>{j.validationToken && <Alert severity="info" sx={{ my: 2 }}>Xác nhận chỉ nhập những dòng đã hợp lệ. Dòng lỗi được giữ trong báo cáo, không coi là nhập thành công.</Alert>}<MutationButton permission="catalog.import" variant="contained" disabled={!j.validationToken || j.status !== 'awaiting_confirmation'} onClick={() => setConfirm(true)}>Xác nhận nhập các dòng hợp lệ</MutationButton><RouteLink to={`/s/${shop.id}/imports`}>Chọn tệp khác</RouteLink></Box></Panel>}</QueryState><ConfirmDialog open={confirm} title="Ghi dữ liệu đã kiểm tra" description="API kiểm lại token, quyền và phiên bản catalog. Nếu dữ liệu đã thay đổi cần chạy kiểm tra tệp lại." onClose={() => setConfirm(false)} error={commit.error} busy={commit.pending} onConfirm={() => commit.execute({ path: { jobId }, body: { validationToken: j?.validationToken || '', confirmValidRowsOnly: true } })}/></>;
}

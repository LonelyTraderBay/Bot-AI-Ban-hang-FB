import { FieldGroup, FormFields } from '../../shared/ui/composition';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import type { ColumnMapping } from '@botsales/contracts';
import { useApi, useCommand } from '../../shared/api/hooks';
import { useScope } from '../../shared/model/scope';

import { PRODUCT_IMPORT_MAX_BYTES, productImportFileError } from './import-file';
import { dateTime } from '../../shared/model/format';
import { label } from '../../shared/model/labels';
import { ConfirmDialog, DataTable, DetailLine, ErrorNotice, MutationButton, PageHeader, Pager, Panel, QueryState, RouteLink, Status } from '../../shared/ui/components';
export function ImportsPage() {
    const { shop } = useScope();
    const nav = useNavigate();
    const jobs = useApi('listJobs', { query: { limit: 20, sort: '-createdAt' } });
    const upload = useCommand('uploadFile', []);
    const dry = useCommand('createProductImport', ['listJobs']);
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState('');
    const [strategy, setStrategy] = useState<'reject' | 'update_existing'>('reject');
    const [mapping, setMapping] = useState<ColumnMapping[]>([
        { sourceColumn: 'sku', targetField: 'sku' },
        { sourceColumn: 'name', targetField: 'name' },
        { sourceColumn: 'price', targetField: 'price' },
        { sourceColumn: 'description', targetField: 'description' },
        { sourceColumn: 'currency', targetField: 'currency' },
    ]);
    const targets: ColumnMapping['targetField'][] = ['sku', 'name', 'description', 'category', 'price', 'currency', 'variantName'];

    return <>
        <PageHeader title="Nhập dữ liệu sản phẩm" subtitle="Tải tệp → ánh xạ cột → kiểm tra trước → xác nhận các dòng hợp lệ." />
        <Panel title="Tệp & ánh xạ" bodyMode="inset">
            <Box sx={{ width: '100%', minWidth: 0 }}>
                <ErrorNotice error={upload.error || dry.error} />
                <FormFields >
                    {__MOCK__ && <Alert severity="info">Trong demo mô phỏng: CSV UTF-8 tối đa 5 MB và 1.000 dòng dữ liệu. Khi nối backend thật, giới hạn được lấy từ API.</Alert>}
                    <Button variant="outlined" component="label">
                        {file ? file.name : 'Chọn CSV UTF-8'}
                        <input hidden type="file" accept=".csv,text/csv" aria-describedby={fileError ? 'product-import-file-error' : undefined} onChange={event => {
                            const input = event.currentTarget;
                            const next = input.files?.[0] || null;
                            const error = productImportFileError(next, __MOCK__ ? PRODUCT_IMPORT_MAX_BYTES : undefined);
                            setFileError(error);
                            setFile(error ? null : next);
                            if (error)
                                input.value = '';
                        }} />
                    </Button>
                    {fileError && <Alert id="product-import-file-error" severity="error" role="alert">{fileError}</Alert>}
                    <FieldGroup direction={{ xs: 'column', sm: 'row' }}  alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Mẫu CSV tổng hợp để kiểm tra import. XLSX chưa có parser được chốt; chuyển sang CSV, không đổi đuôi tệp.</Typography>
                        <Button component="a" href={import.meta.env.BASE_URL + 'samples/products.csv'} download="botsales-products.csv" size="small">Tải CSV mẫu</Button>
                    </FieldGroup>
                    {mapping.map((item, index) => <FieldGroup key={index} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}>
                        <TextField label="Tên cột trong tệp" value={item.sourceColumn} onChange={event => setMapping(mapping.map((value, itemIndex) => itemIndex === index ? { ...value, sourceColumn: event.target.value } : value))} sx={{ flex: 1, minWidth: 0 }} />
                        <TextField select label="Trường sản phẩm" value={item.targetField} onChange={event => {
                            const value = targets.find(target => target === event.target.value);
                            if (value)
                                setMapping(mapping.map((entry, itemIndex) => itemIndex === index ? { ...entry, targetField: value } : entry));
                        }} sx={{ flex: 1, minWidth: 0 }}>
                            {targets.map(target => <MenuItem value={target} key={target}>{target}</MenuItem>)}
                        </TextField>
                        <Button color="error" onClick={() => setMapping(mapping.filter((_, itemIndex) => itemIndex !== index))}>Bỏ</Button>
                    </FieldGroup>)}
                    <Button onClick={() => setMapping([...mapping, { sourceColumn: '', targetField: 'variantName' }])}>Thêm cột</Button>
                    <TextField select label="Khi trùng SKU" value={strategy} onChange={event => setStrategy(event.target.value === 'update_existing' ? 'update_existing' : 'reject')}>
                        <MenuItem value="reject">Từ chối dòng trùng</MenuItem>
                        <MenuItem value="update_existing">Cập nhật SKU có sẵn sau xác nhận</MenuItem>
                    </TextField>
                    <MutationButton permission="catalog.import" variant="contained" busy={upload.pending || dry.pending} disabled={!file || mapping.some(item => !item.sourceColumn)} onClick={async () => {
                        if (!file)
                            return;
                        try {
                            const form = new FormData();
                            form.append('file', file);
                            form.append('purpose', 'product_import');
                            const uploaded = await upload.execute({ form });
                            const result = await dry.execute({ body: { fileId: uploaded.data.id, mapping, duplicateStrategy: strategy, dryRun: true } });
                            nav('/s/' + shop.id + '/imports/' + result.data.id);
                        }
                        catch {
                            // ErrorNotice keeps the upload and validation failure visible.
                        }
                    }}>Kiểm tra trước khi nhập</MutationButton>
                </FormFields>
            </Box>
        </Panel>
        <Panel title="Tác vụ gần đây" subtitle="Tình trạng xử lý do API trả về; dữ liệu mẫu chỉ chạy trong bộ nhớ." beforeGap={"section"}>
            <QueryState query={jobs} pendingProfile="section">
                {jobs.data && <>
                    <DataTable label="Tác vụ nền gần đây" rows={jobs.data.data} rowKey={job => job.id} empty="Chưa có tác vụ nhập. Chọn tệp ở biểu mẫu phía trên để bắt đầu." columns={[
                        { key: 'kind', label: 'Loại tác vụ', render: job => label(job.kind) },
                        { key: 'id', label: 'Mã tác vụ', render: job => job.id },
                        { key: 'status', label: 'Trạng thái', render: job => <Status value={job.status} /> },
                        { key: 'progress', label: 'Đã xử lý', render: job => String(job.completed) + ' / ' + (job.total ?? 'Chưa rõ') },
                        { key: 'errors', label: 'Dòng lỗi', render: job => job.errorCount },
                        { key: 'updatedAt', label: 'Cập nhật', render: job => dateTime(job.updatedAt, shop.timezone) },
                        { key: 'action', label: '', render: job => <RouteLink to={job.kind === 'import' ? '/s/' + shop.id + '/imports/' + job.id : '/s/' + shop.id + '/jobs/' + job.id}>Xem kết quả</RouteLink> },
                    ]} />
                    <Pager page={jobs.data.page} />
                </>}
            </QueryState>
        </Panel>
    </>;
}
export function ImportResultPage() {
    const { shop } = useScope();
    const { jobId = '' } = useParams();
    const job = useApi('getJob', { path: { jobId } });
    const commit = useCommand('commitProductImport', ['getJob', 'listJobs', 'listProducts', 'listStockSnapshots']);
    const [confirm, setConfirm] = useState(false);
    const j = job.data?.data;
    return <><PageHeader title="Kết quả kiểm tra tệp" subtitle="Không nhập dữ liệu âm thầm khi còn lỗi; token kiểm tra gắn với phiên bản dữ liệu." actions={<RouteLink to={`/s/${shop.id}/imports`}>Danh sách tác vụ</RouteLink>}/><QueryState query={job} pendingProfile="section">{j && <Panel title={j.id} action={<Status value={j.status}/>} bodyMode="inset"><FormFields ><ErrorNotice error={commit.error}/><DetailLine label="Đã xử lý">{j.completed} / {j.total ?? 'Chưa rõ'}</DetailLine><DetailLine label="Lỗi">{j.errorCount}</DetailLine><DataTable label="Lỗi từng dòng trong tệp nhập" rows={j.rowErrors.map((e, i) => ({ ...e, key: String(i) }))} rowKey={e => e.key} empty="Không có dòng lỗi trong báo cáo kiểm tra." columns={[{ key: 'row', label: 'Dòng', render: e => e.row }, { key: 'field', label: 'Cột', render: e => e.field }, { key: 'message', label: 'Lỗi', render: e => e.message }]}/>{j.validationToken && <Alert severity="info">Xác nhận chỉ nhập những dòng đã hợp lệ. Dòng lỗi được giữ trong báo cáo, không coi là nhập thành công.</Alert>}<MutationButton permission="catalog.import" variant="contained" disabled={!j.validationToken || j.status !== 'awaiting_confirmation'} onClick={() => setConfirm(true)}>Xác nhận nhập các dòng hợp lệ</MutationButton><RouteLink to={`/s/${shop.id}/imports`}>Chọn tệp khác</RouteLink></FormFields></Panel>}</QueryState><ConfirmDialog open={confirm} title="Ghi dữ liệu đã kiểm tra" confirmLabel="Nhập các dòng hợp lệ" description={`Tệp đã kiểm trong công việc ${jobId}: chỉ ghi các dòng hợp lệ; dòng lỗi không được nhập. Nếu danh mục đã thay đổi, phải kiểm tra tệp lại.`} onClose={() => setConfirm(false)} error={commit.error} busy={commit.pending} onConfirm={() => commit.execute({ path: { jobId }, body: { validationToken: j?.validationToken || '', confirmValidRowsOnly: true } })}/></>;
}

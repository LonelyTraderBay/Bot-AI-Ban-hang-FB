import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type { Category } from '@botsales/contracts';
import { useApi, useCommand } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { PRODUCT_IMAGE_MAX_BYTES, productImageFileError } from './import-file';
import { PageHeader, Panel, DataTable, Status, Amount, QueryState, Toolbar, Pager, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink } from '@/shared/ui/components';
const productSchema = z.object({
    name: z.string().trim().min(1, 'Nhập tên sản phẩm').max(160), description: z.string().max(20000), categoryId: z.string(), status: z.enum(['draft', 'active']), variants: z.array(z.object({
        id: z.string().optional(), sku: z.string().trim().min(1, 'Nhập SKU').max(80), name: z.string().min(1, 'Nhập tên biến thể'), price: z.string().trim().min(1, 'Nhập giá bán').regex(/^\d+(\.\d{1,4})?$/, 'Giá không hợp lệ').refine(value => Number(value) > 0, 'Giá phải lớn hơn 0'), active: z.boolean()
    })).min(1, 'Cần ít nhất một biến thể')
});
type ProductFields = z.infer<typeof productSchema>;
const defaults: ProductFields = { name: '', description: '', categoryId: '', status: 'draft', variants: [{ sku: '', name: 'Mặc định', price: '', active: true }] };
export function ProductsPage() {
    const { shop } = useScope();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const categories = useApi('listCategories', { query: { limit: 100 } });
    const list = useApi('listProducts', { query: { ...useListQuery(), categoryId: params.get('categoryId') || undefined } });
    const setFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        next.delete('cursor');
        setParams(next);
    };
    return <><PageHeader title="Sản phẩm" subtitle="Một nguồn thông tin cho tư vấn, giá bán và các biến thể." actions={<MutationButton permission="catalog.write" onClick={() => navigate(`/s/${shop.id}/products/new`)} variant="contained">Thêm sản phẩm</MutationButton>}/><Panel><Toolbar placeholder="Tìm tên hoặc SKU…" extra={<Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><TextField select size="small" label="Trạng thái" value={params.get('status') || ''} onChange={event => setFilter('status', event.target.value)} sx={{ minWidth: 150 }}><MenuItem value="">Tất cả trạng thái</MenuItem><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="active">Đang bán</MenuItem><MenuItem value="archived">Đã ngừng bán</MenuItem></TextField><TextField select size="small" label="Danh mục" value={params.get('categoryId') || ''} onChange={event => setFilter('categoryId', event.target.value)} sx={{ minWidth: 170 }}><MenuItem value="">Tất cả danh mục</MenuItem>{categories.data?.data.map(category => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}</TextField></Stack>}/><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={p => p.id} columns={[
        {
            key: 'name', label: 'Sản phẩm', render: p => <Stack><Typography fontWeight={650}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.variants.map(v => v.sku).join(' · ')}</Typography></Stack>
        },
        { key: 'variants', label: 'Biến thể', render: p => p.variants.length }, { key: 'price', label: 'Giá biến thể đầu', render: p => <Amount value={p.variants[0]?.price}/> }, { key: 'status', label: 'Trạng thái', render: p => <Status value={p.status}/> }, { key: 'action', label: '', render: p => <RouteLink to={`/s/${shop.id}/products/${p.id}`}>Chi tiết</RouteLink> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>;
}
export function ProductEditorPage() {
    const { productId } = useParams();
    const { shop } = useScope();
    const navigate = useNavigate();
    const canWrite = useCan('catalog.write');
    const product = useApi('getProduct', { path: { productId: productId || 'new' } }, !!productId);
    const categories = useApi('listCategories', { query: { limit: 100 } });
    const create = useCommand('createProduct', ['listProducts']);
    const update = useCommand('updateProduct', ['getProduct', 'listProducts']);
    const archive = useCommand('archiveProduct', ['getProduct', 'listProducts']);
    const [confirm, setConfirm] = useState(false);
    const [imageIds, setImageIds] = useState<string[]>([]);
    const [savedImageIds, setSavedImageIds] = useState<string[]>([]);
    const [imageError, setImageError] = useState('');
    const upload = useCommand('uploadFile', []);
    const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProductFields>({ defaultValues: defaults, resolver: zodResolver(productSchema) });
    const fieldArray = useFieldArray({ control, name: 'variants' });
    const imagesDirty = imageIds.length !== savedImageIds.length || imageIds.some((id, index) => id !== savedImageIds[index]);
    useEffect(() => { if (product.data && !isDirty) {
        const p = product.data.data;
        reset({
            name: p.name, description: p.description, categoryId: p.categoryId || '', status: p.status === 'active' ? 'active' : 'draft', variants: p.variants.map(v => ({ id: v.id, sku: v.sku, name: v.name, price: v.price?.amount ?? '', active: v.active }))
        });
        setImageIds(p.imageFileIds);
        setSavedImageIds(p.imageFileIds);
    } }, [product.data, reset, isDirty]);
    useEffect(() => { if (!isDirty && !imagesDirty)
        return; const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [isDirty, imagesDirty]);
    const save = handleSubmit(async (fields) => { const body = {
        name: fields.name, description: fields.description, categoryId: fields.categoryId || null, status: fields.status, imageFileIds: imageIds, variants: fields.variants.map(v => ({
            id: v.id, sku: v.sku, name: v.name, options: product.data?.data.variants.find(o => o.id === v.id)?.options || {}, price: { amount: v.price, currency: shop.currency }, active: v.active
        }))
    }; try {
        let response: Awaited<ReturnType<typeof create.execute>>;
        if (productId) {
            const current = product.data?.data;
            if (!current) return;
            response = await update.execute({ path: { productId }, version: current.version, body });
        }
        else response = await create.execute({ body });
        setSavedImageIds(imageIds);
        reset(fields);
        navigate(`/s/${shop.id}/products/${response.data.id}`, { replace: true });
    }
    catch { /* ErrorNotice preserves edits. */ } });
    const pending = create.pending || update.pending || upload.pending;
    return <><PageHeader title={productId ? 'Thông tin sản phẩm' : 'Thêm sản phẩm'} subtitle="Giá theo biến thể. Tồn kho được quản lý ở màn hình riêng." actions={<Button component={RouterLink} to={`/s/${shop.id}/products`}>Danh sách</Button>}/>{productId && product.isPending ? <QueryState query={product}>{null}</QueryState> : productId && product.isError ? <QueryState query={product}>{null}</QueryState> : <Box component="form" data-draft-clean={!isDirty && !imagesDirty ? 'true' : undefined} onSubmit={save}>
 <ErrorNotice error={create.error || update.error || upload.error}/>{categories.isError && <Alert severity="warning" role="alert" action={<Button color="inherit" size="small" onClick={() => { void categories.refetch(); }}>Thử lại danh mục</Button>}>Không tải được danh mục. Bản nháp vẫn được giữ; bạn có thể tiếp tục mà không phân loại sản phẩm.</Alert>}<Panel title="Thông tin bán hàng"><Stack spacing={2.5} sx={{ p: 3 }}><TextField label="Tên sản phẩm" {...register('name')} error={!!errors.name} helperText={errors.name?.message} disabled={!canWrite}/><TextField label="Mô tả dùng cho AI tư vấn" multiline minRows={4} {...register('description')} disabled={!canWrite}/><Stack direction={{ xs: 'column', sm: 'row' }} gap={2}><Controller name="categoryId" control={control} render={({ field }) => <TextField select fullWidth label="Danh mục" {...field} disabled={!canWrite}><MenuItem value="">Chưa phân loại</MenuItem>{categories.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField>}/><Controller name="status" control={control} render={({ field }) => <TextField select fullWidth label="Trạng thái" {...field} disabled={!canWrite}><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="active">Đang bán</MenuItem></TextField>}/></Stack></Stack></Panel>
 <Panel title="Biến thể và giá" sx={{ mt: 3 }} action={<Button startIcon={<AddRounded />} disabled={!canWrite} onClick={() => fieldArray.append({ sku: '', name: '', price: '', active: true })}>Thêm biến thể</Button>}><Stack spacing={2} sx={{ p: 3 }}>{fieldArray.fields.map((field, index) => <Stack key={field.id} direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems="start"><TextField label="SKU" {...register(`variants.${index}.sku`)} error={!!errors.variants?.[index]?.sku} helperText={errors.variants?.[index]?.sku?.message} disabled={!canWrite}/><TextField label="Tên / màu / kích cỡ" {...register(`variants.${index}.name`)} disabled={!canWrite} sx={{ flex: 1 }}/><TextField label={`Giá bán (${shop.currency})`} inputProps={{ inputMode: 'decimal' }} {...register(`variants.${index}.price`)} error={!!errors.variants?.[index]?.price} helperText={errors.variants?.[index]?.price?.message} disabled={!canWrite}/><FormControlLabel label="Đang bán" control={<Checkbox defaultChecked={field.active} {...register(`variants.${index}.active`)} disabled={!canWrite}/>}/><IconButton aria-label={`Xóa biến thể ${index + 1}`} disabled={!canWrite || fieldArray.fields.length === 1} onClick={() => fieldArray.remove(index)}><DeleteOutlineRounded /></IconButton></Stack>)}</Stack></Panel>
 <Panel title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý." sx={{ mt: 3 }}><Stack gap={2} sx={{ p: 3 }}><Typography variant="body2">{imageIds.length} tệp được gắn với sản phẩm</Typography><Button component="label" variant="outlined" disabled={!canWrite || pending}>Chọn ảnh<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const input = e.currentTarget; const file = input.files?.[0] || null; const error = productImageFileError(file, __MOCK__ ? PRODUCT_IMAGE_MAX_BYTES : undefined); setImageError(error); if (error) { input.value = ''; return; } if (!file) return; const form = new FormData(); form.append('file', file); form.append('purpose', 'product_image'); try {
            const r = await upload.execute({ form });
            if (r.data.status === 'ready')
                setImageIds(ids => [...ids, r.data.id]);
            else
                alert('Tệp đang được cách ly/kiểm tra; chưa gắn vào sản phẩm.');
        }
        catch { /* visible error */ } input.value = ''; }}/></Button>{imageError && <Alert severity="error" role="alert">{imageError}</Alert>}{imageIds.map(fileId => <Stack key={fileId} direction="row" gap={1}><Typography variant="caption">{fileId}</Typography><Button size="small" disabled={!canWrite} onClick={() => setImageIds(ids => ids.filter(x => x !== fileId))}>Bỏ liên kết ảnh</Button></Stack>)}</Stack></Panel>
 <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>{productId && product.data?.data.status !== 'archived' ? <MutationButton permission="catalog.write" color="error" onClick={() => setConfirm(true)}>Ngừng bán</MutationButton> : <span />}<MutationButton permission="catalog.write" type="submit" variant="contained" busy={pending}>Lưu sản phẩm</MutationButton></Stack></Box>}
 <ConfirmDialog open={confirm} title="Ngừng bán sản phẩm" description="Giữ lại lịch sử đơn hàng; không xóa dữ liệu đã phát sinh." requireReason onClose={() => setConfirm(false)} busy={archive.pending} error={archive.error} onConfirm={async reason => {
        const current = product.data?.data;
        if (!productId || !current) return;
        await archive.execute({ path: { productId }, version: current.version, body: { expectedVersion: current.version, reason } });
    }}/></>;
}
export function CategoriesPage() {
    const list = useApi('listCategories', { query: useListQuery() });
    const create = useCommand('createCategory', ['listCategories']);
    const update = useCommand('updateCategory', ['listCategories']);
    const archive = useCommand('archiveCategory', ['listCategories']);
    const [edit, setEdit] = useState<Category | null | undefined>();
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [remove, setRemove] = useState<Category | null>(null);
    const categoryDetail = useApi('getCategory', { path: { categoryId: edit?.id || '' } }, !!edit?.id);
    const waitingForDetail = Boolean(edit?.id && categoryDetail.data?.data.id !== edit.id);
    useEffect(() => {
        if (edit && categoryDetail.data?.data.id === edit.id) {
            setName(categoryDetail.data.data.name);
            setParentId(categoryDetail.data.data.parentId || '');
        }
    }, [categoryDetail.data, edit]);
    const open = (c: Category | null) => { setName(c?.name || ''); setParentId(c?.parentId || ''); setEdit(c); };
    return <><PageHeader title="Danh mục" subtitle="Sắp xếp sản phẩm, không thay đổi tồn kho." actions={<MutationButton permission="catalog.write" variant="contained" onClick={() => open(null)}>Thêm danh mục</MutationButton>}/><Panel><Toolbar /><QueryState query={list}>{list.data && <><DataTable rows={list.data.data} rowKey={c => c.id} columns={[
        { key: 'name', label: 'Tên danh mục', render: c => c.name }, { key: 'parent', label: 'Danh mục cha', render: c => list.data?.data.find(p => p.id === c.parentId)?.name || '—' }, { key: 'state', label: 'Trạng thái', render: c => <Status value={c.active ? 'active' : 'disabled'}/> },
        {
            key: 'action', label: '', render: c => <Stack direction="row"><MutationButton permission="catalog.write" onClick={() => open(c)}>Sửa</MutationButton><MutationButton permission="catalog.write" color="error" onClick={() => setRemove(c)}>Ngừng dùng</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog open={edit !== undefined} title={edit ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setEdit(undefined)} busy={create.pending || update.pending || waitingForDetail} actions={<Button variant="contained" disabled={!name.trim() || create.pending || update.pending || waitingForDetail} onClick={async () => { try {
        const body = { name: name.trim(), parentId: parentId || null };
        if (edit)
            await update.execute({ path: { categoryId: edit.id }, version: edit.version, body });
        else
            await create.execute({ body });
        setEdit(undefined);
    }
    catch { /* preserve */ } }}>Lưu</Button>}><ErrorNotice error={create.error || update.error}/>{edit?.id && waitingForDetail && <Alert severity={categoryDetail.error ? 'error' : 'info'} action={categoryDetail.error ? <Button size="small" onClick={() => void categoryDetail.refetch()}>Thử lại</Button> : undefined}>{categoryDetail.error ? 'Không tải được chi tiết danh mục; dữ liệu nhập vẫn được giữ. Hãy thử lại.' : 'Đang tải chi tiết danh mục trước khi cho phép chỉnh sửa.'}</Alert>}<Stack gap={2}><TextField label="Tên" value={name} onChange={e => setName(e.target.value)} disabled={waitingForDetail}/><TextField label="Danh mục cha" select value={parentId} onChange={e => setParentId(e.target.value)} disabled={waitingForDetail}><MenuItem value="">Không có</MenuItem>{list.data?.data.filter(c => c.id !== edit?.id).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField></Stack></EditDialog>
 <ConfirmDialog open={!!remove} title="Ngừng dùng danh mục" description="Không xóa sản phẩm trong danh mục." requireReason onClose={() => setRemove(null)} error={archive.error} busy={archive.pending} onConfirm={reason => archive.execute({ path: { categoryId: remove?.id || '' }, version: remove?.version, body: { expectedVersion: remove?.version || 1, reason } })}/></>;
}

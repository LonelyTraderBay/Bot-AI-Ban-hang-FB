import { codePointLength } from '@/shared/model/format';
import { ActionGroup, FieldGroup, FormFields } from '../../shared/ui/composition';
import { useEffect, useRef, useState } from 'react';
import { visualSx } from '@/shared/ui/visual';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Box, Button, Checkbox, FormControlLabel, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import type { Category, Product, ProductWritePatch } from '@botsales/contracts';
import { useApi, useCommand, usePagedApi } from '@/shared/api/hooks';
import { useScope, useCan } from '@/shared/model/scope';
import { useListQuery } from '@/shared/model/filters';
import { PRODUCT_IMAGE_MAX_BYTES, productImageFileError } from './import-file';
import { ApiError } from '@/shared/api/errors';
import { draftEqual, useVersionedDraft } from '@/shared/model/versioned-draft';
import { markDraftClean, useDraftForm } from '@/shared/model/dirty-drafts';
import { DraftConflict } from '@/shared/ui/draft-conflict';
import { PageHeader, Panel, DataTable, Status, Amount, QueryState, Toolbar, Pager, MutationButton, EditDialog, ErrorNotice, ConfirmDialog, RouteLink, LookupLoadMore } from '@/shared/ui/components';
const productSchema = z.object({
    name: z.string().trim().min(1, 'Nhập tên sản phẩm').refine(value => codePointLength(value) <= 160, 'Tên sản phẩm tối đa 160 ký tự.'), description: z.string().refine(value => codePointLength(value) <= 20000, 'Mô tả tối đa 20.000 ký tự.'), categoryId: z.string(), status: z.enum(['draft', 'active']), variants: z.array(z.object({
        id: z.string().optional(), options: z.record(z.string(), z.string()).optional(), sku: z.string().trim().min(1, 'Nhập SKU').refine(value => codePointLength(value) <= 80, 'SKU tối đa 80 ký tự.'), name: z.string().min(1, 'Nhập tên biến thể'), price: z.string().trim().min(1, 'Nhập giá bán').regex(/^\d+(\.\d{1,4})?$/, 'Giá không hợp lệ').refine(value => Number(value) > 0, 'Giá phải lớn hơn 0'), active: z.boolean()
    })).min(1, 'Cần ít nhất một biến thể')
});
type ProductFields = z.infer<typeof productSchema>;
const defaults: ProductFields = { name: '', description: '', categoryId: '', status: 'draft', variants: [{ sku: '', name: 'Mặc định', price: '', active: true }] };
export function ProductsPage() {
    const { shop } = useScope();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const [categorySearchInput, setCategorySearchInput] = useState(''), [categorySearch, setCategorySearch] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setCategorySearch(categorySearchInput.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [categorySearchInput]);
    const categories = usePagedApi('listCategories', { query: { q: categorySearch || undefined } });
    const selectedCategoryDetail = useApi('getCategory', { path: { categoryId: params.get('categoryId') || '' } }, !!params.get('categoryId'));
    const selectedCategory = categories.data?.data.find(category => category.id === params.get('categoryId')) || selectedCategoryDetail.data?.data;
    const list = useApi('listProducts', { query: { ...useListQuery('listProducts'), categoryId: params.get('categoryId') || undefined } });
    const setFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params);
        if (value)
            next.set(key, value);
        else
            next.delete(key);
        next.delete('cursor');
        setParams(next);
    };
    return <><PageHeader title="Sản phẩm" subtitle="Một nguồn thông tin cho tư vấn, giá bán và các biến thể." actions={<MutationButton permission="catalog.write" onClick={() => navigate(`/s/${shop.id}/products/new`)} variant="contained">Thêm sản phẩm</MutationButton>}/><Panel>
        <Toolbar operation="listProducts" placeholder="Tìm tên hoặc SKU…"
            extra={<TextField select size="small" label="Trạng thái" value={params.get('status') || ''} onChange={event => setFilter('status', event.target.value)} sx={{ minWidth: 150 }}>
                <MenuItem value="">Tất cả trạng thái</MenuItem><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="active">Đang bán</MenuItem><MenuItem value="archived">Đã ngừng bán</MenuItem>
            </TextField>}
            filters={<FormFields direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'flex-start' }} role="group" aria-label="Bộ lọc danh mục">
                <FieldGroup geometry={{ flex: 1, minWidth: 0 }}>
                    <TextField size="small" label="Tìm danh mục" value={categorySearchInput} onChange={event => setCategorySearchInput(event.target.value)} helperText="Tìm danh mục trên toàn cửa hàng."/>
                </FieldGroup>
                <FieldGroup geometry={{ flex: 1, minWidth: 0 }}>
                    <TextField select size="small" label="Danh mục" value={params.get('categoryId') || ''} onChange={event => setFilter('categoryId', event.target.value)}>
                        <MenuItem value="">Tất cả danh mục</MenuItem>
                        {params.get('categoryId') && !categories.data?.data.some(category => category.id === params.get('categoryId')) && <MenuItem value={params.get('categoryId')!}>{selectedCategory?.name || params.get('categoryId')}</MenuItem>}
                        {categories.data?.data.map(category => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
                    </TextField>
                    <LookupLoadMore label="danh mục" loadedCount={categories.loadedCount} hasMore={categories.hasMore} busy={categories.isLoadingMore} onLoadMore={categories.loadMore}/>
                    {categories.isError && <Button size="small" onClick={() => { void (categories.isFetchNextPageError ? categories.loadMore() : categories.refetch()); }}>Thử lại danh mục</Button>}
                </FieldGroup>
            </FormFields>}/>
        <QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={p => p.id} columns={[
        {
            key: 'name', label: 'Sản phẩm', render: p => <Stack><Typography fontWeight={visualSx.typography.fontWeight.strong}>{p.name}</Typography><Typography variant="caption" color="text.secondary">{p.variants.map(v => v.sku).join(' · ')}</Typography></Stack>
        },
        { key: 'variants', label: 'Biến thể', render: p => p.variants.length }, { key: 'price', label: 'Giá biến thể đầu', render: p => <Amount value={p.variants[0]?.price}/> }, { key: 'status', label: 'Trạng thái', render: p => <Status value={p.status}/> }, { key: 'action', label: 'Thao tác', render: p => <RouteLink to={`/s/${shop.id}/products/${p.id}`}>Chi tiết</RouteLink> }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel></>;
}
export function ProductEditorPage() {
    const { productId: routeProductId } = useParams();
    const [createdProductId, setCreatedProductId] = useState<string>();
    const productId = routeProductId || createdProductId;
    const { shop } = useScope();
    const navigate = useNavigate();
    const canWrite = useCan('catalog.write');
    const product = useApi('getProduct', { path: { productId: productId || 'new' } }, !!productId);
    const [categorySearch, setCategorySearch] = useState('');
    const [categoryQuery, setCategoryQuery] = useState('');
    useEffect(() => {
        const timer = window.setTimeout(() => setCategoryQuery(categorySearch.trim()), 250);
        return () => window.clearTimeout(timer);
    }, [categorySearch]);
    const categories = usePagedApi('listCategories', { query: { limit: 20, q: categoryQuery || undefined } });
    const create = useCommand('createProduct', ['listProducts']);
    const update = useCommand('updateProduct', ['getProduct', 'listProducts']);
    const archive = useCommand('archiveProduct', ['getProduct', 'listProducts']);
    const [confirm, setConfirm] = useState(false);
    const [imageIds, setImageIds] = useState<string[]>([]);
    const [savedImageIds, setSavedImageIds] = useState<string[]>([]);
    const [imageError, setImageError] = useState('');
    const upload = useCommand('uploadFile', []);
    const productForm = useForm<ProductFields>({ defaultValues: defaults, resolver: zodResolver(productSchema) });
    const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = productForm;
    useWatch({ control });
    const selectedCategoryId = useWatch({ control, name: 'categoryId' });
    const categoryOnPage = categories.data?.data.find(category => category.id === selectedCategoryId);
    const selectedCategory = useApi('getCategory', { path: { categoryId: selectedCategoryId || '' } }, Boolean(selectedCategoryId && !categoryOnPage));
    const retainedCategory = categoryOnPage || (selectedCategory.data?.data.id === selectedCategoryId ? selectedCategory.data.data : undefined);
    const fieldArray = useFieldArray({ control, name: 'variants' });
    const imagesDirty = imageIds.length !== savedImageIds.length || imageIds.some((id, index) => id !== savedImageIds[index]);
    const editor = useVersionedDraft({
        identity: `${shop.id}:product:${routeProductId || 'new'}`,
        source: product.data ? productSnapshot(product.data.data) : undefined,
        draft: { ...productForm.getValues(), imageFileIds: imageIds },
        apply: (values, baseline) => {
            reset(baseline);
            for (const key of ['name', 'description', 'categoryId', 'status', 'variants'] as const)
                if (!draftEqual(values[key], baseline[key])) productForm.setValue(key, values[key], { shouldDirty: true });
            setImageIds(values.imageFileIds); setSavedImageIds(baseline.imageFileIds);
        },
        refresh: () => product.refetch({ throwOnError: true }),
    });
    const draftForm = useDraftForm(isDirty || imagesDirty || editor.dirty);
    const productElement = useRef<HTMLFormElement>(null);
    useEffect(() => { if (!isDirty && !imagesDirty)
        return; const prevent = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; }; window.addEventListener('beforeunload', prevent); return () => window.removeEventListener('beforeunload', prevent); }, [isDirty, imagesDirty]);
    const save = handleSubmit(async (fields) => {
        const submitted = { ...productForm.getValues(), imageFileIds: [...imageIds] };
        const body = { name: fields.name, description: fields.description, categoryId: fields.categoryId || null, status: fields.status,
            imageFileIds: imageIds, variants: fields.variants.map(v => ({ id: v.id, sku: v.sku, name: v.name, options: v.options || {}, price: { amount: v.price, currency: shop.currency }, active: v.active })) };
        try {
            let response: Awaited<ReturnType<typeof create.execute>>;
            if (productId) {
                const prepared = editor.prepare(); if (!prepared || !Object.keys(prepared.patch).length) return;
                const patch = Object.fromEntries(Object.keys(prepared.patch).map(key => [key, body[key as keyof typeof body]])) as ProductWritePatch;
                response = await update.execute({ path: { productId }, version: prepared.version, body: patch });
            } else response = await create.execute({ body });
            const clean = editor.committed(productSnapshot(response.data), submitted);
            setCreatedProductId(response.data.id);
            if (clean) { if (productElement.current) markDraftClean(productElement.current); navigate(`/s/${shop.id}/products/${response.data.id}`, { replace: true }); }
        } catch (error) { editor.failed(error); }
    });
    const pending = create.pending || update.pending || upload.pending;
    return <><PageHeader title={productId ? 'Thông tin sản phẩm' : 'Thêm sản phẩm'} subtitle="Giá theo biến thể. Tồn kho được quản lý ở màn hình riêng." actions={<Button component={RouterLink} to={`/s/${shop.id}/products`}>Danh sách</Button>}/>{productId && product.isPending ? <QueryState query={product}>{null}</QueryState> : productId && product.isError ? <QueryState query={product}>{null}</QueryState> : <Box component="form" ref={form => { const element = form as HTMLFormElement | null; productElement.current = element; draftForm(element); }} data-draft-clean={!isDirty && !imagesDirty ? 'true' : undefined} onSubmit={save}>
 <ErrorNotice error={create.error || update.error || upload.error}/><DraftConflict editor={editor} labels={{ name: 'Tên sản phẩm', description: 'Mô tả', categoryId: 'Danh mục', status: 'Trạng thái', variants: 'Biến thể và giá', imageFileIds: 'Ảnh sản phẩm' }} busy={pending}/><Panel title="Thông tin bán hàng" bodyMode="inset"><FormFields ><TextField label="Tên sản phẩm" {...register('name')} error={!!errors.name} helperText={errors.name?.message} disabled={!canWrite}/><TextField label="Mô tả dùng cho AI tư vấn" multiline minRows={4} {...register('description')} disabled={!canWrite}/><TextField label="Tìm danh mục" size="small" value={categorySearch} onChange={event => setCategorySearch(event.target.value)} disabled={!canWrite} helperText="Tìm trên danh sách cửa hàng; có thể tải thêm khi cần."/><FieldGroup direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'start' }}><Controller name="categoryId" control={control} render={({ field }) => <FieldGroup geometry={{flex: 1, minWidth: 0, width: '100%'}}><TextField select fullWidth label="Danh mục" {...field} disabled={!canWrite}><MenuItem value="">Chưa phân loại</MenuItem>{selectedCategoryId && !categoryOnPage && <MenuItem value={selectedCategoryId}>{retainedCategory?.name || (selectedCategory.isError ? `Danh mục hiện tại (${selectedCategoryId})` : 'Đang tải danh mục hiện tại…')}</MenuItem>}{categories.data?.data.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField><LookupLoadMore label="danh mục" loadedCount={categories.loadedCount} hasMore={categories.hasMore} busy={categories.isLoadingMore} onLoadMore={categories.loadMore}/>{categories.isPending && <Alert severity="info" role="status">Đang tải danh mục…</Alert>}{categories.isError && <Alert severity={categories.isFetchNextPageError ? 'warning' : 'error'} role="alert" action={<Button color="inherit" size="small" onClick={() => { void (categories.isFetchNextPageError ? categories.loadMore() : categories.refetch()); }}>Thử lại danh mục</Button>}>{categories.isFetchNextPageError ? `Không tải thêm được danh mục (HTTP ${categories.error instanceof ApiError ? categories.error.status : 'lỗi'}). Các lựa chọn đã tải vẫn dùng được.` : `Không tải được danh mục (HTTP ${categories.error instanceof ApiError ? categories.error.status : 'lỗi'}). Bản nháp được giữ; hãy thử lại hoặc chọn “Chưa phân loại”.`}</Alert>}{categories.data?.data.length === 0 && !categories.isFetching && <Alert severity="info" role="status">{categoryQuery ? 'Không tìm thấy danh mục phù hợp.' : 'Cửa hàng chưa có danh mục.'}</Alert>}{selectedCategory.isPending && selectedCategoryId && !categoryOnPage && <Alert severity="info" role="status">Đang tải tên danh mục đã gắn với sản phẩm…</Alert>}{selectedCategory.isError && selectedCategoryId && !categoryOnPage && <Alert severity="warning" role="alert" action={<Button color="inherit" size="small" onClick={() => { void selectedCategory.refetch(); }}>Thử lại danh mục đang chọn</Button>}>{selectedCategory.error instanceof ApiError && selectedCategory.error.status === 403 ? 'Không có quyền đọc danh mục hiện tại (403). ID đã chọn vẫn được giữ trong biểu mẫu.' : `Không tải được danh mục hiện tại (${selectedCategory.error instanceof ApiError ? selectedCategory.error.status : 'lỗi'}). ID đã chọn vẫn được giữ trong biểu mẫu.`}</Alert>}</FieldGroup>}/><Controller name="status" control={control} render={({ field }) => <TextField select fullWidth label="Trạng thái" {...field} disabled={!canWrite} sx={{ flex: 1, minWidth: 0 }}><MenuItem value="draft">Bản nháp</MenuItem><MenuItem value="active">Đang bán</MenuItem></TextField>}/></FieldGroup></FormFields></Panel>
 <Panel title="Biến thể và giá" bodyMode="inset" beforeGap={"section"} action={<Button startIcon={<AddRounded />} disabled={!canWrite} onClick={() => fieldArray.append({ sku: '', name: '', price: '', active: true })}>Thêm biến thể</Button>}><FormFields >{fieldArray.fields.map((field, index) => <FieldGroup key={field.id} direction={{ xs: 'column', md: 'row' }}  alignItems={{ xs: 'stretch', md: 'start' }} flexWrap="wrap"><TextField label="SKU" {...register(`variants.${index}.sku`)} error={!!errors.variants?.[index]?.sku} helperText={errors.variants?.[index]?.sku?.message} disabled={!canWrite} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: 'min(100%, 12em)', maxWidth: '100%', flex: { xs: '0 1 auto', md: '1 1 12em' } }}/><TextField label="Tên / màu / kích cỡ" {...register(`variants.${index}.name`)} disabled={!canWrite} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: 'min(100%, 12em)', maxWidth: '100%', flex: { xs: '0 1 auto', md: '1 1 12em' } }}/><TextField label={`Giá bán (${shop.currency})`} inputProps={{ inputMode: 'decimal' }} {...register(`variants.${index}.price`)} error={!!errors.variants?.[index]?.price} helperText={errors.variants?.[index]?.price?.message} disabled={!canWrite} sx={{ width: { xs: '100%', md: 'auto' }, minWidth: 'min(100%, 12em)', maxWidth: '100%', flex: { xs: '0 1 auto', md: '1 1 12em' } }}/><FormControlLabel label="Đang bán" control={<Checkbox defaultChecked={field.active} {...register(`variants.${index}.active`)} disabled={!canWrite}/>}/><IconButton aria-label={`Xóa biến thể ${index + 1}`} disabled={!canWrite || fieldArray.fields.length === 1} onClick={() => fieldArray.remove(index)}><DeleteOutlineRounded /></IconButton></FieldGroup>)}</FormFields></Panel>
 <Panel title="Ảnh sản phẩm" subtitle="File được kiểm soát qua API upload; không nhúng secret hoặc URL tùy ý." bodyMode="inset" beforeGap={"section"}><FormFields ><Typography variant="body2">{imageIds.length} tệp được gắn với sản phẩm</Typography><Button component="label" variant="outlined" disabled={!canWrite || pending}>Chọn ảnh<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const input = e.currentTarget; const file = input.files?.[0] || null; const error = productImageFileError(file, __MOCK__ ? PRODUCT_IMAGE_MAX_BYTES : undefined); setImageError(error); if (error) { input.value = ''; return; } if (!file) return; const form = new FormData(); form.append('file', file); form.append('purpose', 'product_image'); try {
            const r = await upload.execute({ form });
            if (r.data.status === 'ready')
                setImageIds(ids => [...ids, r.data.id]);
            else
                alert('Tệp đang được cách ly/kiểm tra; chưa gắn vào sản phẩm.');
        }
        catch { /* visible error */ } input.value = ''; }}/></Button>{imageError && <Alert severity="error" role="alert">{imageError}</Alert>}{imageIds.map(fileId => <ActionGroup key={fileId} direction="row" ><Typography variant="caption">{fileId}</Typography><Button size="small" disabled={!canWrite} onClick={() => setImageIds(ids => ids.filter(x => x !== fileId))}>Bỏ liên kết ảnh</Button></ActionGroup>)}</FormFields></Panel>
 <ActionGroup direction="row" beforeGap="form" justifyContent={"space-between"} >{productId && product.data?.data.status !== 'archived' ? <MutationButton permission="catalog.write" color="error" onClick={() => setConfirm(true)}>Ngừng bán</MutationButton> : <span />}<MutationButton permission="catalog.write" type="submit" variant="contained" busy={pending}>Lưu sản phẩm</MutationButton></ActionGroup></Box>}
 <ConfirmDialog open={confirm} title="Ngừng bán sản phẩm" description="Giữ lại lịch sử đơn hàng; không xóa dữ liệu đã phát sinh." requireReason onClose={() => setConfirm(false)} busy={archive.pending} error={archive.error} onConfirm={async reason => {
        const current = product.data?.data;
        if (!productId || !current) return;
        await archive.execute({ path: { productId }, version: current.version, body: { expectedVersion: current.version, reason } });
    }}/></>;
}
export function CategoriesPage() {
    const list = useApi('listCategories', { query: useListQuery('listCategories') });
    const create = useCommand('createCategory', ['listCategories']);
    const update = useCommand('updateCategory', ['listCategories']);
    const archive = useCommand('archiveCategory', ['listCategories']);
    const [edit, setEdit] = useState<Category | null | undefined>();
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    const [remove, setRemove] = useState<Category | null>(null);
    const categoryDetail = useApi('getCategory', { path: { categoryId: edit?.id || '' } }, !!edit?.id);
    const waitingForDetail = Boolean(edit?.id && categoryDetail.data?.data.id !== edit.id);
    const detail = edit?.id && categoryDetail.data?.data.id === edit.id ? categoryDetail.data.data : edit;
    const categoryEditor = useVersionedDraft({
        identity: `${useScope().shop.id}:category:${edit?.id || 'new'}`,
        source: detail ? { version: detail.version, values: { name: detail.name, parentId: detail.parentId || '' } } : undefined,
        draft: { name, parentId }, apply: values => { setName(values.name); setParentId(values.parentId); },
        refresh: () => categoryDetail.refetch({ throwOnError: true }),
    });
    const open = (c: Category | null) => { setName(c?.name || ''); setParentId(c?.parentId || ''); setEdit(c); };
    return <><PageHeader title="Danh mục" subtitle="Sắp xếp sản phẩm, không thay đổi tồn kho." actions={<MutationButton permission="catalog.write" variant="contained" onClick={() => open(null)}>Thêm danh mục</MutationButton>}/><Panel><Toolbar operation="listCategories" /><QueryState query={list} pendingProfile="section">{list.data && <><DataTable rows={list.data.data} rowKey={c => c.id} columns={[
        { key: 'name', label: 'Tên danh mục', render: c => c.name }, { key: 'parent', label: 'Danh mục cha', render: c => list.data?.data.find(p => p.id === c.parentId)?.name || '—' }, { key: 'state', label: 'Trạng thái', render: c => <Status value={c.active ? 'active' : 'disabled'}/> },
        {
            key: 'action', label: '', render: c => <Stack direction="row"><MutationButton permission="catalog.write" onClick={() => open(c)}>Sửa</MutationButton><MutationButton permission="catalog.write" color="error" onClick={() => setRemove(c)}>Ngừng dùng</MutationButton></Stack>
        }
    ]}/><Pager page={list.data.page}/></>}</QueryState></Panel>
 <EditDialog allowEditsWhileBusy open={edit !== undefined} title={edit ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setEdit(undefined)} busy={create.pending || update.pending || waitingForDetail} actions={<Button variant="contained" disabled={!name.trim() || create.pending || update.pending || waitingForDetail} onClick={async () => { try {
        const submitted = { name, parentId };
        const body = { name: name.trim(), parentId: parentId || null };
        let result: Awaited<ReturnType<typeof create.execute>>;
        if (edit) {
            const prepared = categoryEditor.prepare(); if (!prepared || !Object.keys(prepared.patch).length) return;
            result = await update.execute({ path: { categoryId: edit.id }, version: prepared.version, body: {
                ...(prepared.patch.name !== undefined ? { name: body.name } : {}),
                ...(prepared.patch.parentId !== undefined ? { parentId: body.parentId } : {}),
            } });
        } else result = await create.execute({ body });
        const clean = categoryEditor.committed({ version: result.data.version, values: { name: result.data.name, parentId: result.data.parentId || '' } }, submitted, `${result.data.shopId}:category:${result.data.id}`);
        setEdit(clean ? undefined : result.data);
    }
    catch (error) { categoryEditor.failed(error); } }}>Lưu</Button>}><ErrorNotice error={create.error || update.error}/><DraftConflict editor={categoryEditor} labels={{ name: 'Tên danh mục', parentId: 'Danh mục cha' }} busy={create.pending || update.pending}/>{edit?.id && waitingForDetail && <Alert severity={categoryDetail.error ? 'error' : 'info'} action={categoryDetail.error ? <Button size="small" onClick={() => void categoryDetail.refetch()}>Thử lại</Button> : undefined}>{categoryDetail.error ? 'Không tải được chi tiết danh mục; dữ liệu nhập vẫn được giữ. Hãy thử lại.' : 'Đang tải chi tiết danh mục trước khi cho phép chỉnh sửa.'}</Alert>}<FormFields ><TextField label="Tên" value={name} onChange={e => setName(e.target.value)} disabled={waitingForDetail}/><TextField label="Danh mục cha" select value={parentId} onChange={e => setParentId(e.target.value)} disabled={waitingForDetail}><MenuItem value="">Không có</MenuItem>{list.data?.data.filter(c => c.id !== edit?.id).map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}</TextField></FormFields></EditDialog>
 <ConfirmDialog open={!!remove} title="Ngừng dùng danh mục" description="Không xóa sản phẩm trong danh mục." requireReason onClose={() => setRemove(null)} error={archive.error} busy={archive.pending} onConfirm={reason => archive.execute({ path: { categoryId: remove?.id || '' }, version: remove?.version, body: { expectedVersion: remove?.version || 1, reason } })}/></>;
}

export { ImportsPage, ImportResultPage } from './imports';

function productSnapshot(product: Product) {
    const values: ProductFields & { imageFileIds: string[] } = {
        name: product.name, description: product.description, categoryId: product.categoryId || '', status: product.status === 'active' ? 'active' : 'draft',
        variants: product.variants.map(v => ({ id: v.id, sku: v.sku, name: v.name, options: v.options, price: v.price?.amount || '', active: v.active })), imageFileIds: product.imageFileIds,
    };
    return { version: product.version, values };
}

import { useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import type { KnowledgeTemplate, ProductKnowledgeTemplate, SalesScriptKnowledgeTemplate } from '@botsales/contracts';
import { useCommand, usePagedApi } from '@/shared/api/hooks';
import { useCan, useScope } from '@/shared/model/scope';
import { limitCodePoints } from '@/shared/model/format';
import { FormFields } from '@/shared/ui/composition';
import { ErrorNotice, LookupLoadMore, MutationButton, Panel, RouteLink } from '@/shared/ui/components';

const productLabels = {
    sourceOwner: 'Chủ nguồn nội dung', features: 'Điểm nổi bật có nguồn', sizeUse: 'Kích cỡ và cách sử dụng',
    warranty: 'Bảo hành / đổi trả', alternatives: 'Sản phẩm thay thế', forbiddenPromises: 'Điều không được cam kết',
} as const;
const scriptLabels = {
    industry: 'Ngành hàng', persona: 'Vai trò và giọng tư vấn',
    needs: 'Câu hỏi tìm hiểu nhu cầu', requiredFacts: 'Thông tin bắt buộc cần xác nhận',
    boundaries: 'Giới hạn và điều không được hứa', shippingPolicy: 'Chính sách giao hàng đã kiểm', returnPolicy: 'Chính sách đổi trả đã kiểm',
} as const;
const emptyProduct: ProductKnowledgeTemplate = {
    kind: 'product_content', productId: '', sourceOwner: '', features: '', sizeUse: '', warranty: '', alternatives: '', forbiddenPromises: '',
};
const emptyScript: SalesScriptKnowledgeTemplate = {
    kind: 'sales_script', industry: '', persona: '', needs: '', requiredFacts: '', boundaries: '', shippingPolicy: '', returnPolicy: '',
};

export function KnowledgeTemplateFields({ value, onChange }: {
    value: KnowledgeTemplate;
    onChange: (value: KnowledgeTemplate) => void;
}) {
    const { shop } = useScope();
    const canReadProducts = useCan('catalog.read');
    const products = usePagedApi('listProducts', { query: { status: 'active' } }, value.kind === 'product_content' && canReadProducts);
    if (value.kind === 'sales_script') return <FormFields>
        {(Object.keys(scriptLabels) as (keyof typeof scriptLabels)[]).map(key =>
            <TextField key={key} label={scriptLabels[key]} multiline={key !== 'industry'} value={value[key]}
                onChange={event => onChange({ ...value, [key]: limitCodePoints(event.target.value, key === 'industry' ? 80 : 1000) })} />)}
    </FormFields>;

    const productRows = products.data?.data ?? [];
    const imageIds = productRows.find(row => row.id === value.productId)?.imageFileIds ?? [];
    return <FormFields>
        <ErrorNotice error={products.error} />
        {canReadProducts ? <>
            <TextField select label="Sản phẩm nguồn" value={value.productId}
                onChange={event => onChange({ ...value, productId: event.target.value, imageFileId: undefined })}>
                <MenuItem value="">Chọn sản phẩm</MenuItem>
                {value.productId && !productRows.some(row => row.id === value.productId) && <MenuItem value={value.productId}>{value.productId}</MenuItem>}
                {productRows.map(row => <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>)}
            </TextField>
            <LookupLoadMore label="sản phẩm nguồn" loadedCount={products.loadedCount} hasMore={products.hasMore}
                busy={products.isLoadingMore} onLoadMore={products.loadMore} />
            {value.productId && <TextField select label="Ảnh nguồn" value={value.imageFileId ?? ''}
                onChange={event => onChange({ ...value, imageFileId: event.target.value || undefined })}>
                <MenuItem value="">Không chọn ảnh</MenuItem>
                {value.imageFileId && !imageIds.includes(value.imageFileId) &&
                    <MenuItem value={value.imageFileId}>Ảnh đã chọn ở phiên bản này</MenuItem>}
                {imageIds.map((id, index) => <MenuItem key={id} value={id}>Ảnh {index + 1} trong danh mục</MenuItem>)}
            </TextField>}
            {value.productId && <RouteLink to={`/s/${shop.id}/products/${encodeURIComponent(value.productId)}`}>Xem ảnh và thông tin sản phẩm nguồn</RouteLink>}
        </> : <Alert severity="info">Cần quyền đọc sản phẩm để chọn nguồn.</Alert>}
        {(Object.keys(productLabels) as (keyof typeof productLabels)[]).map(key =>
            <TextField key={key} label={productLabels[key]} multiline={key !== 'sourceOwner'} value={value[key]}
                onChange={event => onChange({ ...value, [key]: limitCodePoints(event.target.value, key === 'sourceOwner' ? 160 : 1000) })} />)}
    </FormFields>;
}

export function KnowledgeTemplatePanel({ kind }: { kind: KnowledgeTemplate['kind'] }) {
    const { shop } = useScope();
    const canWrite = useCan('knowledge.write');
    const [value, setValue] = useState<KnowledgeTemplate>(() => ({ ...(kind === 'product_content' ? emptyProduct : emptyScript) }));
    const [title, setTitle] = useState('');
    const [createdId, setCreatedId] = useState('');
    const create = useCommand('createKnowledge', ['listKnowledge']);
    const valid = Boolean(title.trim() && (value.kind === 'sales_script' || value.productId));
    if (!canWrite) return null;
    const save = async () => {
        try {
            const receipt = await create.execute({ body: { title: title.trim(), sourceKind: 'manual', fileId: null, content: null, template: value } });
            setCreatedId(receipt.data.id);
        } catch { /* Giữ biểu mẫu và lỗi từ API để người dùng kiểm lại. */ }
    };
    return <Panel title={kind === 'product_content' ? 'Hồ sơ nội dung sản phẩm' : 'Kịch bản tư vấn theo ngành'} bodyMode="inset">
        <FormFields>
            <ErrorNotice error={create.error} />
            {createdId ? <Alert severity="success">
                Đã lưu nháp. <RouteLink to={`/s/${shop.id}/knowledge/${createdId}`}>Mở phiên bản để gửi duyệt</RouteLink>
            </Alert> : <>
                <TextField label="Tiêu đề bản nháp" value={title} onChange={event => setTitle(limitCodePoints(event.target.value, 180))} />
                <KnowledgeTemplateFields value={value} onChange={setValue} />
                <MutationButton permission="knowledge.write" variant="contained" busy={create.pending} disabled={!valid || create.unresolved} onClick={() => void save()}>Lưu nháp kiến thức</MutationButton>
            </>}
        </FormFields>
    </Panel>;
}

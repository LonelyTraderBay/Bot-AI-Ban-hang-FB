import { all, find, insert, ensure, job, str, num, rows, record, id, now, future, money, sum, units, strings } from './database';
import type { Input, Row } from './database';
import { catalog } from './catalog';
import statementFormats from '../../../../packages/contracts/src/statement-formats.json';
import { activeAccount } from './masters';
import { journalReports, postedJournals } from './accounting';
import { assertSchema } from '../shared/api/validation';
import { limitCodePoints } from '../shared/model/format';
const uploads = new Map<string, {
    text: string;
    file: File;
    purpose: string;
    resourceId: string | null;
}>();
const importRows = new Map<string, {
    products: Row[];
    token: string;
    snapshot: string;
    strategy: string;
}>();
const exportUrls = new Set<string>();
const mediaReadUrls = new Set<string>();
const statementPreviews=new Map<string,{shopId:string;fileId:string;accountOrCarrierId:string;sourceBatchId:string;formatId:string;kind:string;expiresAt:string}>();
export function clearFileState() {
    uploads.clear();
    importRows.clear();
    statementPreviews.clear();
    for (const url of exportUrls)
        URL.revokeObjectURL(url);
    exportUrls.clear();
    for (const url of mediaReadUrls)
        URL.revokeObjectURL(url);
    mediaReadUrls.clear();
}
export function parseCSV(text: string): string[][] {
    const result: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quote = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quote && text[i + 1] === '"') {
                field += '"';
                i++;
            }
            else if (quote || field === '')
                quote = !quote;
            else
                throw new Error('Dấu nháy trong CSV không hợp lệ.');
        }
        else if (c === ',' && !quote) {
            row.push(field);
            field = '';
        }
        else if ((c === '\n' || c === '\r') && !quote) {
            if (c === '\r' && text[i + 1] === '\n')
                i++;
            row.push(field);
            if (row.some(Boolean))
                result.push(row);
            row = [];
            field = '';
        }
        else
            field += c;
    }
    ensure(!quote, 'CSV thiếu dấu nháy đóng.', 422);
    row.push(field);
    if (row.some(Boolean))
        result.push(row);
    return result;
}
async function mediaSignatureMatches(file: File): Promise<boolean> {
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const ascii = (start: number, value: string) => value.split('').every((character, index) => bytes[start + index] === character.charCodeAt(0));
    switch (file.type) {
        case 'image/png': return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
        case 'image/jpeg': return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        case 'image/webp': return bytes.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP');
        case 'audio/mpeg': return bytes.length >= 3 && (ascii(0, 'ID3') || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0));
        case 'audio/mp4': return bytes.length >= 8 && ascii(4, 'ftyp');
        case 'audio/ogg': return bytes.length >= 4 && ascii(0, 'OggS');
        case 'audio/webm': return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
        case 'application/pdf': return bytes.length >= 5 && ascii(0, '%PDF-');
        case 'text/plain': {
            try {
                const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
                return !text.includes('\0');
            }
            catch { return false; }
        }
        default: return false;
    }
}
export async function upload(input: Input, form: FormData) {
    const value = form.get('file');
    ensure(value instanceof File, 'Thiếu file upload.', 422);
    const purpose = form.get('purpose');
    ensure(typeof purpose === 'string' && ['product_image', 'product_import', 'knowledge_source', 'bank_statement', 'cod_statement', 'conversation_media'].includes(purpose), 'Cần chỉ định mục đích tải tệp hợp lệ.', 422);
    const resourceId=typeof form.get('resourceId')==='string'?String(form.get('resourceId')):null;
    let mediaPolicy: Row | undefined;
    if (purpose === 'conversation_media') {
        ensure(resourceId, 'Tải media cần mã hội thoại.', 422, 'CONVERSATION_SCOPE_REQUIRED');
        const conversation = find('conversations', resourceId, input.shopId);
        const channel = find('channels', str(conversation.channelId), input.shopId);
        mediaPolicy = record(channel.mediaPolicy);
        const allowedTypes = strings(mediaPolicy.allowedMimeTypes);
        ensure(channel.status === 'connected' && allowedTypes.length > 0, 'Kênh chưa công bố chính sách media được hỗ trợ.', 422, 'MEDIA_CAPABILITY_UNAVAILABLE');
        ensure(value.type && allowedTypes.includes(value.type), 'Loại tệp này không được kênh hỗ trợ.', 415, 'MEDIA_TYPE_UNSUPPORTED');
        ensure(value.size > 0 && value.size <= num(mediaPolicy.maxFileSizeBytes), 'Tệp vượt kích thước tối đa của kênh.', 413, 'MEDIA_SIZE_EXCEEDED');
    }
    else ensure(value.size <= 5 * 1024 * 1024, 'Tối đa 5 MB trong frontend mẫu.', 413);
    const isCsv = value.name.toLowerCase().endsWith('.csv') && ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream', ''].includes(value.type);
    const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(value.type);
    const isKnowledgeFile = ['application/pdf', 'text/plain'].includes(value.type) || isCsv;
    const purposeTypeAllowed = purpose === 'product_image' ? isImage
        : purpose === 'knowledge_source' ? isKnowledgeFile
            : purpose === 'conversation_media' ? Boolean(mediaPolicy && strings(mediaPolicy.allowedMimeTypes).includes(value.type))
                : isCsv;
    ensure(purposeTypeAllowed, 'Định dạng không phù hợp với mục đích tải tệp.', 415);
    if (purpose === 'conversation_media') ensure(await mediaSignatureMatches(value), 'Nội dung tệp không khớp MIME đã khai báo.', 415, 'MEDIA_CONTENT_TYPE_MISMATCH');
    if(purpose==='bank_statement'&&resourceId)activeAccount(input.shopId,resourceId);
    // A `ready` result here is the local synthetic scan-pass fixture, not antivirus evidence.
    const row = insert('files', 'FileObject', input.shopId, { name: value.name, mimeType: value.type || 'text/csv', sizeBytes: value.size, status: 'ready', readUrl: null,purpose,resourceId });
    uploads.set(str(row.id), { text: value.name.toLowerCase().endsWith('.csv') || value.type.startsWith('text/') ? await value.text() : '', file: value,purpose,resourceId });
    return row;
}

export function resolveConversationAttachments(input: Input, conversation: Row, fileIds: string[]): Row[] {
    if (fileIds.length === 0) return [];
    ensure(new Set(fileIds).size === fileIds.length, 'Không thể gửi lặp cùng một tệp.', 422, 'DUPLICATE_ATTACHMENT');
    const channel = find('channels', str(conversation.channelId), input.shopId);
    const policy = record(channel.mediaPolicy);
    const allowedTypes = strings(policy.allowedMimeTypes);
    const maxCount = num(policy.maxAttachmentCount);
    ensure(channel.status === 'connected' && allowedTypes.length > 0 && maxCount > 0, 'Kênh không hỗ trợ tệp đính kèm.', 422, 'MEDIA_CAPABILITY_UNAVAILABLE');
    ensure(fileIds.length <= maxCount, 'Số tệp vượt giới hạn của kênh.', 422, 'MEDIA_COUNT_EXCEEDED');
    return fileIds.map(fileId => {
        const file = find('files', fileId, input.shopId);
        const upload = uploads.get(fileId);
        ensure(file.status === 'ready' && upload, 'Tệp chưa qua kiểm tra hoặc không còn sẵn sàng.', 422, 'FILE_NOT_READY');
        ensure(file.purpose === 'conversation_media' && upload.purpose === 'conversation_media', 'Tệp không được tải lên cho hội thoại.', 422, 'FILE_PURPOSE_MISMATCH');
        ensure(file.resourceId === conversation.id && upload.resourceId === conversation.id, 'Tệp thuộc hội thoại khác.', 403, 'FILE_SCOPE_MISMATCH');
        ensure(allowedTypes.includes(str(file.mimeType)) && upload.file.type === file.mimeType, 'Tệp không còn phù hợp chính sách kênh.', 415, 'MEDIA_TYPE_UNSUPPORTED');
        ensure(num(file.sizeBytes) > 0 && num(file.sizeBytes) <= num(policy.maxFileSizeBytes) && upload.file.size === num(file.sizeBytes), 'Tệp vượt kích thước tối đa của kênh.', 413, 'MEDIA_SIZE_EXCEEDED');
        return { fileId: str(file.id), name: str(file.name), mimeType: str(file.mimeType), sizeBytes: num(file.sizeBytes) };
    });
}
function csvCell(value: unknown) { const v = typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''); return `"${(/^[\s]*[=+\-@\t\r]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`; }
function localDate(value: string, timezone: string) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
type CsvRow = Record<string, unknown>;
function exportRows(input: Input, type: string): { fields: string[]; rows: CsvRow[] } {
    const { shopId, body } = input;
    const from = str(body.from), to = str(body.to), timezone = str(body.timezone);
    const start = Date.parse(from), end = Date.parse(to);
    ensure(Number.isFinite(start) && Number.isFinite(end) && start <= end, 'Khoảng thời gian export không hợp lệ.', 422, 'INVALID_REPORT_RANGE');
    // Validate the IANA zone before creating a job or a download URL.
    try { localDate(from, timezone); }
    catch { ensure(false, 'Múi giờ IANA của báo cáo không hợp lệ.', 422, 'INVALID_REPORT_TIMEZONE'); }
    const fromDate = localDate(from, timezone), toDate = localDate(to, timezone);
    const withinRange = (value: unknown) => {
        if (typeof value !== 'string') return false;
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) && timestamp >= start && timestamp <= end;
    };
    const inSnapshot = (value: unknown) => {
        if (typeof value !== 'string') return false;
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) && timestamp <= end;
    };
    if (type === 'inventory') {
        const includeCost = input.permissions?.includes('finance.read') === true;
        const rows = all('stock', shopId).filter(row => inSnapshot(row.asOf)).map(row => ({
            sku: row.sku, variantId: row.variantId, warehouseId: row.warehouseId,
            onHand: row.onHand, reserved: row.reserved, available: row.available,
            ...(includeCost ? { unitCostAmount: record(row.unitCost).amount, unitCostCurrency: record(row.unitCost).currency } : {}),
            asOf: row.asOf,
        }));
        return { fields: ['sku', 'variantId', 'warehouseId', 'onHand', 'reserved', 'available', ...(includeCost ? ['unitCostAmount', 'unitCostCurrency'] : []), 'asOf'], rows };
    }
    if (type === 'orders') {
        const rows = all('orders', shopId).filter(row => withinRange(row.createdAt)).map(row => ({
            orderId: row.id, createdAt: row.createdAt, orderState: row.orderState,
            fulfillmentState: row.fulfillmentState, paymentState: row.paymentState,
            totalAmount: record(row.total).amount, currency: record(row.total).currency,
        }));
        return { fields: ['orderId', 'createdAt', 'orderState', 'fulfillmentState', 'paymentState', 'totalAmount', 'currency'], rows };
    }
    if (type === 'cashflow') {
        const report=journalReports(shopId,{from,to,timezone,start,end},'cashflow');
        return {fields:['from','to','timezone','asOf','policyVersion','completeness','receipts','disbursements','netCashMovement','warnings','sourceJournalIds'],rows:[report]};
    }
    if (type === 'profit_loss') {
        const data=postedJournals(shopId).filter(row=>str(row.effectiveDate)>=fromDate&&str(row.effectiveDate)<toDate).flatMap(row=>rowsFromJournal(row));
        return {fields:['effectiveDate','status','sourceType','sourceId','journalId','accountId','debitAmount','debitCurrency','creditAmount','creditCurrency'],rows:data};
    }
    ensure(false, 'Không hỗ trợ loại báo cáo.', 422, 'UNSUPPORTED_REPORT');
}
function rowsFromJournal(journal: Row) {
    return rows(journal.lines).map(line => ({
        effectiveDate: journal.effectiveDate, status: journal.status, sourceType: journal.sourceType,sourceId:journal.sourceId,journalId:journal.id,
        accountId: line.accountId, debitAmount: record(line.debit).amount, debitCurrency: record(line.debit).currency,
        creditAmount: record(line.credit).amount, creditCurrency: record(line.credit).currency,
    }));
}
function statementResources(shopId:string,kind:string) {
    if(kind==='bank')return all('accounts',shopId).filter(a=>a.status==='active'&&str(a.code).startsWith('112')).map(a=>({id:a.id,label:limitCodePoints(`${a.code} · ${a.name}`,160)}));
    const ids=new Set([...all('shipments',shopId).map(s=>str(s.carrierId)),...all('debts',shopId).filter(d=>d.counterpartyType==='carrier').map(d=>str(d.counterpartyId)),...all('codSettlements',shopId).map(c=>str(c.carrierId))].filter(Boolean));
    return [...ids].map(id=>({id,label:limitCodePoints(`Đơn vị ${id}`,160)}));
}
function statementRows(input:Input,kind:string) {
    const {shopId,body}=input,file=find('files',str(body.fileId),shopId),uploaded=uploads.get(str(body.fileId));
    ensure(file.status==='ready'&&uploaded,'Tệp chưa sẵn sàng hoặc không còn trong phiên.',422,'FILE_NOT_READY');
    ensure(uploaded.purpose===(kind==='bank'?'bank_statement':'cod_statement'),'Mục đích tệp không phù hợp bảng đối soát.',422,'FILE_PURPOSE_MISMATCH');
    ensure(!uploaded.resourceId||uploaded.resourceId===body.accountOrCarrierId,'Tệp không thuộc tài khoản/đơn vị đã chọn.',422,'FILE_SCOPE_MISMATCH');
    const format=statementFormats.formats.find(f=>f.kind===kind&&f.formatId===body.formatId);ensure(format,'Chọn định dạng CSV do API trả về.',422,'FORMAT_UNSUPPORTED');
    ensure(statementResources(shopId,kind).some(r=>r.id===body.accountOrCarrierId),'Tài khoản/đơn vị không thuộc nguồn đang sử dụng trong cửa hàng.',422,'STATEMENT_RESOURCE_MISMATCH');
    const csv=parseCSV(uploaded.text),header=csv[0];ensure(header&&new Set(header).size===header.length&&format.requiredColumns.every(c=>header.includes(c)),'CSV thiếu cột bắt buộc hoặc lặp tên cột.',422,'CSV_HEADER_INVALID');
    ensure(csv.length>1&&csv.length<=format.maxRows+1,'CSV cần 1–1000 dòng.',422,'CSV_SIZE_INVALID');
    const seenRows=new Set<string>(),currency=str(find('shops',shopId,shopId).currency);
    return csv.slice(1).map((row,index)=>{
        const values:Record<string,string>=Object.fromEntries(header.map((key,i)=>[key,row[i]||''])),errors:string[]=[];
        try {
            ensure(row.length===header.length,'Số cột trong dòng không khớp tiêu đề.',422);
            if(kind==='bank') {
                ensure(values.externalTransactionId&&/^\d+(\.\d{1,4})?$/.test(values.amount||'')&&units({amount:values.amount,currency})>0n&&['credit','debit'].includes(values.direction||''),'Mã giao dịch, số tiền dương hoặc chiều tiền không hợp lệ.',422);
                assertSchema('DateTime',values.occurredAt);
                ensure(!values.currency||values.currency===currency,'Chỉ dùng đồng tiền cơ sở của cửa hàng.',422,'CURRENCY_POLICY_REQUIRED');
                const key=values.externalTransactionId||'';ensure(!seenRows.has(key)&&!all('bankTransactions',shopId).some(t=>t.accountId===body.accountOrCarrierId&&t.externalTransactionId===key),'Mã giao dịch đã có hoặc lặp trong tệp.',422,'DUPLICATE_SOURCE');seenRows.add(key);
            }else {
                const orderIds=(values.orderIds||'').split(';').filter(Boolean);ensure(values.externalBatchId&&orderIds.length&&new Set(orderIds).size===orderIds.length,'Thiếu đợt/đơn COD hoặc lặp đơn.',422);
                ensure(!seenRows.has(values.externalBatchId||'')&&!all('codSettlements',shopId).some(c=>c.carrierId===body.accountOrCarrierId&&(c.externalBatchId===values.externalBatchId||orderIds.some(id=>Array.isArray(c.orderIds)&&c.orderIds.includes(id)))),'Đợt hoặc đơn COD đã nhập.',422,'DUPLICATE_SOURCE');
                for(const orderId of orderIds) {const order=find('orders',orderId,shopId),shipment=all('shipments',shopId).find(s=>s.orderId===orderId);ensure(order.paymentMethod==='cod'&&['delivered','part_returned','returned'].includes(str(order.fulfillmentState))&&record(order.total).currency===currency,'Chỉ nhập đơn COD đã giao đúng tiền cơ sở.',422);ensure((shipment?.carrierId||'manual-carrier')===body.accountOrCarrierId,'Đơn COD không thuộc đơn vị này.',422,'CARRIER_MISMATCH');}
                seenRows.add(values.externalBatchId||'');for(const orderId of orderIds){ensure(!seenRows.has('order:'+orderId),'Đơn COD lặp trong tệp.',422,'DUPLICATE_SOURCE');seenRows.add('order:'+orderId);}
            }
        }catch(error){errors.push(error instanceof Error?error.message:'Dòng không hợp lệ.');}
        return {row:index+2,values,errors};
    });
}
export function files(op: string, input: Input): Row | Row[] | undefined {
    const { shopId, body } = input;
    if (op === 'getFile') {
        const fileId = str(input.path.fileId);
        const file = find('files', fileId, shopId);
        const stored = uploads.get(fileId);
        if (file.purpose === 'conversation_media') {
            ensure(file.resourceId, 'Tệp media thiếu phạm vi hội thoại.', 403, 'FILE_SCOPE_MISMATCH');
            find('conversations', str(file.resourceId), shopId);
        }
        let readUrl: string | null = null;
        if (file.status === 'ready' && stored) {
            readUrl = URL.createObjectURL(stored.file);
            mediaReadUrls.add(readUrl);
        }
        return { ...file, readUrl };
    }
    if(op==='listStatementFormats')return statementFormats.formats.map(format=>({...format,resourceOptions:statementResources(shopId,format.kind)}));
    if(op==='previewStatementImport') {
        const file=find('files',str(body.fileId),shopId),kind=file.purpose==='bank_statement'?'bank':'cod',data=statementRows(input,kind),validationToken=id('statement-preview'),expiresAt=future();
        statementPreviews.set(validationToken,{shopId,fileId:str(body.fileId),accountOrCarrierId:str(body.accountOrCarrierId),sourceBatchId:str(body.sourceBatchId),formatId:str(body.formatId),kind,expiresAt});
        return {...body,kind,rows:data,validRows:data.filter(r=>!r.errors.length).length,invalidRows:data.filter(r=>r.errors.length).length,validationToken,expiresAt};
    }
    if (op === 'createProductImport') {
        const uploaded = uploads.get(str(body.fileId));
        find('files', str(body.fileId), shopId);
        ensure(uploaded, 'File không còn trong phiên. Hãy tải lại.', 422);
        const csv = parseCSV(uploaded.text);
        ensure(csv.length > 1 && csv.length <= 1001, 'CSV cần 1–1000 dòng dữ liệu.', 422);
        const header = csv[0];
        ensure(header, 'CSV thiếu dòng tiêu đề.', 422, 'INVALID_CSV');
        const mapped = rows(body.mapping);
        const rowErrors: Row[] = [];
        const products: Row[] = [];
        const skus = new Set<string>();
        csv.slice(1).forEach((r, index) => {
            const values: Record<string, string> = {};
            mapped.forEach(m => values[str(m.targetField)] = r[header.indexOf(str(m.sourceColumn))] || '');
            if (!values.sku || !values.name || !/^\d+(\.\d{1,4})?$/.test(values.price || '')) {
                rowErrors.push({ row: index + 2, field: 'sku/name/price', code: 'INVALID_ROW', message: 'Thiếu SKU/tên hoặc giá không hợp lệ.' });
                return;
            }
            if (skus.has(values.sku.toLowerCase())) {
                rowErrors.push({ row: index + 2, field: 'sku', code: 'DUPLICATE', message: 'Trùng SKU trong file.' });
                return;
            }
            skus.add(values.sku.toLowerCase());
            const existing = all('products', shopId).find(p => rows(p.variants).some(v => v.sku === values.sku));
            if (existing && body.duplicateStrategy === 'reject') {
                rowErrors.push({ row: index + 2, field: 'sku', code: 'EXISTS', message: 'SKU đã có trong cửa hàng.' });
                return;
            }
            products.push({
                name: values.name, description: values.description || '', categoryId: null, status: 'active', imageFileIds: [], variants: [{
                        sku: values.sku, name: values.variantName || 'Mặc định', options: {}, price: { amount: values.price, currency: values.currency || 'VND' }, active: true
                    }], existingId: existing?.id ?? null
            });
        });
        const token = id('validated');
        const result = job(shopId, 'import', {
            status: 'awaiting_confirmation', completed: csv.length - 1, total: csv.length - 1, errorCount: rowErrors.length, rowErrors, validationToken: token
        });
        importRows.set(str(result.id), { products, token, snapshot: JSON.stringify(all('products', shopId)), strategy: str(body.duplicateStrategy) });
        return result;
    }
    if (op === 'commitProductImport') {
        const j = find('jobs', input.id, shopId);
        const pending = importRows.get(input.id);
        ensure(pending && j.status === 'awaiting_confirmation' && pending.token === body.validationToken, 'Bản kiểm tra đã dùng hoặc không tồn tại.');
        ensure(pending.snapshot === JSON.stringify(all('products', shopId)), 'Danh mục đã đổi sau dry-run. Kiểm tra lại file.', 412, 'STALE_IMPORT');
        for (const p of pending.products) {
            const { existingId, ...data } = p;
            if (existingId) {
                const existing = find('products', str(existingId), shopId);
                const imported = rows(data.variants)[0];
                ensure(imported, 'Dòng nhập không có biến thể.', 422, 'INVALID_ROW');
                const matched = rows(existing.variants).find(v => v.sku === imported.sku);
                ensure(matched, 'SKU không còn tồn tại.', 412);
                data.variants = rows(existing.variants).map(v => v.id === matched.id ? { ...v, ...imported, id: v.id } : v);
                catalog('updateProduct', { ...input, id: str(existingId), version: num(existing.version), body: data });
            }
            else
                catalog('createProduct', { ...input, body: data });
        }
        j.status = num(j.errorCount) > 0 ? 'partial' : 'succeeded';
        j.completed = pending.products.length;
        j.validationToken = null;
        j.updatedAt = now();
        importRows.delete(input.id);
        return j;
    }
    if (op === 'importBankStatement' || op === 'importCODStatement') {
        const kind=op==='importBankStatement'?'bank':'cod';
        if(body.validationToken) {
            const preview=statementPreviews.get(str(body.validationToken));
            ensure(preview&&preview.shopId===shopId&&preview.kind===kind&&preview.fileId===body.fileId&&preview.accountOrCarrierId===body.accountOrCarrierId&&preview.sourceBatchId===body.sourceBatchId&&preview.formatId===body.formatId,'Preview không thuộc đúng tệp/tài khoản/đợt hoặc đã dùng.',409,'PREVIEW_MISMATCH');
            ensure(Date.parse(preview.expiresAt)>Date.parse(now()),'Preview đã hết hạn; xem lại trước khi nhập.',409,'PREVIEW_EXPIRED');
        }
        const previewRows=statementRows(input,kind),errors:Row[]=[];let completed=0;
        const currency=str(find('shops',shopId,shopId).currency);
        for(const line of previewRows) {
            if(line.errors.length){errors.push({row:line.row,field:'transaction',code:'INVALID_ROW',message:line.errors.join('; ')});continue;}
            const values=line.values;
            if(kind==='bank') {
                const tx=insert('bankTransactions','BankTransaction',shopId,{accountId:body.accountOrCarrierId,externalTransactionId:values.externalTransactionId,amount:{amount:values.amount,currency},direction:values.direction,occurredAt:values.occurredAt,referenceText:values.referenceText||'',matchState:'unmatched'});
                insert('reconciliations','ReconciliationCase',shopId,{transactionId:tx.id,state:'unmatched',suggestedResourceIds:[],difference:tx.amount,reason:'Chưa đối soát; không tự xác nhận tiền.'});
            }else {
                const orderIds=(values.orderIds||'').split(';').filter(Boolean),orders=orderIds.map(orderId=>find('orders',orderId,shopId)),gross=sum(orders,'total');
                insert('codSettlements','CODSettlement',shopId,{carrierId:body.accountOrCarrierId,externalBatchId:values.externalBatchId,orderIds,grossDue:money(gross,currency),actualFees:money(0n,currency),bankReceived:money(0n,currency),difference:money(gross,currency),status:'pending',bankTransactionId:null});
            }completed++;
        }
        if(body.validationToken)statementPreviews.delete(str(body.validationToken));
        return job(shopId,'import',{status:errors.length?(completed?'partial':'failed'):'succeeded',total:previewRows.length,completed,errorCount:errors.length,rowErrors:errors});
    }
    if (op === 'createExport') {
        ensure(['inventory', 'orders', 'cashflow', 'profit_loss'].includes(str(body.reportType)), 'Không hỗ trợ loại báo cáo.', 422, 'UNSUPPORTED_REPORT');
        const { fields, rows: data } = exportRows(input, str(body.reportType));
        const text = '\uFEFF' + [fields.map(csvCell).join(','), ...data.map(row => fields.map(key => csvCell(row[key])).join(','))].join('\r\n');
        const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
        exportUrls.add(url);
        return job(shopId, 'export', { total: data.length, completed: data.length, downloadUrl: url });
    }
    return undefined;
}

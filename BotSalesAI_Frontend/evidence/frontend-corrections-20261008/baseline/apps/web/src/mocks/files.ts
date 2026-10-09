import { all, find, insert, ensure, job, str, num, rows, record, id, now, money, sum } from './database';
import type { Input, Row } from './database';
import { catalog } from './catalog';
const uploads = new Map<string, {
    text: string;
    file: File;
}>();
const importRows = new Map<string, {
    products: Row[];
    token: string;
    snapshot: string;
    strategy: string;
}>();
const exportUrls = new Set<string>();
export function clearFileState() {
    uploads.clear();
    importRows.clear();
    for (const url of exportUrls)
        URL.revokeObjectURL(url);
    exportUrls.clear();
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
export async function upload(input: Input, form: FormData) {
    const value = form.get('file');
    ensure(value instanceof File, 'Thiếu file upload.', 422);
    const purpose = form.get('purpose');
    // Bank/COD purposes are simulator-only adapters; the canonical API contract currently has no such upload purposes.
    ensure(typeof purpose === 'string' && ['product_image', 'product_import', 'knowledge_source', 'bank_statement', 'cod_statement'].includes(purpose), 'Cần chỉ định mục đích tải tệp hợp lệ.', 422);
    ensure(value.size <= 5 * 1024 * 1024, 'Tối đa 5 MB trong frontend mẫu.', 413);
    const isCsv = value.name.toLowerCase().endsWith('.csv') && ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream', ''].includes(value.type);
    const isImage = ['image/png', 'image/jpeg', 'image/webp'].includes(value.type);
    const isKnowledgeFile = ['application/pdf', 'text/plain'].includes(value.type) || isCsv;
    const purposeTypeAllowed = purpose === 'product_image' ? isImage
        : purpose === 'knowledge_source' ? isKnowledgeFile
            : isCsv;
    ensure(purposeTypeAllowed, 'Định dạng không phù hợp với mục đích tải tệp.', 415);
    const row = insert('files', 'FileObject', input.shopId, { name: value.name, mimeType: value.type || 'text/csv', sizeBytes: value.size, status: 'ready', readUrl: null });
    uploads.set(str(row.id), { text: value.name.toLowerCase().endsWith('.csv') || value.type.startsWith('text/') ? await value.text() : '', file: value });
    return row;
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
        const rows = all('financeEntries', shopId).filter(row => withinRange(row.occurredAt)).map(row => ({
            entryId: row.id, occurredAt: row.occurredAt, kind: row.kind, classification: row.classification,
            status: row.status, amount: record(row.amount).amount, currency: record(row.amount).currency,
        }));
        return { fields: ['entryId', 'occurredAt', 'kind', 'classification', 'status', 'amount', 'currency'], rows };
    }
    if (type === 'profit_loss') {
        const rows = all('journals', shopId).filter(row => typeof row.effectiveDate === 'string' && row.effectiveDate >= fromDate && row.effectiveDate <= toDate)
            .flatMap(row => rowsFromJournal(row));
        return { fields: ['effectiveDate', 'status', 'sourceType', 'accountId', 'debitAmount', 'debitCurrency', 'creditAmount', 'creditCurrency'], rows };
    }
    ensure(false, 'Không hỗ trợ loại báo cáo.', 422, 'UNSUPPORTED_REPORT');
}
function rowsFromJournal(journal: Row) {
    return rows(journal.lines).map(line => ({
        effectiveDate: journal.effectiveDate, status: journal.status, sourceType: journal.sourceType,
        accountId: line.accountId, debitAmount: record(line.debit).amount, debitCurrency: record(line.debit).currency,
        creditAmount: record(line.credit).amount, creditCurrency: record(line.credit).currency,
    }));
}
export function files(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
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
        find('files', str(body.fileId), shopId);
        const uploaded = uploads.get(str(body.fileId));
        ensure(uploaded, 'Tệp không còn trong phiên.', 422);
        ensure(body.formatId === 'botsales-csv-v1', 'Định dạng chưa có trong bộ mô phỏng.', 422);
        const csv = parseCSV(uploaded.text);
        ensure(csv.length > 1 && csv.length <= 1001, 'CSV cần 1–1000 dòng.', 422);
        const header = csv[0];
        ensure(header, 'CSV thiếu dòng tiêu đề.', 422, 'INVALID_CSV');
        const errors: Row[] = [];
        let completed = 0;
        for (let i = 1; i < csv.length; i++) {
            const row = csv[i];
            ensure(row, 'CSV thiếu dòng dữ liệu.', 422, 'INVALID_CSV');
            const values: Record<string, string> = Object.fromEntries(header.map((h, j) => [h, row[j] || '']));
            try {
                if (op === 'importBankStatement') {
                    const externalTransactionId = values.externalTransactionId || '';
                    const amount = values.amount || '';
                    const direction = values.direction || '';
                    const occurredAt = values.occurredAt || '';
                    ensure(externalTransactionId && /^\d+(\.\d{1,4})?$/.test(amount) && ['credit', 'debit'].includes(direction) && !Number.isNaN(Date.parse(occurredAt)), 'Thiếu hoặc sai dữ liệu giao dịch.', 422);
                    ensure(str(body.accountOrCarrierId).trim(), 'Cần chọn mã tài khoản ngân hàng.', 422);
                    ensure(!all('bankTransactions', shopId).some(t => t.accountId === body.accountOrCarrierId && t.externalTransactionId === externalTransactionId), 'Mã giao dịch đã nhập.', 422);
                    const shopCurrency = str(find('shops', shopId, shopId).currency);
                    const currency = values.currency || shopCurrency;
                    ensure(currency === shopCurrency, 'Bộ mô phỏng chỉ hỗ trợ tiền cơ sở của cửa hàng; chưa có chính sách quy đổi ngoại tệ.', 422, 'CURRENCY_POLICY_REQUIRED');
                    const tx = insert('bankTransactions', 'BankTransaction', shopId, {
                        accountId: body.accountOrCarrierId, externalTransactionId, amount: { amount, currency }, direction, occurredAt, referenceText: values.referenceText || '', matchState: 'unmatched'
                    });
                    insert('reconciliations', 'ReconciliationCase', shopId, {
                        transactionId: tx.id, state: 'unmatched', suggestedResourceIds: [], difference: tx.amount, reason: 'Chưa đối soát; không tự xác nhận tiền.'
                    });
                }
                else {
                    const orderIds = (values.orderIds || '').split(';').filter(Boolean);
                    const externalBatchId = values.externalBatchId || '';
                    ensure(orderIds.length > 0 && externalBatchId, 'Thiếu mã đợt/đơn hàng.', 422);
                    ensure(str(body.accountOrCarrierId).trim(), 'Cần chọn mã đơn vị vận chuyển.', 422);
                    const orders = orderIds.map(orderId => find('orders', orderId, shopId));
                    const shopCurrency = str(find('shops', shopId, shopId).currency);
                    ensure(orders.every(o => o.paymentMethod === 'cod' && ['delivered', 'part_returned', 'returned'].includes(str(o.fulfillmentState)) && record(o.total).currency === shopCurrency), 'Chỉ đối soát đơn COD đã giao trong tiền cơ sở của shop.', 422);
                    ensure(!all('codSettlements', shopId).some(c => c.carrierId === body.accountOrCarrierId && (c.externalBatchId === values.externalBatchId || orderIds.some(orderId => Array.isArray(c.orderIds) && c.orderIds.includes(orderId)))), 'Đợt hoặc đơn COD đã được nhập.', 422);
                    const gross = sum(orders, 'total');
                    insert('codSettlements', 'CODSettlement', shopId, {
                        carrierId: body.accountOrCarrierId, externalBatchId, orderIds, grossDue: money(gross, shopCurrency), actualFees: money(0n, shopCurrency), bankReceived: money(0n, shopCurrency), difference: money(gross, shopCurrency), status: 'pending', bankTransactionId: null
                    });
                }
                completed++;
            }
            catch (e) {
                errors.push({ row: i + 1, field: 'transaction', code: 'INVALID_ROW', message: e instanceof Error ? e.message : 'Dòng không hợp lệ' });
            }
        }
        return job(shopId, 'import', {
            status: errors.length ? (completed ? 'partial' : 'failed') : 'succeeded', total: csv.length - 1, completed, errorCount: errors.length, rowErrors: errors
        });
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

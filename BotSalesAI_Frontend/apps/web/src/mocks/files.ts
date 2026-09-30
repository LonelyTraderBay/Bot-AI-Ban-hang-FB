import { all, find, insert, ensure, job, str, num, rows, id, now, money, sum, zero } from './database';
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
    ensure(value.size <= 5 * 1024 * 1024, 'Tối đa 5 MB trong frontend mẫu.', 413);
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'text/csv', 'text/plain', 'application/pdf'];
    ensure(allowed.includes(value.type) || value.name.toLowerCase().endsWith('.csv'), 'Định dạng không được hỗ trợ.', 415);
    const row = insert('files', 'FileObject', input.shopId, { name: value.name, mimeType: value.type || 'text/csv', sizeBytes: value.size, status: 'ready', readUrl: null });
    uploads.set(str(row.id), { text: value.name.toLowerCase().endsWith('.csv') || value.type.startsWith('text/') ? await value.text() : '', file: value });
    return row;
}
function csvCell(value: unknown) { const v = typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''); return `"${(/^[=+\-@\t\r]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`; }
export function files(op: string, input: Input): Row | undefined {
    const { shopId, body } = input;
    if (op === 'createProductImport') {
        const uploaded = uploads.get(str(body.fileId));
        find('files', str(body.fileId), shopId);
        ensure(uploaded, 'File không còn trong phiên. Hãy tải lại.', 422);
        const csv = parseCSV(uploaded.text);
        ensure(csv.length > 1 && csv.length <= 1001, 'CSV cần 1–1000 dòng dữ liệu.', 422);
        const header = csv[0];
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
        const errors: Row[] = [];
        let completed = 0;
        for (let i = 1; i < csv.length; i++) {
            const values = Object.fromEntries(header.map((h, j) => [h, csv[i][j] || '']));
            try {
                if (op === 'importBankStatement') {
                    ensure(values.externalTransactionId && /^\d+(\.\d{1,4})?$/.test(values.amount) && ['credit', 'debit'].includes(values.direction) && !Number.isNaN(Date.parse(values.occurredAt)), 'Thiếu hoặc sai dữ liệu giao dịch.', 422);
                    ensure(!all('bankTransactions', shopId).some(t => t.accountId === body.accountOrCarrierId && t.externalTransactionId === values.externalTransactionId), 'Mã giao dịch đã nhập.', 422);
                    const tx = insert('bankTransactions', 'BankTransaction', shopId, {
                        accountId: body.accountOrCarrierId, externalTransactionId: values.externalTransactionId, amount: { amount: values.amount, currency: values.currency || 'VND' }, direction: values.direction, occurredAt: values.occurredAt, referenceText: values.referenceText, matchState: 'unmatched'
                    });
                    insert('reconciliations', 'ReconciliationCase', shopId, {
                        transactionId: tx.id, state: 'unmatched', suggestedResourceIds: [], difference: tx.amount, reason: 'Chưa đối soát; không tự xác nhận tiền.'
                    });
                }
                else {
                    const orderIds = values.orderIds.split(';').filter(Boolean);
                    ensure(orderIds.length > 0 && values.externalBatchId, 'Thiếu mã đợt/đơn hàng.', 422);
                    const orders = orderIds.map(orderId => find('orders', orderId, shopId));
                    ensure(orders.every(o => o.paymentMethod === 'cod' && o.fulfillmentState === 'delivered'), 'Đơn không phải COD đã giao.', 422);
                    ensure(!all('codSettlements', shopId).some(c => c.carrierId === body.accountOrCarrierId && (c.externalBatchId === values.externalBatchId || orderIds.some(orderId => Array.isArray(c.orderIds) && c.orderIds.includes(orderId)))), 'Đợt hoặc đơn COD đã được nhập.', 422);
                    const gross = sum(orders, 'total');
                    insert('codSettlements', 'CODSettlement', shopId, {
                        carrierId: body.accountOrCarrierId, externalBatchId: values.externalBatchId, orderIds, grossDue: money(gross), actualFees: zero(), bankReceived: zero(), difference: money(gross), status: 'pending', bankTransactionId: null
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
        const collection = ({ inventory: 'stock', orders: 'orders', cashflow: 'financeEntries', profit_loss: 'journals' } as Record<string, string>)[str(body.reportType)];
        ensure(collection, 'Không hỗ trợ loại báo cáo.', 422);
        const data = all(collection, shopId);
        const fields = [...new Set(data.flatMap(row => Object.keys(row)))].filter(key => !['credential', 'endpoint', 'auth'].includes(key));
        const text = '\uFEFF' + [fields.map(csvCell).join(','), ...data.map(row => fields.map(key => csvCell(row[key])).join(','))].join('\r\n');
        const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
        return job(shopId, 'export', { total: data.length, completed: data.length, downloadUrl: url });
    }
    return undefined;
}

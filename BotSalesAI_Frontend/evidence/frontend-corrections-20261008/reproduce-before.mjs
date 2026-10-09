import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { startDemoServer } from '../../tests/session/demo-server.mjs';

// Diagnostic assertions below prove the observed defect, not correct product behavior.
const server = await startDemoServer({ cacheIsolationKey: 'code-review' });
const browser = await chromium.launch({ headless: true });
const results = [];
const selected = process.argv.slice(2);
async function run(id, route, body) {
  if (selected.length && !selected.includes(id)) return;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  try {
    await page.goto(server.url + route);
    await expect(page.locator('main')).toBeVisible();
    const observed = await body(page);
    results.push({ id, result: 'REPRODUCED', observed });
    await page.screenshot({ path: fileURLToPath(new URL(`${id}.png`, import.meta.url)), fullPage: true });
    console.log(id + ': REPRODUCED ' + JSON.stringify(observed));
  } catch (error) {
    results.push({ id, result: 'INCONCLUSIVE', error: String(error) });
    console.log(id + ': INCONCLUSIVE ' + String(error));
  } finally { await context.close(); }
}
async function mutate(page, path, body, method = 'POST', version) {
  return page.evaluate(async ({ path, body, method, version }) => {
    const response = await fetch('/api/v2/shops/shop-demo/' + path, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': crypto.randomUUID(), ...(version !== undefined ? { 'If-Match': `"${version}"` } : {}) },
      body: JSON.stringify(body),
    });
    return { status: response.status, payload: await response.json() };
  }, { path, body, method, version });
}
async function pulse(page) {
  const result = await mutate(page, 'customers', { displayName: 'Concurrent synthetic review event', phone: null, email: null, notes: '' });
  assert.equal(result.status, 201);
}
try {
  await run('R1-order-draft-guard', '/s/shop-demo/orders/new', async page => {
    await page.getByLabel('Ghi chú chuẩn bị').fill('Bản nháp cần giữ lại');
    const dirty = await page.evaluate(async () => (await import('/src/shared/model/dirty-drafts.ts')).hasUnsavedFormDraft());
    assert.equal(dirty, false);
    await page.getByRole('link', { name: 'Danh sách đơn', exact: true }).click();
    await expect(page).toHaveURL(/\/orders$/);
    assert.equal(await page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?' }).count(), 0);
    return { editedNotes: true, guardDetectedDirty: dirty, navigatedWithoutWarning: true };
  });
  await run('R2-customer-lost-update', '/s/shop-demo/customers/c1', async page => {
    const name = page.getByLabel('Tên khách hàng');
    const notes = page.getByLabel('Ghi chú (không bắt buộc)');
    await expect(name).toHaveValue('Linh (khách mẫu)');
    const oldNotes = await notes.inputValue();
    await name.fill('Local name being edited');
    const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data);
    const refetch = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/customers/c1'));
    const changed = await mutate(page, 'customers/c1', { notes: 'Saved concurrently by another editor' }, 'PATCH', current.version);
    assert.equal(changed.status, 200);
    await refetch;
    await expect(notes).toHaveValue(oldNotes);
    // The heading still identifies the server snapshot; allow the observer to commit it.
    await page.getByRole('heading', { name: 'Linh (khách mẫu)', exact: true }).waitFor();
    const submitted = page.waitForRequest(r => r.method() === 'PATCH' && new URL(r.url()).pathname.endsWith('/customers/c1'));
    const response = page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname.endsWith('/customers/c1'));
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    const request = await submitted;
    const saved = await response;
    assert.equal(request.headers()['if-match'], `"${current.version + 1}"`);
    assert.equal(saved.status(), 200);
    const stored = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data);
    assert.equal(stored.notes, oldNotes);
    return { baselineVersion: current.version, submittedVersion: request.headers()['if-match'], concurrentNotes: changed.payload.data.notes, overwrittenWith: stored.notes, httpStatus: saved.status() };
  });
  await run('R3-product-image-refetch', '/s/shop-demo/products/p1', async page => {
    await expect(page.getByLabel('Tên sản phẩm')).toHaveValue('Áo mẫu A');
    await expect(page.getByText('0 tệp được gắn với sản phẩm', { exact: true })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles({ name: 'review.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pWQAAAAASUVORK5CYII=', 'base64') });
    await expect(page.getByText('1 tệp được gắn với sản phẩm', { exact: true })).toBeVisible();
    const refetch = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/products/p1'));
    await pulse(page);
    await refetch;
    await expect(page.getByText('0 tệp được gắn với sản phẩm', { exact: true })).toBeVisible();
    return { beforeUpload: 0, afterUpload: 1, afterUnrelatedServerEvent: 0, productSaved: false };
  });
  await run('R4-policy-draft-refetch', '/s/shop-demo/notifications/devices', async page => {
    const minutes = page.getByLabel('Nhắc sau (phút), để trống nếu chưa chốt');
    await expect(minutes).toHaveValue('');
    await minutes.fill('17');
    const refetch = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/notification-policy'));
    await pulse(page);
    await refetch;
    await expect(minutes).toHaveValue('');
    return { localDraftMinutes: '17', afterUnrelatedServerEvent: await minutes.inputValue(), policySaved: false };
  });
  await run('R5-composer-inflight-edits', '/s/shop-demo/inbox/cv1', async page => {
    await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
    const text = page.getByLabel('Ghi chú cho nhóm');
    await text.fill('First submitted note');
    await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 1500));
    const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.includes('/notes'));
    await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
    await text.fill('Second note typed while the first is pending');
    await response;
    await expect(text).toHaveValue('');
    return { textEditableDuringRequest: true, nextDraftErasedOnFirstSuccess: true };
  });
  await run('R6-customer-note-limit', '/s/shop-demo/customers', async page => {
    await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm khách hàng' });
    await dialog.getByLabel('Tên khách hàng').fill('Review note limit');
    await dialog.getByLabel('Ghi chú (không bắt buộc)').fill('a'.repeat(4001));
    let posted = false;
    page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname.endsWith('/customers')) posted = true; });
    await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
    await expect(dialog.getByRole('alert').filter({ hasText: 'Dữ liệu không đúng hợp đồng' })).toBeVisible();
    assert.equal(posted, false);
    return { frontendAcceptedLength: 4001, contractMaxLength: 4000, errorAtTransportBoundary: true, requestSent: false };
  });
  await run('R7-prep-close-bypass', '/s/shop-demo/fulfillment', async page => {
    await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().waitFor();
    await page.evaluate(async () => {
      const { db } = await import('/src/mocks/database.ts');
      db.prepJobs.find(row => row.shopId === 'shop-demo').state = 'picking';
    });
    await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().click();
    const dialog = page.getByRole('dialog').filter({ hasText: 'Phiếu chuẩn bị' });
    await dialog.getByLabel('Nhập/quét SKU thực tế').fill('Draft scan before checking');
    await expect(dialog).toHaveAttribute('data-draft-dirty', 'true');
    await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
    await expect(dialog).toHaveCount(0);
    assert.equal(await page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?' }).count(), 0);
    return { setup: 'existing synthetic prep moved to valid picking state', changedScan: true, footerClosedWithoutDraftWarning: true };
  });
  await run('R9-event-broad-refetch', '/s/shop-demo/customers/c1', async page => {
    await page.addInitScript(() => {
      const Original = window.EventSource;
      window.EventSource = class extends Original {
        constructor(...args) { super(...args); window.reviewEventSource = this; }
      };
    });
    await page.reload();
    await expect(page.getByLabel('Tên khách hàng')).toHaveValue('Linh (khách mẫu)');
    await expect(page.getByRole('heading', { name: 'Yêu cầu hỗ trợ', exact: true })).toBeVisible();
    // All four current-scope query bodies are resolved before injecting one normal event.
    await page.evaluate(async () => {
      await Promise.all(['customers/c1', 'orders?customerId=c1&limit=10', 'shipments?limit=100', 'service-cases?limit=10'].map(path => fetch('/api/v2/shops/shop-demo/' + path)));
    });
    const requests = [];
    page.on('request', r => { if (r.method() === 'GET' && new URL(r.url()).pathname.startsWith('/api/v2/shops/shop-demo/')) requests.push(new URL(r.url()).pathname); });
    const done = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/shipments'));
    await page.evaluate(() => window.reviewEventSource.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ eventId: 'review-message-created', type: 'message.created', schemaVersion: 2, shopId: 'shop-demo', resourceType: 'message', resourceId: 'message-review', resourceVersion: 1, occurredAt: '2026-10-08T00:00:00Z', sequence: 100000 }) })));
    await done;
    assert(requests.some(path => path.endsWith('/customers/c1')));
    assert(requests.some(path => path.endsWith('/orders')));
    assert(requests.some(path => path.endsWith('/shipments')));
    return { syntheticNormalEvent: 'message.created', refetchedRequests: requests, unrelatedQueriesInvalidated: true };
  });
} finally {
  await browser.close();
  await server.close();
  await writeFile(new URL(selected.length ? `results-${selected.join('-')}.json` : 'results.json', import.meta.url), JSON.stringify({ executedAt: new Date().toISOString(), scope: 'actual React demo with synthetic MSW API; diagnostic assertions prove defects', results }, null, 2) + '\n');
}
if (results.some(r => r.result !== 'REPRODUCED')) process.exitCode = 1;

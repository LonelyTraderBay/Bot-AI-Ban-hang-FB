import { openDemoControls } from './session/demo-controls';
import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let stopDemoServer: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
  const server = await startDemoServer();
  demoUrl = server.url;
  stopDemoServer = server.close;
});

test.afterAll(async () => {
  await stopDemoServer?.();
});

async function gotoDemo(page: import('@playwright/test').Page, path: string) {
  await page.goto(new URL(path, demoUrl).toString());
}

async function uploadStatus(page: import('@playwright/test').Page, purpose: string | null, key: string, contents: string) {
  return page.evaluate(async ({ purpose, key, contents }) => {
    const csrf = (await (await fetch('/api/v2/auth/csrf')).json()).data.csrfToken as string;
    const form = new FormData();
    form.append('file', new File([contents], 'sample.csv', { type: 'text/csv' }));
    if (purpose) form.append('purpose', purpose);
    const response = await fetch('/api/v2/shops/shop-demo/uploads', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': key }, body: form,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { purpose, key, contents });
}

test('untrusted product text renders as text without activating markup', async ({ page }) => {
  const payload = '<img src=x onerror=window.__xssExecuted=true>sample-safe-text';
  await page.addInitScript(() => {
    (window as Window & { __xssExecuted?: boolean }).__xssExecuted = false;
  });
  await gotoDemo(page, '/s/shop-demo/products');
  await page.getByRole('button', { name: 'Thêm sản phẩm', exact: true }).click();
  await page.getByLabel('Tên sản phẩm', { exact: true }).fill(payload);
  await page.getByLabel('SKU', { exact: true }).fill('XSS-SAFE-001');
  await page.getByLabel(/Giá bán/).fill('125000');
  await page.getByRole('button', { name: 'Lưu sản phẩm', exact: true }).click();
  await page.getByRole('link', { name: 'Danh sách', exact: true }).click();

  await expect(page.getByText(payload, { exact: true })).toBeVisible();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as Window & { __xssExecuted?: boolean }).__xssExecuted)).toBe(false);
});

test('catalog import rejects a non-CSV file before an upload request', async ({ page }) => {
  let uploadRequests = 0;
  page.on('request', request => {
    if (request.url().endsWith('/api/v2/shops/shop-demo/uploads') && request.method() === 'POST')
      uploadRequests++;
  });
  await gotoDemo(page, '/s/shop-demo/imports');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'products.csv.exe',
    mimeType: 'text/csv',
    buffer: Buffer.from('sku,name,price\nA-1,Example,100'),
  });

  await expect(page.locator('#product-import-file-error')).toContainText('Chỉ nhận tệp có đuôi .csv');
  await expect(page.getByRole('button', { name: 'Kiểm tra trước khi nhập' })).toBeDisabled();
  expect(uploadRequests).toBe(0);
});

test('catalog import rejects files above the demo size limit before upload', async ({ page }) => {
  let uploadRequests = 0;
  page.on('request', request => {
    if (request.url().endsWith('/api/v2/shops/shop-demo/uploads') && request.method() === 'POST')
      uploadRequests++;
  });
  await gotoDemo(page, '/s/shop-demo/imports');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'oversized.csv',
    mimeType: 'text/csv',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });

  await expect(page.locator('#product-import-file-error')).toContainText('vượt giới hạn 5 MB');
  await expect(page.getByRole('button', { name: 'Kiểm tra trước khi nhập' })).toBeDisabled();
  expect(uploadRequests).toBe(0);
});

test('mock uploads require a purpose, enforce its role, and fingerprint file content for retries', async ({ page, browser }) => {
  await gotoDemo(page, '/s/shop-demo/imports');
  await expect(page.getByText('Frontend review: API được mô phỏng trong bộ nhớ', { exact: false })).toBeVisible();
  const missingPurpose = await uploadStatus(page, null, 'missing-purpose', 'sku,name,price\nP-1,Sample,100');
  expect(missingPurpose.status).toBe(422);
  expect(missingPurpose.body.code).toBe('UPLOAD_PURPOSE_REQUIRED');

  const salesContext = await browser.newContext();
  try {
    const salesPage = await salesContext.newPage();
    await gotoDemo(salesPage, '/s/shop-demo/imports');
    await expect(salesPage.getByText('Frontend review: API được mô phỏng trong bộ nhớ', { exact: false })).toBeVisible();
    await openDemoControls(salesPage);
    await salesPage.getByRole('combobox', { name: 'Vai trò mô phỏng' }).click();
    await salesPage.getByRole('option', { name: 'sales', exact: true }).click();
    await expect(salesPage.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toContainText('sales');
    const denied = await uploadStatus(salesPage, 'product_import', 'sales-import', 'sku,name,price\nP-1,Sample,100');
    expect(denied.status).toBe(403);
  } finally {
    await salesContext.close();
  }
  const first = await uploadStatus(page, 'product_import', 'same-upload-key', 'sku,name,price\nP-1,Sample,100');
  const changed = await uploadStatus(page, 'product_import', 'same-upload-key', 'sku,name,price\nP-2,Changed,200');
  expect(first.status).toBe(201);
  expect(changed.status).toBe(409);
  expect(changed.body.code).toBe('IDEMPOTENCY_CONFLICT');
});

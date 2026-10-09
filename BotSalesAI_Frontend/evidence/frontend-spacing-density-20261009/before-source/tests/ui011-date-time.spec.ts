import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

const fixedInstant = new Date('2026-09-30T17:30:00.000Z');
let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('UI011 report defaults use the active shop calendar month at a UTC month boundary', async ({ page }) => {
    await page.clock.install({ time: new Date(fixedInstant.getTime() - 60_000) });
    await page.goto(new URL('/s/shop-demo/finance', demoUrl).toString());
    const from = page.getByRole('textbox', { name: 'Từ ngày' });
    const to = page.getByRole('textbox', { name: 'Đến trước ngày' });
    await expect(from).toBeVisible();
    await expect(to).toBeVisible();
    await page.clock.pauseAt(fixedInstant);

    await expect(from).toHaveValue('2026-09-01');
    await expect(to).toHaveValue('2026-10-01');
});

test('UI011 journal effective date defaults to the active shop calendar date', async ({ page }) => {
    await page.clock.install({ time: new Date(fixedInstant.getTime() - 60_000) });
    await page.goto(new URL('/s/shop-demo/finance/journals', demoUrl).toString());
    const openJournal = page.getByRole('button', { name: 'Tạo bút toán nháp', exact: true });
    await expect(openJournal).toBeVisible();
    await page.clock.pauseAt(fixedInstant);
    await openJournal.click();
    await page.clock.runFor(500);

    await expect(page.getByRole('textbox', { name: 'Ngày hiệu lực' })).toHaveValue('2026-10-01');
});

test('UI011 shipment event input and API instant use the shop timezone, not browser timezone', async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage();
    try {
        await page.clock.install({ time: new Date(fixedInstant.getTime() - 60_000) });
        await page.goto(new URL('/s/shop-demo/shipments', demoUrl).toString());
        const shipment = page.getByRole('row').filter({ hasText: 'DH-DEMO-PAID-01' });
        await expect(shipment).toBeVisible();
        await page.clock.pauseAt(fixedInstant);
        await shipment.getByRole('button', { name: 'Cập nhật hành trình', exact: true }).click();
        await page.clock.runFor(500);
        const dialog = page.getByRole('dialog', { name: 'Cập nhật hành trình có bằng chứng' });
        const occurredAt = dialog.getByRole('textbox', { name: 'Thời gian sự kiện' });
        await expect(occurredAt).toHaveValue('2026-10-01T00:30');
        await occurredAt.fill('2026-10-01T12:00');
        await dialog.getByRole('textbox', { name: 'Mã sự kiện bên vận chuyển' }).fill('ui011-shop-local-event');
        await dialog.getByRole('textbox', { name: 'Mã bằng chứng' }).fill('ui011-local-proof');

        const eventRequest = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/events'));
        await dialog.getByRole('button', { name: 'Ghi sự kiện', exact: true }).click();
        const request = await eventRequest;
        expect(JSON.parse(request.postData() || 'null').occurredAt).toBe('2026-10-01T05:00:00.000Z');
    }
    finally {
        await context.close();
    }
});

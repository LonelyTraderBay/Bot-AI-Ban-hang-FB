import { test, expect } from '@playwright/test';
import { startDemoServer } from './session/demo-server.mjs';

let demoUrl = '';
let closeDemo: (() => Promise<void>) | undefined;

test.beforeAll(async () => {
    const server = await startDemoServer();
    demoUrl = server.url;
    closeDemo = server.close;
});

test.afterAll(async () => closeDemo?.());

test('UI028.W24 Inbox spacing roles remain consistent across breakpoints without losing draft state', async ({ page }) => {
    const pageErrors: string[] = [];
    const writes: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
    });

    for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(new URL('/s/shop-demo/inbox', demoUrl).toString());
        await expect(page.getByRole('link', { name: /Linh \(khách mẫu\)/ })).toBeVisible();
        const listSpacing = await page.evaluate(() => {
            const row = document.querySelector<HTMLElement>('a.MuiListItemButton-root[href*="/inbox/cv"]');
            const unread = document.querySelector<HTMLElement>('[data-testid="inbox-unread-count"]');
            if (!row || !unread) throw new Error('Inbox list row or unread count is missing.');
            const rowStyle = getComputedStyle(row);
            const unreadStyle = getComputedStyle(unread);
            return {
                padding: rowStyle.padding,
                gap: rowStyle.columnGap,
                unreadPaddingLeft: unreadStyle.paddingLeft,
            };
        });
        expect(listSpacing).toEqual({ padding: '12px', gap: '12px', unreadPaddingLeft: '8px' });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(new URL('/s/shop-demo/inbox/cv1', demoUrl).toString());
        const composer = page.getByRole('textbox', { name: 'Nội dung trả lời khách' });
        await expect(composer).toBeVisible();
        await expect(page.getByTestId('inbox-context-panel')).toBeAttached();
        await expect(page.getByTestId('inbox-message-bubble').first()).toBeVisible();
        const spacing = await page.evaluate(() => {
            const styleOf = (selector: string) => {
                const element = document.querySelector<HTMLElement>(selector);
                if (!element) throw new Error(`Inbox spacing target missing: ${selector}`);
                const style = getComputedStyle(element);
                return { padding: style.padding, gap: style.gap, marginTop: style.marginTop };
            };
            const context = styleOf('[data-testid="inbox-context-content"]');
            const content = styleOf('[data-testid="inbox-message-content-flow"]');
            const meta = styleOf('[data-testid="inbox-message-meta-flow"]');
            return {
                messageInset: styleOf('[data-testid="inbox-message-list"]').padding,
                bubbleInset: styleOf('[data-testid="inbox-message-bubble"]').padding,
                messageContentGap: content.gap,
                messageMetaGap: meta.gap,
                messageGroupGap: styleOf('[data-testid="inbox-message-groups"]').gap,
                composerInset: styleOf('form[data-draft-clean]').padding,
                contextInset: context.padding,
            };
        });
        expect(spacing).toEqual({
            messageInset: '12px',
            bubbleInset: '12px',
            messageContentGap: '4px',
            messageMetaGap: '8px',
            messageGroupGap: '12px',
            composerInset: '12px',
            contextInset: width < 768 ? '12px' : '16px',
        });
        const draft = `W24 draft ${width}`;
        await composer.fill(draft);
        await page.setViewportSize({ width: width < 768 ? 768 : 390, height: 844 });
        await expect(composer).toHaveValue(draft);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width < 768 ? 768 : 390);
    }

    expect(writes).toEqual([]);
    expect(pageErrors).toEqual([]);
});

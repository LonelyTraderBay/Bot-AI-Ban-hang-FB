import type { Page } from '@playwright/test';

type ReadBarrier = { entered: number; release: () => void };
type BarrierWindow = Window & { botsalesReadBarrier?: ReadBarrier };

/** Hold real client GETs until the pending UI has been observed, without a timed delay. */
export async function holdRouteReads(page: Page, patterns: string[]) {
    await page.evaluate(patterns => {
        const target = window as BarrierWindow;
        if (target.botsalesReadBarrier) throw new Error('A route read barrier is already active.');
        const originalFetch = window.fetch;
        const matches = patterns.map(pattern => new RegExp(pattern));
        let resolve!: () => void;
        const held = new Promise<void>(done => { resolve = done; });
        const state: ReadBarrier = { entered: 0, release: () => {
            window.fetch = originalFetch;
            delete target.botsalesReadBarrier;
            resolve();
        } };
        target.botsalesReadBarrier = state;
        window.fetch = async (input, init) => {
            const url = new URL(input instanceof Request ? input.url : String(input), location.href);
            const method = init?.method || (input instanceof Request ? input.method : 'GET');
            if (url.origin === location.origin && method.toUpperCase() === 'GET' && matches.some(pattern => pattern.test(url.pathname))) {
                state.entered++;
                await held;
            }
            return originalFetch.call(window, input, init);
        };
    }, patterns);
    return {
        entered: () => page.evaluate(() => (window as BarrierWindow).botsalesReadBarrier?.entered ?? 0),
        release: () => page.evaluate(() => (window as BarrierWindow).botsalesReadBarrier?.release()),
    };
}

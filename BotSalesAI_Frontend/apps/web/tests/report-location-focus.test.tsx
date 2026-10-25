import { useReducer } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { ReportsPage, MarketingPage } from '../src/modules/reports';
import { theme } from '../src/shared/ui/theme';

const api = vi.hoisted(() => ({ data: {} as Record<string, unknown> }));
vi.mock('../src/shared/api/hooks', async importOriginal => ({
    ...await importOriginal<typeof import('../src/shared/api/hooks')>(),
    useApi: (operation: string) => ({ data: api.data[operation] ? { data: api.data[operation] } : undefined,
        isPending: !api.data[operation], isError: false, error: null, refetch: vi.fn() }),
    useCommand: () => ({ pending: false, error: null, run: vi.fn() }),
}));
vi.mock('../src/shared/model/scope', async importOriginal => ({
    ...await importOriginal<typeof import('../src/shared/model/scope')>(),
    useScope: () => ({ shop: { id: 'shop-demo', name: 'Synthetic shop', currency: 'VND', timezone: 'Asia/Vientiane' } }),
    useCan: () => false,
}));

let router: ReturnType<typeof createBrowserRouter>;
beforeEach(() => { api.data = {}; });
afterEach(() => { cleanup(); router?.dispose(); });

for (const fixture of [
    { Component: ReportsPage, path: '/s/shop-demo/reports', operation: 'getReportSummary', fromDate: '2026-09-01',
        data: { asOf: '2026-09-29T14:00:00.000Z', availableReports: [], warnings: [] } },
    { Component: MarketingPage, path: '/s/shop-demo/reports/marketing', operation: 'getMarketingSummary', fromDate: '2026-08-31',
        data: { asOf: '2026-09-29T14:00:00.000Z', period: { fromDate: '2026-08-31', toDate: '2026-09-29', bucket: 'day', timezone: 'Asia/Vientiane' },
            knownAttributedOrders: 0, unknownAttributionOrders: 0, actualSpend: null,
            estimatedSpend: { amount: '0', currency: 'VND' }, trend: [], topQuestions: [], lostSaleReasons: [] } },
]) {
    it(`${fixture.operation} defaults preserve a newly focused live fragment before router state catches up`, async () => {
        window.history.replaceState({}, '', fixture.path);
        let resolveDefaults = () => {};
        function Harness() {
            const [, update] = useReducer(n => n + 1, 0);
            resolveDefaults = () => { api.data[fixture.operation] = fixture.data; update(); };
            return <ThemeProvider theme={theme}><main id="main-content" tabIndex={-1}><fixture.Component /></main></ThemeProvider>;
        }
        router = createBrowserRouter([{ path: fixture.path, element: <Harness /> }]);
        render(<RouterProvider router={router} />);
        const main = screen.getByRole('main');
        // A native anchor changes the browser URL before an async router render.
        window.history.replaceState(window.history.state, '', `${fixture.path}#main-content`);
        main.focus();
        const entries = window.history.length;
        act(resolveDefaults);
        await waitFor(() => expect(new URLSearchParams(window.location.search).get('fromDate')).toBe(fixture.fromDate));
        expect(new URLSearchParams(window.location.search).get('toDate')).toBe('2026-09-29');
        expect(window.location.pathname).toBe(fixture.path);
        expect(window.location.hash).toBe('#main-content');
        expect(router.state.location.hash).toBe('#main-content');
        expect(main).toHaveFocus();
        expect(window.history.length).toBe(entries);
    });
}

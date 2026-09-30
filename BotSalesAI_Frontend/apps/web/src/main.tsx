import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from './shared/ui/theme';
import { SessionProvider } from './app/SessionProvider';
import { router } from './app/router';
import './app/i18n';
import './app/tokens.css';
import './app/bootstrap.css';
const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: true, gcTime: 120000 }, mutations: { retry: false } } });
async function start() {
    if (__MOCK__) {
        const { startMockWorker } = await import('./mocks/browser');
        await startMockWorker();
    }
    else if ('serviceWorker' in navigator) {
        // A previous demo build must not continue to intercept live requests.
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            if (registration.active?.scriptURL.includes('/mockServiceWorker.js')) {
                await registration.unregister();
                location.reload();
                return;
            }
        }
    }
    const root = document.getElementById('root');
    if (!root)
        throw new Error('Không tìm thấy root.');
    createRoot(root).render(<StrictMode><ThemeProvider theme={theme}><CssBaseline /><QueryClientProvider client={queryClient}><SessionProvider><RouterProvider router={router}/></SessionProvider></QueryClientProvider></ThemeProvider></StrictMode>);
}
void start().catch(() => { const root = document.getElementById('root'); if (root) {
    root.replaceChildren();
    const title = document.createElement('h1');
    title.textContent = 'Chưa khởi động được ứng dụng';
    const text = document.createElement('p');
    text.textContent = 'Chạy npm run setup để tạo service worker mô phỏng, rồi npm run dev. Xem README nếu trình duyệt chặn Service Worker.';
    root.append(title, text);
} });

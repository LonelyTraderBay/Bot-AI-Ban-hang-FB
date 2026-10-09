import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
export async function startMockWorker() {
    if (!__MOCK__)
        throw new Error('Không cho phép mock ở production.');
    await worker.start({
        serviceWorker: { url: '/mockServiceWorker.js' }, onUnhandledRequest(request, print) { if (new URL(request.url).pathname.startsWith('/api/'))
            print.error(); }, quiet: true
    });
}

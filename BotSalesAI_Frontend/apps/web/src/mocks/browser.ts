import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { hasUnsavedFormDraft } from '../shared/model/dirty-drafts';
import { intentSnapshot } from '../shared/api/intents';
import { recoverableMockWorkerUpdateMessage } from './service-worker-update-recovery';
export const worker = setupWorker(...handlers);
let lifecycleInstalled = false;
export async function startMockWorker() {
    if (!__MOCK__)
        throw new Error('Không cho phép mock ở production.');
    if (!lifecycleInstalled) {
        lifecycleInstalled = true;
        const mockWorkerUrl = new URL('/mockServiceWorker.js', location.href).href;
        window.addEventListener('unhandledrejection', event => {
            const scopeUrl = new URL('/', location.href).href;
            const message = recoverableMockWorkerUpdateMessage(
                event.reason,
                navigator.serviceWorker.controller?.scriptURL ?? null,
                scopeUrl,
                mockWorkerUrl,
            );
            if (!message) return;
            event.preventDefault();
            console.warn('[MSW demo] Không cập nhật được worker mô phỏng; tiếp tục dùng worker đang hoạt động.', {
                scope: scopeUrl,
                scriptURL: mockWorkerUrl,
                reason: message,
            });
        }, { capture: true });
        // MSW closes its client at beforeunload even when the user cancels leaving.
        // Keep the current client active while the native draft guard is pending.
        window.addEventListener('beforeunload', event => {
            if (hasUnsavedFormDraft() || intentSnapshot().length > 0) {
                event.stopImmediatePropagation();
                event.preventDefault(); event.returnValue = '';
            }
        }, { capture: true });
    }
    // Firefox can expose a registration from the departing document without a
    // controller for this one. MSW 2 reloads in that state, which can loop. A new
    // registration activates/claims this document instead of reloading it.
    if (!navigator.serviceWorker.controller) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        const mockUrl = new URL('/mockServiceWorker.js', location.href).href;
        for (const registration of registrations) {
            if ([registration.active, registration.waiting, registration.installing].some(instance => instance?.scriptURL === mockUrl))
                await registration.unregister();
        }
    }
    await worker.start({
        serviceWorker: { url: '/mockServiceWorker.js' }, onUnhandledRequest(request, print) { if (new URL(request.url).pathname.startsWith('/api/'))
            print.error(); }, quiet: true
    });
}

import { describe, expect, it } from 'vitest';
import { recoverableMockWorkerUpdateMessage } from '../src/mocks/service-worker-update-recovery';

const scopeUrl = 'http://127.0.0.1:5173/';
const workerUrl = 'http://127.0.0.1:5173/mockServiceWorker.js';
const failure = `Failed to update a ServiceWorker for scope ('${scopeUrl}') with script ('${workerUrl}'): Not found`;

describe('recoverable MSW worker update rejection', () => {
    it('recognizes the exact failed update only while that mock worker controls the document', () => {
        expect(recoverableMockWorkerUpdateMessage(new TypeError(failure), workerUrl, scopeUrl, workerUrl)).toBe(failure);
    });

    it.each([
        ['no active controller', null, scopeUrl, failure],
        ['a different active worker', 'http://127.0.0.1:5173/app-sw.js', scopeUrl, failure],
        ['a different registration scope', workerUrl, 'http://127.0.0.1:5173/other/', failure],
        ['a different worker script', workerUrl, scopeUrl, `Failed to update a ServiceWorker for scope ('${scopeUrl}') with script ('http://127.0.0.1:5173/other.js'): Not found`],
        ['an unrelated rejection', workerUrl, scopeUrl, 'The request failed for an unrelated reason.'],
        ['a truncated update error', workerUrl, scopeUrl, `Failed to update a ServiceWorker for scope ('${scopeUrl}') with script ('${workerUrl}'): `],
    ])('leaves %s unhandled', (_case, controllerUrl, currentScope, message) => {
        expect(recoverableMockWorkerUpdateMessage(new TypeError(message), controllerUrl, currentScope, workerUrl)).toBeNull();
    });
});

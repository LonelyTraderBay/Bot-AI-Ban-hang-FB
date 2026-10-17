export function recoverableMockWorkerUpdateMessage(
    reason: unknown,
    controllerScriptUrl: string | null,
    scopeUrl: string,
    mockWorkerUrl: string,
): string | null {
    if (controllerScriptUrl !== mockWorkerUrl) return null;

    let message = '';
    if (typeof reason === 'string') message = reason;
    else if (reason !== null && typeof reason === 'object') {
        try {
            const candidate = (reason as { message?: unknown }).message;
            if (typeof candidate === 'string') message = candidate;
        } catch {
            return null;
        }
    }

    const expectedPrefix = `Failed to update a ServiceWorker for scope ('${scopeUrl}') with script ('${mockWorkerUrl}'): `;
    return message.startsWith(expectedPrefix) && message.length > expectedPrefix.length ? message : null;
}

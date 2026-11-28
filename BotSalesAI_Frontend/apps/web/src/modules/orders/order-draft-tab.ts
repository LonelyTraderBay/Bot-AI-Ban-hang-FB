const storageKey = 'botsales.order-draft-tab';
let tab: Promise<string> | undefined;

export function orderDraftTab() {
    if (tab) return tab;
    const fresh = crypto.randomUUID();
    if (!navigator.locks) return tab = Promise.resolve(fresh);
    tab = new Promise(resolve => {
        let previous: string = fresh;
        try { previous = sessionStorage.getItem(storageKey) || fresh; } catch { /* Storage may be disabled. */ }
        const occupy = (id: string) => {
            void navigator.locks.request(`${storageKey}:${id}`, { ifAvailable: true }, async lock => {
                if (!lock) {
                    occupy(fresh);
                    return;
                }
                try { sessionStorage.setItem(storageKey, id); } catch { /* Keep this tab's in-memory ID. */ }
                resolve(id);
                // The browser releases the lock when this tab closes or reloads.
                await new Promise<void>(() => {});
            }).catch(() => resolve(fresh));
        };
        occupy(previous);
    });
    return tab;
}

export function rememberedDraftEpoch(id: string) {
    try { return Number(sessionStorage.getItem(`${storageKey}:${id}`)) || null; }
    catch { return null; }
}

export function rememberDraftEpoch(id: string, epoch: number | null) {
    try {
        const key = `${storageKey}:${id}`;
        if (epoch === null) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, String(epoch));
    } catch { /* A reload will require an explicit resume. */ }
}

export type DraftConversionReceipt = { id: string; version: number; epoch: number; key: string; tabId: string };

export function readDraftConversion(scope: string, tabId: string): DraftConversionReceipt | null {
    try {
        const receipt = JSON.parse(sessionStorage.getItem(`${storageKey}:conversion:${scope}`) || 'null') as DraftConversionReceipt | null;
        return receipt?.tabId === tabId ? receipt : null;
    } catch { return null; }
}

export function rememberDraftConversion(scope: string, receipt: DraftConversionReceipt | null) {
    try {
        const key = `${storageKey}:conversion:${scope}`;
        if (receipt) sessionStorage.setItem(key, JSON.stringify(receipt));
        else sessionStorage.removeItem(key);
    } catch { /* Recovery can still retry from the current tab. */ }
}

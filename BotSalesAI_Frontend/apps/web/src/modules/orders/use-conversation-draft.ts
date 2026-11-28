import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ConversationOrderDraft, ConversationOrderDraftValues, Order } from '@botsales/contracts';
import { request } from '@/shared/api/client';
import { ApiError, UnknownResultError } from '@/shared/api/errors';
import { useApi } from '@/shared/api/hooks';
import { useScope } from '@/shared/model/scope';
import { draftEqual } from '@/shared/model/versioned-draft';
import { orderDraftTab, readDraftConversion, rememberDraftConversion, rememberedDraftEpoch, rememberDraftEpoch } from './order-draft-tab';
import type { DraftConversionReceipt } from './order-draft-tab';

type Values = ConversationOrderDraftValues;
type Draft = ConversationOrderDraft;
type PendingAction = 'access' | 'save' | 'convert' | 'discard' | 'renew';

export function completeOrderDraft(values: Values) {
    return Boolean(values.warehouseId && values.paymentMethod && values.lines?.length &&
        values.lines.every(line => line.variantId && line.quantity) &&
        new Set(values.lines.map(line => line.variantId)).size === values.lines.length);
}

export function useConversationDraft(conversationId: string, accessMode: 'preview' | 'intent' | 'normal') {
    const { shop, session, membership, online } = useScope();
    const cache = useQueryClient();
    const view = useApi('getConversationOrderDraft', { path: { conversationId } });
    const { refetch: refetchView } = view;
    const [lease, renderLease] = useState<Draft | null>(null);
    const [values, renderValues] = useState<Values>({});
    const leaseRef = useRef<Draft | null>(null);
    const valuesRef = useRef<Values>({});
    const setLease = useCallback((next: Draft | null) => {
        leaseRef.current = next;
        renderLease(next);
    }, []);
    const setValues = useCallback((update: Values | ((current: Values) => Values)) => {
        const next = typeof update === 'function' ? update(valuesRef.current) : update;
        valuesRef.current = next;
        renderValues(next);
    }, []);
    const [unacknowledged, setUnacknowledged] = useState(false);
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const flight = useRef<{ controller: AbortController; settled: Promise<void> } | null>(null);
    const saveFlight = useRef<Promise<boolean> | null>(null);
    const [receiptReady, setReceiptReady] = useState(false);
    const [receipt, setReceipt] = useState<DraftConversionReceipt | null>(null);
    const receiptRef = useRef<DraftConversionReceipt | null>(null);
    const conversionScope = `${session.user.id}:${shop.id}:${conversationId}`;
    const recordConversion = useCallback((next: DraftConversionReceipt | null) => {
        receiptRef.current = next;
        setReceipt(next);
        rememberDraftConversion(conversionScope, next);
    }, [conversionScope]);
    const leaseChangedAt = useRef(0);
    const restoreTried = useRef<string | null>(null);
    const denied = view.error instanceof ApiError && [401, 403, 404].includes(view.error.status);
    const data = denied ? undefined : view.data?.data;
    const dirty = lease !== null && !draftEqual(values, lease.values);
    const editing = lease !== null && !denied && shop.status !== 'closed';
    const serverDraft = data?.draft;

    useEffect(() => () => flight.current?.controller.abort(), []);
    useEffect(() => {
        if (accessMode === 'preview') return;
        let active = true;
        void orderDraftTab().then(tabId => {
            if (!active) return;
            receiptRef.current = readDraftConversion(conversionScope, tabId);
            setReceipt(receiptRef.current);
            setReceiptReady(true);
        });
        return () => { active = false; };
    }, [accessMode, conversionScope]);
    useEffect(() => {
        if (!denied) return;
        if (leaseRef.current) rememberDraftEpoch(leaseRef.current.id, null);
        setLease(null);
        setValues({});
        setUnacknowledged(false);
    }, [denied, setLease, setValues]);

    const perform = useCallback(async <T,>(action: PendingAction, work: (signal: AbortSignal, tabId: string) => Promise<T>) => {
        if (accessMode === 'preview' || !online || shop.status === 'closed' || flight.current) return undefined;
        const controller = new AbortController();
        let resolveFlight: () => void = () => {};
        flight.current = { controller, settled: new Promise<void>(resolve => { resolveFlight = resolve; }) };
        if (action !== 'renew') setPending(action);
        setError(null);
        try {
            const result = await work(controller.signal, await orderDraftTab());
            return controller.signal.aborted ? undefined : result;
        } catch (failure) {
            if (controller.signal.aborted) return undefined;
            const problem = failure instanceof Error ? failure : new Error('Không thể cập nhật bản đang nhập.');
            if (action !== 'convert' || !(problem instanceof UnknownResultError)) setError(problem);
            if (problem instanceof ApiError && [401, 403, 404, 409, 412].includes(problem.status)) {
                const current = leaseRef.current;
                if (current) rememberDraftEpoch(current.id, null);
                if ([401, 403, 404].includes(problem.status)) {
                    setValues({});
                    setUnacknowledged(false);
                } else if (current && !draftEqual(valuesRef.current, current.values)) {
                    setUnacknowledged(true);
                }
                setLease(null);
                void refetchView();
            }
            if (action === 'convert' && problem instanceof ApiError && problem.status >= 400 && problem.status < 500) recordConversion(null);
            return undefined;
        } finally {
            if (flight.current?.controller === controller) {
                flight.current = null;
                if (!controller.signal.aborted) setPending(null);
            }
            resolveFlight();
        }
    }, [accessMode, online, shop.status, refetchView, setLease, setValues, recordConversion]);

    const refresh = useCallback((...operations: string[]) => Promise.all(operations.map(operation =>
        cache.invalidateQueries({ queryKey: ['scope', session.user.id, shop.id, membership.permissionVersion, operation] })
    )), [cache, session.user.id, shop.id, membership.permissionVersion]);

    useEffect(() => {
        if (!lease || view.dataUpdatedAt <= leaseChangedAt.current || !data) return;
        if (!serverDraft && receiptRef.current?.id === lease.id) return;
        if (data.canOpen && serverDraft?.id === lease.id && serverDraft.editEpoch <= lease.editEpoch && shop.status !== 'closed') return;
        rememberDraftEpoch(lease.id, null);
        if (dirty) setUnacknowledged(true);
        setLease(null);
    }, [data, dirty, lease, serverDraft, shop.status, view.dataUpdatedAt, setLease]);

    const acquire = useCallback(async (action: 'open' | 'resume') => {
        if (!receiptReady || receiptRef.current || (action === 'resume' && !serverDraft)) return false;
        const opened = await perform('access', async (signal, tabId) => request('accessConversationOrderDraft', {
            path: { shopId: shop.id, conversationId }, signal,
            body: { tabId, action, ...(action === 'resume' && serverDraft && { draftId: serverDraft.id, editEpoch: serverDraft.editEpoch }) },
        }));
        if (!opened) return false;
        leaseChangedAt.current = Date.now();
        setLease(opened.data);
        rememberDraftEpoch(opened.data.id, opened.data.editEpoch);
        setValues(opened.data.savedAt ? opened.data.values : {
            ...opened.data.values, warehouseId: shop.defaultWarehouseId, paymentMethod: 'cod',
        });
        setUnacknowledged(false);
        void refresh('getConversationOrderDraft', 'getConversation', 'listConversations');
        return true;
    }, [perform, shop.id, shop.defaultWarehouseId, conversationId, refresh, receiptReady, serverDraft, setLease, setValues]);

    useEffect(() => {
        if (accessMode !== 'normal' || !receiptReady || receipt || unacknowledged || !serverDraft || !data?.canOpen || !online || lease || pending || restoreTried.current === serverDraft.id ||
            rememberedDraftEpoch(serverDraft.id) !== serverDraft.editEpoch) return;
        restoreTried.current = serverDraft.id;
        void (async () => {
            const resumed = await perform('renew', (signal, tabId) => request('accessConversationOrderDraft', {
                path: { shopId: shop.id, conversationId }, version: serverDraft.version, signal,
                body: { tabId, action: 'renew', draftId: serverDraft.id, editEpoch: serverDraft.editEpoch },
            }));
            if (resumed) {
                leaseChangedAt.current = Date.now();
                setLease(resumed.data);
                setValues(resumed.data.values);
            } else rememberDraftEpoch(serverDraft.id, null);
        })();
    }, [accessMode, serverDraft, data?.canOpen, online, lease, pending, perform, shop.id, conversationId, receiptReady, receipt, unacknowledged, setLease, setValues]);

    const save = useCallback((): Promise<boolean> => {
        if (saveFlight.current) return saveFlight.current;
        const operation = (async () => {
            await flight.current?.settled;
            const current = leaseRef.current;
            const snapshot = valuesRef.current;
            if (!current || receiptRef.current) return false;
            if (draftEqual(snapshot, current.values)) return true;
            const saved = await perform('save', (signal, tabId) => request('saveConversationOrderDraft', {
                path: { shopId: shop.id, conversationId, draftId: current.id },
                body: { tabId, editEpoch: current.editEpoch, values: snapshot }, version: current.version, signal,
            }));
            if (!saved) return false;
            setLease(saved.data);
            void refresh('getConversationOrderDraft', 'listConversationOrderDrafts', 'estimateConversationOrderDraft');
            return draftEqual(valuesRef.current, saved.data.values);
        })();
        saveFlight.current = operation;
        void operation.finally(() => { saveFlight.current = null; });
        return operation;
    }, [perform, shop.id, conversationId, refresh, setLease]);

    useEffect(() => {
        if (!editing || !dirty || !online || pending || error || receipt) return;
        const timer = window.setTimeout(() => void save(), 550);
        return () => window.clearTimeout(timer);
    }, [editing, dirty, online, pending, error, receipt, save]);

    const renew = useRef<() => Promise<void>>(async () => {});
    renew.current = async () => {
        if (!lease || document.visibilityState !== 'visible' || pending || receiptRef.current) return;
        const result = await perform('renew', (signal, tabId) => request('accessConversationOrderDraft', {
            path: { shopId: shop.id, conversationId }, version: lease.version, signal,
            body: { tabId, action: 'renew', draftId: lease.id, editEpoch: lease.editEpoch },
        }));
        const current = leaseRef.current;
        if (result && current?.id === result.data.id && current.editEpoch === result.data.editEpoch) {
            setLease({ ...current, editExpiresAt: result.data.editExpiresAt });
        }
    };
    useEffect(() => {
        if (!editing || !online) return;
        const tick = () => void renew.current();
        const timer = window.setInterval(tick, 20_000);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [editing, online]);

    async function finish(action: 'convert' | 'discard'): Promise<Order | undefined> {
        const existing = receiptRef.current;
        if (!receiptReady || denied || (action === 'discard' && (!lease || existing)) ||
            (action === 'convert' && !existing && (!lease || dirty))) return;
        const settled = await perform(action, async (signal, tabId) => {
            const current = leaseRef.current;
            if (!existing && !current) return undefined;
            const intent = existing ?? { id: current!.id, version: current!.version, epoch: current!.editEpoch, key: crypto.randomUUID(), tabId };
            if (action === 'convert') recordConversion(intent);
            const options = {
                path: { shopId: shop.id, conversationId, draftId: intent.id }, version: intent.version, signal,
                body: { tabId, editEpoch: intent.epoch }, idempotencyKey: action === 'convert' ? intent.key : undefined,
            };
            return action === 'convert' ? (await request('convertConversationOrderDraft', options)).data
                : (await request('discardConversationOrderDraft', options)).data;
        });
        if (settled === undefined) return;
        const id = existing?.id ?? lease?.id;
        if (id) rememberDraftEpoch(id, null);
        setLease(null);
        setValues({});
        setUnacknowledged(false);
        if (action === 'convert') recordConversion(null);
        void refresh('getConversationOrderDraft', 'listConversationOrderDrafts', 'listOrders', 'getDashboard');
        return settled ?? undefined;
    }

    const shownDraft = denied ? undefined : lease ?? serverDraft;
    const shownValues = denied ? {} : editing || unacknowledged ? values : shownDraft?.values ?? {};
    const estimate = useApi('estimateConversationOrderDraft',
        { path: { conversationId, draftId: shownDraft?.id ?? '' } },
        Boolean(shownDraft && completeOrderDraft(shownDraft.values) && !dirty));
    const price = estimate.data?.data;
    return { view: denied ? { ...view, data: undefined } : view, draft: shownDraft, values: shownValues, setValues,
        estimate: price?.version === shownDraft?.version && !dirty ? price : undefined,
        editing, acquire, finish, online, pending, error, save, dirty, unacknowledged,
        receiptReady, conversionUnconfirmed: receipt !== null && pending !== 'convert' };
}

import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/errors';

export interface DraftSnapshot<T extends object> {
    version: number;
    values: T;
    hidden?: readonly (keyof T)[];
}
export type DraftChoice = 'mine' | 'theirs';

/** Object keys do not carry order; arrays are atomic, ordered draft fields. */
export function draftFingerprint(value: unknown): string {
    if (Array.isArray(value)) return '[' + value.map(draftFingerprint).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => JSON.stringify(key) + ':' + draftFingerprint(item)).join(',') + '}';
    return JSON.stringify(value) ?? 'undefined';
}
export const draftEqual = (a: unknown, b: unknown) => draftFingerprint(a) === draftFingerprint(b);
export function draftFields<T extends object>(base: T, mine: T, theirs: T, hidden: readonly (keyof T)[] = []) {
    return (Object.keys(theirs) as (keyof T)[]).filter(key => !hidden.includes(key)).map(key => {
        const mineChanged = !draftEqual(base[key], mine[key]);
        const theirsChanged = !draftEqual(base[key], theirs[key]);
        const choice: DraftChoice | null = mineChanged && theirsChanged && !draftEqual(mine[key], theirs[key]) ? null : mineChanged ? 'mine' : 'theirs';
        return { key, base: base[key], mine: mine[key], theirs: theirs[key], choice };
    });
}
export function draftPatch<T extends object>(base: T, draft: T, hidden: readonly (keyof T)[] = []): Partial<T> {
    const result: Partial<T> = {};
    for (const key of Object.keys(draft) as (keyof T)[])
        if (!hidden.includes(key) && !draftEqual(base[key], draft[key])) result[key] = draft[key];
    return result;
}
export function preserveLaterEdits<T extends object>(submitted: T, current: T, persisted: T, hidden: readonly (keyof T)[] = []): T {
    return { ...persisted, ...draftPatch(submitted, current, hidden) };
}

/** One baseline per editable resource. Server refreshes never adopt a version into a dirty draft. */
export function useVersionedDraft<T extends object>({ identity, source, draft, apply, refresh }: {
    identity: string;
    source?: DraftSnapshot<T>;
    draft: T;
    apply: (values: T, baseline: T) => void;
    refresh: () => Promise<unknown>;
}) {
    const [baseline, setBaseline] = useState<(DraftSnapshot<T> & { identity: string }) | null>(null);
    const [comparing, setComparing] = useState(false);
    const [refreshError, setRefreshError] = useState<Error | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const live = useRef({ identity, source, draft, apply, refresh });
    live.current = { identity, source, draft, apply, refresh };
    const baseRef = useRef(baseline);
    baseRef.current = baseline;
    const sourceKey = draftFingerprint(source);
    const clean = !baseline || draftEqual(baseline.values, draft);
    useEffect(() => {
        const latest = live.current;
        const base = baseRef.current;
        if (!latest.source) {
            if (base && base.identity !== latest.identity) {
                baseRef.current = null; setBaseline(null); setComparing(false); setRefreshError(null);
            }
            return;
        }
        if (!base || base.identity !== latest.identity || (latest.source.version >= base.version && draftEqual(base.values, latest.draft))) {
            const next = { ...latest.source, identity: latest.identity };
            baseRef.current = next;
            setBaseline(next);
            latest.apply(next.values, next.values);
            if (!base || base.identity !== latest.identity) setComparing(false);
        }
        else if (latest.source.hidden?.length) {
            const values = { ...latest.draft };
            const original = { ...base.values };
            for (const key of latest.source.hidden) { values[key] = latest.source.values[key]; original[key] = latest.source.values[key]; }
            if (!draftEqual(values, latest.draft) || !draftEqual(original, base.values)) {
                const next = { ...base, values: original, hidden: latest.source.hidden };
                baseRef.current = next; setBaseline(next); latest.apply(values, original);
            }
        }
    }, [identity, sourceKey, clean]);
    const hidden = source?.hidden || [];
    const dirty = Boolean(baseline && baseline.identity === identity && Object.keys(draftPatch(baseline.values, draft, hidden)).length);
    const conflict = Boolean(baseline && baseline.identity === identity && source && source.version > baseline.version && dirty);
    const prepare = () => {
        const base = baseRef.current, latest = live.current;
        if (!base || base.identity !== latest.identity || !latest.source) return null;
        if (latest.source.version > base.version) { setComparing(true); return null; }
        return { version: base.version, patch: draftPatch(base.values, latest.draft, latest.source.hidden) };
    };
    const committed = (persisted: DraftSnapshot<T>, submitted: T, nextIdentity?: string) => {
        const latest = live.current;
        const values = preserveLaterEdits(submitted, latest.draft, persisted.values, persisted.hidden);
        const next = { ...persisted, identity: nextIdentity || latest.identity };
        baseRef.current = next; setBaseline(next); latest.apply(values, next.values);
        setComparing(false);
        return draftEqual(values, persisted.values);
    };
    const compare = async () => {
        setRefreshError(null); setComparing(true); setRefreshing(true);
        try { await live.current.refresh(); }
        catch (error) { setRefreshError(error instanceof Error ? error : new Error('Không tải được dữ liệu để đối chiếu.')); }
        finally { setRefreshing(false); }
    };
    const failed = (error: unknown) => {
        if (error instanceof ApiError && error.status === 412) void compare();
    };
    const reconcile = (version: number, fingerprint: string, choices: Partial<Record<keyof T, DraftChoice>>) => {
        const latest = live.current, base = baseRef.current;
        if (!base || !latest.source || latest.source.version !== version || draftFingerprint(latest.source.values) !== fingerprint) return false;
        const fields = draftFields(base.values, latest.draft, latest.source.values, latest.source.hidden);
        const values = { ...latest.source.values };
        for (const field of fields) {
            const choice = choices[field.key] || field.choice;
            if (!choice) return false;
            values[field.key] = choice === 'mine' ? field.mine : field.theirs;
        }
        const next = { ...latest.source, identity: latest.identity };
        baseRef.current = next; setBaseline(next); latest.apply(values, next.values); setComparing(false);
        return true;
    };
    return { baseline, source, draft, dirty, conflict, comparing, refreshError, refreshing, prepare, committed, failed, compare, reconcile, closeComparison: () => setComparing(false) };
}

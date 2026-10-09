import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { expect, it } from 'vitest';
import { draftEqual, draftFields, draftPatch, preserveLaterEdits, useVersionedDraft, draftFingerprint as importFingerprint } from '../src/shared/model/versioned-draft';
import type { DraftSnapshot } from '../src/shared/model/versioned-draft';
type Values = { name: string; notes: string; lines: string[] };
const first: DraftSnapshot<Values> = { version: 1, values: { name: 'Original', notes: 'Original note', lines: ['a', 'b'] } };
function harness(source: DraftSnapshot<Values>) {
    const [draft, setDraft] = useState(first.values);
    const editor = useVersionedDraft({ identity: 'shop:resource', source, draft, apply: setDraft, refresh: async () => undefined });
    return { editor, draft, setDraft };
}
it('F01/F02/F03 keeps the baseline version and draft across unrelated and conflicting server changes', () => {
    const hook = renderHook(harness, { initialProps: first });
    act(() => hook.result.current.setDraft({ ...first.values, name: 'Mine', lines: ['b', 'a'] }));
    hook.rerender({ version: 2, values: { ...first.values, notes: 'Server note' } });
    expect(hook.result.current.draft).toEqual({ ...first.values, name: 'Mine', lines: ['b', 'a'] });
    expect(hook.result.current.editor.baseline?.version).toBe(1);
    act(() => { expect(hook.result.current.editor.prepare()).toBeNull(); });
    act(() => { expect(hook.result.current.editor.reconcile(2, JSON.stringify({}), {})).toBe(false); });
    const latest = hook.result.current.editor.source!;
    act(() => { expect(hook.result.current.editor.reconcile(2, importFingerprint(latest.values), {})).toBe(true); });
    expect(hook.result.current.draft).toEqual({ name: 'Mine', notes: 'Server note', lines: ['b', 'a'] });
    expect(hook.result.current.editor.prepare()).toMatchObject({ version: 2, patch: { name: 'Mine', lines: ['b', 'a'] } });
});
it('F01 requires choices for both-side changes and treats arrays as one field', () => {
    const fields = draftFields(first.values, { ...first.values, name: 'Mine', lines: ['c'] }, { ...first.values, name: 'Theirs', lines: [] });
    expect(fields.find(field => field.key === 'name')?.choice).toBeNull();
    expect(fields.find(field => field.key === 'lines')?.choice).toBeNull();
    expect(fields.find(field => field.key === 'notes')?.choice).toBe('theirs');
});
it('F01 rejects outdated comparison choices when the server changes again', () => {
    const hook = renderHook(harness, { initialProps: first });
    act(() => hook.result.current.setDraft({ ...first.values, name: 'Mine' }));
    const second = { version: 2, values: { ...first.values, name: 'Second' } };
    hook.rerender(second);
    hook.rerender({ version: 3, values: { ...first.values, name: 'Third' } });
    act(() => { expect(hook.result.current.editor.reconcile(2, importFingerprint(second.values), { name: 'mine' })).toBe(false); });
    expect(hook.result.current.draft.name).toBe('Mine');
});
it('F01 removes newly hidden fields from comparison and outgoing patches', () => {
    const hook = renderHook(harness, { initialProps: first });
    act(() => hook.result.current.setDraft({ ...first.values, name: 'Mine', notes: 'Sensitive draft' }));
    hook.rerender({ version: 2, values: { ...first.values, notes: '' }, hidden: ['notes'] });
    expect(hook.result.current.draft.notes).toBe('');
    expect(draftFields(first.values, hook.result.current.draft, first.values, ['notes']).map(field => field.key)).not.toContain('notes');
    expect(draftPatch(first.values, hook.result.current.draft, ['notes'])).toEqual({ name: 'Mine' });
});
it('F05-style save completion preserves edits made after submission and commits the authoritative version', () => {
    const hook = renderHook(harness, { initialProps: first });
    const submitted = { ...first.values, name: 'Submitted' };
    act(() => hook.result.current.setDraft(submitted));
    act(() => hook.result.current.setDraft({ ...submitted, name: 'Typed later' }));
    act(() => { expect(hook.result.current.editor.committed({ version: 2, values: submitted }, submitted)).toBe(false); });
    expect(hook.result.current.editor.baseline?.version).toBe(2);
    expect(hook.result.current.draft.name).toBe('Typed later');
    expect(hook.result.current.editor.dirty).toBe(true);
});
it('fingerprints ignore object key order but preserve array order, null and empty values', () => {
    expect(draftEqual({ a: 1, b: '' }, { b: '', a: 1 })).toBe(true);
    expect(draftEqual(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(draftEqual(null, '')).toBe(false);
    expect(preserveLaterEdits(first.values, { ...first.values, notes: 'Later' }, { ...first.values, name: 'Saved' })).toEqual({ ...first.values, name: 'Saved', notes: 'Later' });
});
it('F01 releases a dismissed editor baseline before reopening the same resource with newer data', () => {
    const hook = renderHook(({ identity, source }: { identity: string; source?: DraftSnapshot<Values> }) => {
        const [draft, setDraft] = useState(first.values);
        return { draft, setDraft, editor: useVersionedDraft({ identity, source, draft, apply: setDraft, refresh: async () => undefined }) };
    }, { initialProps: { identity: 'resource', source: first } });
    act(() => hook.result.current.setDraft({ ...first.values, name: 'Discarded' }));
    hook.rerender({ identity: 'closed', source: undefined });
    expect(hook.result.current.editor.baseline).toBeNull();
    hook.rerender({ identity: 'resource', source: { version: 2, values: { ...first.values, name: 'Latest' } } });
    expect(hook.result.current.draft.name).toBe('Latest');
    expect(hook.result.current.editor.dirty).toBe(false);
});

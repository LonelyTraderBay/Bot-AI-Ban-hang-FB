import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
    document: dom.window.document,
    HTMLInputElement: dom.window.HTMLInputElement,
    HTMLSelectElement: dom.window.HTMLSelectElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
    HTMLFormElement: dom.window.HTMLFormElement,
});

let drafts;
let stopObserving;
before(async () => {
    drafts = await import('../../apps/web/src/shared/model/dirty-drafts.ts');
    stopObserving = drafts.observeFormSubmissions(document);
});
after(() => {
    stopObserving?.();
    dom.window.close();
});

test('detects changed form controls but excludes the shell search form', () => {
    document.body.innerHTML = '<main><form><input aria-label="Tên" value="Mẫu"></form><form><input aria-label="Tìm kiếm" value=""></form></main>';
    const name = document.querySelector('input[aria-label="Tên"]');
    const search = document.querySelector('input[aria-label="Tìm kiếm"]');
    name.value = 'Bản nháp';
    search.value = 'Tìm màn hình';
    assert.equal(drafts.hasUnsavedFormDraft(), true);
    name.value = 'Mẫu';
    assert.equal(drafts.hasUnsavedFormDraft(), false);
});

test('detects dialog drafts through the shared EditDialog dirty marker', () => {
    document.body.innerHTML = '<div role="dialog"><input type="checkbox"><select><option value="a" selected>A</option><option value="b">B</option></select><textarea>Ghi chú</textarea></div>';
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(drafts.hasUnsavedFormDraft(), false);
    dialog.dataset.draftDirty = 'true';
    assert.equal(drafts.hasUnsavedFormDraft(), true);
    delete dialog.dataset.draftDirty;
    assert.equal(drafts.hasUnsavedFormDraft(), false);
});

test('rebases a successfully submitted form but keeps edits after a failed submit', () => {
    document.body.innerHTML = '<main><form><input value="Mẫu"></form><button>Đi nơi khác</button></main>';
    const form = document.querySelector('form');
    form.querySelector('input').value = 'Đã sửa';
    assert.equal(drafts.hasUnsavedFormDraft(), true);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    assert.equal(drafts.consumeFormSubmissionNavigation(), false);
    drafts.markDraftClean(form);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    assert.equal(drafts.consumeFormSubmissionNavigation(), true);
    assert.equal(drafts.hasUnsavedFormDraft(), false);
    assert.equal(form.dataset.draftClean, 'true');
    form.querySelector('input').value = 'Sửa thêm';
    form.querySelector('input').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    assert.equal(drafts.hasUnsavedFormDraft(), true);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    document.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true }));
    assert.equal(drafts.consumeFormSubmissionNavigation(), false);
    assert.equal(drafts.hasUnsavedFormDraft(), true);
});

test('a saved form does not hide a separate dirty dialog draft', () => {
    document.body.innerHTML = '<main><form><input value="Mẫu"></form></main><div role="dialog"><textarea>Ghi chú</textarea></div>';
    const form = document.querySelector('form');
    const name = form.querySelector('input');
    const note = document.querySelector('textarea');
    name.value = 'Đã lưu';
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    assert.equal(drafts.consumeFormSubmissionNavigation(), false);
    drafts.markDraftClean(form);
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    assert.equal(drafts.consumeFormSubmissionNavigation(), true);
    assert.equal(drafts.hasUnsavedFormDraft(), false);
    note.value = 'Ghi chú chưa lưu';
    note.closest('[role="dialog"]').dataset.draftDirty = 'true';
    assert.equal(drafts.hasUnsavedFormDraft(), true);
});

test('F06 successful submit cannot bypass a later controlled edit or another dirty form', () => {
    document.body.innerHTML = '<main><form id="saved"><input value="A"></form><form id="other"><input value="B"></form></main>';
    const saved = document.querySelector('#saved');
    const other = document.querySelector('#other');
    drafts.markDraftClean(saved);
    saved.dispatchEvent(new dom.window.Event('submit', { bubbles: true }));
    drafts.setDraftDirty(other, true);
    assert.equal(drafts.consumeFormSubmissionNavigation(), false);
    assert.equal(drafts.hasUnsavedFormDraft(), true);
});

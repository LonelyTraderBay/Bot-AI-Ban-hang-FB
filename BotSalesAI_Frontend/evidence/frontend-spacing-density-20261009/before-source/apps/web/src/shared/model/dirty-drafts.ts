import { useCallback } from 'react';
type DraftControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/** Controlled editors report semantic dirty state, including arrays and non-input controls. */
export function useDraftForm(dirty: boolean) {
    return useCallback((form: HTMLFormElement | null) => {
        if (!form) return;
        setDraftDirty(form, dirty);
        if (!dirty) markDraftClean(form);
    }, [dirty]);
}

let pendingSubmitAt = 0;
let pendingSubmitForm: HTMLFormElement | null = null;

function isDirty(control: DraftControl) {
    if (control.disabled)
        return false;
    if (control instanceof HTMLInputElement) {
        if (['button', 'hidden', 'reset', 'submit'].includes(control.type))
            return false;
        if (control.type === 'checkbox' || control.type === 'radio')
            return control.checked !== control.defaultChecked;
        if (control.type === 'file')
            return control.files?.length ? control.files.length > 0 : false;
    }
    if (control instanceof HTMLSelectElement)
        return Array.from(control.options).some(option => option.selected !== option.defaultSelected);
    return control.value !== control.defaultValue;
}

function controlsIn(scope: ParentNode) {
    const controls = new Set<DraftControl>();
    for (const control of scope.querySelectorAll<DraftControl>('input, select, textarea'))
        controls.add(control);
    return [...controls];
}

/** Captures the values visible when an editor opens as the baseline for guard decisions. */
export function captureDraftBaseline(root: ParentNode) {
    for (const control of controlsIn(root)) {
        if (control instanceof HTMLInputElement) {
            if (control.type === 'checkbox' || control.type === 'radio')
                control.defaultChecked = control.checked;
            else if (control.type !== 'file')
                control.defaultValue = control.value;
        }
        else if (control instanceof HTMLSelectElement) {
            for (const option of control.options)
                option.defaultSelected = option.selected;
        }
        else
            control.defaultValue = control.value;
    }
}

/** Marks a successfully persisted form clean and resets its comparison baseline. */
export function markDraftClean(form: HTMLFormElement) {
    form.dataset.draftClean = 'true';
    delete form.dataset.draftDirty;
    captureDraftBaseline(form);
}

/** Marks controlled React forms whose live values cannot be compared via DOM defaults. */
export function setDraftDirty(form: HTMLFormElement | null, dirty: boolean) {
    if (!form)
        return;
    if (dirty) {
        delete form.dataset.draftClean;
        form.dataset.draftDirty = 'true';
    }
    else
        delete form.dataset.draftDirty;
}

/** Detects unsaved native controls without persisting or inspecting their values. */
export function hasUnsavedFormDraft(root: ParentNode = document) {
    if (root !== document)
        return controlsIn(root).some(isDirty);

    const forms = Array.from(root.querySelectorAll<HTMLFormElement>('main form'))
        .filter(form => !form.dataset.draftClean && !form.querySelector('input[aria-label="Tìm kiếm"]'));
    const dialogs = Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"]'))
        .filter(dialog => !dialog.dataset.draftClean);
    return forms.some(form => form.dataset.draftDirty === 'true' || controlsIn(form).some(isDirty)) || dialogs.some(dialog => dialog.dataset.draftDirty === 'true');
}

/** Lets a successful async form submit navigate without masking a later edit. */
export function observeFormSubmissions(root: Document = document) {
    const markSubmitted = (event: Event) => {
        if (event.target instanceof HTMLFormElement) {
            pendingSubmitAt = Date.now();
            pendingSubmitForm = event.target;
        }
    };
    const markEdited = (event: Event) => {
        const target = event.target;
        if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)
            delete target.form?.dataset.draftClean;
    };
    const clearSubmission = () => { pendingSubmitAt = 0; pendingSubmitForm = null; };
    root.addEventListener('submit', markSubmitted, true);
    root.addEventListener('input', markEdited, true);
    root.addEventListener('change', markEdited, true);
    root.addEventListener('pointerdown', clearSubmission, true);
    root.addEventListener('keydown', clearSubmission, true);
    return () => {
        root.removeEventListener('submit', markSubmitted, true);
        root.removeEventListener('input', markEdited, true);
        root.removeEventListener('change', markEdited, true);
        root.removeEventListener('pointerdown', clearSubmission, true);
        root.removeEventListener('keydown', clearSubmission, true);
        pendingSubmitAt = 0;
        pendingSubmitForm = null;
    };
}

export function consumeFormSubmissionNavigation(root: ParentNode = document) {
    if (!pendingSubmitAt || Date.now() - pendingSubmitAt > 60_000) {
        pendingSubmitAt = 0;
        pendingSubmitForm = null;
        return false;
    }
    const form = pendingSubmitForm;
    pendingSubmitAt = 0;
    pendingSubmitForm = null;
    if (!form || !root.contains(form))
        return false;
    return form.dataset.draftClean === 'true' && !hasUnsavedFormDraft(root);
}

# UI010 source and regression inventory

Date: 2026-10-03. Scope: React frontend with the synthetic MSW demo only.

## Existing behavior and coverage

`apps/web/src/shared/ui/components.tsx` owns the shared `EditDialog` and `ConfirmDialog` behavior. `ConfirmDialog` owns its `reason` value locally. Module screens keep the shared component mounted and control visibility with `open`, so closing a confirmation does not unmount the component. Before this task, the reason was cleared after successful confirmation, but there was no reset when the user closed the dialog after discarding a dirty draft.

The source has 20 `<ConfirmDialog>` call sites across 14 modules. The reason field is used for consequential actions including inbox takeover, order cancellation, finance posting/reversal, procurement cancellation, integration disconnect, AI pause, and knowledge review/retirement. The shared close behavior therefore affects multiple frontend routes; API contracts and command semantics are outside this UI fix.

Relevant existing tests established adjacent requirements:

| Existing test | What it proves | Missing case before UI010 |
|---|---|---|
| `tests/states/fe023.spec.ts` — dirty dialog keeps the form value until discard is confirmed | A dirty EditDialog preserves the draft while the user chooses Continue or Discard | Does not assert that a discarded draft is empty on the next opening, or focus return after nested discard confirmation |
| `tests/fe016.spec.ts` — FE016.S03 stale takeover preserves reason after 412 | ConfirmDialog keeps the reason and dialog open on a confirmed version conflict | Does not cover explicit discard or reopen lifecycle |
| `tests/fe011.spec.ts` — FE011.AC05 restores focus after inventory adjustment dialog | MUI returns focus after closing a simple EditDialog | Does not cover closing the parent while the nested dirty-draft warning is open |
| `tests/states/fe023.spec.ts` — saved shop form reports success and resets dirty baseline | A successful form save reports success and updates the dirty baseline | Does not cover ConfirmDialog local draft lifecycle |

## Reproduced gap

The new browser case in `tests/ui010-dialog-draft.spec.ts` opens the Inbox takeover confirmation, enters a reason, chooses Cancel, then confirms **Bỏ thay đổi**. Before the fix, the reason remained when the dialog reopened. The same run also showed `document.activeElement` was not the original **Tiếp quản** trigger after the nested warning and parent dialog closed together.

The cause was local state ownership plus close ordering: `ConfirmDialog` stayed mounted with its reason value, and `EditDialog.discardChanges()` closed the warning and parent in the same render. MUI's nested focus restoration then lost the outer dialog's original return target.

## Intended boundary

Reset the confirmation reason whenever the controlled dialog is closed. After an explicit discard, let the nested warning finish its exit before closing the parent, so the focus trap can restore focus in sequence. Preserve the existing behavior on 409/412/422/unknown outcomes: keep the dialog and input available unless the command succeeds or the user explicitly discards. Do not alter API, command protocol, or module imports.

# UI012/S35 — visual-state recheck on current React source

**Ngày:** 04/10/2026 · **Phạm vi:** local React demo + synthetic MSW · **Kết luận:** bounded AI visual review only; UI012 remains 4/5, C04 PARTIAL.

## Kết quả quan sát

- **R04 Dashboard, 1440×1000 CSS px:** sampled CTA is visible in default/hover/pressed states. The keyboard pass reaches the CTA with `:focus-visible` and a solid 2 px gold outline. Current screenshots show distinct default, hover and pressed appearances; this supersedes the S22 observation that hover and pressed were identical on that earlier source snapshot. The CTA crop has 6,762–6,764 changed pixels pairwise in the recorded screenshots; crop means are approximate summary values, not contrast ratios. See [state-diff JSON](S35-dashboard-cta-state-diff-20261004.json) and [default](S35-overview-default.png), [hover](S35-overview-hover.png), [pressed](S35-overview-pressed.png), [keyboard focus](S35-overview-keyboard-focus.png).
- **R04 icon-only controls:** five sampled controls expose DOM-derived names: “Đăng xuất”, “Thông báo” and three “Sao chép mã đơn hàng” buttons. This confirms names in the DOM only; it does not verify their spoken output.
- **R23 Knowledge synthetic 422:** the named dialog remains open, error alert is visible, form values are retained, one field is `aria-invalid`, and focus is on the `content` field. The localized alert says “Trường Nội dung: Hãy rà soát nội dung nguồn.” The screenshot shows the alert and focused textarea without clipping at this viewport. See [R23 capture](S35-knowledge-synthetic-422.png) and [capture manifest](S35-visual-state-review-capture.json).
- The capture command exited **0** on Node 24.19.0. Source hashes, command and revision are in the [run log](S35-current-visual-review-20261004.log); the reusable [capture script](S35-capture-current-visual-states-20261004.mjs) writes only new S35-named evidence.

## Phạm vi còn thiếu

This is an AI review of two desktop compositions, not a human signoff or a broad review of all 54 routes, dialogs, menus, selects, tables, file inputs, roles and error/interaction states. The tool session exposed no controllable native app or screen-reader speech/transcript capture. Although Windows `Narrator.exe` exists, no Narrator output was observed or recorded. The accessibility tree and DOM labels are not speech evidence. No backend/provider request or persistent write was made.

**Paired result:** `UI: PASS` only for the observations above; `ARCH: PRESERVED`, with no React, contract, route, permission, token, generated source or tracker change. The old S22 hover/pressed candidate is no longer observed on S35; this closes that sampled P2 observation only, not UI012.C04. Keep UI012 at **4/5 / C04 PARTIAL** and FE-G05 open pending actual screen-reader speech/transcript plus broad human review. No checkpoint or FE/product ledger changes.

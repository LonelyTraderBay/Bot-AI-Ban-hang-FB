# 15 — Rủi ro, dữ kiện còn thiếu và chặn đúng chỗ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Design decisions already approved: A–H scope, dark-only, four roles, PWA+Telegram, bounded automatic order confirmation, purchase draft default, professional management finance, no autonomous bank transfer or ad spend. Do not re-ask these each session.

Unknowns are explicit at execution/owner-inputs.json: country/base currency/hours/actual responsible people/hosting budget+region/IdP/Meta+AI grants/device consent/carrier+supplier mode/finance policy/purchase cap/retention/workload+SLO+recovery/release authority. AI resolves harmless reads when possible before asking. Null means unknown, not zero or not applicable. Concrete provider credentials cannot be synthesized from public docs.

Risk responses: no phone ack means unclaimed task, not assumed seen; no data to forecast means static threshold with label; no exact bank matching means review, not guessed paid; unknown supplier send means reconcile, not new PO. User marketing freedom does not remove human physical fulfillment or authorization accountability. 24/7 target depends actual infra/on-call/service policies; no uptime warranty in doc.

Input gates block specific live actions, not local implementation of adapters/simulators. Missing legal approval for live ledger does not stop dark UI/layout/typed local tests. Missing budget for auto_send keeps draft mode functional and must not lead to unlimited budget. Feature explicitly deferred/disabled can only leave mandatory plan with new scoped approval and history; not by changing required=false to make completion higher.

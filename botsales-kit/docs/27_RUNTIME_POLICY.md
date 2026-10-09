# 27 — Cấu hình live, an toàn mặc định và quyền được giao

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

| Setting | Default before real setup | May activate when |
|---|---|---|
| Theme | dark-only, immutable product decision | no other theme in scope |
| Messenger auto reply | disabled until connected + tested policy | Actual page scopes and provider permissions granted |
| Auto confirm eligible order | policy implementation enabled in tests; live gated | customer confirmation + quote + stock + payment/COD/shop rules valid |
| Notification delivery | in-app demo only; live subscriptions empty | real device consent, HTTPS, test and recipient policy |
| Telegram fallback | chosen design, not connected | one-time pairing and secret backend grant |
| Reminders/digest | disabled until real schedule/recipients/limits | owner settings reviewed, worker healthy |
| Purchase mode | draft_for_approval | owner may separately activate auto_send rule with nonnull caps |
| Purchase automatic money transfer | unavailable | outside this baseline; needs separate approved integration |
| Actual refund/bank transfer | not a tool | approval + separate real flow not inferred from UI acceptance |
| Revenue policy/currency/retention | unconfigured for real shop | explicit business/professional confirmation |
| Provider failover | none unless allowed list policy | compatible tested model + data/privacy/budget approval |
| Marketing | analytics/suggestions only | auto spend/publish not in this scope |
| Production deploy | forbidden by default | T081 authentic approval and verified artifact |

Runtime policies are product records, not AI_RULES Universal. Controlled changes need version/diff/approval scope; do not let LLM update rules by suggesting a text. Demo settings visible with synthetic label do not populate production. Prompt returning permission=true is never permission.

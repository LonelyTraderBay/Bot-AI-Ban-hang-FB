# 07 — Admin AI, dữ liệu và kênh Facebook

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Provider boundary
Four business roles use one provider abstraction; adapter catalog declares protocol, tool/vision/audio/structured output/streaming support and limits, data region policy and tested version. API-key field is write-only to server secret store, responses only fingerprint/health. OpenAI-compatible is an API family, not a guarantee every provider works identically. Custom endpoints need HTTPS allowlist, DNS/private/metadata address protections and no unsafe redirects. Lock model/provider price source at evaluation; unknown prices are unknown, not zero.

## Sales execution
Detect customer need → retrieve current published knowledge with tenant/customer boundaries → read catalog/quote through scoped tools → respond with checked price/availability → gather required address/contact → present exact quote summary → record customer confirmation → deterministic confirm-order policy. A model cannot set `confirmed=true` to synthesize proof. Coupons/combo/discount floor are published rules with dates. Missing data, complaint, policy mismatch or request for human leads to handoff WorkItem.

## Knowledge vs memory
Published shop knowledge, live product/stock/price, private customer memory and raw chat are separate stores/purposes. Ingest untrusted input with file/type/size/scan/redaction; prompt instructions inside documents/messages are data, not authority. Feedback becomes draft correction, human-reviewed and evaluated before publish. Store model/prompt/knowledge/price/permission/policy versions in evaluation and side-effect audit. Retirement/deletion must stop future retrieval promptly.

## Channel constraints
24/7 means backend worker availability target, not unlimited right to message. Meta's official collection lists Page token/message permission and standard 24-hour recipient condition [N10]. Backend computes eligibility and blocks unsupported send; UI displays reason. Comments/media/private replies need actual permissions/API support and tests, not assumed from Messenger enablement. Image transfer receipt is not verified payment; voice address transcript requires confirmation.

Takeover increments conversation generation; revalidate before every send to prevent human+bot double reply. External send timeout is unknown, not a reason for a second message. No bulk promotional messages from service reply consent. Respect marketing opt-out and suppression checks again at execution time.

## Evaluation and release
Use curated golden cases and adversarial cases for fake consent, stock/price mismatch, prompt injection, forbidden refunds, handoff, media and policy-window errors. Keep actual sample counts and sources; model self-reported confidence is not measured accuracy. Owner/risk-approved threshold per enabled feature, not arbitrary universal 100%. Critical invariants must not be traded for high average response quality. Pause/cap/fallback policies tested before actual API deployment. OWASP Excessive Agency guides least authority and downstream verification [N11].

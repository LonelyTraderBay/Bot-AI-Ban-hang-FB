# 10 — Kiểm thử và tiêu chí nghiệm thu

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Levels of proof
Kit validator: files, references, JSON/schema, tracker corruption handling. Prototype tests: rendered UI and local state interactions. Local product: actual React/Nest/database/worker source+network; mocked external adapters labeled. Staging integration: granted provider accounts and actual devices. Production readiness: security, concurrency, observability, recovery and business approval on release artifact. No level substitutes for another.

## Mandatory families
Contract response/request validation; tenant read/write/callback/search/export tests; concurrency last-stock/order claim/budget/period close; property ledger money/journal balance; state transitions and out-of-order events; unknown side-effect reconciliation; queue restart/redis-loss/outbox replay; knowledge injection/stale revocation; privacy deletion and restore. UI focus/keyboard/responsive/zoom/offline/stale/failed/unknown/403 across all enabled routes. Fake adapter tests must throw/timeout/accept-then-timeout, not only success.

## Golden business fixtures
Sale: 10 units at 100000 VND cost, sell 2 at 150000, COD carrier fee 20000 and remit 280000. Gross margin 100000, management profit 80000, AR carrier zero only after full settlement, cash independent of inventory acquisition. Purchasing: suggestion after threshold with an existing open PO, partial receipt and damaged unit. Returns: one sold unit returning, no available until inspected, refund obligation independent of cash transferred. Explicit examples in fixtures/finance-golden.json and docs/24.

## Evidence schema and gates
Use execution/plan.json per-checkpoint evidence kind; real-device steps require real device info/observations, not screenshot of phone frame. `execution/progress.json` initially zero. Validator checks evidence path/hash and source snapshot and command registration. It cannot know whether someone fabricated observed output; reviewer/CI needs actual checks. A skip/unrun/zero-test success cannot pass mandatory test. Missing external account or budget is BLOCKED only relevant task; ready independent tasks can proceed.

Feature scenarios SC2-A01…SC2-H08 are intended tests, NOT test results. Core v1 scenarios are historical until mapped in T062/T066. Mandatory acceptance route×operation×invariant matrix produced from actual tests, no screenshot-only coverage. Mutation tests must catch removing guard/dedupe/tenant checks. Re-run impacted checks after source/contract/policy/dependency merge changes; stale evidence cannot count. No arbitrary coverage percentage replaces behavioral tests.


Core regressions hiện hành: fixtures/core-acceptance-scenarios.json (55 SC-*); bổ sung scope A–H: fixtures/acceptance-scenarios.json (64 SC2-*); code/dark QA: governance/acceptance-scenarios.json. Tất cả là đặc tả NOT_RUN_PRODUCT_TEST cho đến khi task tương ứng có evidence thật.

## Cổng màu đã duyệt

QA-025..030 ở governance/acceptance-scenarios.json bổ sung cho QG-04/05/06/07/12: quyết định và hash token đúng; output không drift; semantic colors không tráo nghĩa; boot/portal/mobile cùng theme; giữ tiến độ và ngoại lệ accessibility. Các ca sản phẩm vẫn NOT_RUN_PRODUCT_TEST. `scripts/validate-release.py` chỉ kiểm đồng bộ artifact trong kit; source/app thật phải được kiểm ở T010 và các task liên quan.

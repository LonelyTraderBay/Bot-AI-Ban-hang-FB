# 25 — Trưởng nhóm và bốn vai trò vận hành

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Roles are business identities with capability lists, model connection, knowledge version, human owner, current generation and budgets. Common orchestration infra schedules typed jobs; not four always-running LLMs talking to each other. Admin AI can read/draft/eligible-confirm order. Accounting role reads/labels/explains; posting triggered by deterministic finance services. Warehouse drafts purchase or sends under explicitly activated rule. Supervisor detects/assigns/escalates/summarizes with policy validation. Agent cannot approve its own role/amount increases or impersonate human.

## Work management
One WorkItem per source business intent; prep boards/notification cards are projections of same task. State queued/claimed/working/blocked/completed/cancelled, assignee, dueAt, source ref+version. Leader checks unsolved chat, unclaimed order, late delivery, stock shortage, pending receipt/payment mismatch. Cooldowns/dedupe/generation prevent endless repeated tasks. Source cancellation closes inappropriate jobs; completed task has actual evidence, not model said done.

## Approval model
Canonical intent hash built from exact action/tenant/resource/lines/amount/currency/supplier/policyVersion/resourceVersion; owner review shows diff/impact. Approved bound token is single-use, expires, revoked on changes. Delayed execution rechecks current policy and actor delegation. Batch approve evaluates each row and leaves invalid rows with reasons; no all-or-nothing hidden failures unless business requires transaction. Silence not approval. Human review can be shop owner; no fake second employee requirement for a one-person shop.

## Dashboard and digest
Owner sees things requiring decision, deadlines and accountable person; drill-down into evidence and recommendation. Four role cards display actual readiness/not configured/paused/degraded, never fake numeric trust score. Digest configurable time/recipient/business timezone and low-noise grouping; disabled until set. Detail includes completed/blocked/new risks and financial source snapshots. Creating schedule definition doesn't mean it's running until worker integration verified.

## Budget / Stop
Separate AI spend, message channel quota and purchasing commitments. Estimates vs provider billed costs explicitly labeled. Fallback only to approved provider/capability/data region. Pause per shop/role/conversation increments generation; checked before side effects and running output dispatch. Cannot recall already sent Meta/PO, UI displays accepted/unknown results. Runbook links and genuine health check age determine readiness.

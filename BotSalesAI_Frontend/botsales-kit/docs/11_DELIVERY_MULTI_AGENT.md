# 11 — Phối hợp AI và bàn giao không lệch code

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

One coordinator owns canonical contracts, routing root, design tokens, lockfile, migrations and CI. Default task loop is sequential. Do not spawn multiple agents or copy tracker branches and assume tasks locked globally. A .progress.lock prevents concurrent writes to THIS file in THIS filesystem only. Parallel branch work needs real coordinator assignment, isolated worktree/db ports/queues and integration authority. Do not auto-steal abandoned task.

Before task start read task card + direct dependencies evidence + real code, list exact write scope and source revision. Public interface change first updates canonical contract, generation and consumers; don't handwrite temporary DTO in each module. Missing requirement not excuse to invent a second UI kit or global utils service. Follow CODE rules and target repo formatting, not subjective redesign.

Each handoff records actual changed paths, commands/cwd/exit/test counts, artifact digest, unresolved issues and next eligible task. New session verifies source and stale evidence before resume; no trust in chat memory over repo. Do not keep retrying failed command infinitely or ask owner to repeat approved A–H scope. Ask only real material inputs when necessary; document blockers and continue unrelated ready tasks.

Agent can work through eligible tasks within granted local repo tools and active session. This plan is not a daemon: after session/tool/compute ends, save SESSION_HANDOFF. Do not promise background development or automatic continuation without an actual configured runner. No force push/merge/deploy/production mutation inferred from file presence.

# FE020 — Handoff

## Implemented against canonical source

- R37 task actions are shown from each `WorkItem.allowedActions`; the mock validates both `claim`/notification acknowledgement and `updateWorkItem` actions, checks current version/state, and returns updated capabilities after supported transitions.
- R38 opens the canonical `getApproval` detail before a decision. The page uses the detail version, exact intent hash, policy/resource version, requester, and expiry; expiry compares with API `meta.asOf`. A stale source purchase remains pending and the decision reason stays visible after the mock rejects it.
- R52 shows digest ID/version/created-updated time/source references and integration health as unknown with explicit synthetic copy. Role pause/resume uses the canonical versioned `controlAutomation` operation and `bot.pause`; resume returns to `not_configured` in the mock.
- Mock summary and digest panels retain separate query states so an error remains scoped to its pane. The health fixture remains unknown; partial-load behavior was not separately fault-injected in the final FE020 browser run.

## Deliberate contract gap

The current canonical OpenAPI has `listDigests` but no operation to create or update digest schedules. The page keeps that gap visible and does not simulate scheduling or claim a worker is running. Real backend, provider, worker, CI, staging, and user acceptance are outside this frontend mock verification.

## Verification

- `S01-source-map.log`: R37/R38/R52 operation and permission mapping, 2/2 checks.
- `S05-e2e.log`: FE020 browser scenarios, 3/3 passed in Chromium against the React demo and synthetic MSW API.
- `S04-typecheck.log`, `S04-lint.log`, `S04-boundaries.log`, `S04-generate-check.log`, `S04-unit.log`, and `S04-domain.log`: current local frontend checks passed.
- `S04-build.log`: production build passed; Vite reported the existing 719.57 kB chunk warning above its 500 kB advisory threshold.
- A combined FE014 + FE020 regression run had one FE014 partial-receipt test fail to find stock row `MU-006`; the same FE014 test passed when rerun alone (`S04-fe014-isolated.log`). FE020's focused browser suite passed. This isolated-suite observation does not establish the root cause.

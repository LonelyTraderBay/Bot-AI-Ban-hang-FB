# Danh sách từng file trong phạm vi rollout UI

**Snapshot:** 2026-10-06T14:24:24.121Z · **356 entries:** 355 workspace +1 active parent workflow.

Bản đọc sinh từ [inventory.json](inventory.json); tái lập bằng [render-file-index.mjs](render-file-index.mjs) sau khi refresh inventory. Đây là navigation, không tracker/verdict mới. Owner/edit policy/required checks/full SHA-256 ở JSON. Mỗi file giữ NOT_RUN_THIS_DOCS_TURN cho implementation assessment; KEEP_VERIFY không tự PASS. Route count là conservative static impact, không browser coverage.

Quy trình: [standard §0](../../../docs/FRONTEND_SPACING_STANDARD.md#unified-workflow); thứ tự: [plan §16](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Quyền edit/treatment phân biệt generated/reference/vendor/runtime. File deleted xử lý riêng, không khôi phục dirty deletion. Excluded families có count/reason tại [coverage-review](coverage-review.md) và JSON.

## active-external-workflow — 1 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [../.github/workflows/frontend.yml](../../../../.github/workflows/frontend.yml) | TOOLING_VERIFY | S04, S18, S19 | 0 |

## app-shell-entry-css-or-types — 14 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/src/app/bootstrap.css](../../../apps/web/src/app/bootstrap.css) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/CommandRecovery.tsx](../../../apps/web/src/app/CommandRecovery.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/dirty-drafts.ts](../../../apps/web/src/app/dirty-drafts.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/feedback.tsx](../../../apps/web/src/app/feedback.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/i18n.ts](../../../apps/web/src/app/i18n.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/locales/vi/customers.ts](../../../apps/web/src/app/locales/vi/customers.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/locales/vi/knowledge.ts](../../../apps/web/src/app/locales/vi/knowledge.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/navigation.ts](../../../apps/web/src/app/navigation.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/router.tsx](../../../apps/web/src/app/router.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/ScopeEvents.tsx](../../../apps/web/src/app/ScopeEvents.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/SessionProvider.tsx](../../../apps/web/src/app/SessionProvider.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/app/Shell.tsx](../../../apps/web/src/app/Shell.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/main.tsx](../../../apps/web/src/main.tsx) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 54 |
| [apps/web/src/vite-env.d.ts](../../../apps/web/src/vite-env.d.ts) | KEEP_VERIFY | S04, S05, S07, S08, S09, S15, S16, S19 | 0 |

## canonical-contract-token-or-acceptance-input — 18 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/contracts/events.schema.json](../../../botsales-kit/contracts/events.schema.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/feature-catalog.json](../../../botsales-kit/contracts/feature-catalog.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/migration-map.json](../../../botsales-kit/contracts/migration-map.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/openapi.json](../../../botsales-kit/contracts/openapi.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/permission-catalog.json](../../../botsales-kit/contracts/permission-catalog.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/route-manifest.json](../../../botsales-kit/contracts/route-manifest.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/contracts/source-register.json](../../../botsales-kit/contracts/source-register.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/design/decision.json](../../../botsales-kit/design/decision.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/design/IMPLEMENTATION_NOTES.md](../../../botsales-kit/design/IMPLEMENTATION_NOTES.md) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/design/PALETTE.md](../../../botsales-kit/design/PALETTE.md) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/design/tokens.json](../../../botsales-kit/design/tokens.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/fixtures/acceptance-scenarios.json](../../../botsales-kit/fixtures/acceptance-scenarios.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/fixtures/core-acceptance-scenarios.json](../../../botsales-kit/fixtures/core-acceptance-scenarios.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/fixtures/core-v1-scenarios-reference.json](../../../botsales-kit/fixtures/core-v1-scenarios-reference.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/fixtures/finance-golden.json](../../../botsales-kit/fixtures/finance-golden.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/governance/acceptance-scenarios.json](../../../botsales-kit/governance/acceptance-scenarios.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/governance/project-policy.json](../../../botsales-kit/governance/project-policy.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |
| [botsales-kit/governance/quality-gates.json](../../../botsales-kit/governance/quality-gates.json) | KEEP_VERIFY | S03, S04, S08, S14, S19 | 0 |

## canonical-frontend-plan — 1 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/execution/frontend-plan.json](../../../botsales-kit/execution/frontend-plan.json) | KEEP_VERIFY | S02, S03, S14, S20 | 0 |

## derived-kit-input-view — 3 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/contracts/openapi.yaml](../../../botsales-kit/contracts/openapi.yaml) | GENERATE_VERIFY | S03, S04, S08, S14 | 0 |
| [botsales-kit/contracts/operation-index.json](../../../botsales-kit/contracts/operation-index.json) | GENERATE_VERIFY | S03, S04, S08, S14 | 0 |
| [botsales-kit/design/tokens.css](../../../botsales-kit/design/tokens.css) | GENERATE_VERIFY | S03, S04, S08, S14 | 0 |

## feature-ui-or-helper — 24 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/src/modules/bot/index.tsx](../../../apps/web/src/modules/bot/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 4 |
| [apps/web/src/modules/catalog/import-file.ts](../../../apps/web/src/modules/catalog/import-file.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/catalog/imports.tsx](../../../apps/web/src/modules/catalog/imports.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/catalog/index.tsx](../../../apps/web/src/modules/catalog/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/customers/index.tsx](../../../apps/web/src/modules/customers/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 3 |
| [apps/web/src/modules/dashboard/index.tsx](../../../apps/web/src/modules/dashboard/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 1 |
| [apps/web/src/modules/finance/demo-account-preview.ts](../../../apps/web/src/modules/finance/demo-account-preview.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/finance/index.tsx](../../../apps/web/src/modules/finance/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/finance/report-explanations.ts](../../../apps/web/src/modules/finance/report-explanations.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 6 |
| [apps/web/src/modules/fulfillment/index.tsx](../../../apps/web/src/modules/fulfillment/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/inbox/conversation-components.tsx](../../../apps/web/src/modules/inbox/conversation-components.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/inbox/index.tsx](../../../apps/web/src/modules/inbox/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/integrations/index.tsx](../../../apps/web/src/modules/integrations/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/inventory/index.tsx](../../../apps/web/src/modules/inventory/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/knowledge/index.tsx](../../../apps/web/src/modules/knowledge/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 3 |
| [apps/web/src/modules/notifications/index.tsx](../../../apps/web/src/modules/notifications/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/notifications/push-capabilities.ts](../../../apps/web/src/modules/notifications/push-capabilities.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/operations/index.tsx](../../../apps/web/src/modules/operations/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 3 |
| [apps/web/src/modules/orders/demo-address-preview.ts](../../../apps/web/src/modules/orders/demo-address-preview.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 4 |
| [apps/web/src/modules/orders/index.tsx](../../../apps/web/src/modules/orders/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 4 |
| [apps/web/src/modules/procurement/index.tsx](../../../apps/web/src/modules/procurement/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 4 |
| [apps/web/src/modules/reports/index.tsx](../../../apps/web/src/modules/reports/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/reports/report-utils.ts](../../../apps/web/src/modules/reports/report-utils.ts) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 2 |
| [apps/web/src/modules/workspace/index.tsx](../../../apps/web/src/modules/workspace/index.tsx) | KEEP_VERIFY | S04, S09, S10, S11, S12, S13, S15, S16, S19 | 8 |

## frontend-ledger-or-ledger-view — 2 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/execution/frontend-progress-report.json](../../../botsales-kit/execution/frontend-progress-report.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [botsales-kit/execution/frontend-progress.json](../../../botsales-kit/execution/frontend-progress.json) | REFERENCE_READONLY | S17, S20 | 0 |

## frontend-test-fixture-or-generator — 95 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/tests/api-client.test.tsx](../../../apps/web/tests/api-client.test.tsx) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/catalog-import-file.test.ts](../../../apps/web/tests/catalog-import-file.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/components.test.tsx](../../../apps/web/tests/components.test.tsx) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/composition.test.tsx](../../../apps/web/tests/composition.test.tsx) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/dashboard-labels.test.ts](../../../apps/web/tests/dashboard-labels.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/fe021-source-map.test.ts](../../../apps/web/tests/fe021-source-map.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/format.test.ts](../../../apps/web/tests/format.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/push-capabilities.test.ts](../../../apps/web/tests/push-capabilities.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/report-utils.test.ts](../../../apps/web/tests/report-utils.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/setup.ts](../../../apps/web/tests/setup.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/states/fe023-state.test.tsx](../../../apps/web/tests/states/fe023-state.test.tsx) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [apps/web/tests/timezone.test.ts](../../../apps/web/tests/timezone.test.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/accessibility/routes.spec.ts](../../../tests/accessibility/routes.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/architecture/check-boundaries.mjs](../../../tests/architecture/check-boundaries.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/artifacts/demo-preview.spec.ts](../../../tests/artifacts/demo-preview.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/built-demo-regression.spec.ts](../../../tests/built-demo-regression.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/contracts/generator.test.mjs](../../../tests/contracts/generator.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/design/browser-audit.mjs](../../../tests/design/browser-audit.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/design/manual-contrast.mjs](../../../tests/design/manual-contrast.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/design/palette-guard.mjs](../../../tests/design/palette-guard.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/design/run-browser-audit.mjs](../../../tests/design/run-browser-audit.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/design/ui012-route-contrast-audit.mjs](../../../tests/design/ui012-route-contrast-audit.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/domain-scenarios.cjs](../../../tests/domain-scenarios.cjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe009.spec.ts](../../../tests/fe009.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe010.spec.ts](../../../tests/fe010.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe011-source-map.test.mjs](../../../tests/fe011-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe011.spec.ts](../../../tests/fe011.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe012-source-map.test.mjs](../../../tests/fe012-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe012.spec.ts](../../../tests/fe012.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe013-source-map.test.mjs](../../../tests/fe013-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe013.spec.ts](../../../tests/fe013.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe014-source-map.test.mjs](../../../tests/fe014-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe014.spec.ts](../../../tests/fe014.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe015-source-map.test.mjs](../../../tests/fe015-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe015.spec.ts](../../../tests/fe015.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe016-source-map.test.mjs](../../../tests/fe016-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe016.spec.ts](../../../tests/fe016.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe017-source-map.test.mjs](../../../tests/fe017-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe017-validation.spec.ts](../../../tests/fe017-validation.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe017.spec.ts](../../../tests/fe017.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe018-source-map.test.mjs](../../../tests/fe018-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe018.spec.ts](../../../tests/fe018.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe019.spec.ts](../../../tests/fe019.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe020-source-map.test.mjs](../../../tests/fe020-source-map.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe020.spec.ts](../../../tests/fe020.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fe021.spec.ts](../../../tests/fe021.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/fixtures/mock-network.mjs](../../../tests/fixtures/mock-network.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/frontend.spec.ts](../../../tests/frontend.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/layout-checker.test.mjs](../../../tests/layout-checker.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/route-role-matrix.spec.ts](../../../tests/route-role-matrix.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/security.spec.ts](../../../tests/security.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/session/demo-server-cache-isolation.spec.ts](../../../tests/session/demo-server-cache-isolation.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/session/demo-server.mjs](../../../tests/session/demo-server.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/session/dirty-drafts.check.mjs](../../../tests/session/dirty-drafts.check.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/source-checker.test.mjs](../../../tests/source-checker.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/states/fe023.spec.ts](../../../tests/states/fe023.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/states/generate-fe023-evidence.mjs](../../../tests/states/generate-fe023-evidence.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/states/generate-route-state-roles.mjs](../../../tests/states/generate-route-state-roles.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/states/route-empty-composition.spec.ts](../../../tests/states/route-empty-composition.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/states/route-error-composition.spec.ts](../../../tests/states/route-error-composition.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-bot-layout.spec.ts](../../../tests/ui-bot-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-catalog-layout.spec.ts](../../../tests/ui-catalog-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-composition-checker.test.mjs](../../../tests/ui-composition-checker.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-composition-layout.spec.ts](../../../tests/ui-composition-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-customers-layout.spec.ts](../../../tests/ui-customers-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-dashboard-layout.spec.ts](../../../tests/ui-dashboard-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-finance-layout.spec.ts](../../../tests/ui-finance-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-fulfillment-layout.spec.ts](../../../tests/ui-fulfillment-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-integrations-layout.spec.ts](../../../tests/ui-integrations-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-inventory-layout.spec.ts](../../../tests/ui-inventory-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-knowledge-layout.spec.ts](../../../tests/ui-knowledge-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-notifications-layout.spec.ts](../../../tests/ui-notifications-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-operations-layout.spec.ts](../../../tests/ui-operations-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-orders-layout.spec.ts](../../../tests/ui-orders-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-procurement-layout.spec.ts](../../../tests/ui-procurement-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-shell-layout.spec.ts](../../../tests/ui-shell-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui-workspace-layout.spec.ts](../../../tests/ui-workspace-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui006-lookups.spec.ts](../../../tests/ui006-lookups.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui007-query-states.spec.ts](../../../tests/ui007-query-states.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui008-integration-empty.spec.ts](../../../tests/ui008-integration-empty.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui009-scope-regression.spec.ts](../../../tests/ui009-scope-regression.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui010-dialog-draft.spec.ts](../../../tests/ui010-dialog-draft.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui011-date-time.spec.ts](../../../tests/ui011-date-time.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui012-keyboard.spec.ts](../../../tests/ui012-keyboard.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui013-url-state.spec.ts](../../../tests/ui013-url-state.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui021-permission-edge.spec.ts](../../../tests/ui021-permission-edge.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui028-w24-inbox-layout.spec.ts](../../../tests/ui028-w24-inbox-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui028-w25-reports-layout.spec.ts](../../../tests/ui028-w25-reports-layout.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui028-w28-routes.spec.ts](../../../tests/ui028-w28-routes.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui028-w29-reflow.spec.ts](../../../tests/ui028-w29-reflow.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/ui028-w30-stress.spec.ts](../../../tests/ui028-w30-stress.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/vertical-slices/fe022-flows.spec.ts](../../../tests/vertical-slices/fe022-flows.spec.ts) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/vertical-slices/generate-fe022-evidence.mjs](../../../tests/vertical-slices/generate-fe022-evidence.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/vertical-slices/generate-route-implementation.mjs](../../../tests/vertical-slices/generate-route-implementation.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |
| [tests/visual-token-checker.test.mjs](../../../tests/visual-token-checker.test.mjs) | TOOLING_VERIFY | S04, S05, S07, S08, S09, S10, S14, S15, S16, S17, S19 | 0 |

## frontend-tooling-or-gate-config — 16 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [scripts/check-boundaries.mjs](../../../scripts/check-boundaries.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/check-layout.mjs](../../../scripts/check-layout.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/check-source.mjs](../../../scripts/check-source.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/check-ui-composition.mjs](../../../scripts/check-ui-composition.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/check-visual-tokens.mjs](../../../scripts/check-visual-tokens.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/doctor.mjs](../../../scripts/doctor.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/generate.mjs](../../../scripts/generate.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/layout-exceptions.json](../../../scripts/layout-exceptions.json) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/layout-exceptions.schema.json](../../../scripts/layout-exceptions.schema.json) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/run-e2e.mjs](../../../scripts/run-e2e.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/setup.mjs](../../../scripts/setup.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/source-policy.mjs](../../../scripts/source-policy.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/test-domain.mjs](../../../scripts/test-domain.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/tools.mjs](../../../scripts/tools.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/validate-mock-schemas.py](../../../scripts/validate-mock-schemas.py) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |
| [scripts/vite-cache.mjs](../../../scripts/vite-cache.mjs) | TOOLING_VERIFY | S04, S05, S06, S07, S08, S09, S14, S17, S18 | 0 |

## generated-frontend-output — 11 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/public/app-icon.svg](../../../apps/web/public/app-icon.svg) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [apps/web/public/manifest.webmanifest](../../../apps/web/public/manifest.webmanifest) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [apps/web/src/app/tokens.css](../../../apps/web/src/app/tokens.css) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/generated.ts](../../../packages/contracts/src/generated.ts) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/index.ts](../../../packages/contracts/src/index.ts) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/operations.json](../../../packages/contracts/src/operations.json) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/permissions.json](../../../packages/contracts/src/permissions.json) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/routes.json](../../../packages/contracts/src/routes.json) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/contracts/src/schemas.json](../../../packages/contracts/src/schemas.json) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/design-tokens/src/index.ts](../../../packages/design-tokens/src/index.ts) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |
| [packages/design-tokens/src/tokens.json](../../../packages/design-tokens/src/tokens.json) | GENERATE_VERIFY | S04, S08, S18, S19 | 54 |

## generated-frontend-plan-view — 30 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/execution/FRONTEND_PROGRESS.md](../../../botsales-kit/execution/FRONTEND_PROGRESS.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE001.md](../../../botsales-kit/execution/frontend-tasks/FE001.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE002.md](../../../botsales-kit/execution/frontend-tasks/FE002.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE003.md](../../../botsales-kit/execution/frontend-tasks/FE003.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE004.md](../../../botsales-kit/execution/frontend-tasks/FE004.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE005.md](../../../botsales-kit/execution/frontend-tasks/FE005.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE006.md](../../../botsales-kit/execution/frontend-tasks/FE006.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE007.md](../../../botsales-kit/execution/frontend-tasks/FE007.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE008.md](../../../botsales-kit/execution/frontend-tasks/FE008.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE009.md](../../../botsales-kit/execution/frontend-tasks/FE009.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE010.md](../../../botsales-kit/execution/frontend-tasks/FE010.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE011.md](../../../botsales-kit/execution/frontend-tasks/FE011.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE012.md](../../../botsales-kit/execution/frontend-tasks/FE012.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE013.md](../../../botsales-kit/execution/frontend-tasks/FE013.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE014.md](../../../botsales-kit/execution/frontend-tasks/FE014.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE015.md](../../../botsales-kit/execution/frontend-tasks/FE015.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE016.md](../../../botsales-kit/execution/frontend-tasks/FE016.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE017.md](../../../botsales-kit/execution/frontend-tasks/FE017.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE018.md](../../../botsales-kit/execution/frontend-tasks/FE018.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE019.md](../../../botsales-kit/execution/frontend-tasks/FE019.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE020.md](../../../botsales-kit/execution/frontend-tasks/FE020.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE021.md](../../../botsales-kit/execution/frontend-tasks/FE021.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE022.md](../../../botsales-kit/execution/frontend-tasks/FE022.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE023.md](../../../botsales-kit/execution/frontend-tasks/FE023.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE024.md](../../../botsales-kit/execution/frontend-tasks/FE024.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE025.md](../../../botsales-kit/execution/frontend-tasks/FE025.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE026.md](../../../botsales-kit/execution/frontend-tasks/FE026.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE027.md](../../../botsales-kit/execution/frontend-tasks/FE027.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/execution/frontend-tasks/FE028.md](../../../botsales-kit/execution/frontend-tasks/FE028.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |
| [botsales-kit/IMPLEMENTATION_PLAN.md](../../../botsales-kit/IMPLEMENTATION_PLAN.md) | GENERATE_VERIFY | S02, S14, S20 | 0 |

## generated-vendor-worker — 1 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/public/mockServiceWorker.js](../../../apps/web/public/mockServiceWorker.js) | GENERATE_VERIFY | S04, S18, S19 | 54 |

## html-entry — 1 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/index.html](../../../apps/web/index.html) | KEEP_VERIFY | S04, S07, S08, S15, S19 | 54 |

## kit-validator-or-generator — 11 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/scripts/generate-reference.py](../../../botsales-kit/scripts/generate-reference.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/generate-theme.py](../../../botsales-kit/scripts/generate-theme.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/progress.mjs](../../../botsales-kit/scripts/progress.mjs) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/release_common.py](../../../botsales-kit/scripts/release_common.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/sync-release.py](../../../botsales-kit/scripts/sync-release.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/test_progress.py](../../../botsales-kit/scripts/test_progress.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/test_release.py](../../../botsales-kit/scripts/test_release.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/validate_contracts.py](../../../botsales-kit/scripts/validate_contracts.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/validate-kit.mjs](../../../botsales-kit/scripts/validate-kit.mjs) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/validate-release.py](../../../botsales-kit/scripts/validate-release.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |
| [botsales-kit/scripts/validate-theme.py](../../../botsales-kit/scripts/validate-theme.py) | TOOLING_VERIFY | S03, S14, S20 | 0 |

## policy-plan-doc-or-frontend-ledger — 63 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [AGENTS.md](../../../AGENTS.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/AGENTS.md](../../../botsales-kit/AGENTS.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/AI_RULES_PROJECT.md](../../../botsales-kit/AI_RULES_PROJECT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/ARCHITECTURE_BLUEPRINT.md](../../../botsales-kit/ARCHITECTURE_BLUEPRINT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/CHANGELOG.md](../../../botsales-kit/CHANGELOG.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/00_PROVENANCE_AND_DECISIONS.md](../../../botsales-kit/docs/00_PROVENANCE_AND_DECISIONS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/01_PRODUCT_SCOPE.md](../../../botsales-kit/docs/01_PRODUCT_SCOPE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/02_ARCHITECTURE.md](../../../botsales-kit/docs/02_ARCHITECTURE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/03_DESIGN_SYSTEM.md](../../../botsales-kit/docs/03_DESIGN_SYSTEM.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/04_SCREENS_AND_FLOWS.md](../../../botsales-kit/docs/04_SCREENS_AND_FLOWS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/05_DOMAIN_AND_INVARIANTS.md](../../../botsales-kit/docs/05_DOMAIN_AND_INVARIANTS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/06_API_AND_REALTIME.md](../../../botsales-kit/docs/06_API_AND_REALTIME.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/07_AI_AND_CHANNELS.md](../../../botsales-kit/docs/07_AI_AND_CHANNELS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md](../../../botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md](../../../botsales-kit/docs/09_STATE_AND_DATA_ACCESS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/10_TESTING_ACCEPTANCE.md](../../../botsales-kit/docs/10_TESTING_ACCEPTANCE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/11_DELIVERY_MULTI_AGENT.md](../../../botsales-kit/docs/11_DELIVERY_MULTI_AGENT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/12_OPERATIONS_RELEASE.md](../../../botsales-kit/docs/12_OPERATIONS_RELEASE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/13_EXTENSION_AND_MIGRATION.md](../../../botsales-kit/docs/13_EXTENSION_AND_MIGRATION.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/14_IMPLEMENTATION_BACKLOG.md](../../../botsales-kit/docs/14_IMPLEMENTATION_BACKLOG.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/15_RISKS_DECISION_REGISTER.md](../../../botsales-kit/docs/15_RISKS_DECISION_REGISTER.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/16_SOURCES.md](../../../botsales-kit/docs/16_SOURCES.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/17_TRACEABILITY.md](../../../botsales-kit/docs/17_TRACEABILITY.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/18_CODING_STANDARDS.md](../../../botsales-kit/docs/18_CODING_STANDARDS.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/19_DARK_ONLY_POLICY.md](../../../botsales-kit/docs/19_DARK_ONLY_POLICY.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/20_AI_BOOTSTRAP_AND_ENFORCEMENT.md](../../../botsales-kit/docs/20_AI_BOOTSTRAP_AND_ENFORCEMENT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/21_NOTIFICATIONS.md](../../../botsales-kit/docs/21_NOTIFICATIONS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/22_FULFILLMENT.md](../../../botsales-kit/docs/22_FULFILLMENT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/23_PROCUREMENT.md](../../../botsales-kit/docs/23_PROCUREMENT.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/24_FINANCE.md](../../../botsales-kit/docs/24_FINANCE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/25_OPERATIONS_AI.md](../../../botsales-kit/docs/25_OPERATIONS_AI.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/26_DATA_DICTIONARY.md](../../../botsales-kit/docs/26_DATA_DICTIONARY.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/docs/27_RUNTIME_POLICY.md](../../../botsales-kit/docs/27_RUNTIME_POLICY.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/DOCUMENT_INDEX.md](../../../botsales-kit/DOCUMENT_INDEX.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/FRONTEND_PLAN_GUIDE.md](../../../botsales-kit/execution/FRONTEND_PLAN_GUIDE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/FRONTEND_SCOPE_ADOPTION.md](../../../botsales-kit/execution/FRONTEND_SCOPE_ADOPTION.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/frontend-command-map.json](../../../botsales-kit/execution/frontend-command-map.json) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/frontend-plan-migrations/FEPLAN-001.json](../../../botsales-kit/execution/frontend-plan-migrations/FEPLAN-001.json) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/frontend-plan-migrations/FEPLAN-002.json](../../../botsales-kit/execution/frontend-plan-migrations/FEPLAN-002.json) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/execution/frontend-scope-adoption.json](../../../botsales-kit/execution/frontend-scope-adoption.json) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/PROJECT_BUILD_PROMPT_VI.txt](../../../botsales-kit/PROJECT_BUILD_PROMPT_VI.txt) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/README.md](../../../botsales-kit/README.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/RELEASE_NOTES.md](../../../botsales-kit/RELEASE_NOTES.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/scripts/requirements-validation.txt](../../../botsales-kit/scripts/requirements-validation.txt) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/START_HERE.md](../../../botsales-kit/START_HERE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/templates/AGENTS_REPO_SNIPPET.md](../../../botsales-kit/templates/AGENTS_REPO_SNIPPET.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/templates/CHECKPOINT_EVIDENCE.json](../../../botsales-kit/templates/CHECKPOINT_EVIDENCE.json) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [botsales-kit/UPGRADE.md](../../../botsales-kit/UPGRADE.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [DESIGN.md](../../../DESIGN.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/CONTINUE_FRONTEND.md](../../../docs/CONTINUE_FRONTEND.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md](../../../docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-04.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-05.md](../../../docs/FRONTEND_PLAN_DOCUMENT_AUDIT_2026-10-05.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [docs/FRONTEND_SCOPE.md](../../../docs/FRONTEND_SCOPE.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/FRONTEND_SPACING_STANDARD.md](../../../docs/FRONTEND_SPACING_STANDARD.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/FRONTEND_UI_IMPROVEMENT_PLAN.md](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/KNOWN_GAPS.md](../../../docs/KNOWN_GAPS.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [docs/PROJECT_CONTEXT.md](../../../docs/PROJECT_CONTEXT.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/route-implementation.json](../../../docs/route-implementation.json) | GENERATE_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [docs/route-state-role-matrix.json](../../../docs/route-state-role-matrix.json) | GENERATE_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [README.md](../../../README.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |
| [samples/MOCK_DATA.md](../../../samples/MOCK_DATA.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [STACK_LOCK.md](../../../STACK_LOCK.md) | REFERENCE_READONLY | S02, S03, S14, S17, S20 | 0 |
| [UX-CONTRACT.md](../../../UX-CONTRACT.md) | EDIT_VERIFY | S02, S03, S14, S17, S20 | 0 |

## public-asset-or-worker — 2 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/public/app-sw.js](../../../apps/web/public/app-sw.js) | ASSET_VERIFY | S04, S07, S08, S18, S19 | 54 |
| [apps/web/public/samples/products.csv](../../../apps/web/public/samples/products.csv) | ASSET_VERIFY | S04, S07, S08, S18, S19 | 0 |

## shared-behavior-or-model — 13 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/src/shared/api/client.ts](../../../apps/web/src/shared/api/client.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/api/client.type-contracts.ts](../../../apps/web/src/shared/api/client.type-contracts.ts) | KEEP_VERIFY | S04, S05, S19 | 0 |
| [apps/web/src/shared/api/errors.ts](../../../apps/web/src/shared/api/errors.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/api/hooks.ts](../../../apps/web/src/shared/api/hooks.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/api/intents.ts](../../../apps/web/src/shared/api/intents.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/api/validation.ts](../../../apps/web/src/shared/api/validation.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/auth.ts](../../../apps/web/src/shared/model/auth.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/dirty-drafts.ts](../../../apps/web/src/shared/model/dirty-drafts.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/download.ts](../../../apps/web/src/shared/model/download.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/filters.ts](../../../apps/web/src/shared/model/filters.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/format.ts](../../../apps/web/src/shared/model/format.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/labels.ts](../../../apps/web/src/shared/model/labels.ts) | KEEP_VERIFY | S04, S05, S19 | 54 |
| [apps/web/src/shared/model/scope.tsx](../../../apps/web/src/shared/model/scope.tsx) | KEEP_VERIFY | S04, S05, S19 | 54 |

## shared-ui-owner-or-catalog — 6 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/src/shared/ui/components.tsx](../../../apps/web/src/shared/ui/components.tsx) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 54 |
| [apps/web/src/shared/ui/composition.tsx](../../../apps/web/src/shared/ui/composition.tsx) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 54 |
| [apps/web/src/shared/ui/layout.ts](../../../apps/web/src/shared/ui/layout.ts) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 54 |
| [apps/web/src/shared/ui/README.md](../../../apps/web/src/shared/ui/README.md) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 0 |
| [apps/web/src/shared/ui/theme.ts](../../../apps/web/src/shared/ui/theme.ts) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 54 |
| [apps/web/src/shared/ui/visual.ts](../../../apps/web/src/shared/ui/visual.ts) | KEEP_VERIFY | S05, S06, S08, S09, S10, S11, S12, S13, S14, S19 | 54 |

## snapshot-or-release-metadata — 7 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [botsales-kit/DELIVERY_SUMMARY.json](../../../botsales-kit/DELIVERY_SUMMARY.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [botsales-kit/MANIFEST.sha256](../../../botsales-kit/MANIFEST.sha256) | REFERENCE_READONLY | S17, S20 | 0 |
| [botsales-kit/release.json](../../../botsales-kit/release.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [DELIVERY.json](../../../DELIVERY.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [premium-audit.json](../../../premium-audit.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [premium-ui.json](../../../premium-ui.json) | REFERENCE_READONLY | S17, S20 | 0 |
| [SHA256SUMS.json](../../../SHA256SUMS.json) | REFERENCE_READONLY | S17, S20 | 0 |

## synthetic-demo-state — 15 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [apps/web/src/mocks/auxiliary.ts](../../../apps/web/src/mocks/auxiliary.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/browser.ts](../../../apps/web/src/mocks/browser.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/catalog.ts](../../../apps/web/src/mocks/catalog.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/collections.json](../../../apps/web/src/mocks/collections.json) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/control.ts](../../../apps/web/src/mocks/control.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/database.ts](../../../apps/web/src/mocks/database.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/files.ts](../../../apps/web/src/mocks/files.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/finance.ts](../../../apps/web/src/mocks/finance.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/fulfillment.ts](../../../apps/web/src/mocks/fulfillment.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/handlers.ts](../../../apps/web/src/mocks/handlers.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/marketing-fixture.ts](../../../apps/web/src/mocks/marketing-fixture.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/orders.ts](../../../apps/web/src/mocks/orders.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/procurement.ts](../../../apps/web/src/mocks/procurement.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/seed.json](../../../apps/web/src/mocks/seed.json) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |
| [apps/web/src/mocks/service.ts](../../../apps/web/src/mocks/service.ts) | KEEP_VERIFY | S04, S15, S17, S19 | 0 |

## synthetic-sample — 3 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [samples/bank.csv](../../../samples/bank.csv) | ASSET_VERIFY | S03, S15, S19 | 0 |
| [samples/cod.csv](../../../samples/cod.csv) | ASSET_VERIFY | S03, S15, S19 | 0 |
| [samples/products.csv](../../../samples/products.csv) | ASSET_VERIFY | S03, S15, S19 | 0 |

## toolchain-config — 17 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [.env.example](../../../.env.example) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.gitignore](../../../.gitignore) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.node-version](../../../.node-version) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.npmrc](../../../.npmrc) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.nvmrc](../../../.nvmrc) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.vscode/extensions.json](../../../.vscode/extensions.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [.vscode/tasks.json](../../../.vscode/tasks.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [apps/web/package.json](../../../apps/web/package.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [apps/web/tsconfig.json](../../../apps/web/tsconfig.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [apps/web/vite.config.ts](../../../apps/web/vite.config.ts) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [apps/web/vitest.config.ts](../../../apps/web/vitest.config.ts) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [eslint.config.mjs](../../../eslint.config.mjs) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [package-lock.json](../../../package-lock.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [package.json](../../../package.json) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [playwright.built-demo.config.ts](../../../playwright.built-demo.config.ts) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [playwright.config.ts](../../../playwright.config.ts) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |
| [START_WINDOWS.cmd](../../../START_WINDOWS.cmd) | TOOLING_VERIFY | S03, S04, S05, S18, S19 | 0 |

## universal-original — 2 files

| File | Planned treatment | Steps | Routes có impact tĩnh |
|---|---|---|---:|
| [AI_RULES.md](../../../AI_RULES.md) | REFERENCE_READONLY | S02, S14, S20 | 0 |
| [botsales-kit/AI_RULES.md](../../../botsales-kit/AI_RULES.md) | REFERENCE_READONLY | S02, S14, S20 | 0 |

## Retired paths từ Git baseline

- .github/workflows/frontend.yml: RETIRED_VALIDATE; path không còn tồn tại là trạng thái dự kiến, xem retiredTreatment trong JSON.

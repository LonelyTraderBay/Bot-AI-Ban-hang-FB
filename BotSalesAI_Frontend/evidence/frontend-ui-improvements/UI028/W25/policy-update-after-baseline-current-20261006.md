# W25 policy update after immutable pre-source baseline

**Date:** 2026-10-06
**Task:** UI028.W25 — Reports
**Phase at initial capture:** pre-source edit. This addendum was refreshed after W25 source work began to record the final v1.12 policy hash; the original baseline manifest and pre-code design contract remain unchanged.

## Why this addendum exists

The user requested a durable rule so future UI work does not reintroduce scattered styling or bypass the shared design system. The original W25 design contract and render/layout baseline were captured against spacing standard v1.11. The baseline is immutable and is not rewritten to pretend the new rule existed at capture time.

Spacing standard v1.12 adds SPC-050: UI028.W01–W36 are the initial migration only; the design contract, baseline, shared semantic roles, source checks and regression gates remain mandatory for every later UI task. Any replacement or narrowing of a guard requires equivalent positive, negative and UNKNOWN fixtures plus run evidence. This rule does not change R31/R53 behavior, route/API contracts or the captured visual baseline. Before the first W25 source edit, the original contract and standard v1.12 policy were reviewed together.

Before W25 consumer edits, the v1.12 semantic table was also expanded under SPC-035 with `actions.linkTarget` (44px target, 16px horizontal and 8px vertical inset) and Reports roles: `sectionGap` (24px), `contextGap` (16px), `listSurfaceInset` (24px), `listMarkerInset` (+16px left, total text inset 40px), `listItemGap` (12px), `chartViewportInset` (16px) and `emptyStateInset` (24px). The bridge definitions use canonical token factors; the chart viewport remains 260px with its existing 16px inset, and the question list composes a 24px surface wrapper plus a 16px inner list indent.

## Immutable baseline and current document hashes

The original baseline manifest and design contract remain unchanged:

| Artifact | SHA-256 |
|---|---|
| Pre-code standard v1.11, as recorded in the baseline manifest | `7b197734417a1255c947b094b1d0c4ef9058be187a89fa7ee08cd3171d4f20df` |
| Original W25 pre-code contract | `a02b4311f0cc2ce6390d220c5e170c2922c1760214137785540545548e3cdc39` |
| W25 baseline manifest | `27a369a157a5a353b5455b2a02f9013e1e01b6d4d9dcdc0c030260cb366be948` |

Policy sources to apply before W25 implementation:

| Source | SHA-256 |
|---|---|
| `docs/FRONTEND_SPACING_STANDARD.md` v1.12, final semantic table used by W25 | `6be2405075a49425e35123c4f9bed2a50a61ae1f285885b5e6f40bc3b4256855` |
| `docs/FRONTEND_UI_IMPROVEMENT_PLAN.md` | `b34b61bffaa830d04471727bfcbc7704714fad9a728052ef574ca9dc72ea5b0b` |
| `AGENTS.md` | `63317910d29c5b0cbf6a41748db22ecc94a4e7c867bd135d323c71422c2dfeaf` |
| `apps/web/src/modules/reports/index.tsx` pre-code source hash captured in immutable baseline | `88911e0be20acb3d1a30a98169236f7392441ec2393f44bdf78663ad99e452f0` |

No route capture, source hash in the original manifest, or before-image was overwritten. The final policy and semantic roles were in place before their W25 consumer changes; current after-source hashes and test results belong in W25 closeout evidence.

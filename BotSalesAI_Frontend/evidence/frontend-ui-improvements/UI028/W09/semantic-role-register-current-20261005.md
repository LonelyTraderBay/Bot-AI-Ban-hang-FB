# UI028.W09 — Semantic role register

W09 extended the single shared bridge at `apps/web/src/shared/ui/layout.ts`; app consumers select these names and do not define spacing locally. Canonical pixels come from `botsales-kit/design/tokens.json`; numeric MUI factors stay private to the bridge.

| Role | Owner and meaning | Source / responsive behavior |
|---|---|---|
| `shell.headerHeight` | Shell header frame | `tokens.layout.headerMobile/headerDesktop`: 56 px below 768 px, 64 px from 768 px |
| `shell.mainFill` | Main column consumes remaining vertical space | `flex: 1`; replaces the old fixed `80vh` minimum |
| `shell.demoBanner` | Demo notice and controls share page gutter | 16 px mobile, 24 px tablet/desktop, 16 px before the banner |
| `shell.demoToolsBefore` | Space between demo notice and controls | 8 px |
| `shell.statusBanner` | Scope, recovery, offline and shell errors | 16/24 px horizontal inset by breakpoint, 8 px top gap |
| `shell.pageFallbackInset` | Standalone fallback page owner | 16/24 px horizontal, 24 px vertical |
| `shell.centeredFallback` | Centered API-session fallback | Same page inset; grid centering instead of viewport-height margin |
| `shell.demoControls` | Demo control flow | 8 px gap and wrapping |
| `shell.demoControl`, `shell.demoToggle` | Demo input/toggle geometry | 44 px minimum touch height from `tokens.layout.touchTarget` |
| `shell.searchIconInset` | Header search adornment | 8 px |
| `shell.footerContent` | Footer row alignment | Flex row, space-between, 8 px gap |
| `navigation.brandInset` | Brand block in 240 px rail | 16 px inline, 24 px block; 16 px keeps brand text on one line |
| `navigation.brandGap` | Brand mark to title | 12 px |
| `navigation.brandMarkShape`, `navigation.itemShape` | Canonical shell shapes | Dialog/card radii from `tokens.radius`, converted to MUI factors in the bridge; brand title uses theme `h6` |
| `navigation.shopInset` | Workspace picker owner | 16 px inline, 8 px after |
| `navigation.listInset` | Scrollable route list owner | 8 px inline, 16 px bottom |
| `navigation.groupGap` | Navigation group separation | 4 px |
| `navigation.groupLabelInset`, `navigation.groupLabelGap` | Group label owner | 12 px inline, 4 px after |
| `navigation.itemInsetBlock`, `navigation.itemGap` | Route item owner | 8 px block, 4 px between items |
| `navigation.accountInset`, `navigation.accountGap` | Account/logout row owner | 16 px inset, 8 px gap |

`navigation.brandInset` was set to 16 px inline after the first after-render showed that 32 px inline space wrapped the brand label inside the 240 px rail; the same screenshot comparison verifies the corrected one-line brand. This is a measured role decision, not a new atomic token.

Consumers: `Shell.tsx`, `router.tsx`, `ScopeEvents.tsx`, `CommandRecovery.tsx`, and `feedback.tsx`. The source scanner baseline/final report comparison is linked from the W09 verification record; it reduced 448 to 396 findings, introduced none, left zero findings in these five consumers, and retained `UNKNOWN_STYLE_SOURCE=0`.

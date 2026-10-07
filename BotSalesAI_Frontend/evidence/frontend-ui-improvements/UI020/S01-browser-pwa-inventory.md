# UI020 — Browser/PWA support: C01 inventory

Date: 2026-10-03  
Scope: React/TypeScript Frontend with synthetic MSW. C01 inventories the current browser/PWA contract and test coverage only; no source/runtime changes.  
Baseline HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872`. Existing dirty worktree was preserved.

## Current browser evidence

- Root `playwright.config.ts` defines one project: `chromium` using Playwright's `Desktop Chrome` device profile. The configured E2E base URL is local Vite; browser suites cited in current reports are Chromium-only.
- Existing 320/390/768/1280/1440 CSS-pixel viewports test responsive layout in the same Chromium engine. They are not Firefox/WebKit, Safari, Android/iOS or physical-device evidence.
- Search of `AI_RULES.md`, `docs/FRONTEND_SCOPE.md`, package metadata and current frontend docs found no approved browser support matrix or browser version policy. Installed test configuration proves test setup, not the product owner's supported-browser contract.

## PWA and permission boundary

- `apps/web/public/manifest.webmanifest` declares standalone display, root scope/start URL and a single SVG icon with purpose `any`; there is no recorded maskable-icon matrix.
- `apps/web/public/app-sw.js` handles push display and same-origin notification click navigation only. `apps/web/src/modules/notifications/index.tsx` registers it after the user starts the device-enable flow; `push-capabilities.ts` checks secure context, service worker, PushManager and Notification support before permission/subscription work.
- `apps/web/src/main.tsx` starts MSW only in demo mode; production only unregisters a stale mock worker. The demo worker and push worker are separate responsibilities.
- `tests/fe019.spec.ts` includes synthetic integration/PWA cases and explicitly verifies they do not request OS permission. `docs/KNOWN_GAPS.md` says installability on Android/iOS/Safari, maskable-icon behavior, real push consent/delivery and Telegram are not verified.

## C01 paired result and next decision

- `UI: PASS` for inventory: Chromium-only route coverage and viewport checks are documented; no multi-browser support claim is supported by current evidence.
- `ARCH: PASS` for inventory: React app, demo MSW worker and user-initiated push worker have distinct responsibilities; runtime capability checks remain the guard. No competing browser/PWA dependency or cross-module import was introduced.
- No code change is justified by C01. UI020.C02 must choose an explicit support matrix before adding browser projects, real-device tests, installability work or new compatibility shims. Until an owner-approved matrix exists, Chromium Desktop Chrome remains the only measured browser; all other engines/devices remain unverified, not failed or supported.

Sources: [Playwright config](../../playwright.config.ts), [frontend scope](../../docs/FRONTEND_SCOPE.md), [manifest](../../apps/web/public/manifest.webmanifest), [app service worker](../../apps/web/public/app-sw.js), [push capability guard](../../apps/web/src/modules/notifications/push-capabilities.ts), [FE019 browser tests](../../tests/fe019.spec.ts), [known gaps](../../docs/KNOWN_GAPS.md).

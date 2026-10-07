# UI020.C02 — Owner decision draft: browser and device support matrix

**Status:** DRAFT — no product-owner approval recorded. UI020 remains IN_PROGRESS 1/5.  
**Date:** 2026-10-03  
**Scope:** Frontend UI/runtime support expectations only; backend/provider behavior is excluded.

## Verified current baseline

- The Playwright project in `playwright.config.ts` is Chromium with the Desktop Chrome profile. Viewport runs at 320–1440 CSS px are the same browser engine; they do not establish Firefox, WebKit/Safari, Edge, Android or iOS support.
- UI015/S07 opened Chrome 152 on an Android 17/API 37 Pixel 10 Pro XL emulator and observed the native soft keyboard, composer/send visibility, no horizontal document overflow, and draft/route preservation after Android Back. This verifies one emulator scenario; it is not physical-device, browser-support or PWA-installability certification.
- No approved minimum browser versions, support duration, mobile form factors, PWA installation commitments or notification-delivery requirements were found in the project documents inventoried by UI020/S01.
- PWA capability checks and user-initiated notification permission flows exist in source. Actual installation behavior, iOS/Safari behavior, real push delivery and OS permission outcomes remain unverified.

## Product-owner decision fields

Fill each row with **Supported**, **Best effort**, or **Out of scope**, and add the minimum/current version policy. Do not mark a row supported just because its browser engine is available in Playwright.

| Surface | Current evidence | Owner decision | Minimum/current version policy | Required fallback |
|---|---|---|---|---|
| Desktop Chrome | Playwright Desktop Chrome; local E2E | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| Desktop Edge | No dedicated project or run | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| Desktop Firefox | No dedicated project or run | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| Desktop Safari / macOS | No WebKit/Safari run | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| Android mobile web (Chrome or specified browser) | One Chrome 152 emulator soft-keyboard probe; no physical-device matrix | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| iOS mobile web (Safari or specified browser) | No iOS device/browser run | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| PWA installation and standalone mode | Manifest/service worker inventoried; installability not tested across OS/browser | **Owner to fill** | **Owner to fill** | **Owner to fill** |
| Web push / OS permission UX | Capability guards inventoried; tests do not request permission or send push | **Owner to fill** | **Owner to fill** | **Owner to fill** |

**Owner approver:** ____________________  
**Decision date:** ____________________  
**Release scope/version:** ____________________  
**Exceptions or explicit exclusions:** ____________________

## Choices the owner must settle

1. Which desktop browsers and mobile operating systems are contractual support targets?
2. What minimum version and support window apply? Is the policy tied to the current stable release, a fixed version, or another rule?
3. Is the responsive web app required on phones/tablets, and does the product promise installable PWA behavior on any platform?
4. Are browser notification permission UX and real push delivery in scope for this frontend release, or explicitly deferred?
5. What fallback should users see when a required capability is unavailable?

## Validation plan after approval

For each **Supported** environment, record browser/device/version and run the agreed frontend smoke set: deep-link + refresh, date/select/dialog interaction, file/download, responsive Inbox/composer, and PWA capability checks only when that row is supported. Test denied/granted permission presentation without requesting permission from a real user or sending real push unless a separately approved environment and procedure exist. Add Playwright projects or physical-device cases only for environments the owner selects.

## Acceptance gate

UI020.C02 stays **PENDING OWNER DECISION** until the owner fills the matrix and approves version policy, form factors, PWA/notification scope and fallbacks. This draft is evidence preparation only; it does not change the browser-support claim or backlog checkpoint count. After approval, UI020.C03/C04 can implement and validate only the selected coverage; C05 must preserve the approved matrix and test provenance.

**Source evidence:** [UI020/S01 browser/PWA inventory](S01-browser-pwa-inventory.md), [UI015/S07 Android soft-keyboard probe](../UI015/S07-android-soft-keyboard-probe-20261003.json), and [plan §UI020](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md).

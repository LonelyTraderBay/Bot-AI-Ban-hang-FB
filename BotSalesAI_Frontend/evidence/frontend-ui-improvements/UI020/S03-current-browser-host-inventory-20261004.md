# UI020/S03 — current host/browser inventory refresh

**Ngày:** 04/10/2026 · **Phạm vi:** read-only host and test-runner inventory for the Frontend browser/device decision · **HEAD:** `e68cb65e61c5c1aab2ae169dd8033df305df8872`.

## Observed host and installed browser facts

| Surface | Current observation | What it establishes |
|---|---|---|
| OS | Microsoft Windows 11 Pro, version `10.0.26200`, build `26200`, x64 | This test host only; not a product support policy. |
| Chrome | Executable `C:\Program Files\Google\Chrome\Application\chrome.exe`: `154.0.8037.92`; HKCU Chrome `BLBeacon`: `.92`; uninstall record: `154.0.8037.95` | Registry version records disagree with the installed executable. Do not infer an exact browser patch policy from the uninstall entry. |
| Firefox | Executable `C:\Program Files\Mozilla Firefox\firefox.exe`: `157.0`; uninstall record also `157.0` | Firefox is installed, but the repository has no Firefox Playwright project or recorded Firefox run. Installation is not support evidence. |
| Edge | No `msedge.exe` found at the standard Program Files / Program Files (x86) application paths checked; Microsoft Edge WebView2 Runtime `154.0.4258.53` is installed | WebView2 Runtime is not evidence of Edge browser coverage. |
| Android tooling | `adb.exe` and `emulator.exe` are not on PATH in this shell | The prior UI015 Android 17/API 37 emulator evidence remains a historical bounded probe; no new AVD or physical-device test ran in S03. |

## Current repository test coverage

`playwright.config.ts` defines exactly one project, `chromium`, using Playwright's `Desktop Chrome` device profile and local demo base URL. Viewport coverage does not add another browser engine. No new Playwright project, dependency, browser install, source/config change or device test was made for this inventory.

## Paired result and decision

- **UI:** inventory refreshed; Chrome is the only browser engine with project E2E evidence. Firefox is installed but untested; Edge browser binary, WebKit/Safari, physical Android/iOS, and multi-browser PWA installability are unverified.
- **ARCH:** `PRESERVED`; no React/module/API/route/token/generated-source boundary changed.
- **Acceptance:** UI020.C01 remains PASS; UI020 stays **1/5**, C02 **PENDING OWNER DECISION**. The owner must still choose supported/best-effort/out-of-scope environments, minimum-version policy, mobile/PWA/notification scope and fallbacks in [S02 decision draft](S02-support-matrix-owner-decision-draft.md). S03 does not promote installed browsers into supported browsers and does not increase a checkpoint.

The inventory is a one-host snapshot; its registry/executable version mismatch for Chrome is explicitly retained. Source evidence: [Playwright project config](../../../playwright.config.ts), [prior C01 browser/PWA inventory](S01-browser-pwa-inventory.md), [owner decision draft](S02-support-matrix-owner-decision-draft.md).

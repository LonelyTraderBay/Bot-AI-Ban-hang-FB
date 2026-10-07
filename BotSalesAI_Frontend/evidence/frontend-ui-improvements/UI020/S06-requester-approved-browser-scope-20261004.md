# UI020/S06 — requester-approved desktop browser support scope

**Date:** 2026-10-04
**Decision source:** The current requester said the reviewed material was approved and asked Codex to continue the plan. The requester’s organizational title is not present in the repository; this records the conversation approval without asserting a named or formally verified product-owner role.

## Approved scope for this Frontend release

| Surface | Support level | Minimum version policy | Fallback / evidence boundary |
|---|---|---|---|
| Desktop Google Chrome | **Supported** | Chrome 154 major or newer; do not promise older majors. Host binary measured as `154.0.8037.92`. | If below the floor, update Chrome. S05 verifies the actual Chrome channel on a deep link, refresh and an unsaved edit dialog; broader suite result is tracked separately. |
| Desktop Firefox | **Supported** | Firefox 155 major or newer; do not promise older majors. Automated target is Playwright-managed Firefox `155.0`; this is distinct from the host-installed Firefox `157.0`. | If below the floor, update Firefox. Full regression evidence must name the managed engine version and must not be described as a branded-host Firefox 157 run. |
| Desktop Microsoft Edge | **Best effort** | No minimum version committed in this release. | The checked host has no Edge executable. Chromium-engine evidence is related, but does not count as a direct Edge run; use supported Chrome for critical work. |
| Desktop Safari / macOS | **Best effort** | No minimum version committed in this release. | No macOS Safari run exists. The Windows WebKit probe is not Safari evidence; use supported Chrome or Firefox for critical work. |
| Android mobile web | **Best effort, responsive web only** | No physical-device browser version floor. One earlier Chrome 152 / Android 17 emulator observation remains limited to its recorded soft-keyboard scenario. | Use a supported desktop browser for critical work. No physical-device or PWA-install commitment is made. |
| iOS mobile web | **Best effort** | No minimum version committed in this release. | No iOS Safari device run exists; use supported desktop Chrome or Firefox for critical work. |
| PWA install / standalone mode | **Out of scope as a release guarantee** | No platform/version commitment. | Use the ordinary browser tab. A manifest or service worker in source does not establish installability. |
| OS notification permission / real push delivery | **Out of scope** | No platform/version commitment. | The current UI remains synthetic and does not claim actual permission or delivery. |

## Version and validation policy

The floor is the major version actually exercised for the supported desktop browser in this release; there is no N-1 support promise. Browser patch updates stay within the major floor. Refresh the matrix when a supported major changes and retain the exact browser version in test evidence. Playwright-managed browser versions and vendor-installed browsers are recorded separately.

Chrome actual-channel evidence is [S05](S05-desktop-chrome-smoke-20261004.log) with its repeatable script in [S04](S04-desktop-chrome-smoke-20261004.mjs). Full browser-engine regression is recorded separately from direct vendor-browser smoke. The existing [S02 draft](S02-support-matrix-owner-decision-draft.md) remains the historical blank form; this file is the requester-approved scoped decision.

**Decision:** UI020.C02 is accepted for the stated desktop-first scope. Approval records the requester’s authorization to proceed; it does not convert best-effort or out-of-scope rows into support claims.

## Current regression result — 2026-10-04

| Accepted desktop target | Measured runtime | Full rebuilt-demo suite |
|---|---|---|
| Installed Google Chrome | `154.0.8037.92`, binary `C:\Program Files\Google\Chrome\Application\chrome.exe`; Playwright page UA `HeadlessChrome/154.0.0.0` | **194/194 PASS**, exit 0, [S08](S08-google-chrome-full-e2e-20261004.log) |
| Playwright Chromium engine | `153.0.8010.12` | **194/194 PASS** |
| Playwright Firefox engine | `155.0` | **194/194 PASS** |

The full Chromium + Firefox run is [UI012/S40](../UI012/S40-full-e2e-20261004.log), **388/388 PASS**, exit 0. Installed Chrome used the repeatable [S06 config](S06-desktop-chrome-playwright.config.mjs); it intentionally specifies desktop geometry without Playwright’s Desktop Chrome preset, whose pinned Chrome 153 User-Agent misrepresented the newer host binary. The earlier [S07a diagnostic](S07a-google-chrome-user-agent-preset-diagnostic-20261004.log) was stopped after 44 passing tests when this mismatch was found; it is not counted as accepted test evidence. [S05](S05-desktop-chrome-smoke-20261004.log) separately records installed Chrome deep-link/refresh/edit-draft smoke with zero API writes.

**UI020 acceptance:** C01–C05 PASS, 5/5, using the requester-approved support boundary above. These are local browser tests against the rebuilt React demo and synthetic MSW only. Edge, Safari, physical Android/iOS, PWA installation, real OS notifications, hosted CI, backend, provider, staging, production and owner UAT were not tested or inferred. Machine-readable fingerprints and exact outcomes are in [S09](S09-acceptance-20261004.json).

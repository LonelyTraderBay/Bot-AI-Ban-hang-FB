# UI021/S38 — requester review decision for the current strict-audit crosswalk

**Date:** 2026-10-04
**Approver provenance:** Current requester in this Codex conversation. The repository does not identify the requester's organizational title, so this record does not assert a named or formally verified product-owner role.

The requester stated that the reviewed material was approved and directed Codex to unlock and continue the plan. For UI021, that decision is applied to the current [S36 strict report](S36-current-frontend-design-audit-20261004.json) and the fresh [S37 source crosswalk](S37-current-source-crosswalk-20261004.md): all 13 `affordance.actionless-button` findings were reviewed as detector limitations because the current source provides RouterLink destinations, real reload/save handlers, file inputs, or download anchors.

**Accepted exception:** retain these 13 findings as an accepted review exception under the current scanner rule. Do not suppress them, add no-op handlers, or overwrite the root `premium-audit.json`.

**Tool verdict remains factual:** strict mode still exits 1 with 13 errors/violations, 0 warnings, and 0 unresolved. This decision closes UI021.C04 by accepted review; it does **not** claim that the scanner passed or that the 13 actions received separate browser tests. The root `premium-audit.json` SHA-256 remains `12E315CB06ABF4C2390EAC41C1C8E2C58472530ADFEC542F374CE621FB655A01`.

# FE019 route/operation verification — 2026-10-08

Scope: FRONTEND_WITH_SYNTHETIC_MOCK_API. This is a current source audit of the integrations and notifications React modules and their MSW handlers. It does not claim provider or backend integration.

| Route | Feature IDs | Planned reads | Route actions |
| --- | --- | --- | --- |
| R29 /s/:shopId/integrations/channels | none declared | listChannels, getChannel, getJob | beginChannelConnect, reconnectChannel, disconnectChannel, checkChannelHealth |
| R30 /s/:shopId/integrations/ai | none declared | listAIConnections, getAIConnection, getProviderCatalog, getJob | createAIConnection, updateAIConnection, testAIConnection, deleteAIConnection |
| R39 /s/:shopId/notifications | A02, A03, A04, A07 | listNotifications, getNotification | acknowledgeNotification |
| R40 /s/:shopId/notifications/devices | A01, A05, A06, A08 | listDevices, getNotificationPolicy | createDevice, revokeDevice, testDevice, beginTelegramPairing, updateNotificationPolicy |

The 24 FE019 planned operation IDs equal the unique route operation union. All planned and route-linked operations exist in OpenAPI and generated operation metadata, and every route action permission matches its OpenAPI operation. Feature catalog mappings for A01-A08 agree with R39/R40.

The current contract/source audit reports three read operations without a direct callsite in the integrations/notifications modules: getChannel, getJob, and getAIConnection. The current UI implements the list, connect/test, notification, and device flows without reading these detail operations. This is recorded for scope review and is not disguised as direct UI coverage.

Current focused browser run: 20/20 across Chromium and Firefox. It includes 8 FE019 scenarios twice (16 results) and 2 shared FE027 notification scenarios twice (4 results). Source-map script: 53 assertions passed. The current full E2E is 512/512, unit suite 138/138, domain/network suite 88/88, and source-map group 16/16.

Browser evidence verifies that credential input is write-only, clears after submit and is absent from stored/read response, browser storage and console; the OAuth connect mock returns MOCK_ONLY without an external request or connected state; device/Telegram/PWA checks remain synthetic and request no OS permission; notification schedule bounds/timezone and active-shop order links are checked.

Remaining environment boundary: these local MSW results do not test provider OAuth, AI credentials against an external provider, real Push/Telegram delivery, OS permission, device reachability, or production deduplication/callback security.

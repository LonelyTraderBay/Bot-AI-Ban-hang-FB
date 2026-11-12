# TalkBack enabled on emulator 5570 — observed setup

On 2026-11-11, the user reported accepting the full-control permission on the existing Medium_Phone_API_37.0:5570 emulator. Read-only Android settings confirmed accessibility enabled=1 and the Google TalkBack service enabled; the emulator Accessibility UI showed Use TalkBack on. This supersedes the earlier 5570 off-state observation for the current session; earlier records remain historical.

The assistant enabled TalkBack's Display speech output preference on this isolated emulator. Its on-screen speech output visibly showed system text including the Chrome startup progress indicator and the Chrome first-run screen. No audio was captured, and this is not evidence of speech on BotSales.

Android Chrome 145.0.7632.218 is still at its first-run screen; the screen states that continuing accepts Terms of Service. The assistant did not continue or accept terms. No app route or TalkBack speech from BotSales was observed; no app UI defect was established or changed. The existing localhost port reverse and demo server are ready. The user must independently complete the browser's first-run choice before the app can be tested in Chrome. S17 remains IN_PROGRESS.

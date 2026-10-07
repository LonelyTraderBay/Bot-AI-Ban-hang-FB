# UI012/S36 — Narrator speech-recap procedure for C04

**Ngày:** 04/10/2026 · **Mục đích:** chuẩn bị cách thu speech transcript cho UI012.C04; đây chưa phải test result và không đóng FE-G05.

## Facts checked

- Local OS reports **Microsoft Windows 11 Pro, build 26200, x64**. `C:\Windows\System32\Narrator.exe` reports file/product version `10.0.26100.8972`.
- Microsoft's current Narrator guide documents Speech Recap: press **Narrator key + Alt + X** to open the recap/live transcription window; it shows up to 500 recently spoken strings. The Narrator key defaults to Caps Lock or Insert. The same official guide documents copying the last spoken phrase with Narrator key + Ctrl + X. See [Microsoft Narrator basics](https://support.microsoft.com/en-us/accessibility/windows/narrator/chapter-2-narrator-basics) and [complete guide](https://support.microsoft.com/en-us/accessibility/windows/narrator/complete-guide-to-narrator).
- The active Codex computer-use inventory exposed no controllable native applications, and this execution surface has no UI control for the Speech Recap window. **Narrator was not started or tested, and no speech/transcript is claimed.** The previous S35 statement about the session lacking a transcript path is refined: Windows documents a built-in transcript window, but this run could not operate it.

## Manual test procedure

Use the local **demo** React build and synthetic MSW data only. Do not enter real credentials, customer data, or submit to a live API.

1. Start Narrator with `Windows logo + Ctrl + Enter`; open Speech Recap with `Narrator key + Alt + X`. Confirm the recap window is visible before interacting with the app. If the shortcut is unavailable on the installed Narrator version, record that exact result and version rather than substituting an accessibility tree.
2. On R04 Dashboard, navigate without a mouse through the main landmark, headings, skip link, navigation and the “Xem việc cần làm” CTA. Record the words/role/state announced and whether focus matches the visible 2 px outline.
3. On R23 Knowledge, open “Thêm nguồn kiến thức”; tab through dialog title, title/content fields, file chooser and actions; submit the seeded synthetic 422. Record the spoken alert, its relation to “Nội dung”, `aria-invalid`, retained draft, focus target, close behavior and return focus.
4. Sample the shared icon-only controls (logout, notifications, copy buttons), one expanded selector/menu, and the CSV file chooser/discard confirmation. Record unexpected silence, duplicate/misleading announcements, trapped/lost focus, incorrect state announcements or lost form state.
5. Copy/export the relevant Speech Recap strings using the documented command, remove unrelated window/app text, and attach the transcript with Narrator version, OS build, browser/version, route, action sequence and test date. Keep the full recap local if it contains unrelated app/window content.

## Acceptance boundary

A transcript proves only the captured routes and interaction sequences. UI012.C04 still needs broad human review across the agreed route/state checklist, plus review of the captured evidence. Do not set C04 or FE-G05 PASS from a successful Narrator launch, accessibility-tree output, axe result, or the transcript for only R04/R23. No UI source, architecture boundary, canonical contract, generated file, or tracker changed in S36.

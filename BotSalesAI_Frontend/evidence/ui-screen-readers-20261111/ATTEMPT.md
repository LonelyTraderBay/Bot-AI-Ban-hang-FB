# Screen-reader follow-up — observed attempt

- 2026-11-11 local Windows 11. Started Windows Narrator through computer use. Narrator Home appeared; Narrator core window remained at higher integrity than the computer-use helper. The helper reported limited access; no actual speech or speech recap from BotSales was captured. Desktop screen-reader acceptance remains NOT_RUN.
- Started Medium_Phone_API_37.0 as a separate Android emulator at emulator-5570 with `-read-only -no-snapshot-save`, leaving the user's already running emulators untouched. Android Accessibility showed installed TalkBack initially Off.
- Selecting Use TalkBack opened the Android permission dialog requesting full control, including reading screen contents and performing actions. No approval was submitted. The prompt remains visible in the isolated emulator.
- Chrome's first-run screen also stated that continuing accepts its Terms of Service; the assistant did not continue. The local demo server is running at 127.0.0.1:4191; an adb reverse mapping on the isolated emulator provides http://localhost:4191 so the demo can use its localhost service worker.
- TalkBack did not become active and no spoken output from the app was observed. No new UI defect was established or changed in this attempt. Existing dirty source and historical evidence remain untouched.

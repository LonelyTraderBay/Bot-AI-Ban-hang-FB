# Dialog heading and screen-reader follow-up

The shared EditDialog heading previously acquired the close button's accessible name: `Chi tiết yêu cầu sau bán Đóng`. Its heading now references the title text, while the close button keeps its own name. This changes shared semantics across EditDialog consumers and does not alter dialog layout or action permissions.

- `test-before.log` reproduces the issue. `test-final.log` passes two browser cases covering two dialogs at 390/1440 CSS px, separate close naming and focus restoration. `dialog-regression.log` passes eight service-case detail loading/error tests across Chromium and Firefox.
- Paired Chrome captures and accessibility snapshots at 390/1440 show the service-case detail before and after; their hashes are in `screenshot-hashes.json`. The affected shared component has many consumers; those captures do not constitute paired acceptance for every dialog.
- Five selected Chrome native 200% page-zoom scenarios and five selected Firefox native 200% text-only scenarios passed. These do not cover every screen.
- `narrator-observation.md` records a limited live Narrator Speech recap on the local service-case demo: table/action context, the detail dialog close button, customer link, and visible focus return after Escape. The recap was observed visually; audio was not recorded. It is not a whole-app or complete screen-reader acceptance.
- At resume the prior emulator window and Narrator recap were absent. A fresh read-only emulator had TalkBack off; no TalkBack utterance from the app was observed. The observation does not contradict or verify what was enabled in the user's earlier session. Physical mobile and TalkBack remain unverified.
- `verify.log` records a passing full frontend verify with 263 Vitest cases. Generated reports were restored to their pre-run bytes. `evidence-final.log` passes after recording the final checks, with S17 still IN_PROGRESS.

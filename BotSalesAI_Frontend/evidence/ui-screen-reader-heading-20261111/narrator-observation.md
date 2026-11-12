# Narrator desktop speech recap observation

On 2026-11-11 after the shared heading fix, the running Narrator's Speech recap was opened using its normal keyboard shortcut while Chrome displayed the local synthetic service-case page. Although direct accessibility access to Narrator's process was limited by Windows integrity, the recap was visually observable over Chrome.

- The recap contained the table name, its two-by-six dimensions, the action-column position and the `Chi tiết yêu cầu` button.
- In the detail dialog, keyboard focus on the close control produced a recap entry containing `Chi tiết yêu cầu sau bán dialog, Đóng, button`.
- Advancing focus to the customer link produced an entry containing `Minh (khách mẫu)` and its link role. The recap also included the customer ID `c2` and the case content.
- Pressing Escape visibly closed the dialog and restored focus to the `Chi tiết yêu cầu` opener.

These observations are a visual reading of Narrator's speech recap, not an audio recording or a test of every route, locale, state or combination. They supersede only the earlier statement that this session had no observable Narrator output. TalkBack and physical-device speech remain unverified.

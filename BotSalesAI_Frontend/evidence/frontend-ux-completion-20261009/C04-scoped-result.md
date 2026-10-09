# C04 scoped verification

- Current combined UX C01–C04 browser run: 28/28 Chromium/Firefox, exit 0, `C00-C04-browser-current.log`.
- C04 viewport/axe subset: 8/8, exit 0, `C04-browser-r2.log`; 320/390/768/1280/1440 screenshots.
- Owner regressions after lifetime fix: 9/9, exit 0, `C04-owners-r2.log`.
- Initial browser run: wrong canonical title expectation, 2 failures; teardown hung and its verified owned process tree PID 60172 was terminated. It is interrupted, not PASS.
- Native zoom/text resize and full final gates remain required at C11. These scoped runs do not close the new business capability scope.

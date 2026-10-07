# UI015.S06 — Android emulator feasibility probe

**Date:** 2026-10-03 · **Purpose:** determine whether the available host can produce UI015.C04 soft-keyboard evidence.

## Observed environment

- Android SDK emulator AVD `Pixel_10_Pro_XL` booted successfully as `emulator-5554`.
- Device properties reported Android 17, API 37, emulator product `sdk_gphone16k_x86_64`, display 1344×2992 pixels and density 480 dpi.
- Android Chrome package `com.android.chrome` is installed.
- The local Frontend demo Vite server was running at host port 5173. `adb reverse tcp:5173 tcp:5173` succeeded.

## Result and limit

- Opening `http://127.0.0.1:5173/s/shop-demo/inbox` through the Android activity intent was attempted. The host command execution policy rejected the command before it was run; Android Chrome did not open the route.
- No composer was focused, no Android soft keyboard appeared, and no keyboard-open viewport/inset, composer, send-button, Back, or draft behavior was measured. No C04 result is claimed.
- The emulator process and adb reverse mapping were stopped/removed after the probe. This record is a tool/environment feasibility result only; it does not count as a UI015 checkpoint or product defect.

**Status:** UI015.C04 remains `PARTIAL`; UI015 remains `IN_PROGRESS`, 4/5. To complete the check, enable an approved way to open/navigate the emulator's Chrome session or use a physical Android device, then capture the focused field, actual keyboard-open layout, composer/send visibility, and Back/draft behavior.

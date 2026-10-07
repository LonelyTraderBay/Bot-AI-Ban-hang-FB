# UI019 — C03 paired decision: NO_CHANGE

Date: 2026-10-03  
Scope: local React demo artifact with synthetic MSW only. No source/runtime changes were made for UI019.

## Evidence used

- Production build: Vite largest entry 737.92 kB raw / 186.81 kB gzip; three initial static JavaScript files total 319,362 bytes under local Node gzip level 9.
- Current demo build: Vite largest chunk 741.57 kB raw / 187.95 kB gzip; Chromium script transfer total 446,252 bytes. Both the existing 200 KiB largest-gzip and 500 KiB initial-route budgets pass for these local artifact measurements.
- One warm-up plus five cold-context Chromium runs on the same demo artifact, 1280×720, CPU throttling 4×, 150 ms RTT, 1.6 Mbit/s down / 0.75 Mbit/s up, gzip static responses, HTTP cache disabled. Route-ready median 3,887 ms (3,865.5–3,976.2); customer first-page median 659.3 ms (637.5–862.3), 21 rows including header and API 200 in every run. Raw results and runner are [S02 log](S02-performance-repeat.log) and [S02 script](S02-repeat-profile.mjs).

## Paired decision

- `UI: PASS within the selected local demo profile.` Initial transfer and largest-chunk budgets pass, and the synthetic customer action consistently renders the first API page. The constrained-profile route-ready median is 3.887 seconds and is recorded as a UX risk to revisit if a product latency target or supported low-end device is specified.
- `ARCH: PRESERVED / NO_CHANGE.` Router already uses lazy imports; React and MUI have shared manual chunks. No module-level attribution or approved time budget identifies a particular bundle boundary to change. Splitting chunks without evidence could add round trips and worsen the measured profile.
- No cache, virtualization, dependency, warning-limit or source-code change is justified by this bounded evidence. This is not a physical mobile-device, production CDN, backend latency or performance-SLO result.

The existing approved byte budgets and scope are the basis for the no-change result. Product UAT may choose a real target device and route-ready budget later; FE-G09 remains independently open.

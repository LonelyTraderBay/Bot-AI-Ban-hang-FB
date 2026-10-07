# UI027/S05 — So sánh hiệu năng ghép cặp

**Ngày:** 05/10/2026 · **Scope:** `FRONTEND_WITH_SYNTHETIC_MOCK_API` · **Reviewer:** Codex self-review.

## Phương pháp

Để so sánh chunking dưới cùng điều kiện, dựng lại artifact baseline từ đúng source React hiện tại bằng Vite 7.3.6, chỉ thay `manualChunks` về cấu hình trước UI027 (`react`, `mui`). Artifact baseline được xuất ra thư mục tạm ngoài repo. Artifact UI027 được dựng bằng `npm run build:demo`; cả hai được phục vụ bằng cùng static Node server, gzip level 6, Chromium 153, viewport 1280×720, cache tắt, CPU 4×, RTT 150 ms, download 1.6 Mbit/s và upload 0.75 Mbit/s. Mỗi artifact có một lượt warm-up và năm lượt đo độc lập. Flow tải 1.004 khách tổng hợp qua API mock, mở route Khách hàng và đợi đủ 20 hàng.

Profiler tái lập: [S05-repeat-profile-current-20261005.mjs](S05-repeat-profile-current-20261005.mjs). Chạy từ `apps/web` với artifact path và label làm hai đối số; baseline chạy với `reconstructed-pre-UI027`, sau đó chạy `dist-demo` với `UI027-current`. Log full E2E/verify/build: [S04-e2e-full-20261005.log](S04-e2e-full-20261005.log), [S04-verify-20261005.log](S04-verify-20261005.log).

## Kết quả

| Chỉ số | Baseline tái dựng | UI027 hiện tại | Thay đổi |
|---|---:|---:|---:|
| Largest JS chunk raw / gzip | 742.030 / 188.083 byte | 328.326 / 100.019 byte | −413.704 raw (−55,8%); −88.064 gzip (−46,8%) |
| Initial-route JS transfer | 446.379 byte | 445.993 byte | −386 byte |
| Số JS request trong route đầu | 8 | 11 | +3 request |
| Artifact file count / tổng byte | 35 / 2.300.344 | 38 / 2.302.527 | +3 file / +2.183 byte |
| Route-ready median | 3.906,9 ms | 3.812,1 ms | −94,8 ms (−2,4%) |
| Customer-list-ready median | 663,3 ms | 639,1 ms | −24,2 ms (−3,6%) |

Route-ready samples: baseline `[3915.9, 3894.7, 3925.7, 3906.9, 3823.8]` ms; UI027 `[3812.1, 3907.8, 3795.1, 3835.4, 3772.3]` ms. Customer-list samples: baseline `[626.8, 663.3, 645.1, 668.9, 679.6]` ms; UI027 `[639.1, 783.9, 625.9, 635.6, 834.3]` ms. The UI027 customer-list samples have higher spread; the median did not regress, but five samples are directional local evidence, not a significance claim.

The pre-UI027 and UI027 artifact tree SHA-256 values are respectively `91ffddd7b2180069603c2060675ede737cb80386b1132ca5a292604000a1b04f` and `c42472ba2418773768545d52f3e9414a3a70bcc52c9593ef46d3e2f6bfb1bb0b`. These hashes cover the complete built demo trees used by the runs.

## Verdict and limits

The paired Chromium measurements show no median regression for either route-ready or the 1,004-customer list. The initial transfer remains below the existing 500 KiB gzip budget, and the largest chunk remains below the 200 KiB gzip budget. Production `verify`/E2E build output shows the largest production chunk at 328.33 kB raw and no Vite >500 kB warning; the built-demo browser suite passed 388/388 across Chromium and Firefox.

This comparison uses synthetic MSW and a local server. It does not prove physical-device, CDN, hosted-CI, Backend or production traffic performance. Firefox had a one-off 596 ms customer-list result in the full suite versus a 411 ms historical sample; those samples were not captured under this paired 4× CPU/3G protocol, so they do not establish a regression or a Firefox performance pass. The repeat profile currently covers Chromium only.

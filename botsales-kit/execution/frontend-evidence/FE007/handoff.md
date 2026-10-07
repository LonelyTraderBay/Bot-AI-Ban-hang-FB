# FE007 — Shell, phiên và scope dữ liệu

Phạm vi: React frontend với phiên, quyền và network mô phỏng. Không xác nhận OIDC, session API, backend authorization hoặc provider thật.

## Hành vi đã kiểm — 01/10/2026

- Shell/router composition ở app root; 54 route canonical render qua React demo, module ownership và navigation theo permission catalog.
- Full Chromium suite hiện hành PASS 123/123. Các ca kiểm shop switch loại response trễ của shop cũ, role guard trên navigation/deep link, refresh deep link, logout và dirty draft, menu mobile, chunk recovery, demo label, cùng live-mode-unavailable không bật mock.
- Vitest hiện hành PASS 66/66; dirty-draft helper PASS 4/4 cho native forms và `EditDialog`. TypeScript strict, ESLint và production/demo artifact isolation đã chạy lại trong FE008 trên source hiện hành.
- Mock API chỉ dùng ở demo/test; source hiện hành không lưu session token trong localStorage. Browser/helper chỉ dùng dữ liệu tổng hợp.

## Bằng chứng và giới hạn

Log browser hiện hành: `../FE003/S03-e2e-current-20261001.log`; unit và dirty-draft helper ở `unit-priority-20261001.log` và `dirty-draft-priority-20261001.log`. FE007 không xác nhận OIDC, server-side authorization, CI, staging, production deployment hoặc owner UAT. Ca live-mode-unavailable chỉ chứng minh UI không tự fallback sang mock khi session API không có.

## Tái xác minh hiện hành — 04/10/2026

- Full Playwright suite đạt **388/388** trên Chromium và Firefox, log tại `../FE008/S05-e2e-rerun-current-20261004.log`. Coverage gồm 54 route, role/shop scope, session/logout, request cancellation, delayed old-shop response, deep links, mobile navigation, chunk recovery, unknown/conflict states và demo/live-mode boundary.
- `npm run verify` đạt exit 0: generator 11 outputs/283 schemas/210 operations/54 routes; source checker 65 files/220 operation calls/54 routes; boundaries 430 imports và 10/10 negative/allowed fixtures; ESLint 0 warning; strict typecheck; domain 88/88; Vitest 85/85; production build. Bundle warning còn chunk lớn nhất 738.39 kB raw / 186.88 kB gzip.
- Dirty-draft helper mới đạt **4/4** cho native form và `EditDialog`; log `S03-dirty-draft-helper-current-20261004.log`.
- FE007.S01–S05 evidence/source snapshots mới là `S01-current-revalidated-20261004.json` đến `S05-current-revalidated-20261004.json`. Kiểm chứng sử dụng React và synthetic MSW, không xác nhận OIDC, server authorization, provider, CI, staging hoặc production.

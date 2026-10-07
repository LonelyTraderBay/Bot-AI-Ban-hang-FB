# FE027 — UAT Frontend bằng mock data — 04/10/2026

## Kết quả đo trên React

- Full suite [`FE008`](../FE008/S05-e2e-rerun-current-20261004.log) đạt **388/388** trên Chromium 153 và Firefox 155. `npm run verify` hiện hành đạt; browser run dùng synthetic MSW.
- [UAT matrix](uat-matrix-current-20261004.json) ghép canonical route manifest, route-feature implementation map, state-role matrix, test evidence và artifact hash: **54/54 route smoke, 64 feature ID, 65/65 feature-route interaction row, 22 journey**, 357/357 quyền đọc trên 51 route riêng tư × 7 role. Ba public route dùng public contract, ngoài private-role matrix.
- Ma trận trạng thái có **19 global cases**, success composition trên 54/54 route, empty composition 11/11 và error composition 51/51; 0 applicable state cell còn `NOT_TESTED`. Gaps về API/backend được giữ trên từng feature/route và không tính thành hành vi live.
- Dataset khách tổng hợp 1.000 dòng được phân trang 20 dòng mỗi request; có probe trên Chromium và Firefox. FE015 `UI003` chuyển synthetic shop context từ `shop-demo` sang `shop-second` để kiểm timezone report; test không chứng minh quyền/tenancy phía server.
- Bốn ảnh chụp built `dist-demo` có request manifest MSW và zero page error. Reflow 320 CSS px đạt 54/54. Trace successful built-demo preview được giữ cho cả hai browser trong `traces/`; focused run đạt 2/2.
- Artifact được kiểm hash khớp FE026 manifest: production `97c6ad5e5f8031b04d25fd9f73daf0ad3d6ea9c26b3cb3c8a8e0e93ccd19761a`; demo `b9bb3138d27ff321836d99082f52c16678e4feb96dae33452ef9d7cc9fe58e8f`.

## Evidence chính

- [Current full E2E](../FE008/S05-e2e-rerun-current-20261004.log)
- [Generated UAT matrix](uat-matrix-current-20261004.json) and [generation log](uat-matrix-generation-current-20261004.log)
- [Built-demo trace run](built-demo-preview-trace-run-current-20261004.log), [Chromium trace](traces/chromium-built-demo-preview-20261004.trace.zip), [Firefox trace](traces/firefox-built-demo-preview-20261004.trace.zip)
- [Screenshots and synthetic request manifest](ui-screenshots-current-20261004/manifest.json)
- [Route-state/role matrix](../../../../docs/route-state-role-matrix.json), [route implementation/feature map](../../../../docs/route-implementation.json)
- [FE026 artifact manifest](../FE026/artifact-manifest-current-20261004.json)

No new UAT defect required another source change: current full run is green. Backend authorization/persistence, provider delivery, staging, hosted CI, full screen-reader speech and the user's acceptance remain outside these local synthetic observations. The handoff records technical UAT; it does not record owner approval or whole-system production readiness.

# C07 — đánh giá tác động trước khi sửa

Ngày ghi nhận: 2026-10-09. Baseline Git: `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6`.

## Bằng chứng hiện trạng

- OpenAPI canonical đang ở `2.2.0`, chưa có consent resource hoặc public challenge flow. SHA256 trước sửa: `49fb3574a17a4ec7d62b836a918efd4c9517348297d4a5aafa21c6b899ac71b6`.
- Route manifest có 60 route, R35 là `/s/:shopId/settings/privacy`; chưa có R61. SHA256: `812bf67dd144cf3f1df7be1a922f3c861c45aeaaeea9e1d37f2bf9ca757ddde5`.
- `PrivacyPage` đang quản lý opt-out bằng React state cục bộ; nội dung hiện nói rõ API chưa lưu hoặc chặn marketing. `privacy.manage` chỉ có trong preset `owner`; manager/accountant không có quyền này.
- Mock không có marketing campaign/outbox worker. `getMarketingSummary` chỉ trả fixture tổng hợp, nên không thể dùng nó làm bằng chứng gửi hoặc chặn marketing.
- `getCsrfToken` hiện là global GET không yêu cầu session trong mock. Public mutations vẫn phải dùng CSRF, schema validation và idempotency; challenge token đi trong POST body, không ở URL API.
- Rà luồng browser cho thấy token nằm trong query trước khi exchange có thể bị gửi kèm `Referer` ở GET CSRF. C07 sẽ áp dụng `Referrer-Policy: no-referrer` từ HTML gốc để chặn rò token trước khi React mount.
- Sự kiện hiện có không bao gồm consent. `event-invalidation.ts` thu hẹp sự kiện theo operation/resource.
- Feature `G05` đang là `APPROVED_SCOPE_NOT_IMPLEMENTED`; acceptance fixture của G05 còn `NOT_RUN_PRODUCT_TEST`. Đây là đặc tả, không phải kết quả kiểm thử.

## Thay đổi dự kiến

1. Nâng OpenAPI minor `2.2.0` → `2.3.0`; thêm consent record/history, yêu cầu xác nhận lại, trao đổi challenge công khai và xác nhận công khai. Không thêm API bật consent bằng checkbox cho nhân viên. Public confirm chỉ nhận session challenge, quyết định và phiên bản nội dung đã xem.
2. Thêm route R61 `/consent/confirm`, bypass đăng nhập ở router như route công khai; R35 dùng API có quyền `privacy.manage` để xem record/lịch sử và yêu cầu khách xác nhận lại.
3. Bổ sung mock consent và worker queue rất hẹp cho fixture kiểm thử: job marketing cũ phải bị chặn khi thực thi sau opt-out; message dịch vụ không chịu opt-out marketing. Đây chỉ là synthetic MSW evidence, không phải campaign/provider thật.
4. Thêm event `customer_consent.updated` và invalidation chỉ cho truy vấn consent/khách có liên quan.
5. Đồng bộ OpenAPI YAML, operation index, generated DTO/route files bằng generator sở hữu; cập nhật migration và acceptance fixture canonical.
6. Thêm unit/domain và browser regression cho pending-not-granted, identity/action binding, expiry, replay, content version, opt-out suppression và phân biệt service.

## Tệp sở hữu / người tiêu dùng

- Contract: `botsales-kit/contracts/openapi.json`, `events.schema.json`, `route-manifest.json`, `feature-catalog.json`, `migration-map.json`, `fixtures/acceptance-scenarios.json`; YAML và operation index là đầu ra cần đồng bộ.
- Frontend: `BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx`, `app/router.tsx`, mock service/database/seed/collections, `shared/api/event-invalidation.ts`; generated contracts/routes và `docs/route-implementation.json` theo generator.
- Regression/evidence: test domain/API và Playwright route R35/R61; kết quả chỉ đóng C07 ở `VERIFIED_SCOPED`. Full verify, full browser, demo review, evidence freshness và acceptance package vẫn thuộc C11.

## Bảo toàn working tree

Working tree đã có 243 tệp tracked thay đổi trước C07. Các tệp mục tiêu cũng đã dirty do những nhóm trước; các hash trên ghi lại nội dung đang có ngay trước C07. Không reset, clean, stage hoặc commit; chỉnh nối tiếp đúng owner và giữ diff hiện hữu.

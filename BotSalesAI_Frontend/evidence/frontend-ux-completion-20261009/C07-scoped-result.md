# UX.C07 — Kết quả scoped consent

Ngày kiểm chứng: 2026-10-09  
Trạng thái: **VERIFIED_SCOPED**  
Scope: React + canonical OpenAPI + MSW tổng hợp local. Không xác nhận campaign worker, email/SMS/Meta provider, Backend hoặc production.

## Hành vi đã triển khai

- Consent có record, version và history theo khách hàng, mục đích và kênh. `privacy.manage` cùng quyền đọc khách hàng bảo vệ việc tạo yêu cầu; GET chỉ đọc.
- Yêu cầu xác nhận tạo trạng thái pending, không tự cấp consent. Challenge ràng buộc khách/kênh/danh tính/nội dung, hết hạn sau 24 giờ, trao đổi qua POST và chỉ dùng một lần. Token và challenge session được lưu dạng SHA-256 trong mock; public view không trả identity/customer ID.
- R61 là route công khai riêng. Trang gửi token bằng POST body, lấy CSRF, xóa token khỏi query bằng replace ngay sau khi trao đổi và đặt `Referrer-Policy: no-referrer` tại HTML gốc để bảo vệ request trước khi React mount.
- Opt-out được kiểm tra lại ở điểm dispatch của fixture marketing; message dịch vụ vẫn được gửi. Đây là phép thử MSW hẹp, không mô phỏng campaign/provider thật.
- `message.created`/`customer_consent.updated` chỉ invalidates read-model consent/customer liên quan; resync toàn scope vẫn dành cho lỗi sequence/reconnect/sự kiện không xác định.
- Khi khách từ chối yêu cầu ngừng nhận tin, response giữ đúng trạng thái và ID consent hiện hành, đồng thời trả version mới sau khi thêm history. Regression mới bao phủ trường hợp này.

## Kết quả kiểm chứng trên source đã fingerprint

| Kiểm tra | Kết quả | Bằng chứng |
|---|---:|---|
| Consent + event invalidation unit | 20/20, exit 0 | `apps/web/tests/privacy-consent.test.ts`, `apps/web/tests/scope-events.test.tsx` |
| TypeScript | PASS, exit 0 | `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` |
| ESLint | PASS, exit 0 | `node node_modules/eslint/bin/eslint.js apps/web/src --max-warnings 0` |
| Contract generation | PASS, 15 outputs / 332 schemas / 241 operations / 61 routes | `node scripts/generate.mjs --check` |
| Source/route mapping | PASS, 84 files / 252 operation refs / 61 routes / 0 issues | `node scripts/check-source.mjs` |
| Chromium browser regression | 4/4, exit 0 | [log](C07-browser-chromium-current-20261009.log) |
| Firefox browser regression | 4/4, exit 0 | [log](C07-browser-firefox-current-20261009.log) |
| Canonical contract validator | PASS; 332 schemas, JSON/YAML equivalent, path parameters valid; OpenAPI SHA-256 `8e7b9fac7a7dc0f657c3cc64260daf27aed2358da75dfb392f785726018208d4` | `botsales-kit/scripts/validate_contracts.py` |
| Kit validator | 532/532, 0 errors; 64 features / 61 routes / 241 operations / 332 schemas | [`kit-validation.json`](../../../botsales-kit/evidence/kit-validation.json), [run log](../../../botsales-kit/evidence/C07-kit-validation-current-20261009.log) |
| `git diff --check` | exit 0 | Root worktree; line-ending notices only |

Browser cases cover R35 challenge creation and history, R61 public confirmation/opt-out, POST-body token exchange, query-token removal, service-message behavior and keyboard/axe/reflow at 320 px. Targeted browser counts are not full application E2E.

## Source identity and remaining closure

Source fingerprint: [`C07-current-source-20261009.json`](C07-current-source-20261009.json), 27 files, SHA-256 `ec5e1d6306b0a02e6b04ddb5eb5aa3b73d791e607ca0a6d9c1ea2493aff110a3`. Pre-edit baseline and scope are recorded in [C07 impact](C07-consent-impact-20261009.md); the working tree was already dirty and was preserved.

The 61-route implementation map was regenerated in `SOURCE_IMPLEMENTED_BROWSER_NOT_REVALIDATED` state after adding R61. The old 54-route E2E result is retained as historical evidence; it is not presented as proof for the new route or current source. C11 must regenerate the browser matrix and run the complete suite on the final source. The FE denominator remains 140; impacted checkpoint freshness is deferred to C11.

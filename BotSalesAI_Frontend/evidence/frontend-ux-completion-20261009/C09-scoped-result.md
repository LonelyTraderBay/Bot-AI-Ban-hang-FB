# UX.C09 — Media Inbox

Ngày kiểm chứng: 2026-10-09  
Trạng thái: **VERIFIED_SCOPED**  
Phạm vi: React Frontend + canonical OpenAPI + MSW tổng hợp local, route R06. Không chứng minh Backend, Meta/provider, antivirus, lưu trữ media production hoặc hosted CI.

## Đã hoàn tất

- Mở rộng API lên **2.5.0** theo cách cộng thêm: capability media có allowlist MIME, giới hạn dung lượng/số tệp; `MessageWrite` giữ tương thích text-only và nhận `fileIds`; `Message` có attachment metadata an toàn; `getFile` được triển khai thành đọc có kiểm tra shop, purpose và quyền.
- Upload/gửi kiểm tra kênh hiện kết nối, capability, quyền `conversations.reply`, shop và conversation scope, MIME và chữ ký nội dung, kích thước, số lượng, purpose, trạng thái file. Kênh không khai báo policy không hiện nút đính kèm nhưng vẫn gửi được text.
- Composer hỗ trợ ảnh, tin thoại và tệp; preview/read URL được thu hồi khi xóa, gửi xong, unmount hoặc reset mock. “Ready” chỉ là fixture scan-pass tổng hợp.
- Khi đang gửi, người dùng tiếp tục soạn text và đính kèm. Acknowledged send chỉ dọn đúng snapshot đã gửi; unknown giữ bản nháp và command intent, chặn gửi lại mù.
- Lỗi contract được phát hiện trong browser regression cũng đã sửa: `Command.result` chỉ trả `ResourceRef {type,id}`; metadata đính kèm thuộc `Message` read model. Test B09 dùng operation delay cố định để tránh race phụ thuộc tốc độ browser.

## Kết quả kiểm chứng

| Gate | Kết quả | Bằng chứng |
|---|---|---|
| Unit media contract/MSW | 6/6, exit 0; gồm text-only, policy thiếu, cross-shop, MIME giả/không hỗ trợ, file quá cỡ, sai purpose, count/scope/quarantine, quyền đọc, URL cleanup, unknown command | [log](C09-unit-final.log) |
| Browser R06 media | Chromium 3/3 + Firefox 3/3; tổng 6/6, exit 0. Gửi ảnh/audio/PDF, kiểm tra file ID, file readback, URL cleanup, giữ text và tệp mới khi send unknown, policy không có | [log](C09-e2e-final.log) |
| TypeScript / ESLint | PASS, exit 0 | [typecheck](C09-typecheck-final.log), [lint](C09-lint-final.log) |
| Generator / source map | PASS: 15 generated outputs, 342 schemas, 245 operations, 61 routes; source map 3/3 | [generator](C09-generate-check-final.log), [source map](C09-source-map-final.log) |
| Source/route và import boundaries | PASS: 84 source files, 262 operation calls, 61 routes, 0 issue; 715 imports, 10/10 negative fixtures | [source](C09-source-final.log), [boundaries](C09-boundaries-final.log) |
| Canonical contracts / kit | PASS: 342 schemas, JSON/YAML tương đương; kit 532/532 | [contracts](C09-contracts-final.log), [kit](C09-kit-final.log) |
| `git diff --check` | Exit 0; Git có cảnh báo chuẩn hóa LF→CRLF trên một số file của dirty tree có sẵn | [log](C09-diff-check-final.log) |

## Baseline và fingerprint

- Baseline trước source edit: [manifest](C09-before-source-20261009.json), aggregate `cae7bf768d61a91cae932c50f2b5af328ff08da63212976b7ec7c59a64b86714`; trước sửa, built demo không có media control ([ảnh baseline](C09-before-inbox-build-1440x1000.png)).
- Source/evidence hiện hành: [manifest 39 file](C09-current-source-20261009.json), aggregate SHA-256 `5dbb31e867138c717f4f3ed28bb2718a28755e07d38274b4b60e5d8d2c4a8a5c`; Git HEAD vẫn `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` và dirty tree được giữ nguyên.
- Quyết định contract và root-cause baseline: [C09-CONTRACT.md](C09-CONTRACT.md). Manifest được tái tạo bằng [capture-c09-current.mjs](capture-c09-current.mjs).

## Ranh giới còn mở

C09 đóng theo phạm vi regression tập trung. Full `verify`, full Chromium/Firefox, production/demo build, built-demo review và route/state/role evidence cuối thuộc C11; FE tracker không được tăng chỉ vì C09 hoàn tất scoped. Trạng thái file `ready` không phải xác nhận antivirus/provider thật. Không có Backend thực trong repository để xác minh enforcement phía server.

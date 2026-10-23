# UI61 — contract khắc phục ngày 20/10/2026

Yêu cầu: triển khai UI-A01–06 của audit 61 route theo P1 rồi P2; giữ toàn bộ thay đổi Tổng quan đang có; kiểm desktop/mobile và mở bản demo cho người dùng nghiệm thu. Không commit/push trong đợt này.

Nguồn chuẩn: `docs/FRONTEND_SPACING_STANDARD.md` §0/SPC-001–075; token canonical trong kit; theme/layout/visual/shared catalog hiện hành. Không tạo chuẩn spacing thứ hai.

Baseline render: audit `ui-61-audit-20261019-202739` trong Codex-Recovery, 61 route × 2 viewport, accepted `sections/` và measurements. Baseline byte/Git mới cùng bản sao mọi file đang sửa nằm tại `Codex-Recovery/Bot-AI-Ban-hang-FB/ui61-implementation-20261020/baseline.json` và `before/`. Kiểm lại source trước khi dùng baseline cũ.

## Owner, tác động và trình tự

1. P1 UI-A01: shared DataTable giữ table/header/scroll semantics khi có dữ liệu; Empty/CTA nằm trong bề rộng nhìn thấy. Kiểm 9 route rỗng, 320/390/desktop và bàn phím.
2. P1 UI-A02: Status intrinsic trong header/field; giữ các action mobile hợp lệ. 6 route hiện thấy + import-job success có cùng pattern. Dùng ActionGroup đã có.
3. P1 UI-A03: PurchaseDelegationsPanel dùng SurfaceContent giữ inset cho notice/action; bảng giữ flush, không double inset.
4. P1 UI-A04: card nghiệp vụ dùng radius.card; FormFields outlined và card tự dựng cùng owner. Giữ dialog/auth/hero/control/bubble đúng vai trò riêng. Kiểm các consumer outlined và các candidate R23/R41/R47.
5. P2 UI-A05: shared Pager đổi flow theo viewport, giữ count/cursor/history/nút 44px. Kiểm 36 route consumer và 320px.
6. P2 UI-A06: tài chính dùng cùng nhịp cảnh báo module-local, không bỏ chữ/severity/provenance/source. Kiểm 0/1/8 cảnh báo, nội dung dài.

Không đổi schema/API/permission/nguồn số liệu, không dựng backend. Tiến độ chỉ ghi plan §16.6. Kết quả phải gắn command/log/exit/hash; source PASS không thay rendered proof. Runtime dùng MSW tổng hợp; không tự ghi nghiệm thu người dùng, screen reader hoặc thiết bị mobile thật.

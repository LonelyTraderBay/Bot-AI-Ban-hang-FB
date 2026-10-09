# 16 — Nguồn và giới hạn chứng cứ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Nguồn kiểm tra khi chuẩn hóa v2
Truy cập 29/09/2026. Chỉ dùng nguồn chính thức cho điểm kỹ thuật liên quan. Đây không phải certification hay kiểm chứng rằng account người dùng đã có capability. Các choices kiến trúc, trọng số tiến độ, task và UI là quyết định thiết kế cho dự án, không là con số từ nguồn ngoài. Khi thực hiện T003/T037/T068–071 kiểm lại đúng phiên bản tài khoản/thư viện.

- **[N01] NestJS modules / encapsulated public exports** — https://docs.nestjs.com/modules
- **[N02] NestJS queues / persisted workers** — https://docs.nestjs.com/application/queues
- **[N03] Node.js release status / LTS baseline** — https://nodejs.org/en/about/previous-releases
- **[N04] Prisma transactions and idempotent/OCC patterns** — https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- **[N05] PostgreSQL RLS and locking** — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **[N06] BullMQ idempotent jobs** — https://docs.bullmq.io/patterns/idempotent-jobs
- **[N07] BullMQ stalled workers / replay conditions** — https://docs.bullmq.io/guide/workers/stalled-jobs
- **[N08] WebKit Home Screen Web Push support and user gesture** — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- **[N09] Telegram Bot API / callbacks** — https://core.telegram.org/bots/api
- **[N10] Official Meta Messenger collection / message eligibility** — https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api
- **[N11] OWASP Excessive Agency / downstream authorization** — https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- **[N12] OWASP ASVS / application security verification** — https://owasp.org/www-project-application-security-verification-standard/
- **[N13] IAS 2 inventories / matching cost with revenue** — https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/
- **[N14] MUI dark mode configuration** — https://mui.com/material-ui/customization/dark-mode/

## Sổ nguồn kế thừa 1.1
Các mục Sxx sau được giữ cho provenance của các quy tắc/UI kế thừa; không tuyên bố đã tái kiểm toàn bộ trong v2.

# 16 — Nguồn và phạm vi sử dụng

Ngày đối chiếu: 29/09/2026. Nội dung thiết kế là baseline đề xuất; nguồn tham khảo không chứng nhận ứng dụng đã production-ready.

## Nghiên cứu nội bộ đã đọc

- Tóm tắt điều hành(3), Library file `file_000000005ba481fb98c619a521620fb4`: yêu cầu sản phẩm, dark UI và định hướng kiến trúc.
- Tóm tắt điều hành(1), Library file `file_000000003cd0820993ce47d6e25176a8`: phạm vi bot, kho và tài chính.
- URL share do chủ dự án đưa chỉ đọc được tiêu đề, không đọc được toàn bộ hội thoại. Không khẳng định kit tái hiện mọi quyết định cuối trong share. Các điểm được chuẩn hóa mới nêu ở docs/00.

## Nguồn chính thức

### S01 — React: Creating a React App

https://react.dev/learn/creating-a-react-app

Trạng thái: Đã truy cập. Phạm vi sử dụng: Framework là hướng khuyến nghị chung; chọn SPA có chủ đích, không gán Vite thành lựa chọn enterprise bắt buộc.

### S02 — React: Build a React app from Scratch

https://react.dev/learn/build-a-react-app-from-scratch

Trạng thái: Đã truy cập. Phạm vi sử dụng: Build tool Vite và trách nhiệm routing/data fetching khi tự tổ hợp SPA.

### S03 — TypeScript: strict

https://www.typescriptlang.org/tsconfig/strict.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: Bật họ kiểm tra kiểu strict; không thay thế runtime validation.

### S04 — TanStack Query: Query Keys

https://tanstack.com/query/latest/docs/framework/react/guides/query-keys

Trạng thái: Đã truy cập. Phạm vi sử dụng: Query key chứa các biến ảnh hưởng dữ liệu; tenant scope là thiết kế của kit.

### S05 — Material UI: Dark mode

https://mui.com/material-ui/customization/dark-mode/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Dark-only theme và tùy biến palette.

### S06 — W3C: WCAG 2.2

https://www.w3.org/TR/WCAG22/

Trạng thái: Đã đối chiếu nội dung WCAG 2.2 từ W3C. Phạm vi sử dụng: Contrast, keyboard, focus, target size; cần audit thực tế.

### S07 — OpenAPI Specification 3.1.0

https://spec.openapis.org/oas/v3.1.0.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: Chọn 3.1.0 vì hợp đồng/toolchain, không tuyên bố đây là phiên bản mới nhất.

### S08 — RFC 9457: Problem Details for HTTP APIs

https://www.rfc-editor.org/rfc/rfc9457.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: application/problem+json và extension lỗi nghiệp vụ.

### S09 — OWASP ASVS

https://owasp.org/www-project-application-security-verification-standard/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Tham chiếu kiểm soát bảo mật; không có chứng nhận tuân thủ tự động.

### S10 — OWASP GenAI: LLM01 Prompt Injection

https://genai.owasp.org/llmrisk/llm01-prompt-injection/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Tài liệu/hội thoại truy xuất là dữ liệu không tin cậy, không phải lệnh.

### S11 — Playwright: Best practices

https://playwright.dev/docs/best-practices

Trạng thái: Đã truy cập. Phạm vi sử dụng: Test hành vi người dùng, isolation và locator có ý nghĩa.

### S12 — Mock Service Worker: Documentation

https://mswjs.io/docs/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Mock tại ranh giới network, dùng lại trong môi trường test.

### S13 — Meta Messenger policy overview

https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/

Trạng thái: Truy cập bị HTTP 429; CHƯA xác minh policy hiện hành. Phạm vi sử dụng: Release owner phải xác minh version, quyền, app review, window và loại tin trước kết nối thật.

## Quy tắc cập nhật

Trước khóa dependency và tích hợp thật, kiểm lại tài liệu chính thức/compatibility, ghi ngày và exact version. Không lấy model price, Graph version hoặc quy định pháp lý cũ trong nghiên cứu làm dữ liệu hiện hành. Hạn chế truy cập Meta là blocker được ghi rõ, không phải bằng chứng chính sách không tồn tại.

## Nguồn bổ sung đã đối chiếu trong 1.1 (29/09/2026)

S03 (strict) và S05 (MUI dark-only) được mở lại trong lần này. Các nguồn khác từ
1.0 giữ như provenance của lần bàn giao trước, không nhận đã kiểm lại tất cả.

| ID | Nguồn chính thức | Dùng cho |
|---|---|---|
| S14 | MDN: color-scheme — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme | CSS/native controls, head metadata; không tự theme mọi component. |
| S15 | Playwright: Emulation — https://playwright.dev/docs/emulation | Color-scheme/media emulation; chỉ phương pháp, chưa chạy UI. |
| S16 | TypeScript: noUncheckedIndexedAccess — https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html | Kiểm truy cập index, riêng với strict. |
| S17 | TypeScript: exactOptionalPropertyTypes — https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html | Phân biệt optional và undefined theo cấu hình. |
| S18 | MUI: Palette — https://mui.com/material-ui/customization/palette/ | primary.light là sắc độ, không là theme mode. |
| S19 | ESLint: Custom Rules — https://eslint.org/docs/latest/extend/custom-rules | Tham khảo AST-based enforcement; chưa cấu hình linter app trong kit. |

Nguồn nội bộ mới: file AI_RULES.md 3.1 do người dùng đính kèm, giữ nguyên; trực tiếp
yêu cầu dark-only và thống nhất code/AI ngày 29/09/2026. Thông số kỹ thuật/stack
trong quy tắc project là baseline triển khai, không biến thành yêu cầu Universal.

## Nguồn thị giác 2.1 — kiểm ngày 29/09/2026

- VIS-01 — Binance, trang chính thức: https://www.binance.com/en . Tham chiếu bối cảnh nhận diện/điểm nhấn ấm; không khẳng định mã HEX chính thức. Web đọc được trang; trình duyệt tự động trong môi trường này bị chặn truy cập trang live.
- VIS-02 — Bybit Press, 24/09/2026, mô tả điểm nhấn cam trong visual identity: https://www.bybit.com/en/press/post/bybit-unveils-make-your-move-as-new-global-brand-campaign-for-the-new-financial-platform-bb81b32d32e08542c5b . Chỉ tham chiếu ý tưởng điểm nhấn ấm, không sao chép biểu tượng chữ I. Trang live trong browser bị chặn; không tuyên bố đối chiếu pixel của Bybit.
- VIS-03 — Coinbase Design System / Colors: https://cds.coinbase.com/getting-started/colors . Tham chiếu cách tách foreground/background/semantic status và vai trò token; không thêm CDS dependency hoặc hệ thống multi-theme.
- VIS-04 — W3C / Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html . Căn cứ mục tiêu tương phản 4.5:1 cho chữ thường. Kiểm token không phải chứng nhận toàn ứng dụng.

Thiết kế mới là lựa chọn riêng của dự án. Không dùng bài viết cộng đồng hay bản trích design.md không chính thức để xác nhận giá trị brand color.

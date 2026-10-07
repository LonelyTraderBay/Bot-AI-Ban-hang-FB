# Phân tích lại mức độ hoàn chỉnh Frontend BotSales AI — 02/10/2026

## 1. Kết luận

Frontend đã có đủ bộ màn hình và nhóm chức năng trong kế hoạch: 54 route, 16 module, 64 feature ID và 65 dòng liên kết feature–route. Tracker đang xác nhận FE001–FE028 DONE, 140/140 checkpoint, 100%, không BLOCKED hoặc STALE. Source có foundation và các luồng nghiệp vụ thực qua mock API, không chỉ là giao diện tĩnh.

**Tuy nhiên, chưa nên kết luận code UI hoàn chỉnh 100%. Lượt phân tích này tái hiện 5 vấn đề P1 và 1 vấn đề P2 trong chính React frontend với MSW.** Có khoảng cách giữa checklist đã ghi DONE và hành vi khi dữ liệu vượt một trang, nhiều collection cùng màn hình hoặc shop dùng múi giờ khác. Cần xử lý và bổ sung kiểm thử trước khi nghiệm thu UI cuối cùng.

Không phát hiện vấn đề P0 trong phần được kiểm tra. Điều này không phải chứng nhận rằng toàn ứng dụng không có lỗi. Không quy đổi các phát hiện thành phần trăm hoàn chỉnh mới vì chưa có trọng số nghiệm thu cho từng lỗi.

Backend, DB, provider thật, persistence thật và staging nằm ngoài đánh giá này. Không yêu cầu triển khai Backend để sửa các vấn đề Frontend dưới đây. Ngoại lệ FE017 về `knowledge.publish` + lifecycle tiếp tục được giữ theo phạm vi đã duyệt; không coi thiếu `Knowledge.allowedActions` là blocker UI mock.

## 2. Phạm vi, nguồn và phương pháp

- Workspace: `BotSalesAI_Frontend`; branch `main`; HEAD `e68cb65e61c5c1aab2ae169dd8033df305df8872`.
- Đọc quy tắc gốc, scope/context/report, kế hoạch frontend, kiến trúc/API/coding standards, route/state/feature matrices và các source liên quan. Không dùng prototype để đánh giá source React.
- Nguồn giao việc: [frontend-plan.json](../botsales-kit/execution/frontend-plan.json); ledger: [frontend-progress.json](../botsales-kit/execution/frontend-progress.json); tài liệu sinh: [IMPLEMENTATION_PLAN.md](../botsales-kit/IMPLEMENTATION_PLAN.md).
- Nguồn UI/API: [route manifest](../botsales-kit/contracts/route-manifest.json), [OpenAPI](../botsales-kit/contracts/openapi.json), [tokens](../botsales-kit/design/tokens.json).
- Lập inventory AST trên 62 file TS/TSX, đối chiếu các component/module, query/command, lookup, thời gian và pagination. Inventory là công cụ định vị, không tự chứng minh hành vi đúng.
- Chạy lại generator, TypeScript, ESLint, boundaries, unit test và production/demo build.
- Chạy 6 probe có mục tiêu trên React dev demo + MSW, Chromium 153.0.8010.12, viewport 1440×1000. Dữ liệu test là tổng hợp theo schema và chỉ tồn tại trong bộ nhớ tab. Các probe này không phải UAT của production artifact.
- Xem 3 ảnh React demo đã có: Inbox, Knowledge, Digests. Không suy ra độ dễ dùng của mọi màn hình chỉ từ các ảnh này.

Phân biệt trong báo cáo: **đã tái hiện** = có browser evidence mới; **quan sát source** = thấy trực tiếp trong code; **đề xuất** = cải thiện chưa triển khai; **chưa xác minh** = chưa chạy kiểm tra tương ứng.

## 3. Kiểm tra đã chạy lại

| Kiểm tra | Kết quả của lượt này | Bằng chứng |
|---|---|---|
| `npm run generate:check` | PASS: 11 outputs, 283 schemas, 210 operations, 54 routes | [generator log](frontend-ui-reaudit-20261002/generate-check.log) |
| `npm run typecheck` | PASS | [typecheck log](frontend-ui-reaudit-20261002/typecheck.log) |
| `npm run lint` | PASS | [lint log](frontend-ui-reaudit-20261002/lint.log) |
| Boundary checker | PASS: 410 imports, 0 issues, negative fixtures 8/8 | [boundary result](frontend-ui-reaudit-20261002/boundaries.json) |
| `npm test` | PASS: 71 tests, 8 files | [unit log](frontend-ui-reaudit-20261002/unit.log) |
| `npm run build` | PASS; cảnh báo chunk >500 kB vẫn còn | [production build log](frontend-ui-reaudit-20261002/build-production.log) |
| `npm run build:demo` | PASS | [demo build log](frontend-ui-reaudit-20261002/build-demo.log) |
| 6 probe tìm khoảng trống UI | Cả 6 tái hiện hành vi được mô tả ở mục 4 | [browser result](frontend-ui-reaudit-20261002/browser-probes.json) |
| Trạng thái ledger | 100%, 140/140, không stale/blocked | `node botsales-kit/scripts/progress.mjs status` chạy đầu và cuối khảo sát |

Lỗi PATH của npm subprocess ở lần thử đầu đã được xử lý bằng PATH gọn trong process chạy kiểm tra. Không sửa manifest/lockfile hoặc cài dependency mới. Không coi lỗi PATH ban đầu là lỗi sản phẩm.

**Bằng chứng sẵn có, không chạy lại toàn bộ trong lượt này:** E2E 147/147, domain/MSW 88/88, mock schema 356/356, npm audit 0/478, cold install và reflow 54/54. Đã đọc [báo cáo hiện hành](REPORT.md) và [log E2E](../botsales-kit/execution/frontend-evidence/FE027/e2e-ui-select-and-feplan-002-current-20261002.log). Không gọi đây là kết quả mới của lượt phân tích này. Không chạy lại cả `npm run verify`/full E2E; các lệnh mới được liệt kê riêng phía trên.

## 4. Vấn đề đã tái hiện và cách hoàn thiện

### P1-01 — Danh sách đánh giá AI không truy cập được trang sau

- Source: [bot/index.tsx:51](../apps/web/src/modules/bot/index.tsx#L51), `EvaluationsPage`.
- API `listEvaluations` hỗ trợ `limit`/`cursor`. Page dùng `useListQuery()` với mặc định 20, render bảng nhưng không render `Pager` hoặc nút tải thêm.
- Probe tạo 25 evaluation tổng hợp. API trả 20 dòng, `total=25`, `hasMore=true`, `nextCursor=audit-eval-20`; UI chỉ có 20 dòng và 0 nút đi trang tiếp/tải thêm.
- Tác động: người dùng không thể truy cập 5 lượt đánh giá còn lại bằng UI. Đây là thiếu luồng Frontend, không phụ thuộc Backend.
- Sửa nhỏ nhất: dùng `Pager` hiện có, giữ query trong URL, reset cursor khi thay tìm kiếm/bộ lọc; không thêm thư viện bảng mới.
- Nghiệm thu: dataset 25 và 105 evaluation; truy cập được hết; đầu danh sách/đi tiếp đúng; tải lỗi không mất query; xem chi tiết và quay lại vẫn đúng trang.
- Liên quan kế hoạch: FE018, FE023.S03, FE027.
- Ảnh: [25 evaluation](frontend-ui-reaudit-20261002/evaluations-25-records.png).

### P1-02 — Thời gian hiển thị không nhất quán với múi giờ shop

- Source: [format.ts:12](../apps/web/src/shared/model/format.ts#L12) mặc định `Asia/Vientiane`; [finance/index.tsx:87](../apps/web/src/modules/finance/index.tsx#L87) gọi `dateTime(c.from/to/asOf)` không truyền `shop.timezone`.
- Inventory tìm 41 lời gọi `dateTime`, trong đó 14 lời gọi một tham số tại bot, catalog import, finance, integrations, knowledge. Đây là 14 điểm cần review, không tự động là 14 lỗi độc lập.
- Probe đặt shop mock thành UTC. Bộ lọc/API vẫn dùng UTC và kỳ bắt đầu `00:00Z`, nhưng UI hiển thị `07:00 1/9/26`, kết thúc `07:00 1/10/26`. Nhãn múi giờ của báo cáo là UTC, nên thông tin trên cùng màn hình mâu thuẫn.
- Sửa nhỏ nhất: truyền timezone của shop/report vào các vị trí theo contract. Có thể yêu cầu timezone rõ ở helper cho UI shop để compiler phát hiện lời gọi thiếu. Giữ date-only tách khỏi timestamp.
- Nghiệm thu: cùng instant hiển thị đúng cho Asia/Vientiane, UTC và một múi giờ lệch ngày; đối chiếu nhãn From/To/asOf/occurredAt. Chưa có bằng chứng DST đầy đủ.
- Liên quan kế hoạch: FE015, FE021, FE023; CODE-010.
- Ảnh: [shop UTC](frontend-ui-reaudit-20261002/cashflow-utc-shop.png).

### P1-03 — Tab đối soát dùng chung cursor của các collection khác nhau

- Source: [finance/index.tsx:198](../apps/web/src/modules/finance/index.tsx#L198), `ReconciliationPage`.
- Ngân hàng, COD, reconciliation cases và debt lookups đều gọi `useListQuery()` trên cùng `cursor` URL. Đổi tab chỉ `setTab`, không bỏ hoặc tách cursor.
- Probe: 25 giao dịch ngân hàng và 1 COD. Bấm Trang tiếp ở Ngân hàng, sau đó chọn COD. COD trang đầu trả 200 với dữ liệu; COD với cursor ngân hàng trả 422 `INVALID_CURSOR`; UI báo “Cursor không còn phù hợp. Mở lại đầu danh sách.”
- Tác động: thao tác đổi tab thông thường làm màn hình lỗi, nút retry vẫn dùng cursor sai. Lookup ngân hàng/công nợ trong dialog cũng bị buộc theo trang đang xem, cần review riêng.
- Sửa nhỏ nhất: đổi tab xóa cursor và lưu tab vào URL nếu cần deep link; hoặc mỗi collection có cursor riêng. Lookup cho dialog dùng query phân trang độc lập, không mượn cursor bảng.
- Nghiệm thu: trang 2 Ngân hàng → COD → Chênh lệch → Back; không gửi cursor collection A cho B; mỗi dialog chọn được giao dịch/nợ ngoài trang bảng hiện tại.
- Liên quan kế hoạch: FE015, FE023.S03, FE027.
- Ảnh: [COD sau phân trang ngân hàng](frontend-ui-reaudit-20261002/reconciliation-cod-after-bank-page.png).

### P1-04 — Phân trang tin nhắn làm hỏng danh sách hội thoại

- Source: [inbox/index.tsx:22](../apps/web/src/modules/inbox/index.tsx#L22) đọc `cursor` cho `listConversations`; [inbox/index.tsx:56](../apps/web/src/modules/inbox/index.tsx#L56) đọc cùng `cursor` cho `listMessages`.
- `detailHref()` lưu cursor danh sách vào `listCursor`, nhưng query danh sách trên route chi tiết vẫn đọc `cursor` của tin nhắn. Cả hai panel còn cùng tồn tại trên desktop.
- Probe tạo 105 tin nhắn cho cv1. Đi trang tiếp trong lịch sử tin; cursor tin nhắn được gửi cho `listConversations`, API mock trả 422 `INVALID_CURSOR`, panel danh sách hiển thị lỗi.
- Sửa nhỏ nhất: dùng tham số riêng cho message cursor; khi ở route chi tiết, danh sách đọc list cursor riêng. Giữ đường Back về đúng bộ lọc và trang danh sách.
- Nghiệm thu: >100 tin và >40 hội thoại; hai vùng phân trang độc lập; send/refetch/SSE không làm mất trang đang xem; desktop/mobile Back giữ list cursor.
- Liên quan kế hoạch: FE016, FE007, FE023, FE027.
- Ảnh: [Inbox sau trang tin nhắn](frontend-ui-reaudit-20261002/inbox-after-message-page.png).

### P1-05 — Lookup danh mục sản phẩm giới hạn 100, không có đường chọn dữ liệu còn lại

- Source: [catalog/index.tsx:50](../apps/web/src/modules/catalog/index.tsx#L50). Form sản phẩm đọc `listCategories(limit:100)` và map trực tiếp thành `MenuItem`; không tải thêm/tìm kiếm server.
- Probe tạo 105 category. Response báo `hasMore=true`; category 105 không xuất hiện trong popup và không có nút tải thêm.
- Tác động: không thể gán một sản phẩm vào danh mục ngoài 100 mục đầu qua UI. Edit sản phẩm có category ngoài trang đầu cũng cần được kiểm riêng.
- Sửa nhỏ nhất: tái sử dụng [usePagedApi](../apps/web/src/shared/api/hooks.ts#L25) và `LookupLoadMore`, thêm tìm kiếm theo contract nếu phù hợp; bảo toàn option đang chọn khi tải trang/filter khác.
- Mở rộng review sang các lookup tương tự: order cho vận đơn/đổi trả, supplier/offer cho PO, purchase order cho nhận hàng, customer cho privacy, members cho assignment. Inventory có 22 lời gọi `limit:100`, nhưng một số là preview có giới hạn được ghi rõ hoặc messages đã có cursor, không đánh đồng tất cả thành lỗi.
- Panel nguồn giá/tồn ở Knowledge/Inbox có nhãn “100 bản ghi đầu” và link tra cứu đầy đủ: đó là giới hạn preview đã công bố; tối ưu thêm tùy nhu cầu, không tự gọi là dropdown bị lỗi.
- Nghiệm thu: 105 category, 150 supplier/offer/order; tìm và chọn được record cuối; giữ selected value khi search/load more; lỗi/permission của lookup có thông báo riêng.
- Liên quan kế hoạch: FE010, FE013, FE014, FE023.S03; kế hoạch ghi rõ “không chỉ lookup 100 dòng cho mọi dữ liệu”.
- Ảnh: [105 category](frontend-ui-reaudit-20261002/product-category-105-records.png).

### P2-01 — Kết nối Facebook rỗng thiếu empty state có hướng dẫn

- Source: [integrations/index.tsx:11](../apps/web/src/modules/integrations/index.tsx#L11), `ChannelsPage`.
- Query thành công nhưng `data=[]` chỉ render một Stack trống; không dùng `Empty` hoặc thông báo chưa có kênh.
- Probe xác nhận response 200/0 rows; main chỉ còn tiêu đề, nút Kết nối Page và nhãn demo; 0 empty live-status.
- Nút kết nối vẫn tồn tại, nên đây là thiếu phản hồi trạng thái, chưa phải luồng bị chặn.
- Sửa: empty state “Chưa có Page kết nối” + CTA phù hợp quyền; rà AI connections, revisions, budgets và card-list rỗng tương tự. Chỉ R29 đã được probe trực tiếp; không coi các màn còn lại đã tái hiện lỗi.
- Nghiệm thu: first-use và search-no-result phân biệt; CTA ẩn/disabled đúng quyền; loading/error không bị hiển thị như empty success.
- Liên quan kế hoạch: FE019, FE023, FE025.
- Ảnh: [kênh rỗng](frontend-ui-reaudit-20261002/channels-empty.png).

## 5. Đối chiếu từng nhóm UI — 16 module

“Có” trong bảng nghĩa là source và đường UI/mock đã tồn tại; không có nghĩa mọi tổ hợp dữ liệu/state đã được nghiệm thu. Các tối ưu chưa tái hiện được ghi là đề xuất.

| Module / route | Những gì đã có | Mục nên cập nhật/kiểm thêm |
|---|---|---|
| **Workspace** — R01–03, R32–36 | Login/demo, chọn shop, onboarding, team/roles, shop settings, audit, privacy, jobs; guard và cache shop có regression | Review lookup customer 100 của privacy; thông báo shop rỗng; giải thích raw IDs/permission labels; UAT onboarding có lỗi từng bước. Privacy protocol thật thiếu là ngoài scope mock. |
| **Dashboard** — R04 | KPI lấy API, scope/permissions, recent orders, vai trò AI, pause bot có xác nhận | Ẩn/giải thích CTA hero khi thiếu `orders.write`/`operations.read`; hiện kỳ/asOf gần KPI hơn; kiểm lỗi độc lập từng panel. Không thêm KPI giả. |
| **Inbox** — R05–06 | Search/filter URL, list/detail, message history, takeover/release/assign/resolve, send/note, feedback, context/price-stock preview | **Sửa P1-04**; kiểm draft khi đổi conversation; search metadata lỗi; kiểm composer khi bàn phím mobile mở; gom preview dài thành tabs/disclosure khi cần. |
| **Customers** — R07–08, R54 | CRUD/profile, redact fields, giữ draft, orders/shipments/service cases, multi-page lookup cho tạo yêu cầu | Profile orders đọc 10 dòng; shipments dựa trên các order đó và 100 shipments đầu. Ghi rõ “gần đây”, đưa link xem toàn bộ/lookup có filter. Secondary orders query chưa có QueryState riêng nên dễ gộp lỗi/quyền/empty vào một câu. |
| **Catalog** — R09–14 | Product/variants/image upload, create/edit/archive, filters, categories, CSV preview/commit/result, lịch sử import | **Sửa P1-05**; kiểm selected category ngoài trang đầu; field error của upload; UX bảng variant nhiều dòng. CSV có giới hạn; không suy ra đã hỗ trợ XLSX. |
| **Inventory** — R15–16 | Snapshot stock/reserved/available, adjustment, movement filters, typed payload và unknown result | Đề xuất lookup kho/variant có nhãn tên khi contract cho phép, thay nhập mã thủ công; kiểm multiwarehouse và item dài; thêm mô tả tác động trước điều chỉnh lớn. |
| **Orders** — R17–19, R43 | Multi-line draft, quote, customer confirmation, confirm/cancel/pay/refund, returns/inspection | Rà order lookup 100 cho return; đơn dài nhiều dòng; visibility quote hết hạn/chênh lệch; giữ metadata unknown và cách copy command ID. Địa chỉ demo đã có nhãn rõ, không yêu cầu CRUD backend để nghiệm thu UI. |
| **Fulfillment** — R41–42 | Work claim, pick/pack, shipment create/handover/events, state/evidence/version | Rà order lookup 100 cho shipment; mở từ deep link phải giữ selected order; timestamp input hiện dùng local browser cần UAT khi browser/shop khác timezone; mobile thao tác nhận/đóng gói. |
| **Procurement** — R44–47 | Suppliers/offers, replenishment/rules, multi-line PO, approval/send/confirm/cancel, receipt/partial/rejected/post | Supplier/offer/PO lookup phân trang; query riêng theo supplier thay lọc 100 offer toàn shop; thông báo lookup loading/error thay kết luận chưa có supplier; kiểm 100+ line và lịch sử nhận từng phần. |
| **Finance** — R20–22, R48–50 | Cashflow/P&L API aggregates, journals nhiều dòng/cân bằng BigInt, post/reverse, statements/COD/reconciliation/debts/periods | **Sửa P1-02 và P1-03**; lookup transaction/debt độc lập; bỏ ngày mặc định cố định khỏi form bình thường hoặc giới hạn rõ demo; thống nhất date-only và timestamp. |
| **Knowledge** — R23–25 | Draft/review/publish/revisions, sources upload, feedback, price-stock source và content preview | Truy cập đầy đủ revision history khi >1 page; timezone `publishedAt`; tách preview dài khỏi luồng danh sách chính; giữ local-preview label. Không tự thêm allowedActions vào contract. |
| **Bot** — R26–28, R51 | Draft/publish/pause/restore, playground sources/cost/latency synthetic, evaluations, roles/budgets/tool permissions | **Sửa P1-01**; pagination history/AI connection choices; loading/error riêng cho version/provider lookup; thay các ID cần nhập tay bằng chooser khi API đã có dữ liệu phù hợp. |
| **Integrations** — R29–30 | Facebook connect/reconnect/disconnect/health; AI provider catalog/create/update/delete/test; secret clear | **Sửa P2-01**; paging list/card; empty provider catalog; model chọn từ catalog thay free text khi contract xác nhận; error catalog có retry. Không coi kết nối mock là kết nối provider thật. |
| **Notifications** — R39–40 | Notification acknowledgment, device consent/capability/revoke, policy/reminders/quiet hours/Telegram preview | Paging devices/member recipients ngoài 100; kiểm long recipient list, tab focus, denied consent; UAT installability/UI trên browser/device được chọn. Delivery thật ngoài scope. |
| **Operations** — R37–38, R52 | Work tasks/claim/assignment, approvals/version, digests/history, indicators và pause/resume roles | Paging member lookup, filter công việc rõ hơn, primary action theo role; giữ “chưa xác minh” cho capability chưa có source. Không dựng scheduler/readiness backend mới. |
| **Reports** — R31, R53 | Chart + data table, timezone/filter/export permissions/safe filename/download, marketing synthetic | Giữ export range/type trong URL; đọc màu chart và contrast; error job/download độc lập; tránh gộp logic chuyển ngày trùng với finance. |

## 6. Đối chiếu đủ FE001–FE028

Tất cả task dưới đây đang DONE theo tracker. Cột cuối là đánh giá bổ sung của lượt audit, **không phải thay đổi ledger**.

| Task | Hạng mục | Đánh giá bổ sung |
|---|---|---|
| FE001 | Source/scope | Đúng scope Frontend mock, preserve source; không thấy thiếu module do scope. |
| FE002 | Toolchain/dependencies | Node 24.19.0/npm 11.17.0; checks/build mới đạt; cold install dựa evidence hiện hành. |
| FE003 | Commands/evidence | Có commands/logs thật. Cần tách suite-pass khỏi claim không còn UI gap. |
| FE004 | TS/boundaries | Checks mới đạt; nên cải thiện readability theo trách nhiệm, không viết lại kiến trúc. |
| FE005 | Contracts/transport | Generator/typed client đạt; lookup pagination phải dùng semantics cursor đúng collection. |
| FE006 | Theme/shared UI | Có một MUI/Graphite Gold theme, shared table/dialog/status/query states. Contrast thủ công còn mở. |
| FE007 | Shell/session/scope | Scope/deep link/draft đã có; Inbox cursor cần regression thêm. |
| FE008 | Synthetic API/data | Có 210 handler operations và test sẵn; dataset nhỏ hiện không phát hiện các ca pagination mới. |
| FE009 | Workspace/customer | Có flow; profile history hữu hạn và secondary-query feedback cần review. |
| FE010 | Catalog/import | Có flow; category >100 không chọn được — P1-05. |
| FE011 | Stock/movement | Có flow; ergonomic lookup/multiwarehouse là cải tiến tiếp theo. |
| FE012 | Order/quote/confirm | Có flow; cần dữ liệu lớn/long form và draft/unknown UAT thêm. |
| FE013 | Fulfillment/returns | Có flow; rà order choices >100. |
| FE014 | Procurement/receipt | Có multi-line flow; supplier/offer/PO lookup còn giới hạn đầu trang. |
| FE015 | Finance/COD | Có flow; hai lỗi tái hiện P1-02/P1-03. |
| FE016 | Inbox/takeover | Có flow; P1-04. |
| FE017 | Knowledge/review | Mock substitute đã được chấp nhận; revision paging/timezone/preview UX cần review. |
| FE018 | Bot/eval | Có flow; P1-01. |
| FE019 | Integrations/notifications | Có flow; R29 empty thiếu phản hồi — P2-01; paging cards/device cần review. |
| FE020 | Operations/approval | Có flow; member lookup/long-data UX nên mở rộng. |
| FE021 | Dashboard/reports | Có aggregates/chart/table/export. Review CTA permission, URL filters và timezone display. |
| FE022 | Cross-module journeys | 4 journey có log PASS; không phủ tất cả pagination/state combination mới. |
| FE023 | States/forms/i18n/recovery | **Cần review lại S03**: kế hoạch yêu cầu lookup không chỉ 100 dòng; lỗi cursor và empty composition còn tồn tại. I18n chỉ common keys, không coi full localization hoàn chỉnh. |
| FE024 | FE security/permissions | Có security/scope evidence; audit không phát hiện P0 trong phần đọc. Không suy ra server security. |
| FE025 | Responsive/a11y/perf | Auto evidence tốt; keyboard sâu, screen-reader/zoom thật/contrast toàn app chưa đóng. |
| FE026 | Artifacts/reproducibility | Hai build mới đạt; production không bật mock. CI remote là việc chưa xác minh, không phải thiếu Backend. |
| FE027 | UI/mock acceptance | Có 147/147 suite cũ; **5 P1 mới cần fix/regression trước nghiệm thu UI cuối**. Owner chưa ký. |
| FE028 | Quality/handoff | Handoff có scope/gaps; cần bổ sung audit mới để claim phản ánh đúng code. |

## 7. Cách đọc coverage hiện tại

Coverage đang có giá trị, nhưng các số tổng cần được hiểu đúng:

- Route–role: **51 route shop × 7 role = 357 case**. Ba route ngoài shop thuộc phạm vi kiểm khác. Không gọi 357 là kiểm mọi action/field cho mọi role.
- Route–state: **54 route × 8 state = 432 ô**. Đây là trục riêng, không phải 54×7 role tạo ra 432.
- Trong 432 ô: **163 route-specific**, **204 shared UI**, **65 N/A theo contract**, **0 NOT_TESTED**. Shared component PASS không chứng minh mọi route ghép state đúng. Với 367 ô áp dụng, 163 có route-specific evidence; không đổi con số này thành phần trăm hoàn chỉnh sản phẩm.
- Empty composition có probe riêng cho 9 route; R29 còn đánh dấu SHARED_UI_TESTED. Vì vậy bảng “0 NOT_TESTED” có thể cùng tồn tại với empty gap vừa tái hiện.
- Success của 54 route có route mount/render smoke; 65 feature-route rows có interaction link. Render route không chứng minh danh sách nhiều trang, tất cả mutation/action hoặc mọi subquery negative state.
- Một test đổi lỗi “mọi API” và thấy error trên main không thay test lỗi riêng category/provider/member lookup khi query chính vẫn thành công.

Nên bổ sung regression cho 6 case mới và targeted state coverage, không nhân mọi test thành toàn bộ Cartesian product không có ý nghĩa.

## 8. Các mục tối ưu thêm, tách khỏi lỗi đã tái hiện

### P1 — Hoàn thiện nghiệm thu và test có mục tiêu

1. Sửa năm P1 ở mục 4; thêm regression đúng trigger. Dataset test phải vượt `limit`, không chỉ test trang đầu.
2. Review toàn bộ lookup dùng 100 records: chỉ sửa nơi người dùng cần chọn toàn collection; giữ preview đã công bố giới hạn nếu vẫn đáp ứng scope.
3. Tách query state cho dữ liệu phụ. Ví dụ CustomerPage orders không nên biến lỗi fetch thành “chưa có đơn hoặc chưa đủ quyền”; PurchasesPage supplier lookup lỗi không nên báo như không có supplier được duyệt.
4. Bổ sung kiểm đổi shop/timezone và hai collection cùng URL; đây là blind spot mà suite hiện có bỏ sót.
5. Hoàn tất FE-G05 manual: keyboard cả workflow, focus dialog/menus, screen-reader, browser zoom thật và contrast. Đây là việc Frontend, không đòi Backend.

### P2 — Dễ dùng hơn

6. **Phân trang quay lại:** shared Pager chỉ có “Đầu danh sách” và “Trang tiếp”; cân nhắc cursor history hoặc hỗ trợ browser Back rõ hơn để không phải về đầu khi cần trang trước. Không bịa số trang/total khi contract không cấp.
7. **Trạng thái URL:** danh sách đã giữ search/cursor; tab đối soát và khoảng ngày cashflow/P&L hiện dùng local state. Giữ trong URL để deep link/refresh/Back có cùng context.
8. **Ngày mặc định:** form finance entry/journal có giá trị khởi đầu cố định `2026-09-29`. Nên dùng ngày shop hiện hành cho flow bình thường, hoặc chỉ dùng fixed clock trong demo có nhãn. Không gọi ngày seed cố định là lỗi bản thân mock.
9. **IDs và thuật ngữ:** ưu tiên nhãn tên + mã, error/tooltip rõ; raw provider/capability/role/warehouse/account IDs chỉ xuất hiện khi giúp người vận hành ra quyết định.
10. **CTA theo quyền:** dashboard hero hiện có link tạo đơn/operations độc lập với permission booleans của panels. Guard vẫn chặn route; cải thiện CTA giúp tránh dẫn người dùng vào 403.
11. **Mobile tables:** DataTable hiện min-width 600 và vùng scroll có nhãn/focus. Giữ cho bảng cần đối chiếu nhiều cột; cân nhắc row detail/card cho thao tác vận hành ở mobile. Không chuyển mọi bảng thành card.
12. **Inbox:** kiểm bàn phím mềm, composer còn thấy, tab order qua message/context; preview tư vấn/giá/tồn dài nên có disclosure/tabs theo nhu cầu. Chưa có phép đo usability để khẳng định phương án mới tốt hơn.
13. **Demo controls:** có thể thu gọn bộ role/fault/dataset thành vùng mở rộng để giảm chiều cao màn nghiệm thu; badge dữ liệu mô phỏng vẫn rõ. Production đã tách vùng này.
14. **Feedback/save:** thống nhất success message, draft clean state và focus return. Một số thao tác đóng dialog sau save; cần UAT để người dùng nhận biết object vừa thay đổi ở đâu.
15. **Long data:** test SKU/tên khách dài, 100+ dòng PO/receipt/journal, nhiều variant/revision/device. Ưu tiên preserve value và focus khi add/remove/reorder.

### P2 — Dễ sửa và vận hành Frontend

16. **Tách theo trách nhiệm:** nhiều module để đọc API/form/actions/JSX trong cùng `index.tsx`. Sáu component lớn nhất khoảng 9.5–12.5 nghìn ký tự; 15 dòng source dài >1.500 ký tự. Định dạng JSX và tách dialog/model/query theo phần khó test; giữ một public entry, không generic CRUD engine hoặc thư viện thứ hai.
17. **I18n:** 4 lời gọi `useTranslation`, từ điển chủ yếu common states, `supportedLngs=['vi']`; copy phần lớn module còn inline. Không bắt thêm tiếng Anh; đưa copy/validation nghiệp vụ vào keys theo từng module khi sửa để nhất quán tiếng Việt. Test key hiện tại không phải kiểm mọi chuỗi UI.
18. **Date helpers:** finance và reports có hai implementation chuyển date/timezone. Gộp phần thực sự cùng semantics sau khi test UTC/offset/day-boundary; giữ khác biệt inclusive/exclusive range, không hợp nhất mù.
19. **Bundle:** build mới lớn nhất 730.75 kB minified / 184.41 kB gzip theo Vite, cảnh báo 500 kB còn. Metric demo sẵn có: initial JS 446,928 bytes gzip (~436.5 KiB), largest chunk 185,429 bytes gzip (~181.1 KiB); đạt budget local 500/200 KiB. Phân tích chunk từ dependency graph trước khi split; không tăng warning limit để gọi là tối ưu, không thêm virtualization/cache mới khi chưa đo bottleneck.
20. **Đo thêm đúng thiết bị:** metric 343 ms cho trang đầu 1,004 customer trên Chromium local chưa đại diện điện thoại yếu/CPU throttling/network chậm; cần đo parse/render, memory, navigation và responsiveness trên target được chọn.
21. **Browser support:** Playwright config chỉ Chromium. Firefox/WebKit, Android/iOS PWA/UI và native date/select behavior chưa có proof tương đương; chạy theo support matrix đã chấp nhận, không tự nhận all-browser PASS.
22. **CI:** workflow đã có install/audit/verify/E2E; GitHub CI chưa có bằng chứng chạy. Đây là tái lập Frontend trên runner, không phải đề nghị dựng Backend hoặc triển khai hosting.
23. **Audit data:** version hóa scope/report và thay tham chiếu cũ; không xóa lịch sử hoặc dùng stale findings để kết luận nút hiện hành vô tác dụng.
24. **Bàn giao/UAT:** owner xem các flow hàng ngày, quy trình nhiều dòng/permission/error; ghi accepted exceptions bằng quyết định thật. Không dùng test auto để ghi owner acceptance.

## 9. Giải thích file premium-audit.json đang mở

- File ở root đang có **25 findings**: 16 thuộc `apps/web/src`, 8 thuộc prototype và 1 thuộc test. Nó không được coi là 25 lỗi hiện hành trong source Frontend.
- [Audit ngày 02/10](frontend-design-audit-current-20261002.json) có **12 findings**, 0 unresolved ownership. Chưa chạy lại strict auditor trong lượt này.
- [Reconciliation](frontend-design-audit-reconciliation-current-20261002.md) giải thích scanner không hiểu một số `onClick`, `component={RouterLink}`, `to` và button label chứa file input. Đọc trực tiếp Shell/router/import/upload cho thấy các điểm đó có action/link thật.
- Kết luận đúng: strict audit hiện vẫn exit 1; không ghi PASS, không gọi 12 findings là 12 nút chết, không xóa code hoạt động chỉ để scanner im lặng. Cần adapter/config hỗ trợ JSX hoặc exception có evidence đúng scope.
- Các lỗi pagination/timezone/cursor mới trong báo cáo này là phát hiện riêng, có browser reproduction; chúng không được thay bằng kết luận scanner.

## 10. Gate Frontend và thứ tự hoàn thiện

| Gate | Đánh giá của lượt audit |
|---|---|
| FE-G01 | Evidence cold install hiện có; build mới đạt. Không chạy cold install lần nữa. |
| FE-G02 | Type/lint/boundaries/generator mới đạt. |
| FE-G03 | Unit mới 71/71; domain/schema dựa log hiện hành. |
| FE-G04 | Coverage hiện có mạnh nhưng cần regression cho 5 P1 mới; shared-state coverage có giới hạn nêu ở mục 7. |
| FE-G05 | Chưa khép kín kiểm thủ công/contrast/screen-reader/zoom thật. |
| FE-G06 | Evidence frontend security hiện có; không mở rộng claim thành server security. |
| FE-G07 | Budget local có evidence; build mới còn chunk advisory; thiết bị/browser khác chưa đo. |
| FE-G08 | Production/demo build mới đạt; remote CI chưa xác minh. |
| FE-G09 | Test/UAT tự động có evidence; owner acceptance chưa được ghi. Các P1 mới cần giải quyết trước nghiệm thu UI cuối. |

**Thứ tự làm hợp lý:**

1. Cursor đối soát và Inbox; timezone shop; pagination evaluations; category lookup.
2. Lookup còn lại, secondary-query errors và empty states.
3. Regression dữ liệu >1 trang, hai collection cùng route, shop timezone; sau sửa chạy các gate bị ảnh hưởng trên đúng diff.
4. Manual accessibility/mobile/owner UAT.
5. Bundle/readability/i18n/ergonomic polish theo phép đo và nhu cầu.

Frontend mock có nền tảng tốt và gần nghiệm thu, nhưng 100% ledger hiện không đủ để khẳng định UI không còn mandatory gap. Đề nghị review lại FE023.S03, các task module liên quan và FE027; báo cáo này không tự thay tracker hay ghi tăng/giảm tiến độ.

## 11. Những thay đổi của lượt này

Chỉ thêm báo cáo và công cụ/log/ảnh audit trong `evidence/`. Không sửa application source, contracts, tokens, generated files, lockfile, kế hoạch hoặc ledger. Build outputs được tạo lại theo scripts của repo. `premium-audit.json` untracked của người dùng được giữ nguyên. Không commit/push/merge/deploy, không gọi provider thật.

Script có thể tái lập: [source inventory](frontend-ui-reaudit-20261002/inspect-source.mjs), [browser probes](frontend-ui-reaudit-20261002/browser-probes.mjs). Initial probe diagnostic được giữ; lượt cuối ghi 6 reproductions thành công. Các reproduction flags nghĩa là đã xác nhận vấn đề, không phải ứng dụng vượt qua 6 acceptance tests.

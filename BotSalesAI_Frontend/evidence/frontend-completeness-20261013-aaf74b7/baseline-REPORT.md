# Kiểm tra Frontend thực tế so với tài liệu — 13/10/2026

Source được kiểm: commit `aaf74b7787ef0f76228e533abe33d22a1b67459c`; workspace `BotSalesAI_Frontend`, React/TypeScript; Node 24.19.0. Backend tại checkout là thư mục trống. Phạm vi nghiệm chứng là Frontend với API MSW tổng hợp. Không sửa code sản phẩm, contract hoặc ledger để làm tăng tỷ lệ.

**Frontend chưa có cơ sở để được công nhận hoàn thiện 100% mọi yêu cầu. Các tỷ lệ đo được có mẫu số rõ là:**

| Thước đo | Tử số / mẫu số | Tỷ lệ | Ý nghĩa và giới hạn |
|---|---:|---:|---|
| Route chuẩn có mapping runtime và component source | 61/61 | 100,00% | Có màn hình và wiring router; không tự chứng minh mọi branch nghiệp vụ |
| Module mà route manifest yêu cầu | 16/16 | 100,00% | Tồn tại các owner của 61 route |
| Operation cần theo route + globalOperations có tham chiếu trong client/app | 214/224 | 95,54% | Độ phủ nối contract; không là tỷ lệ correctness toàn ứng dụng |
| Operation gắn với actions trong route manifest có tham chiếu | 121/123 | 98,37% | Actions bao gồm cả redirect/download; không mặc định toàn bộ là HTTP writes |
| Operation đọc gắn với route có tham chiếu | 91/98 | 92,86% | Chưa đánh đồng dùng list response với đã triển khai API đọc chi tiết |
| Checkpoint FE có bằng chứng còn hiệu lực | 0/140 | 0% | Hồ sơ cũ STALE theo fingerprint/dependency; không có nghĩa 0% code |

Mẫu số API là tập operationId duy nhất từ `botsales-kit/contracts/route-manifest.json`: readOperations, actions và globalOperations. AST quét source app/modules/shared, loại source mocks và generated khỏi tử số; truy vết import lazy, local wrapper OrderPage và component owner. SSE subscribeEvents được nối qua EventSource/operationUrl. OpenAPI có 245 operation; không lấy toàn bộ làm mẫu số Frontend vì có giao tiếp ngoài scope. 64/64 feature có đường truy vết đến route đã map; đây là liên kết feature, không phải 64/64 feature đã nghiệm thu.

**Các operation không tìm thấy trong source Frontend:**

- Luồng còn thiếu rõ: `stepUp` và `approvePrivacyRequest` tại R35. Source PrivacyPage chỉ tạo yêu cầu và thông báo chưa xác minh OIDC step-up; regression hiện tại kỳ vọng yêu cầu xóa ở trạng thái pending approval. Đây là giới hạn chức năng so với route contract, không phải test đã chứng minh approve thành công.
- Chưa có lời gọi đọc chi tiết độc lập: `getBotRevision`, `getEvaluation`, `getChannel`, `getAIConnection`, `getMember`, `getNotification`, `getServiceCase`. Các màn hình tương ứng có source và dùng dữ liệu danh sách/config. Sự thiếu lời gọi GET cụ thể không đủ để kết luận toàn màn hình hoặc toàn feature chưa có; cần chốt liệu giao tiếp đọc chi tiết còn bắt buộc.
- `listCommands` nằm trong globalOperations nhưng không thấy consumer Frontend. `getCommand` và cơ chế theo dõi command vẫn có source. Không suy phần command hoàn toàn thiếu.

| Module | Route có source | API tham chiếu / API route yêu cầu | Khác biệt contract |
|---|---:|---:|---|
| bot | 4/4 | 16/18 | getBotRevision, getEvaluation |
| catalog | 6/6 | 16/16 | Không |
| customers | 3/3 | 12/13 | getServiceCase |
| dashboard | 1/1 | 3/3 | Không |
| finance | 11/11 | 43/43 | Không |
| fulfillment | 2/2 | 9/9 | Không |
| inbox | 2/2 | 14/14 | Không |
| integrations | 2/2 | 12/14 | getChannel, getAIConnection |
| inventory | 3/3 | 9/9 | Không |
| knowledge | 3/3 | 15/15 | Không |
| notifications | 2/2 | 9/10 | getNotification |
| operations | 3/3 | 13/13 | Không |
| orders | 4/4 | 18/18 | Không |
| procurement | 4/4 | 22/22 | Không |
| reports | 2/2 | 4/4 | Không |
| workspace | 9/9 | 20/23 | getMember, stepUp, approvePrivacyRequest |

Các module dùng chung operation; không cộng các mẫu số từng module để ra tổng API.

**Kiểm chứng mới trong lượt này:** generator check đạt 15 output / 346 schema / 245 operation / 61 route. Source check đạt 85 TS/TSX, 262 API call sites. Boundaries đạt 722 imports, 10/10 fixtures. ESLint và TypeScript đạt. Domain/mock transport đạt 117/117 (86 simulator + 31 network); Vitest đạt 238/238 trong 23 file. Layout đạt 86 checks và quét 93 source file, 0 finding; visual tokens 5/5 và 92 file, 0 finding; composition 41/41 và 91 file, 0 finding. Production và demo build đạt. Những mẫu số file khác nhau do scope từng scanner khác nhau.

Lần `npm run verify` đầu tiên exit 1 ở gate cuối do tôi đặt process PATH thiếu Git (`spawnSync git ENOENT`). Các stage trước đó đã đạt. Chạy lại riêng `npm run test:evidence` với PATH đúng exit 0: 11/11 fixture, S17 validator đạt, 15 command/log record và 275 fingerprint hiện hành. Không trình bày lần verify đầu như exit 0; không sửa gate hoặc kỳ vọng để bỏ lỗi.

| Bộ kiểm runtime | Kết quả JSON | Thời gian |
|---|---|---|
| e2e-results.json | 812 đạt; 2 không đạt; 0 bỏ qua; 0 flaky | 84.19 phút |
| built-demo-results.json | 6 đạt; 0 không đạt; 0 bỏ qua; 0 flaky | 3.36 phút |
| e2e-retry-results.json | 2 đạt; 0 không đạt; 0 bỏ qua; 0 flaky | 1.35 phút |

Built-demo đạt 6/6; 244 lượt route ở Chromium/Firefox × 390/1440 px (61 route mỗi tổ hợp), 0 shell overflow và 0 page error theo log. Demo artifact SHA-256 `09405e36f634fb68bf0baceb8ea501d73d13baa5e917668e9fe1c576789c25dc`, 39 file. Đây là kiểm route và Shell trong default state; không thay kiểm mọi action/variant/viewport.

Lần full E2E đầu có lỗi artifact ở ca axe Chromium vì tôi khởi chạy suite built-demo dùng outputDir mặc định trong khi suite chính chạy; thư mục trace bị xung đột. Giữ log lỗi, không tính lỗi đó như defect ứng dụng. Suite tái kiểm dùng server 5199 và outputDir riêng, giữ nguyên assertion. Kết quả retest chỉ tính đúng ca đã chạy, không ghi đè kết quả full run trước.

Ca tạo sản phẩm Chromium cũng timeout 180 giây tại tests/fe010.spec.ts:90, chờ ô Tìm kiếm sau khi bấm Danh sách. Các assertion create payload phía trước đã qua; trace ghi href /s/shop-demo/products nhưng frame vẫn ở /products/product-10006. Có trace và ảnh cuối tại product-failure-last-frame.jpeg. Chưa quy lỗi chắc chắn cho ứng dụng hoặc test readiness chỉ từ một lần thất bại; kết quả chạy lại riêng nằm ở e2e-retry-results.json/e2e-retry.log khi hoàn tất. Không sửa source hoặc test để làm retest xanh.

Retest riêng hai ca Chromium đạt 2/2 trong 1,4 phút, source và assertions giữ nguyên. Lỗi sản phẩm chưa tái hiện được ở retest. Không chuyển full run ban đầu thành PASS; cần giữ rủi ro flake/race cho đến khi có nguyên nhân đủ bằng chứng.

**Ca không đạt/không chạy trong JSON:**

- e2e-results.json: chromium, accessibility/routes.spec.ts:17, all canonical routes pass whole-page WCAG 2.1 A/AA axe checks in the React demo, unexpected. Error: browserContext.close: ENOENT: no such file or directory, open 'C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB\BotSalesAI_Frontend\test-results\playwright-28352-090ea7c8-60e0-423a-8105-7bcfecac161e\.playwright-artifacts-0\traces\a07cfa0167fb674485e9-253454a8681f160473f3.network' Error: ENOENT: no such file or directory, open 'C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB\BotSalesAI_Frontend\test-results\playwright-28352-090ea7c8-60e0-423a-8105-7bcfecac161e\.playwright-artifacts-0\f82bb8019db9575ec53f1df4320a8c7a.zip'
- e2e-results.json: chromium, fe010.spec.ts:40, product editor validates positive prices, protects image-only drafts, and saves variant payload through mock HTTP, unexpected. [31mTest timeout of 180000ms exceeded.[39m Error: locator.fill: Test timeout of 180000ms exceeded. Call log: [2m  - waiting for getByLabel('Tìm kiếm')[22m     88 |   89 |     await page.getByRole('link',{name:'Danh sách',exact:true}).click(); > 90 |     await page.getByLabel('Tìm kiếm').fill('FE010-PRODUCT-L');      |                                       ^   91 |     await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();   92 |     await expect(page.getByText('Sản phẩm FE010',{exact:true})).toBeVisible();   93 |     const clothingProducts=page.waitForRequest(request=>{     at C:\Users\Joker-PC\Documents\Projects\Bot-AI-Ban-hang-FB\BotSalesAI_Frontend\tests\fe010.spec.ts:90:39

**Tài liệu và bằng chứng còn lệch:** CLI canonical báo 28/28 task STALE, 0/140 checkpoint hiệu lực; nguyên nhân đầu tiên là source Shell.tsx đã đổi so với receipt cũ, rồi lan theo dependency. Kế hoạch UI §16.6 ghi UX.C10/C11 NOT_STARTED, nhưng source Marketing đã có fromDate/toDate/bucket, URL và dữ liệu trend; C10-CONTRACT và test cũng đã tồn tại. Vì vậy không coi trạng thái kế hoạch đó là bằng chứng code C10 bằng 0%. FE-G04 guide còn mô tả 54 route trong khi canonical/source hiện có 61. Các số 140/140, 624/624 và 7/9 trong snapshot trước không chứng nhận source hiện hành.

Narrator speech/human accessibility review và nghiệm thu cuối của người dùng chưa có bằng chứng mới trong lượt này. Không xác minh live Backend/provider, database, staging, production hoặc hosted CI trên commit này. Không chuyển các phần đó thành PASS từ local mock tests.

**Ưu tiên tiếp:** (1) xử lý/chốt phạm vi luồng step-up và privacy approve; (2) đối chiếu từng GET chi tiết và listCommands với yêu cầu để bổ sung consumer hoặc điều chỉnh requirement có thẩm quyền; (3) đồng bộ trạng thái C10/C11 và tái xác minh receipts FE theo dependency trên source cuối; (4) giữ các phần manual/user acceptance riêng. Không lấy tỷ lệ test xanh hoặc số route để suy một tỷ lệ chất lượng tổng thể.

Nguồn và kết quả tái lập: [source measurements](source-measurements.json), [script đo](measure-source.mjs), [verify log](verify.log), [evidence gate retry](evidence-gate-retry.log), [FE tracker](frontend-status.json), [test inventory](test-inventory.json), [full E2E log](e2e.log), [built demo log](built-demo.log), [kết quả tổng](audit-results.json). Input được hash trong source measurements. Source input thay đổi khi kết thúc: 0; danh sách trong audit-results.json.

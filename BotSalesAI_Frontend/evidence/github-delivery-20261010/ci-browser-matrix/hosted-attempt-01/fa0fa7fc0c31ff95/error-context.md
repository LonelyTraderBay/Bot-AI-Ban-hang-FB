# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: frontend-corrections.spec.ts >> F01 shop settings merges a server-only locale change and preserves edits typed during save
- Location: tests/frontend-corrections.spec.ts:191:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Ngôn ngữ', { exact: true })
Expected: "en-US"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" getByLabel('Ngôn ngữ', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Ngôn ngữ', { exact: true })

```

```yaml
- link "Đến nội dung chính":
  - /url: "#main-content"
- navigation "Điều hướng chính":
  - heading "BotSales AI" [level=6]
  - text: Đội ngũ vận hành cửa hàng
  - link "Joker Studio · Shop mẫu ⌄":
    - /url: /workspaces
  - text: ĐIỀU HÀNH
  - list:
    - listitem:
      - link "Tổng quan":
        - /url: /s/shop-demo/overview
        - paragraph: Tổng quan
    - listitem:
      - link "Công việc hôm nay":
        - /url: /s/shop-demo/operations
        - paragraph: Công việc hôm nay
    - listitem:
      - link "Cần phê duyệt":
        - /url: /s/shop-demo/approvals
        - paragraph: Cần phê duyệt
  - text: BÁN HÀNG
  - list:
    - listitem:
      - link "Hộp thư khách hàng":
        - /url: /s/shop-demo/inbox
        - paragraph: Hộp thư khách hàng
    - listitem:
      - link "Khách hàng":
        - /url: /s/shop-demo/customers
        - paragraph: Khách hàng
    - listitem:
      - link "Đơn hàng":
        - /url: /s/shop-demo/orders
        - paragraph: Đơn hàng
    - listitem:
      - link "Chuẩn bị hàng":
        - /url: /s/shop-demo/fulfillment
        - paragraph: Chuẩn bị hàng
    - listitem:
      - link "Vận đơn & giao hàng":
        - /url: /s/shop-demo/shipments
        - paragraph: Vận đơn & giao hàng
    - listitem:
      - link "Đổi trả":
        - /url: /s/shop-demo/returns
        - paragraph: Đổi trả
    - listitem:
      - link "Chăm sóc sau bán":
        - /url: /s/shop-demo/service-cases
        - paragraph: Chăm sóc sau bán
  - text: HÀNG HÓA
  - list:
    - listitem:
      - link "Sản phẩm":
        - /url: /s/shop-demo/products
        - paragraph: Sản phẩm
    - listitem:
      - link "Danh mục":
        - /url: /s/shop-demo/categories
        - paragraph: Danh mục
    - listitem:
      - link "Nhập dữ liệu":
        - /url: /s/shop-demo/imports
        - paragraph: Nhập dữ liệu
    - listitem:
      - link "Tồn kho":
        - /url: /s/shop-demo/inventory
        - paragraph: Tồn kho
    - listitem:
      - link "Lịch sử kho":
        - /url: /s/shop-demo/inventory/movements
        - paragraph: Lịch sử kho
    - listitem:
      - link "Nhà cung cấp":
        - /url: /s/shop-demo/suppliers
        - paragraph: Nhà cung cấp
    - listitem:
      - link "Đề nghị nhập":
        - /url: /s/shop-demo/replenishment
        - paragraph: Đề nghị nhập
    - listitem:
      - link "Đơn mua hàng":
        - /url: /s/shop-demo/purchases
        - paragraph: Đơn mua hàng
    - listitem:
      - link "Nhận hàng":
        - /url: /s/shop-demo/receipts
        - paragraph: Nhận hàng
  - text: KẾ TOÁN
  - list:
    - listitem:
      - link "Thu chi":
        - /url: /s/shop-demo/finance
        - paragraph: Thu chi
    - listitem:
      - link "Sổ thu chi":
        - /url: /s/shop-demo/finance/entries
        - paragraph: Sổ thu chi
    - listitem:
      - link "Lợi nhuận":
        - /url: /s/shop-demo/finance/profit-loss
        - paragraph: Lợi nhuận
    - listitem:
      - link "Chứng từ & sổ kép":
        - /url: /s/shop-demo/finance/journals
        - paragraph: Chứng từ & sổ kép
    - listitem:
      - link "Tài khoản kế toán":
        - /url: /s/shop-demo/finance/accounts
        - paragraph: Tài khoản kế toán
    - listitem:
      - link "Mở sổ kế toán":
        - /url: /s/shop-demo/finance/opening-balances
        - paragraph: Mở sổ kế toán
    - listitem:
      - link "Sổ cái":
        - /url: /s/shop-demo/finance/ledger
        - paragraph: Sổ cái
    - listitem:
      - link "Cân đối phát sinh":
        - /url: /s/shop-demo/finance/trial-balance
        - paragraph: Cân đối phát sinh
    - listitem:
      - link "Cân đối quản trị":
        - /url: /s/shop-demo/finance/balance-sheet
        - paragraph: Cân đối quản trị
    - listitem:
      - link "Đối soát":
        - /url: /s/shop-demo/finance/reconciliation
        - paragraph: Đối soát
    - listitem:
      - link "Công nợ & khóa kỳ":
        - /url: /s/shop-demo/finance/debts-periods
        - paragraph: Công nợ & khóa kỳ
  - text: ĐỘI NGŨ AI
  - list:
    - listitem:
      - link "Bốn nhân viên AI":
        - /url: /s/shop-demo/bot/team
        - paragraph: Bốn nhân viên AI
    - listitem:
      - link "Cấu hình Admin":
        - /url: /s/shop-demo/bot
        - paragraph: Cấu hình Admin
    - listitem:
      - link "Thử bot":
        - /url: /s/shop-demo/bot/playground
        - paragraph: Thử bot
    - listitem:
      - link "Chất lượng AI":
        - /url: /s/shop-demo/bot/evaluations
        - paragraph: Chất lượng AI
    - listitem:
      - link "Kiến thức cửa hàng":
        - /url: /s/shop-demo/knowledge
        - paragraph: Kiến thức cửa hàng
    - listitem:
      - link "Phản hồi cần duyệt":
        - /url: /s/shop-demo/knowledge/review
        - paragraph: Phản hồi cần duyệt
    - listitem:
      - link "Bản tin & sức khỏe":
        - /url: /s/shop-demo/operations/digests
        - paragraph: Bản tin & sức khỏe
  - text: THÔNG BÁO & BÁO CÁO
  - list:
    - listitem:
      - link "Trung tâm thông báo":
        - /url: /s/shop-demo/notifications
        - paragraph: Trung tâm thông báo
    - listitem:
      - link "Điện thoại & lịch trực":
        - /url: /s/shop-demo/notifications/devices
        - paragraph: Điện thoại & lịch trực
    - listitem:
      - link "Xuất báo cáo":
        - /url: /s/shop-demo/reports
        - paragraph: Xuất báo cáo
    - listitem:
      - link "Thông tin marketing":
        - /url: /s/shop-demo/reports/marketing
        - paragraph: Thông tin marketing
  - text: CÀI ĐẶT
  - list:
    - listitem:
      - link "Kết nối Facebook":
        - /url: /s/shop-demo/integrations/channels
        - paragraph: Kết nối Facebook
    - listitem:
      - link "Nhà cung cấp AI":
        - /url: /s/shop-demo/integrations/ai
        - paragraph: Nhà cung cấp AI
    - listitem:
      - link "Nhân sự & quyền":
        - /url: /s/shop-demo/settings/team
        - paragraph: Nhân sự & quyền
    - listitem:
      - link "Cửa hàng":
        - /url: /s/shop-demo/settings/shop
        - paragraph: Cửa hàng
    - listitem:
      - link "Quản trị kho":
        - /url: /s/shop-demo/settings/warehouses
        - paragraph: Quản trị kho
    - listitem:
      - link "Nhật ký":
        - /url: /s/shop-demo/settings/audit
        - paragraph: Nhật ký
    - listitem:
      - link "Quyền riêng tư":
        - /url: /s/shop-demo/settings/privacy
        - paragraph: Quyền riêng tư
  - separator
  - text: J
  - paragraph: Jokertrader · tài khoản mẫu
  - text: Chủ shop
  - button "Đăng xuất"
- banner:
  - navigation "Đường dẫn hiện tại": Không gian làm việc / Thiết lập cửa hàng
  - textbox "Tìm màn hình":
    - /placeholder: Tìm màn hình...
  - text: Dữ liệu mô phỏng
  - link "Thông báo":
    - /url: /s/shop-demo/notifications
  - text: J
- alert:
  - text: "Frontend review: API được mô phỏng trong bộ nhớ, không gửi tin hoặc đặt hàng thật. Tải lại trang sẽ khởi tạo lại dữ liệu."
  - button "Góp ý"
- button "Công cụ demo"
- text: owner · Bình thường · Dataset mặc định
- main:
  - heading "Thiết lập cửa hàng" [level=1]
  - paragraph: Cấu hình riêng của shop không thay đổi quy tắc AI lập trình hoặc màu đã duyệt.
  - heading "Thông tin cơ sở" [level=2]
  - text: Tên cửa hàng
  - textbox "Tên cửa hàng": Submitted shop
  - text: Tiền tệ cơ sở
  - textbox "Tiền tệ cơ sở" [disabled]: VND
  - paragraph: Không đổi tiền tệ bằng sửa giao diện. Cần kế hoạch chuyển đổi dữ liệu.
  - text: Múi giờ
  - textbox "Múi giờ": Asia/Vientiane
  - paragraph: Áp dụng cho ngày giờ theo cửa hàng.
  - text: Ngôn ngữ giao diện
  - textbox "Ngôn ngữ giao diện" [disabled]: Tiếng Việt
  - paragraph: "Giao diện hiện chỉ hỗ trợ tiếng Việt. Locale lưu trong API: en-US."
  - text: Giao diện
  - textbox "Giao diện" [disabled]: Graphite Gold · Dark-only
  - button "Lưu cấu hình"
  - heading "Checklist thiết lập vận hành" [level=2]
  - paragraph: Các mục không có trường API được giữ ở trạng thái chưa xác minh; không suy diễn đã sẵn sàng.
  - alert: Bản xem trước mô phỏng. Chỉ tên, tiền tệ, múi giờ và ngôn ngữ được lưu qua API hiện tại. Quốc gia kinh doanh không được suy ra từ múi giờ.
  - paragraph: Quốc gia và giờ kinh doanh
  - paragraph: Chưa có trường cấu hình trong contract
  - paragraph: Địa chỉ, vùng giao và phí vận chuyển
  - paragraph: Có preview mô phỏng, chưa lưu cấu hình
  - link "Xem preview phí giao":
    - /url: /s/shop-demo/shipments
  - paragraph: Người duyệt và thành viên
  - paragraph: Quyền lấy từ membership; chưa có API gán chính sách duyệt
  - link "Quản lý thành viên":
    - /url: /s/shop-demo/settings/team
  - paragraph: Kết nối kênh bán hàng
  - paragraph: Kết nối mô phỏng; không có quyền provider thật
  - link "Mở kết nối":
    - /url: /s/shop-demo/integrations/channels
  - paragraph: Kết nối AI
  - paragraph: Catalog nhà cung cấp mô phỏng
  - link "Mở nhà cung cấp AI":
    - /url: /s/shop-demo/integrations/ai
  - paragraph: Nội dung sản phẩm và phiên bản kiến thức
  - paragraph: Nguồn nội dung, lịch sử phiên bản và duyệt nằm trong khu vực kiến thức.
  - link "Quản lý nội dung":
    - /url: /s/shop-demo/knowledge
  - paragraph: Vòng góp ý có duyệt
  - paragraph: Góp ý tạo bản nháp; không tự huấn luyện hoặc xuất bản.
  - link "Duyệt góp ý":
    - /url: /s/shop-demo/knowledge/review
  - paragraph: Consent và ngừng liên hệ marketing
  - paragraph: Có bản ghi consent, lịch sử và luồng xác nhận challenge; gửi qua nhà cung cấp chưa kết nối.
  - link "Quản lý consent":
    - /url: /s/shop-demo/settings/privacy
- contentinfo:
  - text: BotSales AI · Graphite Gold · Frontend
  - button "Góp ý màn hình"
```

# Test source

```ts
  104 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 700));
  105 |     const response = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.includes('/notes'));
  106 |     await page.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click();
  107 |     await text.fill('Typed next while pending'); const submittedResponse = await response;
  108 |     expect(submittedResponse.status()).toBe(201); expect((await submittedResponse.json()).data.text).toBe(submittedText);
  109 |     await expect(page.getByRole('button', { name: 'Lưu ghi chú', exact: true })).toBeEnabled();
  110 |     await expect(text).toHaveValue('Typed next while pending');
  111 | });
  112 | 
  113 | test('F08 validates 4001 customer-note characters at the field and accepts 4000', async ({ page }) => {
  114 |     await visit(page, 'customers'); await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
  115 |     const dialog = page.getByRole('dialog', { name: 'Thêm khách hàng', exact: true });
  116 |     await dialog.getByLabel('Tên khách hàng', { exact: true }).fill('Note boundary');
  117 |     const notes = dialog.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
  118 |     await notes.fill('a'.repeat(4001));
  119 |     let posted = false;
  120 |     page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/customers')) posted = true; });
  121 |     await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
  122 |     await expect(dialog.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible();
  123 |     expect(posted).toBe(false);
  124 |     await notes.fill('😀'.repeat(4001));
  125 |     await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
  126 |     await expect(dialog.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible();
  127 |     expect(posted).toBe(false);
  128 |     await notes.fill('a'.repeat(4000));
  129 |     const response = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.endsWith('/customers'));
  130 |     await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
  131 |     const created = await response;
  132 |     expect(created.status()).toBe(201);
  133 |     const payload = await created.json();
  134 |     expect(payload.data.notes).toBe('a'.repeat(4000));
  135 |     await expect(page).toHaveURL(demoUrl + '/s/shop-demo/customers/' + payload.data.id);
  136 |     await page.getByRole('link', { name: 'Danh sách khách', exact: true }).click();
  137 |     await page.getByRole('button', { name: 'Thêm khách hàng', exact: true }).click();
  138 |     await dialog.getByLabel('Tên khách hàng', { exact: true }).fill('Unicode note boundary');
  139 |     await notes.fill('😀'.repeat(4000));
  140 |     const unicodeResponse = page.waitForResponse(result => result.request().method() === 'POST' && new URL(result.url()).pathname.endsWith('/customers'));
  141 |     await dialog.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click();
  142 |     const unicodeCreated = await unicodeResponse; expect(unicodeCreated.status()).toBe(201);
  143 |     const unicodePayload = await unicodeCreated.json(); expect(unicodePayload.data.notes).toBe('😀'.repeat(4000));
  144 |     await expect(page).toHaveURL(demoUrl + '/s/shop-demo/customers/' + unicodePayload.data.id);
  145 | });
  146 | 
  147 | test('F07 routes the fulfillment footer close through the shared discard guard', async ({ page }) => {
  148 |     await visit(page, 'fulfillment');
  149 |     await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().waitFor();
  150 |     await page.evaluate(async () => { const { db } = await import('/src/mocks/database.ts'); db.prepJobs.find((row: Record<string, unknown>) => row.shopId === 'shop-demo').state = 'picking'; });
  151 |     await page.getByRole('button', { name: 'Mở phiếu lấy hàng', exact: true }).first().click();
  152 |     const dialog = page.getByRole('dialog', { name: /^Phiếu chuẩn bị/ });
  153 |     await dialog.getByLabel('Nhập/quét SKU thực tế').fill('Unsaved scan');
  154 |     await dialog.getByRole('button', { name: 'Đóng', exact: true }).last().click();
  155 |     const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
  156 |     await expect(warning).toBeVisible();
  157 |     await warning.getByRole('button', { name: 'Tiếp tục sửa', exact: true }).click();
  158 |     await expect(dialog.getByLabel('Nhập/quét SKU thực tế')).toHaveValue('Unsaved scan');
  159 | });
  160 | 
  161 | test('F09 refreshes new Inbox messages without refetching the visible product and stock snapshots', async ({ page }) => {
  162 |     await page.addInitScript(() => {
  163 |         const state = window as unknown as { correctionsSource: EventSource; correctionsSequence?: number };
  164 |         const Original = window.EventSource;
  165 |         window.EventSource = class extends Original {
  166 |             constructor(url: string | URL, options?: EventSourceInit) {
  167 |                 super(url, options); state.correctionsSource = this;
  168 |                 this.addEventListener('message', event => { try { state.correctionsSequence = JSON.parse(event.data).sequence; } catch { /* Invalid envelopes are tested separately. */ } });
  169 |             }
  170 |         };
  171 |     });
  172 |     await visit(page, 'inbox/cv1');
  173 |     await page.getByRole('tab', { name: 'Giá & tồn', exact: true }).click();
  174 |     await expect(page.getByRole('table', { name: 'Nguồn giá và tồn trong hộp thư', exact: true })).toBeVisible();
  175 |     const requests: string[] = [];
  176 |     page.on('request', request => { if (request.method() === 'GET') requests.push(new URL(request.url()).pathname); });
  177 |     const refreshed = page.waitForResponse(result => result.request().method() === 'GET' && new URL(result.url()).pathname.endsWith('/messages'));
  178 |     await page.evaluate(async () => {
  179 |         const { db } = await import('/src/mocks/database.ts');
  180 |         const original = db.messages.find((row: Record<string, unknown>) => row.conversationId === 'cv1');
  181 |         db.messages.push({ ...original, id: 'message-sse-regression', text: 'Synthetic normal SSE message', createdAt: '2030-01-01T00:00:00Z' });
  182 |         const state = window as unknown as { correctionsSource: EventSource; correctionsSequence?: number };
  183 |         state.correctionsSource.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ eventId: 'event-sse-regression', type: 'message.created', schemaVersion: 2, shopId: 'shop-demo', resourceType: 'message', resourceId: 'message-sse-regression', resourceVersion: 1, occurredAt: '2030-01-01T00:00:00Z', sequence: (state.correctionsSequence ?? 0) + 1 }) }));
  184 |     });
  185 |     await refreshed;
  186 |     await expect(page.getByText('Synthetic normal SSE message', { exact: true })).toBeVisible();
  187 |     expect(requests.filter(path => /\/(products|inventory\/snapshots|customers|orders|shipments|service-cases)(\/|$)/.test(path))).toEqual([]);
  188 |     await test.info().attach('F09-request-count.json', { body: JSON.stringify({ requests, unrelatedRequests: 0 }), contentType: 'application/json' });
  189 | });
  190 | 
  191 | test('F01 shop settings merges a server-only locale change and preserves edits typed during save', async ({ page }) => {
  192 |     await visit(page, 'settings/shop');
  193 |     const name = page.getByLabel('Tên cửa hàng', { exact: true });
  194 |     await expect(name).not.toHaveValue(''); await name.fill('Submitted shop');
  195 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo')).json()).data);
  196 |     const changed = await page.evaluate(async version => {
  197 |         const response = await fetch('/api/v2/shops/shop-demo', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': 'botsales-demo-csrf-not-a-real-secret', 'Idempotency-Key': crypto.randomUUID(), 'If-Match': `"${version}"` }, body: JSON.stringify({ locale: 'en-US' }) });
  198 |         return response.status;
  199 |     }, current.version);
  200 |     expect(changed).toBe(200);
  201 |     await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
  202 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  203 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
> 204 |     await expect(page.getByLabel('Ngôn ngữ', { exact: true })).toHaveValue('en-US');
      |                                                                ^ Error: expect(locator).toHaveValue(expected) failed
  205 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateShop', 800));
  206 |     const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname === '/api/v2/shops/shop-demo');
  207 |     const completed = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/v2/shops/shop-demo');
  208 |     await page.getByRole('button', { name: 'Lưu cấu hình', exact: true }).click();
  209 |     expect((await sent).postDataJSON()).toEqual({ name: 'Submitted shop' });
  210 |     await name.fill('Typed later shop'); await completed;
  211 |     await expect(page.getByRole('button', { name: 'Lưu cấu hình', exact: true })).toBeEnabled();
  212 |     await expect(name).toHaveValue('Typed later shop');
  213 |     await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: /Tổng quan/ }).click();
  214 |     await expect(page.getByRole('dialog', { name: 'Rời màn hình chưa lưu?', exact: true })).toBeVisible();
  215 | });
  216 | 
  217 | test('F03 privacy policy preserves refetch drafts and compares before applying the newest version', async ({ page }) => {
  218 |     await visit(page, 'settings/privacy');
  219 |     const days = page.getByLabel('Số ngày lưu hội thoại', { exact: true });
  220 |     await days.fill('180');
  221 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/privacy/policy')).json()).data);
  222 |     expect((await mutate(page, 'privacy/policy', { jurisdictionNote: 'Synthetic server jurisdiction' }, 'PATCH', current.version)).status).toBe(200);
  223 |     await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
  224 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  225 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  226 |     await expect(days).toHaveValue('180');
  227 |     await expect(page.getByLabel('Căn cứ / thị trường áp dụng')).toHaveValue('Synthetic server jurisdiction');
  228 |     const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/privacy/policy'));
  229 |     await page.getByRole('button', { name: 'Lưu bản nháp chính sách', exact: true }).click();
  230 |     const request = await sent; expect(request.postDataJSON()).toEqual({ chatRetentionDays: 180 });
  231 |     expect(request.headers()['if-match']).toBe(`"${current.version + 1}"`);
  232 | });
  233 | 
  234 | test('F01 category keeps a late edit after saving, and reopens with a clean current baseline', async ({ page }) => {
  235 |     await visit(page, 'categories'); await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
  236 |     const dialog = page.getByRole('dialog', { name: 'Sửa danh mục', exact: true });
  237 |     const name = dialog.getByLabel('Tên', { exact: true });
  238 |     await expect(name).toBeEnabled(); await name.fill('Submitted category');
  239 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('updateCategory', 800));
  240 |     const finished = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.includes('/categories/'));
  241 |     await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  242 |     await name.fill('Late category'); await finished;
  243 |     await expect(dialog.getByRole('button', { name: 'Lưu', exact: true })).toBeEnabled();
  244 |     await expect(dialog).toBeVisible(); await expect(name).toHaveValue('Late category');
  245 |     await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  246 |     const warning = page.getByRole('dialog', { name: 'Rời biểu mẫu chưa lưu?', exact: true });
  247 |     await warning.getByRole('button', { name: 'Bỏ thay đổi', exact: true }).click();
  248 |     await expect(dialog).not.toBeVisible();
  249 |     await page.getByRole('row').filter({ hasText: 'Submitted category' }).getByRole('button', { name: 'Sửa', exact: true }).click();
  250 |     await expect(name).toHaveValue('Submitted category');
  251 |     await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  252 |     await expect(dialog).not.toBeVisible();
  253 | });
  254 | 
  255 | test('F01 supplier preserves a concurrent server-only term and PATCHes the local name', async ({ page }) => {
  256 |     await visit(page, 'suppliers'); await page.getByRole('button', { name: 'Sửa', exact: true }).first().click();
  257 |     const dialog = page.getByRole('dialog', { name: 'Cập nhật nhà cung cấp', exact: true });
  258 |     await expect(dialog.getByLabel('Tên nhà cung cấp', { exact: true })).toBeEnabled();
  259 |     const current = await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/suppliers')).json()).data[0]);
  260 |     await dialog.getByLabel('Tên nhà cung cấp', { exact: true }).fill('Local supplier');
  261 |     expect((await mutate(page, 'suppliers/' + current.id, { expectedVersion: current.version, paymentTerms: 'Concurrent terms' }, 'PATCH', current.version)).status).toBe(200);
  262 |     await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  263 |     const comparison = page.getByRole('dialog', { name: 'Đối chiếu thay đổi', exact: true });
  264 |     await comparison.getByRole('button', { name: 'Áp dụng vào bản nháp' }).click();
  265 |     await expect(dialog.getByLabel('Điều kiện thanh toán', { exact: true })).toHaveValue('Concurrent terms');
  266 |     const sent = page.waitForRequest(request => request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/suppliers/' + current.id));
  267 |     await dialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  268 |     expect((await sent).postDataJSON()).toEqual({ expectedVersion: current.version + 1, name: 'Local supplier' });
  269 |     await expect(dialog).not.toBeVisible();
  270 | });
  271 | 
  272 | test('F08 customer update enforces 4000/4001 before HTTP and retains a 422 draft', async ({ page }) => {
  273 |     await visit(page, 'customers/c1');
  274 |     const notes = page.getByLabel('Ghi chú (không bắt buộc)', { exact: true });
  275 |     await notes.fill('b'.repeat(4001));
  276 |     let writes = 0;
  277 |     page.on('request', request => { if (request.method() === 'PATCH' && new URL(request.url()).pathname.endsWith('/customers/c1')) writes++; });
  278 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  279 |     await expect(page.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible(); expect(writes).toBe(0);
  280 |     await notes.fill('b'.repeat(4000));
  281 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationFailure('updateCustomer', { status: 422, code: 'VALIDATION_FAILED', message: 'Synthetic validation rejection' }));
  282 |     const rejected = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
  283 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await rejected).status()).toBe(422);
  284 |     await expect(notes).toHaveValue('b'.repeat(4000));
  285 |     const previousWrites = writes;
  286 |     await notes.fill('😀'.repeat(4001));
  287 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  288 |     await expect(page.getByText('Ghi chú không được vượt quá 4.000 ký tự.', { exact: true })).toBeVisible(); expect(writes).toBe(previousWrites);
  289 |     await notes.fill('😀'.repeat(4000));
  290 |     const unicodeRejected = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
  291 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await unicodeRejected).status()).toBe(422);
  292 |     await expect(notes).toHaveValue('😀'.repeat(4000));
  293 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationFailure('updateCustomer', null));
  294 |     const accepted = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname.endsWith('/customers/c1'));
  295 |     await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click(); expect((await accepted).status()).toBe(200);
  296 |     await expect(notes).toHaveValue('😀'.repeat(4000));
  297 |     expect(await page.evaluate(async () => (await (await fetch('/api/v2/shops/shop-demo/customers/c1')).json()).data.notes)).toBe('😀'.repeat(4000));
  298 | });
  299 | 
  300 | test('F05 keeps mode changes and unknown sends, locks another send, and observes recovery-registry completion', async ({ page }) => {
  301 |     await visit(page, 'inbox/cv1'); await page.getByLabel('Ghi chú nội bộ (không gửi khách)').check();
  302 |     await page.getByLabel('Ghi chú cho nhóm').fill('Mode switched while pending');
  303 |     await page.evaluate(async () => (await import('/src/mocks/service.ts')).setOperationDelay('addInternalNote', 700));
  304 |     const finished = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.includes('/notes'));
```
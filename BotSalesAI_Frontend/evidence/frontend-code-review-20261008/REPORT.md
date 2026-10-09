# Rà soát code Frontend hiện hành — 08/10/2026

Trạng thái: **NEEDS_CORRECTION**. Phạm vi React/TypeScript Frontend với API MSW tổng hợp. Đã xác nhận **6 lỗi P1, 2 lỗi P2 và 1 điểm tối ưu P2** bằng các phép tái hiện dưới đây. Chưa sửa code sản phẩm trong lượt audit này. Báo cáo không thay đổi checkpoint FE hoặc quyết định nghiệm thu của người dùng.

## Phạm vi và cách kiểm tra

- Snapshot: HEAD `53c0ba8f413b1f1e0fa16a747ed27f728b861dd6` cộng working tree đã có trước lượt audit. Giữ nguyên thay đổi đang có trong API client và test của nó.
- Inventory: 70 file source/style, trong đó 68 TS/TSX; 16 module; 8 file package contract/token; 19 script sở hữu và 114 file test/helper được lập danh sách. [Manifest SHA-256](source-manifest.json) ghi snapshot của source, packages, scripts và config.
- Phân tích router/provider/session, quyền và query scope, transport/schema/CSRF/idempotency, lệnh và unknown recovery, SSE, draft guard/shared UI, các luồng của 16 module, mock service và cấu hình build/test. Đối chiếu với manifest 54 route và contract canonical. Inventory hoặc số route không là chứng nhận mọi nhánh đã được chạy.
- Kiểm tra thực: 7 tình huống lỗi trên trình duyệt Chromium chạy React demo hiện hành; 1 tình huống vòng đời dùng hook/transport thật trong Vitest với HTTP fixture; 1 tình huống SSE trên trình duyệt với event tổng hợp hợp lệ. Các assertion chẩn đoán chứng minh **lỗi còn tồn tại**, không phải assertion nghiệm thu hành vi đúng.
- Không chạy lại full E2E, full build, native zoom hoặc Backend/provider. Kết quả 512/512 của lượt bàn giao trước không được ghi như đã chạy lại trong audit này.

## Các lỗi cần sửa theo ưu tiên

### F01 — P1: Bản nháp sử dụng phiên bản mới của server và ghi đè thay đổi đồng thời

Owner: `apps/web/src/modules/customers/index.tsx:85` và `:95`. Form giữ giá trị cũ khi dirty, nhưng lúc lưu lấy `customer.data.data.version` hiện hành. Khi query refetch từ version 1 lên 2, bản nháp cũ được gửi với `If-Match: "2"`; điều kiện chống ghi đè bị vượt qua về mặt ý nghĩa.

Đã tái hiện R2: đổi tên cục bộ; một request khác lưu ghi chú mới; SSE refetch; người dùng lưu. Request trả 200 và ghi chú mới bị thay bằng ghi chú cũ. [Dữ kiện R2](results.json).

Cách sửa: lưu snapshot/version cùng thời điểm khởi tạo bản nháp; giữ version đó tới khi lưu hoặc người dùng chủ động tải/merge lại. Chỉ gửi trường đã sửa khi contract PATCH cho phép. Khi server đổi, giữ draft và hiển thị conflict để người dùng đối chiếu. Kiểm cùng pattern ở ProductEditor (`catalog/index.tsx:102`), ShopSettings (`workspace/index.tsx:108`), Suppliers (`procurement/index.tsx:70`) và DraftForm chỉnh đơn: đây là các vị trí liên quan tìm từ source, chưa tái hiện riêng từng vị trí.

### F02 — P1: Ảnh sản phẩm chưa lưu bị bỏ bởi refetch nền

Owner: `apps/web/src/modules/catalog/index.tsx:83`. Effect khởi tạo form chỉ kiểm `!isDirty` của RHF, không kiểm `imagesDirty`; luôn gán lại `imageIds` từ API.

Đã tái hiện R3 trên `/products/p1`: 0 ảnh → tải ảnh thành công → 1 ảnh đang gắn trong draft → tạo khách hàng khác để phát SSE → trở về 0 ảnh dù chưa lưu sản phẩm. [Dữ kiện R3](results.json), [ảnh](R3-product-image-refetch.png).

Cách sửa: chỉ đồng bộ snapshot khi cả trường form và danh sách ảnh đều sạch; giữ snapshot/version của draft. Kiểm cả thêm/bỏ ảnh, ảnh-only edit, refetch cùng version và refetch version mới.

### F03 — P1: Cấu hình đang nhập bị reset khi query thay đổi

Owner: `apps/web/src/modules/notifications/index.tsx:61`. Effect sao chép toàn bộ policy vào local state mỗi lần `policy.data` đổi, không có điều kiện dirty. Pattern tương tự ở Privacy (`workspace/index.tsx:208`) và tên danh mục (`catalog/index.tsx:141`).

Đã tái hiện R4 trên Devices: nhập 17 phút, chưa lưu; một khách hàng khác được tạo; API policy tải lại; trường trở về rỗng. [Dữ kiện R4](results.json).

Cách sửa: quản lý baseline/draft rõ ràng; giữ dirty state qua cập nhật nền, cảnh báo khi snapshot/version đổi. Bổ sung regression cho Devices, Privacy và Categories; hai vị trí sau mới được xác nhận pattern từ source.

### F04 — P1: Poll lệnh tiếp tục qua unmount/chuyển scope

Owner: `apps/web/src/shared/api/hooks.ts:86`. Timer giữa các lần poll không có signal/vòng đời. `cancelScopeRequests()` chỉ hủy request đang chạy; sau khoảng đợi, hook cũ gọi GET mới nên request mới nhận epoch mới và không bị chặn.

Đã tái hiện R8 bằng `useCommand` và transport thật: nhận `accepted`, unmount hook, gọi `cancelScopeRequests`, tiến timer 400 ms; GET `/shops/shop-1/commands/command-1` vẫn được gửi và promise trả `succeeded`. [Kết quả Vitest](command-results.json), [phép tái hiện](command-scope.test.tsx).

Tác động: callback của màn hình cũ có thể tiếp tục đóng dialog/điều hướng hoặc cập nhật state sau khi người dùng đã đổi scope. Phép thử xác nhận GET và kết quả cũ; chưa mô phỏng riêng mọi callback màn hình.

Cách sửa: fence toàn bộ execution bằng danh tính scope và vòng đời; hủy thời gian chờ/poll sau unmount hoặc scope đổi. Giữ metadata unknown để đối chiếu khi mutation đã gửi; không tự coi tác động server đã bị hủy. Tách việc reconcile hợp lệ khỏi callback UI của màn hình cũ.

### F05 — P1: Soạn tiếp trong hộp thư bị xóa sau khi yêu cầu trước thành công

Owner: `apps/web/src/modules/inbox/conversation-components.tsx:44` và `:73`. Ô soạn vẫn cho nhập khi `send`/`note` pending, nhưng sau `await execute` luôn gọi `setText('')`.

Đã tái hiện R5: gửi ghi chú A với response delay 1.500 ms; nhập ghi chú B trong lúc chờ; A thành công và B bị xóa. [Dữ kiện R5](results.json).

Cách sửa: giữ ô soạn hoạt động và chỉ xóa nếu revision của draft vẫn trùng với bản đã gửi; hoặc khóa việc chỉnh sửa trong lúc gửi với trạng thái rõ ràng. Kiểm cả ghi chú, trả lời khách, lỗi và unknown outcome.

### F06 — P1: Đơn nháp mới không tham gia draft guard của Shell

Owner: `apps/web/src/modules/orders/index.tsx:22`. DraftForm chứa `FormFields` dạng div, không có form/draft registration. Guard chung chỉ tìm `main form` và dialog (`shared/model/dirty-drafts.ts:67`).

Đã tái hiện R1: nhập ghi chú đơn mới; `hasUnsavedFormDraft()` trả false; bấm Danh sách đơn và điều hướng ngay không có xác nhận. [Dữ kiện R1](results.json).

Cách sửa: đăng ký dirty/baseline của toàn DraftForm với cơ chế chung, bao gồm các dòng thêm/xóa và lựa chọn; không chỉ so DOM defaultValue của input controlled. Kiểm navigation nội bộ, đổi shop, đăng xuất, reload và việc lưu thành công.

### F07 — P2: Nút Đóng ở phiếu chuẩn bị bỏ qua dirty guard

Owner: `apps/web/src/modules/fulfillment/index.tsx:74`. Footer action truyền `onClick={onClose}` trực tiếp vào EditDialog. Nút Hủy/icon chung dùng `requestClose`, nhưng action này không đi qua kiểm dirty/busy.

Đã tái hiện R7: dùng prep tổng hợp có sẵn, chuyển fixture về trạng thái picking hợp lệ; nhập SKU mới; dialog mang `data-draft-dirty=true`; bấm Đóng ở footer và dialog biến mất không hỏi bỏ draft. [Dữ kiện R7](results.json).

Cách sửa: dùng đường đóng chung của EditDialog cho mọi nút đóng của consumer. Kiểm các footer tùy biến tương tự, cả trong lúc mutation pending.

### F08 — P2: Giới hạn ghi chú khách hàng không khớp contract

Owner: `apps/web/src/modules/customers/index.tsx:34`. Zod cho 5.000 ký tự; CustomerWrite/CustomerWritePatch canonical chỉ cho 4.000.

Đã tái hiện R6: nhập 4.001 ký tự, form chấp nhận, transport chặn bằng lỗi schema chung trước khi gửi HTTP. [Dữ kiện R6](results.json).

Cách sửa: đồng bộ giới hạn/validation field với contract canonical, báo lỗi ngay tại trường. Thêm các ca 4.000/4.001 ký tự cho create/update. Rà tương tự giới hạn collection/field và giá trị rỗng; không sửa schema generated để chấp nhận dữ liệu sai.

## Tối ưu có bằng chứng

### F09 — P2: SSE làm tải lại cả scope cho mọi loại event

Owner: `apps/web/src/app/ScopeEvents.tsx:45`. Mọi event thông thường đều invalidate cả key scope. Hành vi full invalidation phù hợp với `resync.required`, nhưng đang áp dụng cả `message.created`.

Đã đo R9: một event `message.created` hợp lệ khi đang ở hồ sơ khách tạo 4 GET: customer, orders, shipments, service-cases. [Kết quả đo](results-R9-event-broad-refetch.json).

Đề xuất: ánh xạ loại event/resource sang nhóm operation liên quan; gộp các invalidation cùng loại trong burst khi cần. Giữ full invalidation cho reconnect, gap và `resync.required`; giữ session revoke riêng. Kiểm request count và dữ liệu cuối sau burst/duplicate/out-of-order, không giảm tính đúng để lấy ít request hơn. Chưa đo hiệu năng với tải server thật và chưa định lượng phần trăm tiết kiệm.

## Cải thiện bảo trì tùy chọn

Các module finance, procurement, fulfillment, orders và operations ghép nhiều trang trong `index.tsx`; nhiều JSX/action nằm trong một dòng dài. Có thể tách từng page/form trong nội bộ module rồi giữ public exports hiện tại, theo pattern đã có của Inbox/Catalog imports. Chỉ thực hiện sau các lỗi vòng đời/draft, không cần framework/dependency mới. Không coi số dòng giảm là chứng minh tốc độ tăng.

## Kiểm tra đã chạy trong lượt này

| Kiểm tra | Kết quả thực |
|---|---|
| `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit` | Exit 0 |
| `node node_modules/eslint/bin/eslint.js apps/web/src --max-warnings 0` | Exit 0 |
| `node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts` | 12 file, 138/138 PASS, exit 0 |
| `npm.cmd audit --json` | 0 vulnerability, exit 0 |
| `node evidence/frontend-code-review-20261008/reproduce.mjs` | R1–R7 đều REPRODUCED; đây là chẩn đoán lỗi |
| `node evidence/frontend-code-review-20261008/reproduce.mjs R9-event-broad-refetch` | Event tạo 4 GET, REPRODUCED |
| Vitest config trong thư mục audit, JSON reporter | R8 REPRODUCED, 1/1 assertion chẩn đoán đạt |

Lượt đầu của probe R4 dùng sai URL chờ `/notifications/policy`, nên INCONCLUSIVE. Đã đối chiếu operations canonical, sửa probe thành `/notification-policy` và chạy lại R1–R7; kết quả hiện hành ở `results.json`. Không sửa app để làm probe đạt.

Các wrapper `npm run typecheck/lint/test` ban đầu không resolve được `tsc/eslint/vitest`. Shim `.cmd` vẫn tồn tại; nguyên nhân môi trường resolve lệnh chưa được chốt. Kết quả PASS phía trên là CLI chạy trực tiếp từ dependencies của workspace, không nhận wrapper npm PASS và không thay đổi execution policy.

## Thứ tự triển khai đề nghị

1. F04: bảo vệ toàn vòng đời command/scope tại shared owner, giữ unknown reconcile.
2. F01: baseline/version của các editor và chống lost update.
3. F02/F03/F05: giữ draft trước refetch và completion của request.
4. F06/F07: thống nhất đường nhận biết dirty và đường đóng/navigate.
5. F08: đồng bộ validation field; F09: thu hẹp invalidation có kiểm request count.
6. Sau sửa: biến các probe lỗi thành regression với kỳ vọng đúng trong suite sở hữu; chạy các gate/source/render/evidence phù hợp; refresh FE evidence bị ảnh hưởng theo dependency; người dùng nghiệm thu kết quả cuối.

Không phát hiện P0 qua phạm vi đã kiểm. Các kết quả này không đảm bảo mọi lỗi đã được tìm thấy. Full E2E trước đây đạt và tracker FE 140/140 vẫn có thể cùng tồn tại với các nhánh race/draft chưa có test như trên.

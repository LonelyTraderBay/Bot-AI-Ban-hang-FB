# Kế hoạch triển khai và theo dõi backend BotSales AI

**Phiên bản 1.5 · 21/11/2026.** Mỗi hành vi có một nơi triển khai và bộ ca kiểm theo thao tác. Kế hoạch xác định baseline tích hợp, cách kiểm ma trận tự động và tiêu chí nghiệm thu ở từng mốc. Mục tiêu Enterprise-Grade được đánh giá trên mã, dữ liệu và artifact triển khai có bằng chứng.

**Việc kế tiếp [BE-02](#be-02).** Xác nhận lượt CI backend trên SHA của PR. Workspace, HTTP và kiểm ma trận đã đạt trên checkout sạch cục bộ. Mốc tích hợp đầu tiên là đăng nhập, chọn cửa hàng, tạo sản phẩm và tải lại trang để đọc sản phẩm từ PostgreSQL qua frontend `dev:live`.

- [Kiến trúc](#kiến-trúc-backend-v1) · [Dữ liệu và giao dịch](#quyền-sở-hữu-dữ-liệu-và-giao-dịch) · [Bảng tiến độ](#bảng-theo-dõi) · [Kiểm chứng từng thao tác](#kiểm-chứng-từng-thao-tác)
- [Mốc nghiệm thu](#mốc-nghiệm-thu) · [Kiểm chứng theo module](#kiểm-chứng-theo-module) · [Nhật ký](#nhật-ký-tiến-độ-và-bằng-chứng) · [Ma trận truy vết](#ma-trận-truy-vết-baseline)

## Hiện trạng ngày 21/11/2026

- BE-01 đã kiểm chứng phần chuẩn bị. BE-02 triển khai workspace cùng HTTP nền tảng và kiểm tra ma trận. BE-03–BE-24 chưa bắt đầu.
- Baseline thiết kế và tích hợp là `main@e22bb99d`. Hợp đồng từ [PR #27](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/27) giữ nguyên sau [PR #28](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/28). Phạm vi gồm R01–R67, 16 module, 259 thao tác và 376 schema. OpenAPI sản phẩm dùng phiên bản `2.6.0`. [Bằng chứng CI](#xử-lý-ci-pr-27-và-chọn-baseline) · [SHA-256](#dấu-vân-tay-nguồn)
- Frontend hiện có bản demo MSW. Chế độ `dev:live` gửi API cùng origin qua `/api`, với `API_PROXY_TARGET` mặc định `http://127.0.0.1:3000`. Luồng đăng nhập live yêu cầu URL ủy quyền HTTPS. [Cấu hình frontend](../BotSalesAI_Frontend/README.md#6-nối-backend-sau-này)
- Đã kiểm preflight Node/npm, NestJS, PostgreSQL/Prisma và HTTPS/OIDC với fixture cô lập. Mốc chạy backend từ checkout sạch thuộc BE-02, migration/seed của dự án thuộc BE-03 và phiên live thuộc BE-04. [Bằng chứng kiểm môi trường](#bằng-chứng-kiểm-môi-trường-be-01)
- Kế hoạch toàn sản phẩm có 84 task và 420 checkpoint. Các mã `Txxx` dưới đây là nguồn truy vết. Bảng BE và nhật ký trong file này theo dõi tiến độ backend. [Kế hoạch toàn sản phẩm](../botsales-kit/execution/plan.json) · [Phạm vi frontend](../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md)
- T010–T012 mô tả giao diện nền, shell và mock HTTP. Dùng chúng để đối chiếu phía frontend khi kiểm tích hợp ở BE-07.

## Kiến trúc backend v1

Vị trí mã và kiểm ranh giới áp dụng theo [quy định workspace backend](AGENTS.md).

Frontend và API dùng cùng origin qua cổng HTTP `/api/v2`. API NestJS chia module theo nghiệp vụ. Controller chuyển request đã kiểm sang use case. Use case gọi giao diện công khai của module và nắm ranh giới transaction. Worker là tiến trình riêng khi cần xử lý nền, dùng cùng tầng nghiệp vụ. PostgreSQL lưu dữ liệu nghiệp vụ, command và outbox. Redis chuyển việc đến worker từ BE-10. File nằm ở kho đối tượng riêng, còn quyền và metadata nằm trong PostgreSQL. [Kiến trúc dự án](../botsales-kit/docs/02_ARCHITECTURE.md) · [Từ điển dữ liệu](../botsales-kit/docs/26_DATA_DICTIONARY.md)

### Quyết định và thời điểm áp dụng

| Quyết định | Áp dụng | Quy tắc và bằng chứng |
|---|---|---|
| Workspace riêng | BE-01–BE-02 | `BotSalesAI_Backend/` có manifest, lockfile, môi trường và lệnh kiểm riêng. Giữ `apps/api` và điểm khởi tạo phục vụ test. Thêm `apps/worker` khi BE-10 bắt đầu. Kiểm cài và build từ checkout sạch. |
| Một hợp đồng API | BE-01–BE-02 | Chốt commit, SHA-256 và danh mục endpoint. Mỗi thay đổi hợp đồng cập nhật OpenAPI canonical, đầu ra sinh, quyền, consumer, ca kiểm và hướng tương thích trong cùng thay đổi. Mỗi PR backend chạy kiểm request, response và mã lỗi. |
| Phiên và danh tính | BE-03–BE-05 | Định danh người dùng theo cặp OIDC issuer và subject. Cookie `__Host-bs_session` do server phát, `HttpOnly`, `Secure`, `Path=/`, host-only. Dùng HTTPS khi kiểm phiên qua trình duyệt. Xác minh state, nonce, PKCE, issuer, audience, thời hạn và redirect allowlist. Rotate phiên sau đăng nhập hoặc nâng quyền, thu hồi tại server khi logout. [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html) · [OAuth Security BCP](https://www.rfc-editor.org/rfc/rfc9700) |
| Cô lập theo cửa hàng | BE-03–BE-05 | Dùng membership hiện hành để tạo ngữ cảnh truy vấn. Tài nguyên thuộc shop có khóa duy nhất và khóa ngoại theo shop. Repo nhận ngữ cảnh quyền và transaction, không nhận shop client làm thẩm quyền. Cơ chế RLS chỉ bổ sung nếu có thiết kế dùng chung connection pool và test vai trò thực thi. |
| Giao dịch nhiều module | BE-06 trở đi | Dùng cùng transaction PostgreSQL cho số tồn, trạng thái, chứng từ và audit khi chúng cùng là kết quả của một nghiệp vụ. Khóa dòng theo thứ tự ổn định hoặc cập nhật có điều kiện theo bất biến. Kiểm race trên PostgreSQL. Thử lỗi giữa chừng để chứng minh rollback. [Khóa dòng PostgreSQL](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS) |
| Command và chống lặp | BE-06 | Khóa chống lặp theo phạm vi chủ thể, shop khi có, operation và intent. Hash gồm tham số xác định mục tiêu, payload và điều kiện ghi ảnh hưởng đến ý nghĩa yêu cầu. Lưu kết quả hoặc tham chiếu lệnh bền vững. Cùng intent trả kết quả tương thích sau kiểm quyền hiện hành. Khác nội dung xử lý xung đột theo contract. |
| Outbox và sự kiện | BE-06, BE-10 | Ghi outbox cùng thay đổi nghiệp vụ. Worker phát theo lease và định danh bền vững. Consumer xử lý lặp an toàn. SSE chỉ mang metadata làm mới dữ liệu, không mang nội dung riêng tư. Kiểm mất đoạn, mất Redis, thu hồi quyền và phát lại. [Mẫu transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) |
| Tiền và thời gian | BE-03, BE-11, BE-12, BE-17 | Dùng `NUMERIC` hoặc biểu diễn chính xác tương đương trong DB, chuỗi thập phân trên API. Khóa currency, quy tắc làm tròn và phân bổ theo nghiệp vụ trước migration liên quan. Lưu thời gian UTC, tính kỳ và ngày nghiệp vụ theo timezone shop. Chỉ so sánh hoặc cộng tiền cùng currency khi chưa có quy tắc FX được duyệt. |
| Tệp, dữ liệu cá nhân và nhà cung cấp | BE-08, BE-18, BE-21–BE-24 | Kiểm quyền theo từng tệp và mục đích, giới hạn dung lượng/loại, cách ly trước khi quét, dùng đường dẫn ký ngắn hạn ở nơi áp dụng. Secrets lưu phía server. Provider adapters xác minh đầu vào, dùng timeout có giới hạn và trả kết quả quan sát. Chỉ kích hoạt khả năng live sau khi đủ grant, chính sách và bằng chứng staging. |

Quyết định về phiên bản thư viện, nhà cung cấp cụ thể, tải, mức mất dữ liệu cho phép và thời gian phục hồi được ghi ở đầu việc cần chúng. Thử nghiệm phát triển dùng fixture tổng hợp. Ghi tài khoản môi trường, thời gian kiểm, cấu hình không nhạy cảm và người chịu trách nhiệm vào bằng chứng. [Đầu vào của chủ dự án](../botsales-kit/execution/owner-inputs.json) · [Chính sách mặc định khi chạy](../botsales-kit/docs/27_RUNTIME_POLICY.md)

### Quy tắc đồng bộ từng thay đổi

1. **Trước code**, lấy operation hoặc tác vụ, route, quyền, bất biến và ca kiểm từ ma trận. Đối chiếu request thực tế của frontend, worker và bên đọc chung. Tìm nơi đã thực thi cùng quy tắc. Ghi module sở hữu, điểm vào cần dùng lại, schema hoặc migration bị ảnh hưởng và ca lỗi cần chứng minh trong PR.
2. **Trong code**, mỗi operation đăng ký một handler chính. HTTP map DTO vào use case, worker và công cụ AI gọi cùng nghiệp vụ khi thực hiện cùng hành vi. Mỗi mô hình dữ liệu có một chủ sở hữu ghi. Truyền transaction qua public port khi nhiều module cần cập nhật cùng nhau. Tách các chính sách có ý nghĩa nghiệp vụ khác nhau để mỗi bên vẫn thay đổi đúng theo điều kiện của mình.
3. **Khi review**, lần theo cả đường đọc và ghi từ đầu vào đến DB, sự kiện và kết quả hiển thị. Kiểm handler đăng ký trùng, hàm quyết định trạng thái lặp ở nhiều module, truy cập bảng ngoài quyền sở hữu, phép tính tiền lặp và validation bị bỏ qua. Kiểm import boundary và đăng ký operation trong CI từ BE-02. Dùng lint, typecheck, contract check và ma trận ca kiểm tương ứng. Đường dẫn khác nhau có thể kiểm quyền ở các thời điểm khác nhau bằng cùng một chính sách.
4. **Khi đổi schema đã có dữ liệu**, thử thứ tự **mở rộng → chuyển dữ liệu → chuyển bên đọc và ghi → thu hẹp** trên DB thử. Ghi cách xử lý nếu quá trình chuyển dừng giữa chừng. Thử phương án quay về phiên bản ứng dụng tương thích hoặc chạy sửa tiến tới theo thiết kế migration.
5. **Khi đóng việc**, đối chiếu bằng chứng với đúng commit, contract, migration và môi trường. Chỉ đánh dấu **Đã kiểm chứng** sau khi đủ ca bắt buộc. Nếu phát hiện sai lệch, sửa tại module sở hữu và chạy lại test của các bên phụ thuộc. Mốc staging và nghiệm thu người dùng được theo dõi ở BE-22–BE-24.

### Trách nhiệm triển khai và tái sử dụng

| Quy tắc chung | Đầu việc triển khai | Nơi sử dụng lại |
|---|---|---|
| Xác thực phiên, kiểm quyền và `allowedActions` | BE-04 dựng phiên. BE-05 sở hữu ngữ cảnh shop, quyền và cách gọi chính sách tài nguyên. Module nghiệp vụ định nghĩa điều kiện trạng thái của chính mình. | Controller, query, worker, SSE, callback và export. Lệnh ghi và `allowedActions` dùng cùng điều kiện nghiệp vụ. Worker kiểm lại quyền theo thời điểm tác động. |
| Chống lặp, audit, command và phân loại kết quả | BE-06 sở hữu lưu intent, định danh, kết quả và outbox. BE-10 sở hữu lease, phân phối, retry và phát lại. | Đơn, nhật ký tài chính, mua hàng, gửi tin, scan và thông báo. Dùng định danh gốc khi qua adapter. Kết quả chưa rõ đi theo quy trình đối chiếu của cùng command. |
| Kho và giá vốn xuất/nhận | BE-09 sở hữu sổ biến động, tồn, giữ và quy tắc giá trị của lượng hàng. BE-12 nối điều chỉnh kho có đối ứng tài chính. | Chốt đơn, bàn giao, trả, mở sổ, kiểm kê, chuyển kho và nhập mua. Mỗi luồng truyền lý do, số lượng, giá vốn và nguồn nghiệp vụ vào cổng kho. |
| Bút toán và khóa kỳ | BE-12 sở hữu kiểm kỳ trong transaction ghi, cân bằng và chống trùng theo nguồn. BE-17 nối quyết toán, khóa/mở kỳ và báo cáo vào cùng dữ liệu và cơ chế khóa. | Điều chỉnh kho, bàn giao, hoàn, chuyển kho, nhập mua, đối soát và mở sổ. Nghiệp vụ nguồn xác định ý nghĩa và khoản tiền. Finance ghi và kiểm bút toán. |
| Báo giá, giá ròng và xác nhận khách | BE-11 sở hữu mô hình giá và snapshot cùng luồng xác nhận. Catalog cung cấp giá có hiệu lực. BE-14 khai báo combo đủ điều kiện và số giảm cho luồng định giá đã có. | Đơn nháp, báo giá, chốt đơn qua người dùng hoặc AI, hoàn và R53. BE-13 hoàn theo giá ròng đã chốt từ đầu. Báo cáo đọc số đã ghi và nguồn của đơn. |
| Tin nhắn làm bằng chứng | BE-11 dùng mô hình đọc bằng chứng tối thiểu của Inbox với định danh tin, khách và shop. BE-18 nối tiếp nhận tin thật qua adapter thử vào cùng mô hình. | Xác nhận báo giá và công cụ chốt đơn. Ca P1 tạo tin nhắn tổng hợp gắn với báo giá đã tạo trên DB thử. |
| Công việc và phê duyệt | BE-13 nối work item và nhận việc cho chuẩn bị. BE-16 nối approval ràng buộc intent cho mua. Hai phần thuộc Operations, cùng quy tắc và bảng dữ liệu khi BE-20 mở rộng. | R37/R38/R41/R63, duyệt tự động có điều kiện, hạn mức và bản tin. BE-20 mở rộng loại việc và policy trên use case đã kiểm. |
| Tệp riêng tư | BE-08 sở hữu lớp lưu tệp và metadata, cách ly, kiểm và cấp quyền tải. Mỗi mục đích có policy và consumer riêng. | Ảnh và import catalog, sao kê BE-17, media và tri thức BE-18, tệp export BE-21. Cùng pipeline, kiểm quyền riêng cho từng loại dữ liệu. |

Gộp khi cùng bất biến, cùng nguồn dữ liệu và cùng điều kiện lỗi. Với hành vi giống về cú pháp nhưng khác thẩm quyền hoặc trạng thái, giữ quyết định tại module tương ứng. Thêm tầng dùng chung khi đã có nơi sử dụng cụ thể và ca kiểm cho hành vi dùng chung. [Chuẩn ranh giới và TypeScript của dự án](../botsales-kit/docs/18_CODING_STANDARDS.md)

## Quyền sở hữu dữ liệu và giao dịch

Các nhóm dưới đây làm chủ việc **ghi**. Module đọc chung có thể dùng truy vấn theo quyền hoặc mô hình đọc, còn quyết định ghi được thực thi ở nghiệp vụ sở hữu. [Bất biến INV2 và luồng tác động ngoài](../botsales-kit/docs/05_DOMAIN_AND_INVARIANTS.md) · [Phân quyền và tenant](../botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md)

| Dữ liệu hoặc năng lực | Module sở hữu | Nguồn và bất biến |
|---|---|---|
| Người dùng, shop, membership, session và privacy | Workspace | ID định danh bên ngoài được ánh xạ tới user. Shop, role, permission version và chính sách xác định quyền hiện hành của từng yêu cầu. Lưu audit khi tăng quyền, thu hồi, step-up hoặc xử lý privacy. |
| Hồ sơ khách, địa chỉ, consent và hậu mãi | Khách hàng, phối hợp Workspace về privacy | Khóa danh tính ngoài theo kênh/page. Lịch sử địa chỉ thương mại dùng snapshot. Thay consent tác động tới công việc marketing đang chờ và được kiểm lại trước tác động ngoài. |
| Sản phẩm, SKU, giá, danh mục và ưu đãi | Catalog | Unique SKU theo shop. Phiên bản combo và giá dùng trong báo giá phải truy vết được. Import đi qua kiểm hợp đồng và ràng buộc như tạo thủ công. |
| Vị trí, giữ hàng, sổ tồn, phiếu kiểm kê và chuyển kho | Inventory | Ghi biến động có tham chiếu nghiệp vụ. Tồn khả dụng dựa trên tồn bán được trừ giữ còn hiệu lực. Hàng đi đường và hàng cách ly có số riêng. |
| Đơn, báo giá và xác nhận khách | Orders | Xác nhận ràng buộc báo giá, khách, dữ liệu dòng và thời hạn. Hủy trước bàn giao theo điều kiện. Sau bàn giao dùng quy trình trả và nghĩa vụ tài chính tương ứng. |
| Nhận việc chuẩn bị, đóng gói, vận đơn và bằng chứng giao | Fulfillment | Hạn mức lượng theo từng dòng. Phân biệt bàn giao, đã giao, thu COD và tiền vào tài khoản. R62 lưu phí dự kiến theo phiên bản quy tắc. |
| Nhà cung cấp, đề nghị nhập, đơn mua và phiếu nhận | Procurement | Một ý định mua sử dụng đúng phê duyệt và ngân sách. Tổng nhận nằm trong hạn mức được phép. Kết quả gửi không rõ cần xác minh trước khi gửi lại. |
| Tài khoản, chứng từ, sổ, thu hoàn, COD, công nợ và kỳ | Finance | Cân bằng Nợ/Có theo currency. Bút toán đã ghi dùng đảo hoặc điều chỉnh có dấu vết. Khóa kỳ kiểm cùng transaction với ghi. R65 là mô hình đọc truy vết chứng từ. |
| Hội thoại, tin nhắn và quyền tiếp quản | Inbox | Id ngoài chống trùng theo page/kênh. Kiểm thế hệ tiếp quản trước khi gửi. Sự kiện nhận, gửi, xác nhận và trạng thái chưa rõ được phân biệt. |
| Nguồn tri thức, revision và truy xuất | Knowledge | Quyền và hiệu lực áp dụng cả lúc nhập lẫn truy xuất. Dùng phiên bản nguồn và model để dựng lại kết quả. |
| Cấu hình AI, quyền công cụ và đánh giá | Bot | Quyền do backend xác nhận theo principal và policy. Kết quả đánh giá gắn mẫu, phiên bản, chi phí và kết quả đối chứng. |
| Kết nối, grant và lần thử của dịch vụ ngoài | Integrations | Secrets giữ ở server. Lưu kết quả quan sát, mã tham chiếu, health và thời điểm kiểm. Thu hồi grant chặn hành động kế tiếp. |
| Work item, phê duyệt, hạn mức, bản tin và trạng thái vận hành | Operations | Mỗi ý định có owner và người phụ trách rõ. Phê duyệt ràng buộc hash, phạm vi, phiên bản, quyền và thời hạn. R63 nối tới công việc, job, command và hồ sơ nguồn. |
| Thiết bị, ghép kênh và thông báo | Notifications | Mỗi ý định gửi có mục tiêu và trạng thái riêng cho gửi, mở, xác nhận. Quyền thiết bị và loại thông báo được kiểm trước lúc gửi. |
| Tổng quan và báo cáo | Dashboard, Reports | Tổng hợp tại server theo quyền, kỳ, timezone và dữ liệu nguồn. Mỗi số quan trọng có nguồn đối chiếu. R53 chỉ đếm đơn và giá trị giảm đáp ứng điều kiện được chọn. |
| Hạ tầng dùng chung | Platform | Command, outbox, audit, file metadata và stream có khóa tenant/actor khi áp dụng. Có mã truy vết, chính sách truy cập và retry theo từng loại tác động. |

### Luồng ghi trọng yếu và ca đối chứng

| Luồng và mã việc | Ghi cùng transaction | Kiểm chứng hậu quả khi lỗi hoặc tranh chấp |
|---|---|---|
| Tạo sản phẩm BE-07 | Kiểm scope, SKU, ghi sản phẩm, audit và kết quả chống lặp áp dụng | Cùng yêu cầu song song chỉ ghi một lần. Cùng khóa khác yêu cầu bị từ chối theo contract. Shop khác và thiếu quyền không tạo dữ liệu. |
| Chốt đơn BE-11, BE-14 | Đọc bằng chứng khách và snapshot, khóa vị trí tồn, giữ đủ mọi SKU, đổi đơn, audit và outbox | Tranh đơn vị cuối, lỗi ở SKU thứ hai, giá hoặc phiên bản combo đổi, gửi lại sau khi mất phản hồi. Đối chiếu cả số giữ và trạng thái đơn. |
| Bàn giao và hoàn BE-13 | Tiêu thụ giữ, biến động kho và bằng chứng bàn giao. Kiểm trả nối nhập phần đạt và nghĩa vụ hoàn theo phạm vi | Bàn giao lặp, trả vượt lượng, hàng chưa kiểm, hoàn một phần theo giá ròng. Đối chiếu nghĩa vụ với dòng gốc. |
| Duyệt kiểm kê và xuất/nhận chuyển BE-15 | Kiểm mốc và quyền, ghi chênh và sổ kho. Với chuyển kho, cập nhật tồn, giá vốn và phiếu theo từng lần xuất/nhận | Kiểm kê đổi mốc, người duyệt đồng thời, chuyển vượt tồn, nhận hai lần, nhập quá lượng hoặc thiếu. Kiểm giá vốn còn lại và dấu vết bút toán. |
| Nhận hàng mua BE-16 | Khóa phần còn được nhận, ghi phiếu, tồn phần đạt, công nợ hoặc bút toán | Hai yêu cầu nhận cạnh tranh, dòng lỗi, đơn mua khác shop và retry sau commit. |
| Chứng từ, phân bổ và khóa kỳ BE-12, BE-17 | Kiểm quyền, nguồn duy nhất, phần tiền còn và khóa kỳ. Ghi bút toán cân bằng cùng phân bổ | Ghi vào kỳ đang khóa, phân bổ song song, nhập sao kê trùng, hoàn quá giới hạn. Đảo vẫn giữ lịch sử. |
| Gửi ra ngoài BE-10, BE-16, BE-18, BE-20 | Ghi intent và outbox trước. Worker kiểm quyền, lease và policy hiện hành rồi gọi provider ngoài transaction. Ghi kết quả quan sát trong giao dịch riêng | Crash trước gửi, sau khi provider nhận và trước khi lưu ACK. Kiểm chống gửi trùng, truy vết kết quả chưa rõ và phục hồi có bằng chứng. |
| Duyệt, tiếp quản và nút dừng BE-18–BE-20 | Điều kiện compare-and-set trên trạng thái, phiên bản, chủ thể và phạm vi. Ghi audit, tăng thế hệ khi phù hợp | Hai người cùng nhận, replay phê duyệt, hết hạn, quyền bị thu hồi hoặc job cũ chạy sau khi dừng. |

## Cách theo dõi tiến độ

1. Chọn việc có ưu tiên backend cao nhất theo **P0 → P1 → P2 → P3** và đã đủ phụ thuộc. Trong cùng mức, dùng thứ tự trong bảng. Mã BE giữ ổn định khi đổi thứ tự. Nếu một việc bị chặn, ghi điều kiện gỡ chặn rồi tiếp tục việc độc lập có ưu tiên cao nhất.
2. Khi bắt đầu, đặt trạng thái **Đang thực hiện**. Đánh dấu từng checkbox khi bước đó đạt yêu cầu. Khi code đã có trên một commit và vẫn chờ kiểm tích hợp, đặt **Đã code** và ghi điều còn thiếu.
3. Khi đủ bằng chứng cho mọi tiêu chí của việc, đặt **Đã kiểm chứng**. Nếu thiếu đầu vào hoặc hạ tầng, đặt **Bị chặn** và ghi yêu cầu cụ thể trong nhật ký. Khi thay đổi hợp đồng, migration hoặc bất biến làm mất hiệu lực của bằng chứng, đưa việc liên quan về **Đã code** và chạy lại ca bị ảnh hưởng.
4. Cuối mỗi phiên, ghi commit, bằng chứng, tình trạng và mã BE tiếp theo. Đếm tiến độ từ bảng. **Đã code hoặc đã kiểm chứng** cho biết số việc đã có triển khai đủ để đưa đi kiểm. **Đã kiểm chứng** cho biết số việc đã đạt nghiệm thu. Nếu bị chặn sau khi đã viết code, giữ dấu các bước đã hoàn thành và ghi commit gần nhất vào [nhật ký](#nhật-ký-tiến-độ-và-bằng-chứng).

## Bảng theo dõi

| Việc | Ưu tiên | Phụ thuộc | Kết quả cần đạt | Trạng thái |
|---|---|---|---|---|
| [BE-01](#be-01) | P0 | — | Baseline backend, xử lý CI PR #27 và cấu hình thử | Đã kiểm chứng |
| [BE-02](#be-02) | P0 | BE-01 | Workspace, HTTP và kiểm ma trận tự động trong CI | Đang thực hiện |
| [BE-03](#be-03) | P0 | BE-02 | PostgreSQL, migration và dữ liệu thử | Chưa bắt đầu |
| [BE-04](#be-04) | P0 | BE-03 | OIDC thử nghiệm và phiên backend | Chưa bắt đầu |
| [BE-05](#be-05) | P0 | BE-04 | Cô lập cửa hàng và quyền server | Chưa bắt đầu |
| [BE-06](#be-06) | P0 | BE-05 | Chống ghi trùng, nhật ký và outbox | Chưa bắt đầu |
| [BE-07](#be-07) | P0 | BE-06 | Tạo sản phẩm qua frontend live | Chưa bắt đầu |
| [BE-10](#be-10) | P1 | BE-06 | Worker và phục hồi tác vụ | Chưa bắt đầu |
| [BE-08](#be-08) | P1 | BE-07, BE-10 | Danh mục, biến thể, khách và địa chỉ | Chưa bắt đầu |
| [BE-09](#be-09) | P1 | BE-08 | Sổ kho, số tồn và giữ hàng | Chưa bắt đầu |
| [BE-11](#be-11) | P1 | BE-09, BE-10 | Đơn nháp, báo giá, chốt đơn, R62 và đọc ưu đãi | Chưa bắt đầu |
| [BE-12](#be-12) | P1 | BE-11 | Thu tiền, COD, sổ kép và điều chỉnh kho có đối ứng | Chưa bắt đầu |
| [BE-13](#be-13) | P1 | BE-12 | Chuẩn bị, giao, trả hàng và thông báo | Chưa bắt đầu |
| [BE-14](#be-14) | P2 | BE-13 | Combo và hoàn theo giá sau giảm R64 | Chưa bắt đầu |
| [BE-15](#be-15) | P2 | BE-09, BE-12 | Kiểm kê R66 và chuyển kho R67 | Chưa bắt đầu |
| [BE-16](#be-16) | P2 | BE-09, BE-10, BE-12 | Mua và nhận hàng từng phần | Chưa bắt đầu |
| [BE-17](#be-17) | P2 | BE-14, BE-15, BE-16 | Đối soát, khóa kỳ, báo cáo và R65 | Chưa bắt đầu |
| [BE-18](#be-18) | P2 | BE-08, BE-14 | Inbox, media và tri thức | Chưa bắt đầu |
| [BE-19](#be-19) | P2 | BE-11, BE-18 | AI, công cụ bán hàng và đánh giá | Chưa bắt đầu |
| [BE-20](#be-20) | P2 | BE-10, BE-17, BE-19 | Điều phối, phê duyệt, marketing và R63 | Chưa bắt đầu |
| [BE-21](#be-21) | P2 | BE-20 | Quyền riêng tư, xuất dữ liệu và kiểm toàn phạm vi | Chưa bắt đầu |
| [BE-22](#be-22) | P3 | BE-21 | Staging và dịch vụ ngoài đã cấp quyền | Chưa bắt đầu |
| [BE-23](#be-23) | P3 | BE-21 | Bảo mật, tải, phục hồi và CI/CD | Chưa bắt đầu |
| [BE-24](#be-24) | P3 | BE-22, BE-23 | UAT, phát hành giới hạn và bàn giao | Chưa bắt đầu |

## P0 Nền backend và luồng đầu tiên với frontend

### BE-01

**Chốt baseline backend, xử lý CI PR #27 và chuẩn bị môi trường** · T001–T006

- [x] Chốt `main@e22bb99d` sau khi CI xác nhận đủ job trên đúng SHA. Ma trận ghim SHA-256 của hợp đồng, gồm 259 thao tác và R62–R67.
- [x] Hoàn tất review PR #27 và xác nhận CI trên `7da9a102` trước merge vào `b9a54c31`. Ma trận R19 ghi riêng lookup combo khi mở form sửa.
- [x] Chốt workspace, chủ sở hữu tệp và tracker tiến độ. [Quyết định workspace và tracker](#workspace-và-tracker)
- [x] Chốt toolchain và môi trường P0. Kiểm PostgreSQL/Prisma, HTTPS và callback OIDC trên fixture loopback. [Cấu hình](#toolchain-và-cấu-hình-p0) · [Bằng chứng](#bằng-chứng-kiểm-môi-trường-be-01)
- [x] Chốt quy trình cài, kiểm lockfile trên fixture sạch và lập 10 ca P0 theo đầu việc. [Quy trình cài](#quy-trình-cài-và-chạy-từ-checkout-sạch) · [Ca kiểm P0](#danh-mục-ca-kiểm-p0)

#### Xử lý CI PR #27 và chọn baseline

| Nhóm lỗi quan sát trong CI | Việc cần kiểm khi xử lý |
|---|---|
| FE009 chờ liên kết xem phí giao cũ | Đối chiếu chức năng cấu hình R62, đích điều hướng và quyền hiển thị. Giữ ca xác nhận nhân viên đi đúng nơi và người thiếu quyền bị từ chối. |
| FE011 chờ thông báo điều chỉnh kho cũ | Kiểm mã lỗi, lý do hiển thị, bảo toàn form và dữ liệu kho. Đối chiếu với bất biến tồn khả dụng trước khi sửa kỳ vọng hoặc logic. |
| Các ca empty của R19 | Kiểm màn chi tiết theo `getOrder`. Kiểm danh sách combo rỗng trong luồng mở form sửa. Cập nhật phân loại API khởi tạo và API theo thao tác trong ma trận thay vì coi mọi lookup là bảng chính của màn. |
| UI61 chờ 61 màn | Lấy phạm vi kiểm từ danh mục route đang dùng và kiểm đủ từng ID để phát hiện thiếu hoặc trùng. |
| Ca ready/stale hiển thị sai route | Tái hiện theo log, role và thứ tự điều hướng. Xác định lỗi sản phẩm hay điều kiện đợi của bài test trước khi sửa. |

Bảng ghi các lỗi quan sát trước sửa. Báo cáo hồi quy ghi kết quả FE009, FE011, R19, UI61, FE022, chế độ rỗng của MSW, điều kiện chờ R40, bootstrap phiên R62, kiểm inventory Actions và hai nhận xét review về kho đích và đối soát. [CI thất bại trước sửa](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44705158222) · [Báo cáo hồi quy PR #27](../BotSalesAI_Frontend/evidence/pr27-ci-recovery-20261121/REPORT.md) · [Chính sách CI của repo](../.github/CI_POLICY.md)

**Kết quả CI hiện hành.** PR #27 đã đóng hai nhận xét review và đạt 26/26 job ở `7da9a102` trước khi merge vào `b9a54c31`. Hai lượt frontend trên merge commit đầu đều hết 300 giây ở bài axe Firefox và đã lưu trong nhật ký. [CI frontend PR #27](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44855499947/attempts/1) · [CI hygiene PR #27](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44855500080/attempts/1)

[PR #28](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/28) chia axe thành bốn nhóm giữ đủ 67 màn, bộ rule và kiểm bàn phím. Firefox preview đạt 5/5 và ghi nhận 0 lỗi axe. CI xác nhận toàn bộ 23 job frontend và 3 job hygiene trên `4b23206d` trước merge và trên `e22bb99d` sau merge. [CI frontend PR #28](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44858469201/attempts/1) · [CI hygiene PR #28](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44858469240/attempts/1) · [CI frontend main](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44859360178/attempts/1) · [CI hygiene main](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44859360187/attempts/1)

#### Workspace và tracker

- Workspace npm backend đặt tại `BotSalesAI_Backend/`, có `package.json` private, một `package-lock.json` ở gốc, `.npmrc` và `.node-version` riêng. Dùng `workspaces: ["apps/*"]`; BE-02 tạo duy nhất `apps/api`, còn `apps/worker` bắt đầu ở BE-10 và gọi giao diện công khai của nghiệp vụ. Không cần Nest CLI toàn máy; chạy các lệnh TypeScript và kiểm thử từ dependency đã khóa. [Quy định workspace backend](AGENTS.md)
- BE-02 đặt điểm vào tiến trình tại `apps/api/src/main.ts` và hàm tạo app tại `apps/api/src/app.ts`. Prisma schema/migration/seed nằm ở `apps/api/prisma/` từ BE-03. Đặt kiểm thử tại `tests/` hoặc cạnh module sở hữu, lệnh kiểm tại `scripts/`, cấu hình PostgreSQL thử tại `infra/p0/` và IdP tổng hợp tại `infra/p0/oidc/` khi đến BE-04. Mọi thư mục triển khai trên đều tương đối với gốc backend.
- Hợp đồng dùng chung lấy từ `botsales-kit/contracts/`; backend sinh đầu ra riêng trong workspace của mình. `BotSalesAI_Frontend/` giữ bundle, client và tùy chọn HTTPS của Vite. `.github/` giữ workflow cấp repo với working directory, lockfile và artifact trỏ đúng backend. Khi phối hợp một PR, cả ba vùng thay đổi theo đúng nơi sở hữu.
- Bảng BE-01–BE-24 và nhật ký trong file này là nơi cập nhật tiến độ backend. Ghi mã BE, mã `Txxx` tham chiếu, SHA và bằng chứng hoặc mục còn chặn trong cùng một lượt cập nhật. Kế hoạch và progress toàn sản phẩm của kit là nguồn tham chiếu chỉ đọc; ledger frontend tiếp tục phục vụ frontend theo quy định kit. Điều chỉnh theo dõi toàn sản phẩm cần một quyết định riêng. [Quy định kit](../botsales-kit/AGENTS.md) · [Kế hoạch toàn sản phẩm](../botsales-kit/execution/plan.json) · [Phạm vi frontend](../BotSalesAI_Frontend/docs/FRONTEND_SCOPE.md)

#### Toolchain và cấu hình P0

| Thành phần | Baseline BE-02 và môi trường phát triển |
|---|---|
| Node/npm | Node.js `24.22.3` LTS, npm `11.17.0`, TypeScript `5.9.3`. Dùng ESM, `module` và `moduleResolution` là `NodeNext`. Khai báo `engines`, `packageManager`, `engine-strict=true`, `strict-peer-deps=true` và `save-exact=true`. [Node 24.22.3](https://nodejs.org/en/blog/release/v24.22.3) · [npm ci](https://docs.npmjs.com/cli/npm-ci/) |
| HTTP | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` cùng `11.2.11`, RxJS `7.8.2`, `reflect-metadata` `0.2.2`. Dùng HTTP adapter mặc định của Nest. [Tương thích phiên bản NestJS](https://docs.nestjs.com/faq/versions) |
| PostgreSQL/Prisma | PostgreSQL `18.7`; `prisma`, `@prisma/client` và `@prisma/adapter-pg` cùng `7.10.1`, `pg` `8.23.1`. Dùng generator `prisma-client`, output ESM trong backend, adapter `PrismaPg` và URL PostgreSQL trực tiếp. Thêm Prisma ở BE-03. [Prisma v7 system requirements](https://docs.prisma.io/docs/orm/v7/reference/system-requirements) · [Prisma v7 PostgreSQL](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7) |
| Database thử | Cấu hình Compose dùng `postgres:18.7@sha256:eb63372c1e05c755f55fa30cbd07aecc443676fc6c0fa90b9002d01537841e1a`, publish `127.0.0.1:55432:5432`, named volume tại `/var/lib/postgresql`, database `botsales_be_dev`. Dùng SCRAM. `MIGRATION_DATABASE_URL` dùng role sở hữu schema cho Prisma CLI; `DATABASE_URL` dùng role ứng dụng chỉ có quyền đã cấp. CI cần database/volume riêng cho mỗi run. Có thể dùng PostgreSQL 18.7 chạy trên WSL qua cùng cổng nếu chưa có Docker. Không chạy đồng thời hai dịch vụ trên cùng cổng. [PostgreSQL 18.7](https://www.postgresql.org/docs/release/18.7/) · [Docker Official Image](https://hub.docker.com/_/postgres) |
| HTTPS | Origin browser `https://localhost:5173`; API upstream `http://127.0.0.1:3000` chỉ nghe loopback. Vite `dev:live` giữ `/api` proxy và `changeOrigin: false`. BE-04 thêm tùy chọn TLS phía frontend đọc cert/key theo đường dẫn local và giữ Host công khai. Backend lấy origin/callback từ cấu hình đã định, kiểm Origin và chỉ tin proxy local ở nơi cần. CA/cert thử dùng SAN `localhost` và `127.0.0.1`; tin CA theo profile thử và Node của tiến trình thử. [Cấu hình Vite](../BotSalesAI_Frontend/apps/web/vite.config.ts) |
| OIDC local | Issuer `https://127.0.0.1:9443`, client confidential `botsales-p0-dev`, redirect URI duy nhất `https://localhost:5173/api/v2/auth/callback`; mặc định trả về đường dẫn nội bộ `/workspaces`. `openid-client` `6.9.1` để discovery/token/validation và `oidc-provider` `9.15.1` chỉ cho IdP tổng hợp loopback. API giữ client secret và verifier phía server. Dùng Authorization Code + PKCE S256, state/nonce dùng một lần và xác minh issuer/audience/chữ ký. Dùng hai hostname để cookie host-only của app không chuyển sang IdP. [openid-client](https://github.com/panva/openid-client) · [oidc-provider](https://github.com/panva/node-oidc-provider) |
| Điều kiện theo mốc | BE-03 kiểm Compose hoặc PostgreSQL 18.7 tương đương, migration và seed của dự án. BE-04 xác nhận cấu hình `dev:live`, callback và phiên của API thật với IdP tổng hợp. Tài khoản IdP do chủ dự án cấp thuộc T068/BE-22. Redis thuộc BE-10. [Đầu vào của chủ dự án](../botsales-kit/execution/owner-inputs.json) |

`.env.example` của backend chỉ khai báo tên hoặc placeholder, gồm `APP_ORIGIN`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`. File local, kho cert, key và log có credential ở ngoài Git. Frontend chỉ đọc `API_PROXY_TARGET` và đường dẫn cert/key local ở mức cấu hình Vite; các giá trị xác thực của backend không đi vào `VITE_*`. Tại BE-04, http nội bộ chỉ dùng giữa Vite và API trên loopback. Cookie app dùng `__Host-bs_session`, `Secure`, `HttpOnly`, `Path=/`, host-only và `SameSite=Lax` để tương thích callback GET từ IdP.

#### Bằng chứng kiểm môi trường BE-01

| Kiểm tra | Kết quả và giới hạn |
|---|---|
| Toolchain từ lockfile thử sạch | Node `24.22.3` và npm `11.17.0`. `npm ci` với engine/peer strict cài 274 package trong fixture sạch, SHA-256 lockfile trước/sau giống nhau (`22d48221339c36ca023886446afd1ed1172772d8cbcfcf0db9ffe60904c2fc80`), Nest trả 200. Lượt tải tự động Windows bị `ECONNRESET`; lượt đạt dùng `PRISMA_SCHEMA_ENGINE_BINARY` trỏ binary Windows của engine commit `d1b3f377ca835d73fd50954a5e22128b9ebdd6b8`. Đối chiếu SHA-256 của cả gzip và binary với nguồn Prisma; SHA-256 binary là `e6c4bb89d31f39f7ac601e264c998c0382c069df8485fb8810d0ba8fa806ea4a`. Giữ schema engine theo lockfile; khi lỗi mạng, dùng nguồn chính thức và xác minh checksum trước khi dùng override cục bộ. [Tùy chọn Prisma Schema Engine](https://docs.prisma.io/docs/cli/v7/debug) |
| PostgreSQL 18.7 và Prisma | Node trên Windows kết nối PostgreSQL `18.7` trên WSL qua `127.0.0.1:55432` bằng SCRAM. `prisma generate` và `migrate deploy` đạt; lượt deploy thứ hai báo hết migration chờ. Role runtime không có quyền tạo bảng trong schema. Fixture cho cùng SKU ở hai shop, từ chối trùng cùng shop và FK thiếu shop; rollback để lại 0 dòng phát sinh. Sau restart PostgreSQL, số dòng mẫu giữ nguyên 2 → 2. Đây là schema thử cô lập; migration, seed, khóa ngoại liên shop và readiness của dự án kiểm ở BE-03. |
| HTTPS và proxy | Firefox tin CA trong profile thử riêng, xác minh TLS 1.3 và nhận HTTP 200 ở `https://localhost:5173/login`. Vite dùng config hiện hành ở mode `development` và bật TLS bằng tham số của tiến trình thử; `/api/v2` đi qua proxy tới HTTP loopback. Node xác minh cert qua CA chỉ của tiến trình thử. |
| OIDC qua callback | IdP tổng hợp cung cấp discovery với issuer đúng và S256. Vòng code thực qua Firefox và `openid-client` có xác minh chữ ký token, trả 302 về `/workspaces`, cookie có các thuộc tính dự kiến và được gửi lại cùng origin. Redirect URI ngoài danh sách, state sai hoặc đã dùng, PKCE sai và nonce sai đều trả HTTP 400. API đích trong lượt kiểm là fixture tạm; nghiệm thu phiên và quyền của API dự án ở BE-04/BE-05. |

Lượt kiểm dùng Windows với Ubuntu 26.04.1 trên WSL, chỉ loopback và dữ liệu tổng hợp. PostgreSQL tải qua kho PGDG có chữ ký và chạy trong thư mục thử. Bản Compose đã xác nhận tag/digest; chạy container và volume sẽ được kiểm ở BE-03 trên máy có Docker. Chứng thư thử chỉ được cài vào profile Firefox riêng. IdP tổng hợp không sử dụng tài khoản bên ngoài.

#### Quy trình cài và chạy từ checkout sạch

1. Lấy checkout đúng SHA đã ghi. Dùng bản Node LTS chính thức hoặc toolchain cô lập có npm CLI. Kiểm `node --version` và `npm --version` theo baseline backend trước khi cài. Giữ frontend dùng toolchain và lockfile đã khai báo trong workspace frontend.
2. Khi BE-02 tạo workspace, chủ dependency tạo `package-lock.json` từ manifest bằng `npm install --package-lock-only` tại `BotSalesAI_Backend/`. Review thay đổi manifest và lockfile cùng PR. Sau đó máy dev và CI chạy `npm ci` từ chính thư mục này. Checkout sạch phải cài được với kiểm engine và peer dependencies, hash lockfile trước/sau cài phải khớp.
3. BE-02 thiết lập `npm run verify` gọi kiểm sinh/đối chiếu contract, ma trận, lint, typecheck và test. Chạy build từ checkout vừa cài, rồi khởi động API, kiểm tiền tố `/api/v2`, liveness/readiness và một ca HTTP đúng/sai. Đăng ký tên lệnh thật với README backend và cấu hình CI; BE-01 chốt quy trình, lần kiểm checkout backend đầu tiên diễn ra ở BE-02.
4. Khi BE-03 có hạ tầng và schema, khởi động dịch vụ `postgres` từ `infra/p0/compose.yml` hoặc dùng PostgreSQL WSL qua cùng cổng, rồi kiểm `pg_isready` và `SHOW server_version`. Từ backend, dùng CLI Prisma đã khóa để `generate`, `migrate deploy` với role migration và chạy script seed tường minh. Lặp deploy phải báo hết migration chờ. Lặp seed giữ định danh và số bản ghi. Khởi động API bằng role ứng dụng. Ở BE-04 chạy IdP và Vite `dev:live` theo origin đã ghim, xác minh trên trình duyệt tin CA thử.
5. Mỗi chứng cứ ghi SHA, toolchain, hash lockfile và OpenAPI, profile môi trường, dữ liệu fixture, mã ca, kết quả thực và artifact đã lọc secret. Không dùng cài đặt ở workspace frontend hoặc preview MSW để nghiệm thu backend.

#### Danh mục ca kiểm P0

Dữ liệu BE-03 tạo hai shop A/B có kho mặc định thuộc đúng shop. `p0-editor` có preset `owner` ở A, `p0-editor-b` có preset `owner` ở B, và `p0-reader` có preset `viewer` ở A. Mỗi chủ thể chỉ có membership đã nêu. Định danh ổn định dựa trên issuer/subject tổng hợp. Giữ shop B rỗng ở fixture kiểm danh sách và dùng SKU theo mã run. Tách fixture theo ca để một lượt kiểm không làm thay đổi đầu vào của lượt khác. BE-07 thêm fixture danh mục tối thiểu. Giữ kết quả kiểm từng ca dưới mã BE tương ứng.

| Mã ca | Chủ việc | Kiểm chứng và kết quả mong đợi |
|---|---|---|
| P0-01 | BE-02 | Checkout sạch chạy `npm ci`, build, verify/ma trận và khởi động API. Lỗi cấu hình báo rõ tên biến đã thiếu và không lộ giá trị. Liveness phản ánh tiến trình; readiness phản ánh khả năng sẵn sàng. Một ca request sai kiểm status và envelope lỗi. |
| P0-02 | BE-03 | PostgreSQL trống migrate, seed hai shop và chạy lại an toàn. Kho mặc định cùng shop; thử tham chiếu liên shop bị FK từ chối. Role ứng dụng bị từ chối DDL. Dừng DB làm readiness trả 503; phục hồi DB trả trạng thái sẵn sàng. |
| P0-03 | BE-04 | `getCsrfToken` 200 → `beginLogin` 200 với CSRF và idempotency key → OIDC → `completeLogin` 302 về đích nội bộ → `getSession` 200 bằng cookie HTTPS. Kiểm cả thuộc tính cookie và refresh trình duyệt. |
| P0-04 | BE-04 | Callback state sai/lặp, nonce sai, issuer/audience không khớp, code/PKCE sai hoặc giao dịch hết hạn bị từ chối và không tạo phiên. URL trả về ngoài allowlist không được làm đích. Phiên hết hạn hoặc đã logout trả 401 ở `getSession`; `logout` hợp lệ 204, thiếu/sai CSRF bị từ chối. |
| P0-05 | BE-05 | `listShops` chỉ trả membership hiện hành và `getShop` đọc đúng shop. `p0-reader` đọc A nhưng không thấy B; gọi trực tiếp resource chéo shop trả 404 theo policy ẩn tài nguyên. Thu hồi membership rồi gọi lại, kết quả phải phản ánh quyền mới. |
| P0-06 | BE-06 | Cùng khóa + nội dung cho một lần ghi kể cả khi gửi song song; đổi nội dung với cùng khóa trả 409. Khóa ghi, kết quả và audit/outbox liên quan cùng transaction. Các ca 412/428 áp dụng khi triển khai operation có `If-Match`. Hợp đồng `createProduct` dùng CSRF và idempotency key. |
| P0-07 | BE-06, chạy lại ở BE-07 | Commit DB rồi làm mất phản hồi trước khi UI biết kết quả. Reload và tra theo intent dùng cơ chế đã chốt ở BE-06, không tạo thêm lần ghi. API tra thực thi quyền và shop ở thời điểm tra. DB có đúng một sản phẩm cho intent. |
| P0-08 | BE-07 | Firefox hoặc Chromium chạy `dev:live` từ R01 → R02 → R04 → R09 → R10 → R11. `getDashboard` 200 theo contract; `listCategories` và `listProducts` trả đúng shop; `createProduct` 201; `getProduct` và danh sách đọc đúng SKU sau reload và sau restart API. Đối chiếu với PostgreSQL. |
| P0-09 | BE-07 | `p0-reader` xem được catalog A nhưng `createProduct` bị 403; API cũng từ chối khi gọi trực tiếp. SKU trùng cùng shop 409, cùng SKU khác shop được phép với người có quyền ghi ở shop đó. Bài thử đối chứng danh sách rỗng vẫn 200 đúng schema. |
| P0-10 | BE-07 | Shell vào shop trong cấu hình SSE còn giới hạn; kiểm trạng thái giao diện và tải lại đọc đúng dữ liệu. Lưu giới hạn realtime trong bằng chứng P0. BE-10 nghiệm thu phát lại và mất kết nối SSE cùng worker. |

P0 kết thúc khi đủ bằng chứng HTTP, PostgreSQL và browser live của các ca trên. BE-08 nhận phần ảnh/chỉnh sửa; BE-10 nhận Redis, worker và SSE thật. Tham chiếu ca và operation hiện hành trong [ma trận truy vết](#ma-trận-truy-vết-baseline).

**Bằng chứng đóng BE-01.** Đủ 5/5 mục chuẩn bị và đã ghi baseline, CI, tracker, toolchain, hồ sơ môi trường và danh mục ca P0. BE-02 nhận cấu hình này để triển khai workspace và kiểm cài trên checkout thực. Các ca runtime của backend được xác nhận ở đầu việc sở hữu sau khi có mã chạy.

### BE-02

**Dựng workspace, kiểm giao tiếp HTTP và ma trận tự động** · T007–T009

- [x] Tạo workspace Node/TypeScript riêng có `apps/api`, manifest, lockfile và tài liệu chạy. Tách việc mở cổng trong `main.ts` khỏi hàm khởi tạo ứng dụng để test và worker tái sử dụng. Khai báo biến môi trường mẫu bằng tên hoặc placeholder.
- [x] Nối tiền tố `/api/v2`, lớp kiểm dữ liệu đầu vào, định dạng lỗi theo contract và mã truy vết. Thêm kiểm tra liveness và readiness cho vận hành. Khai báo phiên bản runtime trong tài liệu bộ công cụ.
- [ ] Lệnh `npm run verify` đã chạy typecheck, lint, test, kiểm ranh giới và hợp đồng trên checkout sạch. CI đã nối lệnh này, còn chờ kết quả GitHub Actions trên SHA của PR.
- [x] Tạo lệnh kiểm ma trận tự động trong `BotSalesAI_Backend/scripts/` và gọi từ `verify` của backend và workflow cấp repo. Kiểm danh mục và phạm vi thực thi theo bảng dưới. Lưu báo cáo gắn commit và hash OpenAPI.
- [x] Kiểm chứng từ checkout sạch. API khởi động, có phản hồi hợp lệ cho một ca đúng và một ca sai, chế độ chạy báo rõ khi thiếu cấu hình bắt buộc.

#### Phạm vi kiểm ma trận tự động

| Nhóm kiểm | Điều kiện đạt |
|---|---|
| Nguồn và phạm vi | Đọc nguồn trong `botsales-kit/` và ma trận trong file này. Đối chiếu hash baseline đã chọn, tập ID, method/path, quyền, route, ca chuẩn, sự kiện và mã BE sở hữu. Báo chính xác mục thêm, thiếu, trùng hoặc thay đổi. |
| API được bật theo mốc | Đối chiếu operation đã khai báo triển khai với đăng ký HTTP và ca kiểm tương ứng. Phát hiện thiếu handler, trùng ID hoặc method/path, sai hợp đồng và thiếu ca áp dụng. Danh mục kế hoạch vẫn kiểm toàn bộ. Chỉ đánh giá độ đầy đủ của mã thực thi trong phạm vi đã nhận triển khai ở mốc đó. |
| Luồng tiêu thụ | Phân biệt tải ngay, dùng chung ở shell và gọi theo hành động. Ma trận đánh giá API chính của R19 khi mở trang và tra combo khi mở form sửa. Kiểm luồng phù hợp với quyền và phạm vi đã bật. |
| Sai lệch hiện có và ca từ chối | Báo riêng `SC2-C07-CONSENT` và `journal.updated` với việc xử lý tại BE-21 và BE-10. Ca thử âm phải làm lệnh thất bại khi operation bị xóa khỏi ma trận, đăng ký trùng, sai method/path, dùng mã BE không tồn tại hoặc có sai lệch mới chưa được ghi. |

Dùng cùng nguồn baseline đã chốt ở BE-01 để kiểm ma trận và đăng ký HTTP. Khi hợp đồng thay đổi, cập nhật commit nguồn, SHA-256, ma trận, quyền và ca kiểm liên quan trong cùng PR. Báo cáo ghi baseline tham chiếu và commit đang kiểm.

Kiểm ma trận là một phần của CI backend từ BE-02. Báo cáo cho biết phạm vi và số mục đã kiểm, mã BE hoặc operation bị lỗi và commit của nguồn. Kết quả kiểm HTTP/DB/browser được ghi theo ca thực thi của từng mốc.

#### Kết quả kiểm BE-02

| Phạm vi | Bằng chứng |
|---|---|
| Checkout sạch | Bản thử độc lập trên Windows ở snapshot tạm `68313db39d419adb1a34e6bb6f4f3fa2a4e809db`, dựa trên `main@e22bb99d`. Trước khi cài, Git sạch, không có `.env` hoặc `node_modules`. `npm ci` trên Node `24.22.3` và npm `11.17.0` giữ nguyên SHA-256 lockfile `768e56c9517e7d1f63fc7d5eb90287f8827c57273a1c7d5da6268ae17170794f`. Snapshot nằm trong bản sao kiểm chứng cục bộ. |
| HTTP qua điểm khởi động thực | Tiến trình build khởi động trên cổng loopback tạm. `GET /api/v2/health/live` và `GET /api/v2/health/ready` trả 200. Query ngoài schema trả 400 `VALIDATION_FAILED` theo `application/problem+json`, với `X-Request-Id` khớp `requestId`. Ca kiểm xác nhận readiness lỗi trả 503, liveness vẫn 200 và readiness trở lại 200; thiếu cấu hình bind/port thoát mã 1. |
| Ma trận và ca đối chứng | `npm run verify` đạt lint, ranh giới, typecheck, build, ma trận và 17/17 ca. Ma trận đối chiếu 9 dấu vân tay, 24 việc, 67 màn, 259 operation và 376 schema, với hai route vận hành đã đăng ký và 0 operation sản phẩm được bật. Hai sai lệch đã biết vẫn có chủ việc ở BE-10 và BE-21. Thử bỏ dòng `getCsrfToken` trong bản sao cho mã thoát 1 và báo đúng operation thiếu. Phục hồi ma trận cho kết quả PASS. |
| CI | Workflow có đường dẫn cài/kiểm/artifact trỏ vào workspace backend. Đã kiểm cấu hình YAML và chạy đúng lệnh của job trên checkout sạch. Lượt GitHub Actions cần chạy trên SHA khi thay đổi lên PR. [Workflow backend](../.github/workflows/backend.yml) |

P0-01 đã kiểm ở local. Readiness hiện phản ánh tiến trình và phần phụ thuộc có ở BE-02; kiểm kết nối PostgreSQL bắt đầu ở BE-03. API sản phẩm và phiên OIDC vẫn theo thứ tự BE-03–BE-07. Tham chiếu [hướng dẫn chạy backend](README.md) và [phạm vi đăng ký](api-scope.json).

### BE-03

**Dựng PostgreSQL và nền dữ liệu** · T013

- [ ] Tạo Prisma schema và migration cho user, shop, membership, session và các bảng hạ tầng cần ở BE-06. Có dữ liệu kho tối thiểu dùng chung với BE-09 vì `Shop` yêu cầu `defaultWarehouseId`. Dùng khóa ngoại và unique theo `shopId` cho tài nguyên thuộc cửa hàng. Tách quyền chạy ứng dụng và quyền chạy migration.
- [ ] Viết seed dữ liệu thử có thể chạy lại an toàn cho hai shop, thành viên theo quyền khác nhau và kho mặc định thuộc đúng shop. BE-07 thêm danh mục mẫu qua mô hình Catalog. Kiểm cấu hình tiền tệ, thời gian, ID, trường phiên bản và kiểu số chính xác trước khi làm bảng giao dịch.
- [ ] Kiểm chứng migration từ DB trống và test tích hợp trên PostgreSQL. Dữ liệu còn sau khi khởi động lại API. Truy vấn có thể tham gia cùng transaction, ghi liên shop sai bị khóa ngoại từ chối, readiness phản ánh việc thiếu DB.

### BE-04

**Nối đăng nhập OIDC thử nghiệm và phiên** · T014

- [ ] Triển khai `getCsrfToken`, `beginLogin`, `completeLogin`, `getSession` và `logout`. Dùng IdP thử nghiệm qua HTTPS, kiểm state, nonce, PKCE và đích quay về. Phiên cookie dùng chính sách cùng origin và bảo vệ CSRF.
- [ ] Nối frontend `dev:live` qua origin HTTPS và callback đã chốt ở BE-01. Dùng một đích trả về hợp lệ có sẵn ở mốc này để kiểm callback, cookie, `getSession`, refresh, hết hạn và logout. BE-05 kiểm chuyển sang danh sách shop qua `listShops` và BE-07 kiểm luồng sản phẩm.
- [ ] Kiểm chứng phản hồi đúng contract, cookie và CSRF hợp lệ, phiên hết hạn bị chặn, token và nội dung định danh nhạy cảm được loại khỏi log.

### BE-05

**Cô lập dữ liệu và quyền theo cửa hàng** · T015, T018

- [ ] Triển khai `listShops`, `getShop` và quyền hiệu lực theo membership. Dùng một ngữ cảnh quyền đã xác minh cho truy vấn, ghi và các capability mà UI nhận qua `allowedActions`.
- [ ] Nối chọn shop ở R02 sau đăng nhập, xem membership và thu hồi quyền. Kiểm danh sách, chi tiết, ghi và tài nguyên đoán được ID qua API. SSE và worker tái sử dụng kiểm tra quyền khi có ở BE-10.
- [ ] Kiểm chứng với shop A và B, người đọc và người ghi, membership đã bị thu hồi. Quyền UI và khả năng gọi trực tiếp API cho cùng kết quả nghiệp vụ.

### BE-06

**Chống ghi trùng và ghi nhật ký bền vững** · T016

- [ ] Lưu khóa `Idempotency-Key` theo chủ thể, shop và thao tác, kèm hash nội dung và kết quả lệnh. Cập nhật có phiên bản theo `If-Match` ở những endpoint yêu cầu. Ghi thay đổi nghiệp vụ, audit và outbox trong cùng transaction khi áp dụng.
- [ ] Triển khai `listCommands` và `getCommand` theo contract. Chốt phương án tra theo intent trước khi nhận `commandId`. Quy định ai được tra theo shop, chủ thể và operation, quyền điều phối nếu cần, thời gian giữ tham chiếu và cách tìm lại sau reload. Phân biệt lệnh đang chạy, đã kết thúc và chưa xác định được. Dùng tham chiếu tối thiểu, kiểm quyền hiện hành, chưa gửi lại khi kết quả chưa rõ. Nếu cần đổi API, cập nhật nguồn chuẩn, consumer, scenario và migration record cùng một lượt.
- [ ] Kiểm chứng ghi lặp cùng khóa và cùng nội dung, xung đột `409`, phiên bản cũ `412`, thiếu phiên bản `428` theo từng thao tác. Kiểm chuỗi DB commit → mất phản hồi trước `commandId` → reload → tra đúng kết quả → DB chỉ ghi một lần. Thử tra sai shop, sai chủ thể, quyền đã thu hồi và yêu cầu đang xử lý. BE-07 kiểm lại trường hợp mất phản hồi bằng luồng tạo SKU thật.

### BE-07

**Hoàn thành luồng sản phẩm thật đầu tiên** · T019

- [ ] Nối `getDashboard` với một bộ tổng hợp và hợp đồng phản hồi giữ đến BE-20. Dùng hai shop thử từ BE-03. Thể hiện khả năng chưa cấu hình bằng trạng thái bot, dữ liệu tiền nullable và cảnh báo mà OpenAPI cho phép. BE-20 nối số liệu nghiệp vụ từ nguồn sở hữu. Nối `listCategories`, `listProducts`, `createProduct`, `getProduct` cho R09–R11 và thêm seed danh mục tối thiểu. P0 tạo và đọc SKU cơ bản, ảnh và chỉnh sửa thuộc BE-08.
- [ ] Viết kiểm thử HTTP với PostgreSQL và kiểm từ trình duyệt ở `dev:live`. Đăng nhập, chọn shop, tạo một SKU, mở trang chi tiết và tải lại danh sách sau khi khởi động lại API. Kiểm cả hai đường đọc ID và danh sách.
- [ ] Kiểm chứng quyền đọc mà thiếu quyền tạo, SKU trùng theo phạm vi shop và dữ liệu rỗng. Kiểm mất phản hồi sau khi tạo SKU, tra lại theo BE-06 và đối chiếu DB chỉ có một bản ghi. Shell hiện mở SSE khi vào shop. Ghi cảnh báo mất cập nhật trực tiếp của P0 và xác nhận tải lại vẫn đọc DB chính xác. BE-10 nghiệm thu luồng SSE thật. Ghi commit, lệnh và kết quả vào nhật ký trước khi đóng P0.

## P1 Luồng bán hàng và vận hành cốt lõi

### BE-10

**Dựng worker và realtime** · T017

- [ ] Tạo worker BullMQ/Redis dùng cùng tầng nghiệp vụ với API. Đọc intent và outbox từ BE-06, ghi lease và lần thử cho cùng định danh. Dùng chung trạng thái command và cách đối chiếu từ BE-06. Đảm bảo replay không tạo command hoặc bút toán mới cho cùng intent.
- [ ] Triển khai SSE `text/event-stream` cho `onmessage` của frontend. Mỗi thông báo có `data` theo schema và trường `id` để nối lại theo `Last-Event-ID`. Phát lại theo thứ tự trong đúng phạm vi shop. Khi thiếu đoạn lịch sử, dùng cơ chế resync theo hợp đồng. Kiểm quyền lúc mở, nối lại và khi quyền bị thu hồi trên stream đang mở. Thêm health và độ trễ hàng đợi. [Frontend SSE](../BotSalesAI_Frontend/apps/web/src/app/ScopeEvents.tsx) · [Chuẩn SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-last-event-id-header)
- [ ] Kiểm chứng restart worker, mất Redis rồi phát lại từ DB, lặp sự kiện, ngắt giữa hai sự kiện, nối theo đúng ID, ID của shop khác, lịch sử hết hạn và thu hồi quyền trên stream đang mở. Kiểm retry giới hạn và tác vụ chưa rõ kết quả.

### BE-08

**Hoàn thiện danh mục và khách hàng** · T020–T021

- [ ] Hoàn thiện biến thể, SKU, giá, danh mục, tra cứu khách và CRUD địa chỉ giao hàng. Lưu nguồn định danh khách theo phạm vi shop và kênh. Tạo snapshot địa chỉ để dùng trong báo giá và giao hàng.
- [ ] Nối ảnh, upload và import theo contract. `uploadFile` và `getFile` dùng một pipeline metadata, kiểm loại/kích thước, cách ly và quyền tải. Ảnh và import catalog dùng policy theo mục đích. R13–R14 đọc trạng thái qua `listJobs` và `getJob` của BE-10. Import có bước xem trước, lỗi từng dòng và commit chống lặp qua cùng quy tắc của catalog.
- [ ] Kiểm chứng phân trang và tìm kiếm trên dữ liệu vượt một trang, tệp sai quyền, dòng nhập trùng và thay đổi địa chỉ sau khi đã lưu snapshot. Chạy R13 → R14 qua `dev:live` gồm xem trước, tra job và commit một lần.

### BE-09

**Xây sổ kho và giữ hàng** · T022–T023

- [ ] Tạo kho, vị trí tồn, lịch sử biến động và projection `listStockSnapshots`. Phân biệt tồn thực, giữ hàng, khả dụng và hàng đang đi. Ràng buộc không âm ở tầng ghi và kiểm theo một nguồn dữ liệu. Kiểm sổ trên fixture PostgreSQL. `createInventoryAdjustment` mở ở BE-12 cùng phần ghi đối ứng, dùng lại cổng ghi của Inventory.
- [ ] Xây tạo, giải phóng, tiêu thụ giữ hàng trong transaction theo SKU và kho. Cung cấp use case hết hạn để BE-10 có thể gọi khi BE-11 nối luồng đơn.
- [ ] Kiểm chứng tranh mua SKU cuối, đặt nhiều SKU rồi rollback khi một SKU thiếu, giải phóng và tiêu thụ đúng một lần. Kiểm đối chiếu tồn hiện tại với sổ biến động.

### BE-11

**Chốt luồng đơn hàng, biểu phí giao R62 và đọc ưu đãi** · T024–T026

- [ ] Nối đơn nháp, báo giá, bằng chứng khách xác nhận và chốt đơn. API tính giá, phí và thời hạn qua cùng pipeline định giá cho nháp, báo giá và kiểm khi chốt. Dùng snapshot `unitPrice`, `discount`, `lineTotal` của `OrderLine` từ đầu, với số giảm bằng 0 khi không có ưu đãi. Gắn báo giá với khách, phiên bản, nội dung và thời hạn hiệu lực.
- [ ] Chốt quy tắc độ chính xác, làm tròn và phân bổ phần dư cho giá, giảm giá, hoàn và giá vốn trước migration liên quan. Thêm [bộ ca phân bổ dùng chung](#ca-đối-chứng-phân-bổ-từng-phần), dùng lại ở BE-12–BE-17.
- [ ] Nối biểu phí R62 theo khu vực, lưu phí dự kiến trong snapshot và tách phí thực tế. Gắn chốt đơn, giữ tồn, audit và outbox vào một transaction. Nối tác vụ hết hạn. Triển khai `listPromotions` của Catalog ngay vì R18 đọc khi người dùng có quyền catalog. Query đọc dữ liệu thật, lọc quyền và hiệu lực theo shop trước cursor. Môi trường P1 của luồng bán dùng shop chưa có combo hoạt động. BE-14 nối điều kiện áp dụng và vòng đời combo trên cùng nguồn dữ liệu.
- [ ] Kiểm chứng R18–R19 qua `dev:live`. Tạo bằng chứng khách tổng hợp gắn với báo giá đã lưu, qua mô hình tin nhắn/định danh dùng lại ở BE-18 trên DB thử. Kiểm thiếu hoặc sai `sourceMessageId`, xác nhận không còn hiệu lực, tranh SKU cuối, retry khi timeout, phí dự kiến và danh sách ưu đãi rỗng hợp lệ. Kiểm `listPromotions` bằng fixture riêng có combo hiệu lực, hết hạn và khác shop. Chỉ bật áp dụng ưu đãi khi BE-14 đạt, kể cả với yêu cầu API có `promotionId` gửi trực tiếp. Chỉ mở xác nhận bằng tin thật khi nguồn tiếp nhận tương ứng đã được kiểm.

### BE-12

**Dựng thu tiền, COD, sổ kép cơ sở và điều chỉnh kho** · T027–T030

- [ ] Thực hiện ghi nhận tiền, bằng chứng thu, COD và số còn phải thu. Phân biệt xác minh ảnh, tiền khách trả hãng và tiền đã được quyết toán về shop.
- [ ] Tạo tài khoản, bút toán cân bằng, nguồn chống trùng và cơ chế khóa kỳ dùng chung với BE-17. Dùng số thập phân chính xác trong DB và chuỗi thập phân trên API. Ghi sửa sai bằng bút toán đảo theo quyền và chính sách kỳ. Triển khai `createInventoryAdjustment` cùng cổng ghi Inventory của BE-09 và đối ứng Finance khi phát sinh giá trị.
- [ ] Kiểm chứng với [ca nghiệp vụ tài chính chuẩn](../botsales-kit/docs/10_TESTING_ACCEPTANCE.md#golden-business-fixtures), gồm thu từng phần, trùng chứng từ, từ chối ghi kỳ khóa, đúng currency và rollback khi ghi đối ứng điều chỉnh kho thất bại. Thử nghiệm dùng dữ liệu tổng hợp.

### BE-13

**Nối chuẩn bị, giao hàng, trả hàng và thông báo** · T031–T036

- [ ] Làm luồng nhận việc, lấy, đóng gói, bàn giao và trạng thái vận đơn với phân quyền và phiên bản. `getWorkItem`, `listWorkItems` và `claimWorkItem` thuộc Operations, phục vụ chuẩn bị ở mốc này và phục vụ BE-20 về sau. Tiêu thụ giữ hàng cùng transaction khi chuyển trạng thái tương ứng.
- [ ] Chốt luồng quyền R41 trước khi code. Preset hiện cho `owner` và `manager` quyền `operations.claim`, còn `warehouse` có quyền tác nghiệp kho nhưng thiếu quyền nhận việc. Với phạm vi giữ quyền hiện tại, kiểm actor có quyền nhận và người được giao mới thực hiện bước kho. Nếu cần quản lý giao lại việc hay nhân viên kho tự nhận, rà API phân công, quyền theo tài nguyên và phụ thuộc với BE-20, cập nhật hợp đồng nếu cần rồi mới bật. [Danh mục quyền](../botsales-kit/contracts/permission-catalog.json) · [Điều kiện nhận việc trên R41](../BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx)
- [ ] Nối nhận trả từng phần, kiểm hàng, nhập lại phần đạt và nghĩa vụ hoàn có chứng từ. Tính phần hoàn từ `lineTotal` đã lưu và giới hạn số lượng, số tiền còn đủ điều kiện, kể cả khi có giảm giá. Tạo thông báo trong ứng dụng và nối adapter thử nghiệm cho Web Push và Telegram theo quyền nhận.
- [ ] Kiểm chứng hai người có quyền tranh một việc, vai trò kho chưa có quyền nhận, người chưa được giao thử lấy hàng, bàn giao timeout, hàng hoàn chưa kiểm, giới hạn hoàn và thông báo trùng. Chạy luồng browser từ chốt đơn đến giao hoặc trả với backend thử nghiệm. Kiểm nhiều lần hoàn theo bộ ca phân bổ.

## P2 Nghiệp vụ mở rộng và hoàn thiện phạm vi

### BE-14

**Nối combo R64 với đơn, báo giá và hàng trả** · R64

- [ ] Thực hiện tạo nháp, duyệt bật, tạm dừng, thời hạn, tính đủ điều kiện theo tồn, giá vốn và biên lợi nhuận. Đưa phiên bản ưu đãi và số giảm vào pipeline định giá BE-11, với kết quả phân bổ theo dòng đơn.
- [ ] Dùng lại `listPromotions` của BE-11 cho Inbox và đơn. Xác nhận báo cáo đọc số giảm đã chốt. Kiểm luồng hoàn BE-13 bằng đơn có combo thật để đối chiếu số tiền theo `lineTotal`, giới hạn và chứng từ.
- [ ] Kiểm chứng combo hết hạn hoặc đổi phiên bản, thiếu tồn, giá vốn chưa có, biên lợi nhuận không đạt, xác nhận báo giá cũ và hoàn từng phần sau giảm.

### BE-15

**Nối kiểm kê R66 và chuyển kho R67** · R66–R67

- [ ] Kiểm kê ghi mốc theo kho và SKU, số đếm, người đếm, người duyệt và phiên bản. Khi có xung đột chỉ yêu cầu đếm lại các SKU bị ảnh hưởng. Dùng giao dịch ghi chênh và đối ứng từ BE-09/BE-12 với nguồn là phiếu kiểm kê đã duyệt.
- [ ] Chuyển kho qua lúc xuất, đang đi, nhận từng phần và kết thúc thiếu có lý do. Dùng lại cổng ghi kho, phân bổ giá vốn theo giá trị đã xuất và gửi đối ứng qua Finance. Bảo toàn tham chiếu phiếu trên hai đầu kho. Chặn lưu trữ kho đích khi còn phiếu đang đi, kể cả kho có tồn bằng 0. Xuất hàng và lưu trữ kho phải dùng cùng khóa nghiệp vụ để phép kiểm vẫn đúng khi có yêu cầu đồng thời.
- [ ] Kiểm chứng duyệt hai lần, chênh phiên bản, nhận vượt số lượng, phiếu khác shop, nhận hai phần, chốt thiếu và HTTP 409 khi lưu trữ kho đích đang có hàng chuyển đến. Sau lỗi 409, kho vẫn hoạt động và phiếu còn nhận được. Đối chiếu tổng số lượng, giá vốn và sổ trước với sau chuyển. Chạy bộ ca phân bổ khi giá vốn không chia hết theo số lượng.

### BE-16

**Nối nhà cung cấp, mua và nhận hàng** · T043–T048

- [ ] Làm hồ sơ nhà cung cấp, quy tắc gợi ý mua và đơn nháp. Dùng `listApprovals`, `getApproval`, `createApproval` và `decideApproval` từ một mô hình Operations ràng buộc intent, phiên bản, phạm vi và thời hạn. Mua quy định đề nghị thuộc loại nào và có được gửi hay không theo phê duyệt. BE-20 đưa thêm loại phê duyệt và hạn mức vào cùng mô hình. Mặc định mua nháp chờ duyệt.
- [ ] Làm gửi với cổng thử nghiệm, đối chiếu khi chưa rõ kết quả và nhận từng phần. Ghi tăng kho, công nợ hoặc bút toán phù hợp cùng lần nhận hàng.
- [ ] Kiểm chứng gợi ý trùng, duyệt sai phiên bản, kết quả gửi chưa rõ, nhận một phần, hàng lỗi và công nợ được truy vết.

### BE-17

**Nối đối soát, báo cáo và hàng đợi R65** · T049–T054, R65

- [ ] Nối sao kê, quyết toán COD, phí, phân bổ, công nợ, khóa và mở lại kỳ vào quy tắc kế toán BE-12. Dùng dữ liệu giá vốn từ nguồn đã ghi và policy cùng chủ sở hữu. Tệp sao kê dùng pipeline BE-08 với kiểm mục đích tài chính. Ghép gợi ý có bước duyệt và báo cáo tổng hợp tại server theo nguồn.
- [ ] Dựng hàng đợi thu và hoàn của R65 từ chứng từ, nghĩa vụ, tiền thực nhận, khoản còn lại và người phụ trách. Giữ phần ghi nhận tại nghiệp vụ sở hữu chứng từ. Dùng liên kết chứng từ và khoản phân bổ để loại đúng phần giảm công nợ do cùng một khoản thu. Giữ từng khoản thu đã ghi độc lập.
- [ ] Kiểm chứng nhập trùng, phân bổ nhiều lần, COD sau phí, chênh lệch chứng từ, không cộng đúp nguồn và khóa kỳ. Dùng bộ ca phân bổ để đối chiếu số còn lại và tổng toàn bộ lần phân bổ với chứng từ gốc. Kiểm ca COD 249.000 VND có hai khoản thu 50.000 và 249.000 VND. R65 phải hiện đã xác minh 299.000 VND ở hàng chờ đối chiếu. Ca đối chứng chỉ thu 249.000 VND phải ở trạng thái đã đối chiếu khi cùng khoản thu cũng đã làm giảm công nợ. Đối chiếu báo cáo với bút toán và kiểm quyền xem chi tiết.

### BE-18

**Nối Inbox, tệp và tri thức** · T037–T039

- [ ] Nối ingestion và adapter Messenger thử nghiệm vào mô hình tin nhắn/định danh dùng chung với BE-11. Chuẩn hóa ID theo page và shop, chống webhook lặp hoặc đến lệch thứ tự, hỗ trợ quyền nhập hội thoại và chặn tác vụ bot cũ sau khi nhân viên nhận tiếp quản.
- [ ] Làm gửi và nhận tin theo trạng thái quan sát, giới hạn media và dùng tệp riêng tư từ BE-08. Dựng nguồn tri thức với quyền duyệt, phiên bản và hiệu lực truy xuất. Nối combo hiệu lực vào R06 và sang đơn nháp.
- [ ] Kiểm chứng callback lặp, quyền khác shop, tệp đoán được ID, bot gửi sau khi tiếp quản và tri thức đã hết hiệu lực.

### BE-19

**Nối AI và công cụ bán hàng có giới hạn** · T040–T042

- [ ] Dựng adapter AI thử nghiệm, ngân sách và giới hạn phiên. Chỉ cho phép công cụ đã khai báo theo năng lực, policy và quyền, gắn dấu phiên bản vào kết quả.
- [ ] Nối nháp và đọc thông tin qua giao diện nghiệp vụ. Công cụ AI gọi cùng luồng xác nhận của BE-11, với điều kiện bổ sung cho quyền ủy nhiệm và cấu hình tự động. Chỉ chốt khi bằng chứng khách, tồn, thanh toán và policy hiện hành cùng đạt. Thêm bộ đánh giá có kết quả đối chứng.
- [ ] Kiểm chứng hết ngân sách, dữ liệu đầu vào dẫn sai hướng, quyền không còn hiệu lực, chuyển cho nhân viên và đánh giá chất lượng có nguồn.

### BE-20

**Nối điều phối, phê duyệt, marketing và ngoại lệ R63** · T055–T060, R63

- [ ] Nối quyền ủy nhiệm, hàng duyệt, nhiệm vụ, người phụ trách, hạn xử lý, bốn vai trò AI và nút dừng. Mở rộng mô hình Operations từ BE-13/BE-16 cho các loại việc, phê duyệt và policy mới. Kiểm bộ ca nhận việc và duyệt đã có sau khi mở rộng.
- [ ] Nối bản tin, marketing có nguồn và báo cáo chi phí. `getDashboard` dùng endpoint và bộ tổng hợp BE-07, thêm dữ liệu từ các module sở hữu. R53 lấy doanh số và tổng giảm từ đơn đã chốt trong kỳ. R63 lọc ngoại lệ, tác vụ và command trước phân trang, đi tới hồ sơ gốc và phân biệt trạng thái chưa rõ với thành công.
- [ ] Kiểm chứng phê duyệt hết hạn, vai trò vượt quyền, nút dừng trước tác động ngoài, bản tin cùng kỳ và ngoại lệ phát sinh từ nghiệp vụ thật trong môi trường thử.

### BE-21

**Hoàn thiện onboarding, quyền riêng tư và kiểm toàn phạm vi** · T061–T066

- [ ] Nối thiết lập shop, consent, opt-out, lưu giữ và yêu cầu privacy trên dữ liệu thử. Báo cáo export dùng lại phạm vi truy vấn và phép tổng hợp BE-17/BE-20, dùng pipeline tệp BE-08 để cấp và thu hồi quyền tải. Nối xác minh nâng cao theo cơ chế phiên BE-04 và policy BE-05. Chỉ kích hoạt thao tác dữ liệu thật khi có chính sách tương ứng ở BE-24.
- [ ] Đối chiếu các route đã bật với API, quyền, trạng thái rỗng, lỗi, offline, timeout, sắp xếp và tương thích phiên bản. Với di trú dữ liệu thật, kiểm mẫu, số lượng, liên kết và phương án phục hồi trước khi vận hành.
- [ ] Kiểm chứng ma trận route và backend bằng contract test, tích hợp PostgreSQL và browser `dev:live` theo phạm vi đã cam kết. Ghi mọi mục chưa đạt với mã BE và phụ thuộc để xử lý trước phát hành.

## P3 Staging và phát hành

### BE-22

**Dựng staging và tích hợp được cấp quyền** · T067–T072

- [ ] Chốt region, ngân sách, người phụ trách, dữ liệu thử, domain và callback. Tách DB, Redis, lưu tệp và thông tin xác thực khỏi production. Dùng HTTPS cùng origin cho frontend và API.
- [ ] Kết nối IdP, Meta/AI, Web Push/Telegram và hãng vận chuyển/nhà cung cấp/nguồn sao kê theo từng đầu vào đã được duyệt. Nhà cung cấp chưa chọn có thể giữ quy trình thủ công theo phạm vi đã xác nhận.
- [ ] Chạy ca tích hợp thật trên staging, kiểm grant, callback, giới hạn nhà cung cấp, thu hồi quyền và quy trình khi tác động đã gửi nhưng chưa nhận kết quả.

### BE-23

**Kiểm bảo mật, tải, phục hồi và CI/CD** · T073–T077

- [ ] Bổ sung CI chạy trên checkout sạch, kiểm lỗ hổng dependency, quyền theo shop, quyền tải tệp và log đã lọc dữ liệu nhạy cảm. Có cảnh báo, đối chiếu command, độ trễ worker và theo dõi nguồn sai lệch kho hoặc tiền.
- [ ] Sau khi có môi trường BE-22, đo theo tải đã thống nhất, thử mất dịch vụ ngoài, restart worker, restore DB và tệp, kiểm migration và diễn tập rollback. Ghi mục tiêu tải và phục hồi theo đầu vào của chủ dự án.
- [ ] Kiểm chứng bản khôi phục bằng truy vấn đối chiếu tồn, tiền và công việc đang chờ. Kiểm thử CI/CD trên artifact đầy đủ và ghi kết quả thực tế cùng điều kiện phát hành.

### BE-24

**Nghiệm thu, phát hành giới hạn và bàn giao** · T078–T084

- [ ] Chạy hồi quy đúng artifact phát hành. Chốt dữ liệu, chính sách quốc gia, tiền tệ, lưu giữ và phạm vi tác động ngoài. Người dùng nghiệm thu luồng bán hàng, kho, tài chính và thiết bị theo phạm vi đã cam kết.
- [ ] Ghi phê duyệt phát hành, người trực, cách giám sát và điều kiện quay lui. Triển khai giới hạn sau khi đủ bằng chứng và được phép. Kiểm luồng trọng yếu ngay sau phát hành.
- [ ] Bàn giao cách chạy, cảnh báo, xử lý sự cố, restore, quản lý thông tin xác thực, chủ sở hữu và các mục còn mở. Tính hoàn tất theo các mục đã kiểm chứng trong phạm vi được duyệt.

## Điều kiện kiểm chứng theo từng loại thay đổi

| Loại | Bằng chứng cần ghi |
|---|---|
| Hợp đồng API | Request/response theo OpenAPI, cả ca lỗi. Từ `BotSalesAI_Frontend/`, chạy `node scripts/generate.mjs --check` để đối chiếu phía client khi chạm hợp đồng. |
| Ghi DB và migration | Chạy trên PostgreSQL thật với DB trống hoặc dữ liệu thử vô danh. Có ca rollback, retry, ràng buộc liên shop và kiểm cạnh tranh nếu có nhiều người ghi. |
| Luồng sử dụng | Luồng liên quan chạy qua `dev:live` hoặc staging. Ghi rõ dữ liệu thử, môi trường và kết quả có thể kiểm lại. |
| Worker và tích hợp ngoài | Kiểm lặp tác vụ, crash và phục hồi. Dùng adapter thử trong local, xác nhận phần provider cụ thể trong staging trước khi kích hoạt. |
| Nghiệm thu phát hành | Ghi artifact, migration, smoke, kết quả restore và phê duyệt thật. Điều kiện chi tiết lấy từ [tiêu chí nghiệm thu](../botsales-kit/docs/10_TESTING_ACCEPTANCE.md) và [kế hoạch vận hành](../botsales-kit/docs/12_OPERATIONS_RELEASE.md). |

Quyết định kiến trúc, nguồn dữ liệu và kiểm quyền lấy từ [kiến trúc](../botsales-kit/docs/02_ARCHITECTURE.md), [bất biến nghiệp vụ](../botsales-kit/docs/05_DOMAIN_AND_INVARIANTS.md) và [phân quyền](../botsales-kit/docs/08_SECURITY_TENANCY_RBAC.md). Các đầu vào về dịch vụ ngoài, môi trường, chính sách nghiệp vụ và phục hồi lấy từ [danh sách đầu vào của chủ dự án](../botsales-kit/execution/owner-inputs.json).

## Kiểm chứng từng thao tác

Trước khi code mỗi operation hoặc tác vụ, ghi mã BE, module sở hữu, use case sẽ gọi, consumer, điều kiện ghi, ca chuẩn và bằng chứng cần có. Khi việc có nhiều operation, kiểm riêng từng operation theo dòng trong ma trận rồi chạy ca tích hợp dùng chung. Với ca được xét là không áp dụng theo hợp đồng, ghi lý do như endpoint công khai ngoài membership hoặc luồng chỉ đọc.

| Nhóm bắt buộc khi áp dụng | Ca phải đi qua | Nơi kiểm |
|---|---|---|
| Mọi giao tiếp trong OpenAPI | Mã phản hồi thành công đúng, schema đầu vào/đầu ra đúng, dữ liệu sửa đổi được xác nhận qua nguồn. Khi có đầu vào bắt buộc, thử thiếu hoặc sai kiểu. Khi có quyền, thử không có phiên, thiếu quyền, tài nguyên sai phạm vi và quyền bị thu hồi đúng lúc. | Kiểm hợp đồng HTTP. Dùng bảng tham số từ OpenAPI, danh mục quyền và fixture hai shop. |
| Danh sách, báo cáo và tra cứu | Kết quả có dữ liệu và rỗng, lookup thiếu ID, quyền tới từng trường, lọc trước cursor, thứ tự ổn định và tổng toàn phạm vi khi contract yêu cầu. Với export, đối chiếu cùng scope của báo cáo. | Tích hợp PostgreSQL với fixture vượt một trang. Browser chỉ kiểm luồng lọc hoặc hiển thị mà API test không thể xác nhận. |
| Thao tác ghi | Quyền đúng và quyền thiếu, điều kiện trạng thái, payload hợp lệ và không hợp lệ, version cũ/thiếu nếu yêu cầu, cùng khóa cùng payload và cùng khóa khác payload nếu có chống lặp. Đối chiếu số bản ghi, event và audit sau khi bị từ chối. | Kiểm HTTP và trạng thái DB thật. Dùng chung fixture tenant, phiên và command của backend. |
| Quy tắc tính tiền, tồn hoặc quyết định nghiệp vụ | Giá trị biên và phản ví dụ từ fixture canonical. Với thao tác phối hợp, thử tranh cùng tài nguyên, rollback khi bước ghi sau thất bại và retry sau commit. Kiểm số lượng, số tiền và nguồn của các bản ghi liên quan. | Unit cho phép tính thuần. PostgreSQL tích hợp cho khóa, ràng buộc và atomicity. Các tầng kiểm các thuộc tính khác nhau của cùng nghiệp vụ. |
| Tác vụ, provider hoặc SSE | Test ở điểm tiếp nhận và xử lý cuối. Lặp, sai thứ tự, crash/restart, hết quyền, không rõ kết quả và đồng bộ lại nếu áp dụng. Test adapter thử nghiệm ghi số lần thực thi và trạng thái tương ứng. | Tích hợp với worker và adapter thử. Staging kiểm phần giao tiếp phụ thuộc provider có grant. |
| Luồng giao diện xuyên module | Chạy tuyến thao tác thực tế có quyền và thiếu quyền, với trạng thái cần hiển thị như mất kết nối, phiên bản cũ hoặc pending. Đối chiếu cả nguồn DB hoặc phản hồi đã ghi. | Browser `dev:live` hoặc staging cho các luồng theo mốc. Dùng test API đã có để xác nhận chi tiết của từng operation. |

Mỗi bất biến có ca đối chứng chính ở module sở hữu. Các bên gọi lại dùng fixture và kỳ vọng chuẩn, bổ sung ca riêng cho phần chúng chịu trách nhiệm như mapping HTTP, quyền khi thực thi worker hoặc UI xử lý trạng thái. Khi hai ca chứng minh cùng hành vi ở cùng lớp kiểm, gom dữ liệu thành các trường hợp có tham số. Cố định thời gian trong fixture khi kiểm phiên, báo giá, hạn mức và kỳ. Với kiểm cạnh tranh, dùng điểm đồng bộ để hai yêu cầu thực sự giao nhau.

Khi đóng việc, ghi mã test hoặc vị trí suite, kết quả, commit, baseline hợp đồng và môi trường. Review toàn bộ diff để đối chiếu handler, chính sách và nguồn dữ liệu đã dùng lại. Các ca bỏ qua hoặc chưa chạy thuộc trạng thái đang mở của chính đầu việc.

### Ca đối chứng phân bổ từng phần

Dùng chung fixture tổng hợp cho BE-11–BE-17. Ví dụ chia tổng 100 đơn vị tiền cho ba phần bằng nhau. Chốt trước cách phần dư được gán vào các phần theo chính sách và thứ tự đã chọn. Cùng đầu vào phải cho cùng kết quả. So sánh theo đơn vị tiền chính xác và currency của nguồn.

| Luồng | Bất biến cần chứng minh |
|---|---|
| Giá và giảm giá theo dòng | Tổng phân bổ giảm bằng mức giảm đã chốt. Số tiền ròng mỗi dòng và toàn đơn khớp snapshot và báo giá. |
| Hoàn qua nhiều lần | Tổng hoàn đã ghi cộng phần còn đủ điều kiện khớp hạn mức của nguồn. Hết lượng hoặc hết hạn mức không ghi thêm. Dùng số đã chốt trên dòng và quy tắc phần dư nhất quán. |
| Nhận chuyển kho từng phần | Giá trị đã nhận, giá trị còn đang đi và phần thiếu đã ghi khớp giá trị xuất. Kiểm từng lần nhận và lời gọi lặp. |
| Phân bổ chứng từ và COD | Số đã phân bổ và phần dư khớp số đủ điều kiện theo currency. Chứng từ và bút toán đối ứng truy vết được, kể cả khi hai yêu cầu cùng phân bổ. |

Ở unit, cố định kết quả chuẩn theo chính sách. Ở PostgreSQL, kiểm rollback và kiểm cộng dồn sau nhiều lần ghi hoặc retry. Ghi cùng mã fixture trong bằng chứng của đơn, kho và tài chính.

## Mốc nghiệm thu

| Mốc | Điều kiện hoàn thành | Bằng chứng tối thiểu |
|---|---|---|
| P0 · BE-01–BE-07 | Baseline BE-01 có CI đúng commit. Kiểm ma trận BE-02 đạt. Từ checkout sạch, migrate và seed PostgreSQL, đăng nhập HTTPS → chọn shop → tạo SKU → mở chi tiết → đọc lại sau restart. Phiên hết hạn, quyền thiếu và scope khác shop cho phản hồi đúng. Mất phản hồi rồi reload vẫn tra được kết quả và DB chỉ có một sản phẩm. Ghi giới hạn realtime trong smoke. | Quyết định baseline, link CI, báo cáo ma trận, commit và hash hợp đồng, lockfile, migration/seed, log HTTP/DB và browser live, kết quả hai shop và số lần ghi. |
| P1 · BE-08–BE-13 | BE-10 sẵn sàng trước import BE-08. Đạt luồng sản phẩm → tồn → báo giá → xác nhận bằng fixture tin nhắn trên PostgreSQL → giao/hoàn → nguồn ghi thu. Dữ liệu khớp giữa đơn, kho, công việc và chứng từ. SSE nối lại đúng ID và phạm vi. Quyền R41 và chính sách phân bổ được kiểm. | Ca SKU cuối, báo giá đổi, thiếu/sai bằng chứng, đối ứng kho, tranh nhận việc theo vai trò, hoàn nhiều phần, COD, restart worker, mất Redis, ngắt/nối SSE và hồi quy P0. |
| P2 · BE-14–BE-21 | Ma trận route, chức năng, operation và quyền đã được kiểm trên backend local theo khả năng tương ứng. Luồng R62–R67 và các nghiệp vụ mua, tài chính, inbox, AI, privacy có ca thành công, từ chối và phục hồi. Tổng giá vốn chuyển kho và phần dư đối soát khớp nguồn. | Báo cáo ma trận, đối chiếu DB theo fixture phân bổ, kiểm tenant/role, kiểm realtime, bằng chứng adapter thử và danh sách khả năng còn giới hạn theo môi trường. |
| P3 · BE-22–BE-24 | Staging kiểm chuỗi tích hợp có grant, nghiệm thu tải và bảo mật theo mục tiêu đã chốt, restore và migration đã diễn tập, người dùng nghiệm thu và quyết định phát hành có bằng chứng. | Artifact và môi trường đúng revision, kết quả CI, báo cáo security/load, đo restore, UAT thiết bị, duyệt phát hành và smoke sau triển khai. |

### Kiểm phụ thuộc trước khi code

- Dùng bảng tiến độ để chọn việc đã đủ đầu vào. BE-02 nhận quyết định BE-01. BE-03 sở hữu seed hai shop và kho mặc định. BE-04 chỉ kiểm phiên và callback. BE-05 mở chọn shop. BE-07 dùng cả dữ liệu đó và cơ chế đối chiếu từ BE-06 để đóng P0.
- Trong P1 đi theo **BE-10 → BE-08 → BE-09 → BE-11 → BE-12 → BE-13**. Nếu dùng baseline tạm cho P0, chuyển sang hợp đồng có R62 trước phần tích hợp R62 ở BE-11. Kiểm hợp đồng đã chọn và báo cáo ma trận lại sau khi chuyển.
- Trước BE-11 chốt định giá và phân bổ. Trước BE-13 chốt vai trò và actor thực hiện bước kho, gồm phụ thuộc của API phân công nếu đưa vào mốc. Chạy lại fixture chung ở BE-14, BE-15 và BE-17 khi các module dùng lại quy tắc.
- BE-23 có thể chuẩn bị lệnh kiểm từ BE-21. Các ca dùng staging cần môi trường BE-22. BE-24 lấy kết quả của cả hai và đối chiếu cùng artifact phát hành.

### Điều kiện còn mở và việc chịu ảnh hưởng

| Điều kiện | Việc chịu ảnh hưởng | Kết quả cần có |
|---|---|---|
| Đối chiếu baseline khi bắt đầu BE-02 | BE-01–BE-02 | Kiểm source với `main@e22bb99d` và bảng SHA-256. Nếu nguồn đã đổi, kiểm lại ma trận và ghi bằng chứng CI của đúng commit trước khi chuyển baseline. |
| PostgreSQL và bộ môi trường đăng nhập local | BE-03–BE-05 | BE-01 đã kiểm PostgreSQL 18.7 và callback HTTPS với fixture. BE-03 kiểm migration, seed và readiness của dự án. BE-04 kiểm callback và phiên của API qua `dev:live`. BE-05 kiểm chọn shop và quyền tenant. |
| Cơ chế tra cứu lệnh khi chưa có `commandId` | BE-06 trước BE-07 và trước tác động ngoài | Chọn cách xác minh theo intent, quyền, thời gian giữ và sau reload. Kiểm thành công sau commit mất phản hồi, quyền bị thu hồi, sai shop hoặc chủ thể và DB chỉ ghi một lần. |
| Lookup lúc tạo đơn và bằng chứng xác nhận | BE-11, BE-18 | R18 gọi `listWarehouses`, `listCustomerAddresses` và `listPromotions` theo quyền. R19 gọi `recordCustomerConfirmation` có `sourceMessageId`. Kiểm fixture tin nhắn ở P1 và dùng lại nguồn của Inbox sau khi nối tiếp nhận. |
| Tồn đầu kỳ và điều chỉnh kho có giá trị | BE-09, BE-12 | BE-09 kiểm sổ và vị trí tồn từ fixture PostgreSQL. BE-12 mở thao tác điều chỉnh cùng đối ứng tài chính và kiểm rollback. BE-15 gọi lại cùng cổng kho và Finance theo nguồn phiếu. |
| Import sản phẩm cần trạng thái công việc nền | BE-10 → BE-08 | R13 đọc `listJobs`, R14 đọc `getJob`. Hoàn thành API và trạng thái job trước khi kiểm luồng import. |
| API hỗ trợ nhận việc và duyệt mua | BE-13, BE-16, BE-20 | R41 gọi thêm `getWorkItem` và `claimWorkItem`. R45 đọc ngân sách, phê duyệt và ủy quyền khi bật tùy chọn tự gửi. Nối phần tối thiểu đúng mốc và kiểm pha mở rộng khi có policy. |
| Quyền tự nhận việc R41 | BE-13 | Xác nhận ai nhận, ai phân công và ai thực hiện. Kiểm quyền chéo shop, quyền của `warehouse` theo quyết định và tranh cùng một việc. |
| Step-up còn có trường password trong OpenAPI | BE-21, BE-22 | Quyết định phương án xác minh lại qua IdP và tương thích phía client. Kiểm quyền nhạy cảm, hết hạn, từ chối sau khi thu hồi và audit trước khi bật luồng live. |
| Tham chiếu `SC2-C07-CONSENT` ở R61 | BE-21 | Hai bộ fixture nhận diện `SC2-G05` cho consent. ID `SC2-C07-CONSENT` được khai báo ở route nhưng chưa có bản ghi ca tương ứng trong hai bộ fixture. Cần bổ sung ca canonical có hạn, replay và xác nhận đúng shop hoặc sửa liên kết theo quyết định có bằng chứng trước khi đóng R61. |
| Làm mới dữ liệu P1 qua nhiều phiên | BE-10, BE-14, BE-15, BE-17 | Kiểm định dạng SSE, `id`/`Last-Event-ID`, event và `resourceType` theo hợp đồng. Kiểm hai phiên cùng shop, nối lại, sai phạm vi và thu hồi quyền. Enum nguồn có `journal.updated` lặp. Ghi một loại trong ma trận và xử lý drift ở thay đổi hợp đồng được phê duyệt. |
| Phân bổ phần dư ở đơn, kho và tài chính | BE-11–BE-17 | Chốt một quy tắc theo chính sách nghiệp vụ và dùng cùng fixture. Kiểm tổng tiền hoặc giá vốn qua nhiều lần ghi, lỗi cạnh tranh và gửi lặp. |
| Quốc gia, currency, kế toán, lưu giữ và hạn mức thật | BE-16, BE-17, BE-21, BE-24 | Đầu vào được xác nhận theo chính sách của shop trước khi mở thao tác tương ứng. Local vẫn kiểm bằng fixture tổng hợp. |
| OIDC, Meta, AI, Push, Telegram, vận chuyển và hạ tầng | BE-22–BE-24 | Chốt grant, vùng, ngân sách, tài khoản thử và quyền tác động. Kích hoạt theo từng khả năng đã kiểm độc lập. |
| Tải, thời gian khôi phục và mức mất dữ liệu chấp nhận | BE-23–BE-24 | Mục tiêu do người phụ trách thống nhất. Báo cáo tải, thời gian restore và phương án quay lui được đo trên môi trường đã ghi rõ. |

### Điều kiện phát hành theo chuẩn Enterprise-Grade

- Mọi thay đổi code đi qua review và CI áp dụng, với liên kết từ BE và hợp đồng đến bài kiểm. Ca test quan trọng ghi command, commit, kết quả và phạm vi. Chỉ số như tỷ lệ dòng code đã chạy dùng để phát hiện vùng thiếu test. Hiệu lực nghiệm thu dựa trên hành vi, bất biến và ca lỗi theo rủi ro.
- Dữ liệu qua migration được đối chiếu trước và sau, gồm kho, chứng từ, command và quan hệ theo shop. Cách phục hồi được diễn tập với một bản thử độc lập.
- Quyền người, quyền bot, bí mật, audit, giới hạn chi phí và khả năng dừng được kiểm trên môi trường đích. Cảnh báo có người xử lý và hướng dẫn đối chiếu hoặc quay lui.
- Mỗi khả năng live có đầu vào, grant, bằng chứng UAT và phê duyệt tương ứng. Ghi các giới hạn còn mở cùng phạm vi tính năng bị ảnh hưởng. [Các mốc phát hành](../botsales-kit/docs/12_OPERATIONS_RELEASE.md#release-gates)

## Kiểm chứng theo module

| Module màn hình | Việc triển khai | Ca tích hợp cần giữ trong CI |
|---|---|---|
| `workspace` | BE-04–BE-06, BE-10, BE-21 | Login/CSRF/logout, đổi shop, thu hồi membership, audit và lọc dữ liệu cũ khi đổi phạm vi. Mở route consent với mã hợp lệ, hết hạn, dùng lặp và sai mục đích. |
| `dashboard` | BE-07, BE-20 | Tổng quan tối thiểu ở P0. Kiểm số liệu có nguồn và đôi lúc chưa sẵn sàng. Thao tác dừng áp dụng quyền hiện hành và ảnh hưởng tới worker. |
| `inbox` | BE-14, BE-18–BE-19 | Webhook trùng và lệch thứ tự, tìm kiếm phân trang, tiếp quản, gửi khi mất phản hồi, quyền media và chọn combo từ hội thoại. |
| `customers` | BE-08, BE-21 | Hồ sơ cùng tên khác page không tự nhập một, địa chỉ chỉ thuộc đúng khách/shop, sửa địa chỉ hiện tại giữ snapshot đơn cũ và opt-out ảnh hưởng việc marketing chờ. |
| `catalog` | BE-07–BE-08, BE-14 | Tạo từ UI live và đọc detail sau restart. Kiểm trùng SKU, ghi phiên bản cũ, import có lỗi từng dòng, file sai quyền, giá và combo hết hiệu lực. |
| `inventory` | BE-09, BE-11, BE-15 | Hai lần giữ tranh SKU cuối, tổng giữ và tồn không âm, chênh kiểm kê sau khi mốc đổi, chuyển hai đầu đúng lượng và giá vốn sau nhận từng phần. |
| `orders` | BE-11–BE-14 | Báo giá mất hiệu lực khi dòng hoặc chính sách đổi, chốt cùng giữ tồn, thời điểm hủy theo bàn giao, tích lũy lượng trả và tiền hoàn theo dòng. |
| `finance` | BE-12, BE-15–BE-17 | Bút toán cân bằng, ghi trùng từ cùng nguồn, mở sổ, kỳ đóng đồng thời, đối soát có phần dư và R65 chỉ báo theo chứng từ có thể truy vết. |
| `knowledge` | BE-18–BE-19 | Phiên bản được duyệt mới vào truy xuất, tài liệu đã thu hồi biến mất khỏi kết quả và phản hồi giữ nguồn. Tệp có nội dung không tin cậy được xử lý như dữ liệu. |
| `bot` | BE-19–BE-20 | Công cụ từ chối quyền sai, policy hết hiệu lực, quá hạn mức, chạy đánh giá với mẫu cố định, publish/restore có dấu vết và dừng không gửi mới. |
| `integrations` | BE-18–BE-19, BE-22 | Kết nối mà thiếu grant chưa báo sẵn sàng. Kiểm callback theo tài khoản, thu hồi, token rotate, timeout và giới hạn nhà cung cấp trong staging. |
| `reports` | BE-17, BE-20–BE-21 | Đối chiếu tổng server với sổ nguồn qua nhiều trang, mốc ngày theo timezone shop, doanh số combo sau giảm, export theo quyền và ngày hiệu lực. |
| `operations` | BE-06, BE-10, BE-13, BE-16, BE-20 | Nhận việc đúng một lần, duyệt ràng buộc phiên bản, bản tin đúng kỳ. R63 lọc trước cursor, có đường phục hồi lệnh và dấu vết nguồn. |
| `notifications` | BE-13, BE-22 | Quyền thiết bị, ghép Telegram một lần, hủy thiết bị, chống gửi trùng, phân biệt đã nhận từ hệ thống với đã xem hoặc xác nhận. |
| `fulfillment` | BE-11, BE-13 | Biểu phí R62 lưu đúng phiên bản, không phát sinh phí thực từ bản ước tính. Kiểm luồng chuẩn bị–bàn giao, thiếu hoặc hỏng một phần, sự kiện vận đơn đến sai thứ tự. |
| `procurement` | BE-16, BE-20, BE-22 | Đề nghị trùng, thay phê duyệt hoặc ngân sách, gửi chưa rõ kết quả, nhận từng phần và đối chiếu tồn với công nợ. |

### Điểm vào ngoài danh mục màn hình

| Điểm vào | Mốc | Kiểm chứng tối thiểu |
|---|---|---|
| OIDC redirect và callback | BE-04, BE-22 | Vòng HTTPS, xác minh giao dịch một lần, phiên và redirect áp dụng đúng. Kiểm IdP thử ở local, IdP được cấp quyền ở staging. |
| Webhook Meta, hãng vận chuyển, Telegram và quan sát từ cổng ngoài | BE-13, BE-16, BE-18, BE-22 | Tiếp nhận theo giao diện chính thức của nhà cung cấp đã chọn. Kiểm xác minh nguồn, ánh xạ shop, lặp/sai thứ tự và tách chuyển trạng thái khỏi nhận dữ liệu. |
| Worker cho reservation, lệnh gửi, file scan, notification, báo cáo và chính sách định kỳ | BE-10 và việc sở hữu từng nghiệp vụ | Mỗi tác vụ định danh ổn định, có lease, deadline, giới hạn retry, audit và kiểm quyền trước lúc ghi hoặc gọi ngoài. Khởi động lại và phát lại an toàn. |
| Migration, bootstrap, liveness, readiness, kiểm hiệu năng và phục hồi | BE-02–BE-03, BE-22–BE-24 | Vận hành trên môi trường đã ghi, kiểm quyền theo vai trò, migration có phương án phục hồi, artifact và cấu hình có thể truy vết. |

## Nhật ký tiến độ và bằng chứng

Thêm một dòng khi chuyển trạng thái hoặc có kết quả kiểm mới. Ghi lệnh, môi trường và kết quả hoặc đường dẫn báo cáo đủ để kiểm lại. Với việc bị chặn, ghi đầu vào còn thiếu và mã việc độc lập tiếp theo. Khi một bước liên quan ID `Txxx`, ghi ID đó cùng bằng chứng để đối chiếu sau.

| Ngày | Việc và người phụ trách | Trạng thái | Commit hoặc PR | Kiểm thử và bằng chứng | Điều kiện gỡ chặn hoặc việc kế tiếp |
|---|---|---|---|---|---|
| 20/11/2026 | — | Lập kế hoạch | Baseline `329338b5` | Đối chiếu cấu trúc repo, contract và kế hoạch toàn sản phẩm | BE-01 |
| 20/11/2026 | — | Rà soát kế hoạch v1 | Baseline `329338b5` | Đối chiếu 9 SHA-256, 16 module, 67 màn, 64 tính năng, 123 ca hiện có, 259 thao tác, 56 quyền và 32 loại sự kiện. Kiểm thứ tự phụ thuộc của 24 việc. Ghi hai chênh lệch nguồn vào mục điều kiện còn mở. | BE-01 |
| 20/11/2026 | — | Tối ưu kế hoạch v1.1 | Baseline `329338b5` | Chốt trách nhiệm dùng lại và ca kiểm theo thao tác. Đưa BE-10 lên trước import, đọc ưu đãi về luồng đơn và điều chỉnh kho về mốc có đối ứng. Giữ các mã BE và cùng danh mục hợp đồng. | BE-01 |
| 21/11/2026 | — | Cập nhật kế hoạch v1.2 | Ma trận thiết kế `329338b5`, PR #27 | Đưa CI frontend vào BE-01, kiểm ma trận tự động vào BE-02. Rà lại phụ thuộc TLS và OIDC, seed, khôi phục command, SSE, quyền R41 và phân bổ từng phần. | Xử lý CI và chốt baseline ở BE-01 |
| 21/11/2026 | BE-01 | Đang thực hiện | `main@b9a54c31` | [Frontend lượt 1](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44856461106/attempts/1) · [Frontend lượt 2](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44856461106/attempts/2) · [Hygiene đạt](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44856461077/attempts/1) | Hai lượt axe Firefox hết thời gian. Theo dõi PR #28. |
| 21/11/2026 | BE-01 | Đang thực hiện | `main@e22bb99d` | [CI frontend main](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44859360178/attempts/1) · [CI hygiene main](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44859360187/attempts/1) | Hoàn tất môi trường thử, phạm vi workspace và ca P0 |
| 21/11/2026 | BE-01 | Đã kiểm chứng | `main@e22bb99d` | 5/5 mục, kiểm preflight Nest/Prisma/PostgreSQL 18.7 và Firefox HTTPS/OIDC, chốt 10 ca P0. [Bằng chứng](#bằng-chứng-kiểm-môi-trường-be-01) | BE-02 dựng workspace, kiểm checkout sạch và ma trận. |
| 21/11/2026 | BE-02 | Đang thực hiện | Snapshot kiểm cục bộ `68313db3` | Checkout sạch, lockfile ổn định, 17/17 ca, HTTP 200/400 và fail đúng khi ma trận thiếu operation. [Kết quả](#kết-quả-kiểm-be-02) | Xác nhận CI backend trên GitHub trước khi đóng BE-02. |

## Ma trận truy vết baseline

**Phạm vi thiết kế.** Bảng này gắn mã BE vào đúng danh mục của baseline. Một operation có một việc triển khai chính và có thể phục vụ nhiều màn. Mã việc chính trên một màn là nơi nghiệm thu nghiệp vụ của màn đó. Các tác vụ chưa có API công khai như callback provider, runtime worker, CI, backup và deploy được theo dõi trong các việc BE tương ứng.

- [Dấu vân tay nguồn](#dấu-vân-tay-nguồn) · [Toàn bộ màn hình](#toàn-bộ-màn-hình) · [Toàn bộ tính năng](#toàn-bộ-tính-năng)
- [Toàn bộ thao tác API](#toàn-bộ-thao-tác-api) · [Danh mục quyền](#danh-mục-quyền) · [Danh mục sự kiện](#danh-mục-sự-kiện)

### Dấu vân tay nguồn

Ghim baseline tại commit `e22bb99d6839df9943308556c94499c04e7b7f85`. Khi nguồn đổi, đối chiếu phần thêm, xóa và thay đổi, cập nhật chủ việc, test và dấu vân tay trong cùng PR. Giá trị hash tính từ nội dung tệp theo byte. Có thể đối chiếu bằng `Get-FileHash -Algorithm SHA256` từ root repository.

| Nguồn | Số mục | SHA-256 |
|---|---:|---|
| [openapi.json](../botsales-kit/contracts/openapi.json) | 259 thao tác / 376 schema | `1d79ffea34cc263d582d1919208ae634d293c86ca77ee591e32ef549a19b800e` |
| [operation-index.json](../botsales-kit/contracts/operation-index.json) | 259 thao tác | `369c3a08ec3ee76d55c594bc454c1636c08202f2c2a6fad81cf96755c9086909` |
| [route-manifest.json](../botsales-kit/contracts/route-manifest.json) | 67 màn / 16 module | `600f9b92a74aa2c541cd6a1ac97fcfe7bd43246b7803d8444a80360ba1aedfd1` |
| [feature-catalog.json](../botsales-kit/contracts/feature-catalog.json) | 64 tính năng | `0b3f6c8a1fa8739d7ecd53937d40bfe54559c4d8e274e27bb7c4542171b654b0` |
| [permission-catalog.json](../botsales-kit/contracts/permission-catalog.json) | 56 quyền / 7 preset / 4 vai trò AI | `144ff0315d2510e2a0c55df1d3eaa82730bf6b7b678461d548229939d2e29acd` |
| [events.schema.json](../botsales-kit/contracts/events.schema.json) | 32 loại sự kiện phân biệt | `7b67ae36fabe0b22978fbb47e897b635ca4b7518b7599eee486d3a1af23f18fc` |
| [migration-map.json](../botsales-kit/contracts/migration-map.json) | Các mốc tương thích | `e18ebbfa05960ed5cc1318f8f22dead949c577bfec6867abf2a61e7d2f9cc303` |
| [core-acceptance-scenarios.json](../botsales-kit/fixtures/core-acceptance-scenarios.json) | 55 ca màn hình | `b3abc6055884194d8b9e5a0912c3d40420ab6f2e00d7f3d69c03a5d5004be5b8` |
| [acceptance-scenarios.json](../botsales-kit/fixtures/acceptance-scenarios.json) | 68 ca theo tính năng | `13d05c85bd9dafbb3d297a698e9b0d7529c9c9b8805815d5a3beae8af5458511` |

### Toàn bộ màn hình

Các cột đọc, ghi và ca chuẩn lấy từ route manifest. Cột thêm từ source ghi các phụ thuộc phát hiện trong luồng đơn hàng, kho và mua hàng. Khi nghiệm thu từng màn, đối chiếu thêm request thực tế do shell, form, component dùng chung hoặc capability tùy quyền sinh ra. Bộ ca gốc nằm trong [scenario màn hình](../botsales-kit/fixtures/core-acceptance-scenarios.json) và [scenario tính năng](../botsales-kit/fixtures/acceptance-scenarios.json).

| Màn | Module | Việc chính | Operation đọc | Operation ghi | Thêm từ source | Ca chuẩn |
|---|---|---|---|---|---|---|
| R01 Đăng nhập | `workspace` | [BE-04](#be-04) | `getCsrfToken` | `beginLogin` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R02 Chọn cửa hàng | `workspace` | [BE-05](#be-05) | `listShops`, `getSession` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R03 Thiết lập cửa hàng | `workspace` | [BE-21](#be-21) | `getSession` | `createShop` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R04 Tổng quan | `dashboard` | [BE-07](#be-07) | `getDashboard`, `getShop` | `pauseBot` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-053` |
| R05 Hộp thư | `inbox` | [BE-18](#be-18) | `listConversations`, `getInboxMetadata` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-033`, `SC-034`, `SC-035`, `SC-036`, `SC-037` |
| R06 Chi tiết hội thoại | `inbox` | [BE-18](#be-18) | `getConversation`, `listMessages`, `getCommand`, `getInboxMetadata`, `getFile`, `listPromotions` | `sendMessage`, `addInternalNote`, `takeoverConversation`, `releaseConversation`, `assignConversation`, `resolveConversation`, `createFeedback`, `uploadFile` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-033`, `SC-034`, `SC-035`, `SC-036`, `SC-037` |
| R07 Khách hàng | `customers` | [BE-08](#be-08) | `listCustomers` | `createCustomer` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-038` |
| R08 Hồ sơ khách | `customers` | [BE-08](#be-08) | `getCustomer`, `listCustomerAddresses`, `getCustomerAddress` | `updateCustomer`, `createCustomerAddress`, `updateCustomerAddress`, `archiveCustomerAddress` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-038`, `SC2-C05-ADDRESS` |
| R09 Sản phẩm | `catalog` | [BE-07](#be-07) | `listProducts`, `listCategories` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R10 Thêm sản phẩm | `catalog` | [BE-07](#be-07) | `listCategories` | `createProduct`, `uploadFile` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R11 Chi tiết sản phẩm | `catalog` | [BE-07](#be-07) | `getProduct`, `listCategories`, `getFile` | `updateProduct`, `archiveProduct`, `uploadFile` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R12 Danh mục hàng | `catalog` | [BE-08](#be-08) | `listCategories`, `getCategory` | `createCategory`, `updateCategory`, `archiveCategory` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R13 Nhập dữ liệu | `catalog` | [BE-08](#be-08) | `listJobs`, `getFile` | `uploadFile`, `createProductImport` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R14 Kết quả nhập dữ liệu | `catalog` | [BE-08](#be-08) | `getJob` | `commitProductImport` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-012`, `SC-013`, `SC-014`, `SC-015`, `SC-016`, `SC-017`, `SC-018` |
| R15 Tồn kho | `inventory` | [BE-09](#be-09) | `listStockSnapshots`, `getShop` | `createInventoryAdjustment` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-019`, `SC-020`, `SC-021` |
| R16 Lịch sử kho | `inventory` | [BE-09](#be-09) | `listStockMovements` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-019`, `SC-020`, `SC-021` |
| R17 Đơn hàng | `orders` | [BE-11](#be-11) | `listOrders` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-022`, `SC-023`, `SC-024`, `SC-025`, `SC-026`, `SC-027` |
| R18 Tạo đơn nháp | `orders` | [BE-11](#be-11) | `listCustomers`, `listProducts`, `getShop`, `listPromotions` | `createOrder` | `listWarehouses`, `listCustomerAddresses` | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-022`, `SC-023`, `SC-024`, `SC-025`, `SC-026`, `SC-027` |
| R19 Chi tiết đơn hàng | `orders` | [BE-11](#be-11) | `getOrder`, `getCommand` | `updateOrderDraft`, `quoteOrder`, `confirmOrder`, `handoverShipment`, `cancelOrder`, `createReturnCase`, `payOrder`, `refundOrder` | `recordCustomerConfirmation`, `listPromotions` | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-022`, `SC-023`, `SC-024`, `SC-025`, `SC-026`, `SC-027` |
| R20 Thu/chi tổng quan | `finance` | [BE-17](#be-17) | `getCashflow` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-028`, `SC-029`, `SC-030`, `SC-031`, `SC-032` |
| R21 Sổ thu/chi | `finance` | [BE-12](#be-12) | `listFinanceEntries`, `getFinanceEntry`, `getCommand` | `createFinanceEntry`, `updateFinanceEntry`, `postFinanceEntry`, `reverseFinanceEntry` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-028`, `SC-029`, `SC-030`, `SC-031`, `SC-032` |
| R22 Lợi nhuận quản trị | `finance` | [BE-17](#be-17) | `getProfitLoss` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-028`, `SC-029`, `SC-030`, `SC-031`, `SC-032` |
| R23 Nguồn kiến thức | `knowledge` | [BE-18](#be-18) | `listKnowledge`, `getFile` | `createKnowledge`, `uploadFile` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-039`, `SC-040`, `SC-041`, `SC-042` |
| R24 Chi tiết kiến thức | `knowledge` | [BE-18](#be-18) | `getKnowledge`, `listKnowledgeRevisions`, `getKnowledgeRevision` | `updateKnowledge`, `createKnowledgeRevision`, `submitKnowledgeReview`, `publishKnowledge`, `retireKnowledge`, `restoreKnowledgeRevision` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-039`, `SC-040`, `SC-041`, `SC-042` |
| R25 Đánh giá và phản hồi | `knowledge` | [BE-18](#be-18) | `listFeedback` | `reviewFeedback` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-039`, `SC-040`, `SC-041`, `SC-042` |
| R26 Cấu hình bot | `bot` | [BE-19](#be-19) | `getBotConfig`, `listAIConnections`, `listKnowledge`, `listBotRevisions`, `getBotRevision` | `updateBotDraft`, `publishBotConfig`, `pauseBot`, `restoreBotRevision` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-043`, `SC-044`, `SC-045`, `SC-046` |
| R27 Thử bot an toàn | `bot` | [BE-19](#be-19) | `getBotConfig` | `runPlayground` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-043`, `SC-044`, `SC-045`, `SC-046` |
| R28 Kiểm thử chất lượng AI | `bot` | [BE-19](#be-19) | `listEvaluations`, `getEvaluation`, `getJob` | `createEvaluation` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-043`, `SC-044`, `SC-045`, `SC-046` |
| R29 Kết nối Facebook | `integrations` | [BE-18](#be-18) | `listChannels`, `getChannel`, `getJob` | `beginChannelConnect`, `reconnectChannel`, `disconnectChannel`, `checkChannelHealth` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-047`, `SC-048`, `SC-049`, `SC-050` |
| R30 Nhà cung cấp AI | `integrations` | [BE-19](#be-19) | `listAIConnections`, `getAIConnection`, `getProviderCatalog`, `getJob` | `createAIConnection`, `updateAIConnection`, `testAIConnection`, `deleteAIConnection` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-047`, `SC-048`, `SC-049`, `SC-050` |
| R31 Báo cáo và xuất dữ liệu | `reports` | [BE-17](#be-17) | `getReportSummary`, `listJobs` | `createExport` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-006`, `SC-007`, `SC-008`, `SC-010`, `SC-011`, `SC-051`, `SC-052` |
| R32 Nhân sự và quyền | `workspace` | [BE-05](#be-05) | `listMembers`, `getMember` | `inviteMember`, `updateMemberRoles`, `revokeMembership` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R33 Thiết lập cửa hàng | `workspace` | [BE-21](#be-21) | `getShop` | `updateShop` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R34 Nhật ký kiểm toán | `workspace` | [BE-06](#be-06) | `listAuditEvents` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R35 Quyền riêng tư và lưu trữ | `workspace` | [BE-21](#be-21) | `getPrivacyPolicy`, `listPrivacyRequests`, `getCommand` | `updatePrivacyPolicy`, `createPrivacyRequest`, `stepUp`, `approvePrivacyRequest` | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R36 Theo dõi công việc nền | `workspace` | [BE-10](#be-10) | `getJob` | — | — | `SC-001`, `SC-002`, `SC-003`, `SC-004`, `SC-005`, `SC-006`, `SC-007`, `SC-008`, `SC-009`, `SC-010`, `SC-011`, `SC-054`, `SC-055` |
| R37 Điều hành và công việc | `operations` | [BE-20](#be-20) | `getOperationsSummary`, `listWorkItems` | `claimWorkItem`, `updateWorkItem` | — | `SC2-F02`, `SC2-F03`, `SC2-F07` |
| R38 Hàng chờ phê duyệt | `operations` | [BE-20](#be-20) | `listApprovals`, `getApproval`, `listPurchaseDelegations`, `listPurchaseDelegationReservations` | `decideApproval`, `createPurchaseDelegation`, `updatePurchaseDelegation` | — | `SC2-F04`, `SC2-F05`, `SC2-D06` |
| R39 Trung tâm thông báo | `notifications` | [BE-13](#be-13) | `listNotifications`, `getNotification` | `acknowledgeNotification` | — | `SC2-A02`, `SC2-A03`, `SC2-A04`, `SC2-A07` |
| R40 Thiết bị, kênh nhận và lịch trực | `notifications` | [BE-13](#be-13) | `listDevices`, `getNotificationPolicy` | `createDevice`, `revokeDevice`, `testDevice`, `beginTelegramPairing`, `updateNotificationPolicy` | — | `SC2-A01`, `SC2-A05`, `SC2-A06`, `SC2-A08` |
| R41 Chuẩn bị và lấy hàng | `fulfillment` | [BE-13](#be-13) | `listPrepJobs`, `getPrepJob` | `pickPrepLine`, `packPrepJob` | `getWorkItem`, `claimWorkItem` | `SC2-C01`, `SC2-C02`, `SC2-C03` |
| R42 Vận đơn và giao hàng | `fulfillment` | [BE-13](#be-13) | `listShipments`, `getShipment` | `createShipment`, `handoverShipment`, `recordShipmentEvent` | — | `SC2-C04`, `SC2-C05`, `SC2-C06` |
| R43 Đổi trả và kiểm hàng hoàn | `orders` | [BE-13](#be-13) | `listReturnCases`, `getReturnCase` | `createReturnCase`, `inspectReturn` | — | `SC2-C07`, `SC2-C08` |
| R44 Nhà cung cấp hàng hóa | `procurement` | [BE-16](#be-16) | `listSuppliers`, `getSupplier`, `listSupplierOffers` | `createSupplier`, `updateSupplier`, `setSupplierStatus`, `createSupplierOffer` | — | `SC2-D02` |
| R45 Đề nghị nhập và quy tắc | `procurement` | [BE-16](#be-16) | `listPurchaseSuggestions`, `listReorderRules` | `evaluateReorder`, `createReorderRule`, `updateReorderRule`, `createPurchaseOrder` | `listBudgetPolicies`, `listApprovals`, `listPurchaseDelegations` | `SC2-D03`, `SC2-D04`, `SC2-D07`, `SC2-D06` |
| R46 Đơn mua hàng | `procurement` | [BE-16](#be-16) | `listPurchaseOrders`, `getPurchaseOrder` | `createPurchaseOrder`, `requestPurchaseApproval`, `sendPurchaseOrder`, `confirmPurchaseOrder` | — | `SC2-D05`, `SC2-D06` |
| R47 Nhận hàng và đối chiếu | `procurement` | [BE-16](#be-16) | `listGoodsReceipts`, `getGoodsReceipt` | `createGoodsReceipt`, `postGoodsReceipt` | — | `SC2-D01`, `SC2-D08` |
| R48 Chứng từ và sổ kép | `finance` | [BE-12](#be-12) | `listJournals`, `getJournal` | `createJournal`, `postJournal`, `reverseJournal` | — | `SC2-E01`, `SC2-E02`, `SC2-E03` |
| R49 Đối soát ngân hàng và COD | `finance` | [BE-17](#be-17) | `listReconciliationCases`, `listBankTransactions`, `listCODSettlements`, `listStatementFormats` | `importBankStatement`, `importCODStatement`, `matchSettlement`, `matchCODSettlement`, `previewStatementImport` | — | `SC2-E04`, `SC2-E05` |
| R50 Công nợ và khóa kỳ | `finance` | [BE-17](#be-17) | `listDebtItems`, `listAccountingPeriods` | `closeAccountingPeriod`, `reopenAccountingPeriod`, `createAccountingPeriod` | — | `SC2-E06`, `SC2-E07` |
| R51 Bốn vai trò AI và quyền | `bot` | [BE-20](#be-20) | `listAgentRoles`, `listBudgetPolicies` | `updateAgentRole`, `controlAutomation` | — | `SC2-F01`, `SC2-H02`, `SC2-H03` |
| R52 Bản tin và sức khỏe hệ thống | `operations` | [BE-20](#be-20) | `listDigests`, `getOperationsSummary` | `controlAutomation` | — | `SC2-F06`, `SC2-F07`, `SC2-F08`, `SC2-H01`, `SC2-H04`, `SC2-H08` |
| R53 Thông tin hỗ trợ marketing | `reports` | [BE-20](#be-20) | `getMarketingSummary` | — | — | `SC2-G07`, `SC2-G08` |
| R54 Yêu cầu sau bán | `customers` | [BE-08](#be-08) | `listServiceCases`, `getServiceCase` | `createServiceCase`, `setServiceCaseStatus` | — | `SC2-B06`, `SC2-G04` |
| R55 Quản trị kho | `inventory` | [BE-09](#be-09) | `listWarehouses`, `getWarehouse` | `createWarehouse`, `updateWarehouse`, `archiveWarehouse` | — | `SC2-D01`, `SC2-C05-WAREHOUSE` |
| R56 Tài khoản kế toán | `finance` | [BE-12](#be-12) | `listAccounts`, `getAccount` | `createAccount`, `updateAccount`, `archiveAccount` | — | `SC2-E01`, `SC2-C05-ACCOUNT` |
| R57 Mở sổ kế toán | `finance` | [BE-12](#be-12) | `listOpeningBalances`, `getOpeningBalance`, `listAccounts`, `listWarehouses`, `listProducts` | `createOpeningBalance`, `updateOpeningBalance`, `postOpeningBalance` | — | `SC2-E01`, `SC2-C06-FINANCE` |
| R58 Sổ cái | `finance` | [BE-12](#be-12) | `getLedger`, `getJournal`, `listAccounts` | — | — | `SC2-E01`, `SC2-C06-FINANCE` |
| R59 Cân đối phát sinh | `finance` | [BE-17](#be-17) | `getTrialBalance`, `getLedger` | — | — | `SC2-E01`, `SC2-C06-FINANCE` |
| R60 Cân đối quản trị | `finance` | [BE-17](#be-17) | `getBalanceSheet`, `getLedger` | — | — | `SC2-E01`, `SC2-C06-FINANCE` |
| R61 Xác nhận quyền marketing | `workspace` | [BE-21](#be-21) | — | `exchangeConsentChallenge`, `confirmConsentChallenge` | — | `SC2-G05`, `SC2-C07-CONSENT` |
| R62 Cấu hình giao hàng | `fulfillment` | [BE-11](#be-11) | `getShippingPolicy` | `updateShippingPolicy` | — | `SC2-C04` |
| R63 Ngoại lệ và tác vụ nền | `operations` | [BE-20](#be-20) | `listWorkItems`, `listJobs`, `getJob`, `listCommands`, `getCommand` | `claimWorkItem` | — | `SC2-F02`, `SC2-F03`, `SC2-H01`, `SC2-H04` |
| R64 Ưu đãi và combo | `catalog` | [BE-14](#be-14) | `listPromotions`, `listProducts` | `createPromotion`, `updatePromotion`, `decidePromotion` | — | `SC2-B05`, `SC2-G03` |
| R65 Xác minh thu tiền và hoàn tiền | `finance` | [BE-17](#be-17) | `listPaymentReviews` | — | — | `SC2-E04`, `SC2-E05`, `SC2-C07` |
| R66 Phiên kiểm kê kho | `inventory` | [BE-15](#be-15) | `listStocktakes`, `listWarehouses`, `listStockSnapshots` | `createStocktake`, `updateStocktake`, `postStocktake` | — | `SC2-D01` |
| R67 Phiếu chuyển kho | `inventory` | [BE-15](#be-15) | `listStockTransfers`, `listWarehouses`, `listStockSnapshots` | `createStockTransfer`, `updateStockTransfer` | — | `SC2-D01` |

### Toàn bộ tính năng

Danh mục giữ mã, màn hình và ca chuẩn của kit. Cột điều kiện đạt tóm theo tiêu chí của feature catalog. Ca sản phẩm đi qua backend thật và kiểm thêm các phụ thuộc như worker, thiết bị hoặc grant ở mốc tương ứng.

| Tính năng | Việc chính | Màn liên quan | Ca chuẩn | Điều kiện đạt |
|---|---|---|---|---|
| A01 Đăng ký thiết bị nhận thông báo | [BE-13](#be-13) | R40 | `SC2-A01` | Từ chối quyền không ghi connected. Thiết bị đã thu hồi không nhận lại. Không yêu cầu key trong trình duyệt. |
| A02 Báo đơn đủ điều kiện chuẩn bị | [BE-13](#be-13) | R39 | `SC2-A02` | Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị. Event trùng chỉ một việc. |
| A03 Mở đơn an toàn từ thông báo | [BE-13](#be-13) | R39 | `SC2-A03` | Người không thuộc shop nhận 403/404. URL cũ không vượt quyền hiện hành. |
| A04 Xác nhận nhận chuẩn bị | [BE-13](#be-13) | R39 | `SC2-A04` | Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận. Delivery receipt không đồng nghĩa nhận việc. |
| A05 Nhắc hạn và dự phòng | [BE-13](#be-13) | R40 | `SC2-A05` | Nhận việc/hủy đơn dừng nhắc. Worker restart không phát trùng. Không có người trực thì vào hàng ngoại lệ. |
| A06 Loại thông báo và lịch trực | [BE-13](#be-13) | R40 | `SC2-A06` | Không tự bỏ qua giờ yên lặng. Bộ nhớ cấu hình mẫu không thành chính sách live. |
| A07 Theo dõi gửi/mở/nhận việc | [BE-13](#be-13) | R39 | `SC2-A07` | Timeout không gắn failed. Không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả. |
| A08 Chống trùng và bảo vệ thông báo | [BE-13](#be-13) | R40 | `SC2-A08` | Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn. Tắt SMS/voice mặc định. |
| B01 Kịch bản tư vấn theo ngành hàng | [BE-18](#be-18) | R06 | `SC2-B01` | Thiếu chính sách giao/đổi trả thì bot hỏi hoặc handoff, không bịa. |
| B02 Giá/tồn từ dữ liệu nghiệp vụ | [BE-19](#be-19) | R06 | `SC2-B02` | Tồn/giá thay sau retrieval được kiểm lại tại confirm. Không dùng vector cache làm giá giao dịch. |
| B03 Thu thập và xác nhận đặt hàng | [BE-19](#be-19) | R06 | `SC2-B03` | Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt. Sửa hàng/giá cần xác nhận mới. |
| B04 Tự chốt đơn có điều kiện | [BE-19](#be-19) | R06 | `SC2-B04` | Prompt nói đã đồng ý không thay bằng chứng xác nhận. Không tự tăng hạn mức. |
| B05 Bán kèm theo chương trình | [BE-14](#be-14) | R06, R64 | `SC2-B05` | Hết hạn, sai SKU, vượt giảm giá hoặc hết tồn không áp dụng ưu đãi. |
| B06 Chăm sóc sau mua | [BE-18](#be-18) | R54 | `SC2-B06` | Không gửi đơn khách khác. Không hứa hoàn tiền hoặc xác nhận hoàn tiền thật. |
| B07 Bot/người thật tiếp quản | [BE-18](#be-18) | R06 | `SC2-B07` | Takeover xảy ra khi LLM đang chạy: draft cũ không được send. Release bot có audit. |
| B08 Bình luận/ảnh/tin thoại | [BE-18](#be-18) | R06 | `SC2-B08` | Ảnh chuyển tiền không xác nhận payment. Comment không tự cấp phép private message. Không hỗ trợ thì UI nêu rõ. |
| C01 Bảng chuẩn bị hàng | [BE-13](#be-13) | R41 | `SC2-C01` | Không gộp packed với delivered. Bộ lọc không làm mất việc chưa nhận. |
| C02 Phiếu lấy hàng theo SKU | [BE-13](#be-13) | R41 | `SC2-C02` | Quét sai SKU/nhập vượt lượng chặn pack. Snapshot không dùng ảnh hiện tại sai phiên bản. |
| C03 Kiểm đóng gói | [BE-13](#be-13) | R41 | `SC2-C03` | Có issue chưa giải quyết thì không ready. Ảnh chứng cứ không công khai PII. |
| C04 Phí và vùng giao hàng | [BE-11](#be-11) | R42, R62 | `SC2-C04` | Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao. |
| C05 Vận đơn và bàn giao | [BE-13](#be-13) | R42 | `SC2-C05` | Timeout create label phải reconcile. Bàn giao lần hai không trừ tồn lần hai. |
| C06 Trạng thái giao độc lập | [BE-13](#be-13) | R42 | `SC2-C06` | Event lùi/trùng không hoàn tất sai. Delivered không đồng nghĩa tiền về ngân hàng. |
| C07 Đổi/trả từng phần | [BE-13](#be-13) | R43, R65 | `SC2-C07` | Returned item chưa kiểm không available. Không hoàn quá paid/qty. Partial return không làm hoàn toàn đơn. |
| C08 Sửa/hủy theo giai đoạn | [BE-11](#be-11) | R43 | `SC2-C08` | Không hủy đơn đã handed_over bằng cancel thường. Reservation release đúng một lần. |
| D01 Tồn theo trạng thái và SKU | [BE-09](#be-09) | R47, R55, R66, R67 | `SC2-D01` | Hàng đang về/hỏng không có trong available. Tổng projection khớp movement ledger. |
| D02 Nhà cung cấp hàng hóa | [BE-16](#be-16) | R44 | `SC2-D02` | Supplier khác shop hoặc chưa duyệt không auto-purchase. Lịch sử đổi giá được giữ. |
| D03 Quy tắc nhập lại | [BE-16](#be-16) | R45 | `SC2-D03` | Thiếu budget cho auto_send phải block. Qty không âm và đúng packSize/MOQ. |
| D04 Nguy cơ hết hàng | [BE-16](#be-16) | R45 | `SC2-D04` | Chưa đủ lịch sử hiển thị static rule. Không dự báo confidence giả. |
| D05 Vòng đời đơn mua | [BE-16](#be-16) | R46 | `SC2-D05` | Timeout send giữ unknown. Không gửi đơn mới trước reconcile. |
| D06 Tự gửi đơn mua có giới hạn | [BE-16](#be-16) | R38, R45, R46 | `SC2-D06` | Reservation budget theo policy+period là atomic. Trước dispatch kiểm grant/policy/resource version, intent hash, currency, hạn mức và agent generation. Intent đổi phải xét lại. Pause/revoke chặn tác động chưa được tiếp nhận. Unknown giữ reservation và không gửi lại. Không có quyền thanh toán. |
| D07 Ngăn đặt trùng và vượt vốn | [BE-16](#be-16) | R45 | `SC2-D07` | Hai workers reorder cùng SKU tạo tối đa một active proposal. Reserved budget không vượt cap. |
| D08 Nhận và đối chiếu hàng | [BE-16](#be-16) | R47 | `SC2-D08` | Nhận một phần đúng tồn và công nợ. Replay receipt không double stock. Rejects không sellable. |
| E01 Chứng từ và sổ kép | [BE-12](#be-12) | R48, R56, R57, R58, R59, R60 | `SC2-E01` | Không post journal mất cân bằng. Source trùng không ghi lặp. Reversed phải reason. |
| E02 Giá vốn và lợi nhuận | [BE-17](#be-17) | R48 | `SC2-E02` | Không lấy toàn purchase cost vào P&L. Không giả định dispatch = delivered. Policy chưa duyệt chặn live post. |
| E03 Chi phí và phân bổ | [BE-17](#be-17) | R48 | `SC2-E03` | Phí COD đã khấu trừ không hạch toán thêm lần thứ hai. Nhãn estimate không đổi thành actual. |
| E04 Đối soát ngân hàng | [BE-17](#be-17) | R49, R65 | `SC2-E04` | Ảnh chuyển khoản chỉ evidence chờ kiểm. Unmatched/partial/duplicate visible. Offline không post. |
| E05 Đối soát COD | [BE-17](#be-17) | R49, R65 | `SC2-E05` | Khách trả carrier khác shop received cash. Net remittance + fees cân bằng gross clearing. |
| E06 Công nợ | [BE-17](#be-17) | R50 | `SC2-E06` | Không cộng khác currency chưa FX policy. Deposit không bị coi revenue sai kỳ. |
| E07 Khóa kỳ và điều chỉnh | [BE-17](#be-17) | R50 | `SC2-E07` | Backdated post vào locked period bị chặn. Export không thay dữ liệu nguồn. |
| E08 Báo cáo và hỏi đáp có nguồn | [BE-17](#be-17) | R22 | `SC2-E08` | LLM không được viết ledger. Tổng từ pagination UI không làm P&L. Missing data shown. |
| F01 Bốn vai trò AI | [BE-20](#be-20) | R51 | `SC2-F01` | Không xem bốn cards là bốn process. Bot role không có members.manage hoặc payment transfer. |
| F02 Bảng công việc chung | [BE-20](#be-20) | R37, R63 | `SC2-F02` | Notification ack liên kết task, không thành tracker cạnh tranh. Cancelled source cancels task. |
| F03 Giám sát ngoại lệ | [BE-20](#be-20) | R37, R63 | `SC2-F03` | Rule version, cooldown, dedupe. No endless self-created tasks. |
| F04 Hàng chờ duyệt | [BE-20](#be-20) | R38 | `SC2-F04` | Expired/changed/replayed approvals fail. Batch approval excludes stale rows with reasons. |
| F05 Ủy quyền | [BE-20](#be-20) | R38 | `SC2-F05` | Supervisor không tự nâng scope, không approval của mình thành người thật. |
| F06 Bản tin chủ shop | [BE-20](#be-20) | R52 | `SC2-F06` | Thiếu giờ/recipient thì chưa bật. Gửi lại bản tin cùng kỳ không trùng. |
| F07 Trạng thái hệ thống | [BE-20](#be-20) | R37, R52 | `SC2-F07` | No green healthy when last check too old. Unknown distinct down. |
| F08 Đánh giá chất lượng | [BE-19](#be-19) | R52 | `SC2-F08` | Không tự nhận confidence từ model là accuracy. Version linkage and sample counts visible. |
| G01 Onboarding vận hành | [BE-21](#be-21) | R33 | `SC2-G01` | Không tự suy quốc gia kinh doanh từ location. Config missing blocks only dependent live actions. |
| G02 Nội dung sản phẩm | [BE-08](#be-08) | R33 | `SC2-G02` | Publish yêu cầu dữ liệu tối thiểu. Price/stock vẫn live tools. |
| G03 Chính sách phiên bản | [BE-18](#be-18) | R33, R64 | `SC2-G03` | Outdated knowledge excluded from retrieval. New version does not silently rewrite past promises. |
| G04 Hồ sơ khách liên kết | [BE-08](#be-08) | R54, R08 | `SC2-G04` | Không tự merge cùng tên/số bị che. Scope mismatch denied. |
| G05 Consent và ngừng liên hệ | [BE-21](#be-21) | R35, R61 | `SC2-G05` | Opt-out suppresses marketing jobs queued before change. Backups restore reapplies tombstones. |
| G06 Vòng cải thiện có duyệt | [BE-18](#be-18) | R33 | `SC2-G06` | Prompt injection in document not instructions. No all-chat training by default. |
| G07 Thông tin marketing cho chủ shop | [BE-20](#be-20) | R53 | `SC2-G07` | Report missing attribution separately. No auto publish ads/content. API defaults to 30 inclusive shop-local days, caps custom ranges at 366 days, and returns aggregates with unknown attribution separate. |
| G08 Hiệu quả chiến dịch | [BE-20](#be-20) | R53 | `SC2-G08` | Không tự tăng ad spend. Không ghi estimate thành actual finance expense. API aggregate keeps unavailable actual spend null and never treats estimated spend as actual finance expense. |
| H01 Worker phía máy chủ | [BE-10](#be-10) | R52, R63 | `SC2-H01` | Close browser and restart worker preserves due work. Queue loss rebuild from DB. |
| H02 Kill switch | [BE-20](#be-20) | R51 | `SC2-H02` | Stop cannot unsend accepted message. UI shows accepted/unknown boundary honestly. |
| H03 Chi phí và failover | [BE-19](#be-19) | R51 | `SC2-H03` | No silent PII transfer to unapproved model. Exhausted budget moves to safe handoff. |
| H04 Chống trùng và phục hồi | [BE-06](#be-06) | R52, R63 | `SC2-H04` | Crash after external accept before local save not blindly retried. Poison jobs isolated. |
| H05 Quyền xuyên mọi entrypoint | [BE-05](#be-05) | R34 | `SC2-H05` | UI-hidden control cannot bypass backend. Telegram id mapping rechecked. |
| H06 Audit | [BE-06](#be-06) | R34 | `SC2-H06` | Changed data must not rewrite audit reason. No secrets in logs/exports/error URLs. |
| H07 Phòng thử | [BE-02](#be-02) | R34 | `SC2-H07` | Demo pass not live proof. No real customer/keys/money in synthetic tests. |
| H08 Khôi phục và readiness | [BE-23](#be-23) | R52 | `SC2-H08` | Backup exists not restore proof. Missing mandatory criterion cannot greenlight launch. |

### Ca kiểm bổ sung theo hợp đồng

Bảng màn hình truy vết ca SC và SC2 từ nguồn. Bảng tính năng truy vết ca chính. Các ca dưới đây bổ sung cho mục tính năng và cần chạy riêng theo phạm vi ghi.

| Ca kiểm | Việc chính | Màn | Điều kiện đạt |
|---|---|---|---|
| `SC2-C05-WAREHOUSE` | [BE-09](#be-09) | R55 | Owner/manager CRUD. Warehouse role denied management. Cross-shop/stale rejected. Stock/reservations/open work prevent archive. |
| `SC2-C05-ACCOUNT` | [BE-12](#be-12) | R56 | Owner/accountant CRUD. Manager denied. Used code/group immutable. Archived IDs remain historical but cannot post new journals. |
| `SC2-C05-ADDRESS` | [BE-08](#be-08) | R08 | Same-customer/same-shop references only. Redacted values never echoed or written. Quote and confirmed order snapshots remain unchanged after edits. |
| `SC2-C06-FINANCE` | [BE-17](#be-17) | R20, R22, R48, R49, R50, R57, R58, R59, R60 | Profit 80000 then 30000 VND. Assets = liabilities + equity. Immutable source journals, correct period and full read-model totals. |

R61 còn tham chiếu `SC2-C07-CONSENT` chưa có trong hai bộ fixture. Việc xử lý thuộc BE-21 và được theo dõi trong mục điều kiện còn mở.


### Toàn bộ thao tác API

Đường dẫn dưới đây tương đối với `/api/v2`. Quyền lấy từ hợp đồng. Ô quyền trống vẫn áp dụng security scheme và kiểm phạm vi hoặc ngoại lệ của endpoint. Với quyền động theo mục đích như upload, bổ sung ca thực thi chính sách trong BE-08, BE-17, BE-18 và BE-21.

**Header ghi** ghi theo contract. CSRF là `X-CSRF-Token`, IK là `Idempotency-Key`, Ver là `If-Match`. Điều kiện phiên bản trong body, schema phản hồi, lỗi và policy bổ sung vẫn kiểm theo OpenAPI. Mã `202` biểu thị lệnh được chấp nhận. Trạng thái cuối lấy từ nguồn có thẩm quyền.

**Màn dùng** chọn từ manifest và các cuộc gọi bổ sung đã đối chiếu ở trên. `Global` chỉ thao tác được liệt kê dùng chung trong manifest. Dấu trống có thể là API phục vụ consumer, trang con, tác vụ nền hoặc triển khai qua bước sau. Mỗi thao tác vẫn có một việc chính và cần ca contract theo phạm vi.

#### API workspace

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getCsrfToken` | `GET /auth/csrf` | [BE-04](#be-04) | — | — | 200 | R01, Global |
| `logout` | `POST /auth/logout` | [BE-04](#be-04) | — | CSRF | 204 | Global |
| `stepUp` | `POST /auth/step-up` | [BE-21](#be-21) | — | CSRF | 200 | R35 |
| `getSession` | `GET /session` | [BE-04](#be-04) | — | — | 200 | R02, R03, Global |
| `listShops` | `GET /shops` | [BE-05](#be-05) | — | — | 200 | R02 |
| `createShop` | `POST /shops` | [BE-21](#be-21) | — | CSRF, IK | 201 | R03 |
| `getShop` | `GET /shops/{shopId}` | [BE-05](#be-05) | — | — | 200 | R04, R15, R18, R33, Global |
| `updateShop` | `PATCH /shops/{shopId}` | [BE-21](#be-21) | `shop.manage` | CSRF, IK, Ver | 200 | R33 |
| `beginLogin` | `POST /auth/start` | [BE-04](#be-04) | — | CSRF, IK | 200 | R01 |
| `completeLogin` | `GET /auth/callback` | [BE-04](#be-04) | — | — | 302 | — |

#### API members

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listMembers` | `GET /shops/{shopId}/members` | [BE-05](#be-05) | `members.manage` | — | 200 | R32 |
| `inviteMember` | `POST /shops/{shopId}/members` | [BE-05](#be-05) | `members.manage` | CSRF, IK | 201 | R32 |
| `updateMemberRoles` | `PATCH /shops/{shopId}/members/{memberId}` | [BE-05](#be-05) | `members.manage` | CSRF, IK, Ver | 200 | R32 |
| `revokeMembership` | `DELETE /shops/{shopId}/members/{memberId}` | [BE-05](#be-05) | `members.manage` | CSRF, IK, Ver | 204 | R32 |
| `getMember` | `GET /shops/{shopId}/members/{memberId}` | [BE-05](#be-05) | `members.manage` | — | 200 | R32 |

#### API dashboard

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getDashboard` | `GET /shops/{shopId}/dashboard` | [BE-07](#be-07) | `dashboard.read` | — | 200 | R04 |

#### API products

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listProducts` | `GET /shops/{shopId}/products` | [BE-07](#be-07) | `catalog.read` | — | 200 | R09, R18, R57, R64 |
| `createProduct` | `POST /shops/{shopId}/products` | [BE-07](#be-07) | `catalog.write` | CSRF, IK | 201 | R10 |
| `getProduct` | `GET /shops/{shopId}/products/{productId}` | [BE-07](#be-07) | `catalog.read` | — | 200 | R11 |
| `updateProduct` | `PATCH /shops/{shopId}/products/{productId}` | [BE-08](#be-08) | `catalog.write` | CSRF, IK, Ver | 200 | R11 |
| `archiveProduct` | `POST /shops/{shopId}/products/{productId}/archive` | [BE-08](#be-08) | `catalog.write` | CSRF, IK | 202 | R11 |

#### API categories

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listCategories` | `GET /shops/{shopId}/categories` | [BE-07](#be-07) | `catalog.read` | — | 200 | R09, R10, R11, R12 |
| `createCategory` | `POST /shops/{shopId}/categories` | [BE-08](#be-08) | `catalog.write` | CSRF, IK | 201 | R12 |
| `getCategory` | `GET /shops/{shopId}/categories/{categoryId}` | [BE-08](#be-08) | `catalog.read` | — | 200 | R12 |
| `updateCategory` | `PATCH /shops/{shopId}/categories/{categoryId}` | [BE-08](#be-08) | `catalog.write` | CSRF, IK, Ver | 200 | R12 |
| `archiveCategory` | `POST /shops/{shopId}/categories/{categoryId}/archive` | [BE-08](#be-08) | `catalog.write` | CSRF, IK | 202 | R12 |

#### API customers

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listCustomers` | `GET /shops/{shopId}/customers` | [BE-08](#be-08) | `customers.read` | — | 200 | R07, R18 |
| `createCustomer` | `POST /shops/{shopId}/customers` | [BE-08](#be-08) | `customers.write` | CSRF, IK | 201 | R07 |
| `getCustomer` | `GET /shops/{shopId}/customers/{customerId}` | [BE-08](#be-08) | `customers.read` | — | 200 | R08 |
| `updateCustomer` | `PATCH /shops/{shopId}/customers/{customerId}` | [BE-08](#be-08) | `customers.write` | CSRF, IK, Ver | 200 | R08 |
| `listServiceCases` | `GET /shops/{shopId}/service-cases` | [BE-08](#be-08) | `customers.read` | — | 200 | R54 |
| `createServiceCase` | `POST /shops/{shopId}/service-cases` | [BE-08](#be-08) | `customers.write` | CSRF, IK | 201 | R54 |
| `getServiceCase` | `GET /shops/{shopId}/service-cases/{resourceId}` | [BE-08](#be-08) | `customers.read` | — | 200 | R54 |
| `setServiceCaseStatus` | `POST /shops/{shopId}/service-cases/{resourceId}/status` | [BE-08](#be-08) | `customers.write` | CSRF, IK | 200 | R54 |

#### API inventory

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listStockSnapshots` | `GET /shops/{shopId}/inventory` | [BE-09](#be-09) | `inventory.read` | — | 200 | R15, R66, R67 |
| `listStockMovements` | `GET /shops/{shopId}/inventory/movements` | [BE-09](#be-09) | `inventory.read` | — | 200 | R16 |
| `createInventoryAdjustment` | `POST /shops/{shopId}/inventory/adjustments` | [BE-12](#be-12) | `inventory.adjust` | CSRF, IK | 202 | R15 |
| `listStocktakes` | `GET /shops/{shopId}/inventory/stocktakes` | [BE-15](#be-15) | `inventory.read` | — | 200 | R66 |
| `createStocktake` | `POST /shops/{shopId}/inventory/stocktakes` | [BE-15](#be-15) | `inventory.adjust` | CSRF, IK | 201 | R66 |
| `updateStocktake` | `PATCH /shops/{shopId}/inventory/stocktakes/{resourceId}` | [BE-15](#be-15) | `inventory.adjust` | CSRF, IK, Ver | 200 | R66 |
| `postStocktake` | `PATCH /shops/{shopId}/inventory/stocktakes/{resourceId}/posting` | [BE-15](#be-15) | `warehouses.manage` | CSRF, IK, Ver | 200 | R66 |
| `listStockTransfers` | `GET /shops/{shopId}/inventory/transfers` | [BE-15](#be-15) | `inventory.read` | — | 200 | R67 |
| `createStockTransfer` | `POST /shops/{shopId}/inventory/transfers` | [BE-15](#be-15) | `inventory.adjust` | CSRF, IK | 201 | R67 |
| `updateStockTransfer` | `PATCH /shops/{shopId}/inventory/transfers/{resourceId}` | [BE-15](#be-15) | `inventory.adjust` | CSRF, IK, Ver | 200 | R67 |

#### API orders

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listOrders` | `GET /shops/{shopId}/orders` | [BE-11](#be-11) | `orders.read` | — | 200 | R17 |
| `createOrder` | `POST /shops/{shopId}/orders` | [BE-11](#be-11) | `orders.write` | CSRF, IK | 201 | R18 |
| `getOrder` | `GET /shops/{shopId}/orders/{orderId}` | [BE-11](#be-11) | `orders.read` | — | 200 | R19 |
| `updateOrderDraft` | `PATCH /shops/{shopId}/orders/{orderId}` | [BE-11](#be-11) | `orders.write` | CSRF, IK, Ver | 200 | R19 |
| `quoteOrder` | `POST /shops/{shopId}/orders/{orderId}/quote` | [BE-11](#be-11) | `orders.write` | CSRF, IK | 200 | R19 |
| `confirmOrder` | `POST /shops/{shopId}/orders/{orderId}/confirm` | [BE-11](#be-11) | `orders.confirm` | CSRF, IK | 202 | R19 |
| `cancelOrder` | `POST /shops/{shopId}/orders/{orderId}/cancel` | [BE-11](#be-11) | `orders.write` | CSRF, IK | 202 | R19 |
| `payOrder` | `POST /shops/{shopId}/orders/{orderId}/pay` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R19 |
| `refundOrder` | `POST /shops/{shopId}/orders/{orderId}/refund` | [BE-12](#be-12) | `finance.refund` | CSRF, IK | 202 | R19 |
| `listReturnCases` | `GET /shops/{shopId}/returns` | [BE-13](#be-13) | `orders.read` | — | 200 | R43 |
| `createReturnCase` | `POST /shops/{shopId}/returns` | [BE-13](#be-13) | `orders.return` | CSRF, IK | 201 | R19, R43 |
| `getReturnCase` | `GET /shops/{shopId}/returns/{resourceId}` | [BE-13](#be-13) | `orders.read` | — | 200 | R43 |
| `recordCustomerConfirmation` | `POST /shops/{shopId}/orders/{orderId}/customer-confirmations` | [BE-11](#be-11) | `orders.write` | CSRF, IK | 200 | R19 |
| `inspectReturn` | `POST /shops/{shopId}/returns/{resourceId}/inspect` | [BE-13](#be-13) | `inventory.adjust` | CSRF, IK | 200 | R43 |

#### API finance

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listFinanceEntries` | `GET /shops/{shopId}/finance/entries` | [BE-12](#be-12) | `finance.read` | — | 200 | R21 |
| `createFinanceEntry` | `POST /shops/{shopId}/finance/entries` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 201 | R21 |
| `getFinanceEntry` | `GET /shops/{shopId}/finance/entries/{entryId}` | [BE-12](#be-12) | `finance.read` | — | 200 | R21 |
| `updateFinanceEntry` | `PATCH /shops/{shopId}/finance/entries/{entryId}` | [BE-12](#be-12) | `finance.post` | CSRF, IK, Ver | 200 | R21 |
| `postFinanceEntry` | `POST /shops/{shopId}/finance/entries/{entryId}/post` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R21 |
| `reverseFinanceEntry` | `POST /shops/{shopId}/finance/entries/{entryId}/reverse` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R21 |
| `getCashflow` | `GET /shops/{shopId}/finance/cashflow` | [BE-17](#be-17) | `finance.read` | — | 200 | R20 |
| `getProfitLoss` | `GET /shops/{shopId}/finance/profit-loss` | [BE-17](#be-17) | `finance.read` | — | 200 | R22 |
| `listJournals` | `GET /shops/{shopId}/journals` | [BE-12](#be-12) | `finance.read` | — | 200 | R48 |
| `createJournal` | `POST /shops/{shopId}/journals` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 201 | R48 |
| `getJournal` | `GET /shops/{shopId}/journals/{resourceId}` | [BE-12](#be-12) | `finance.read` | — | 200 | R48, R58 |
| `listBankTransactions` | `GET /shops/{shopId}/bank-transactions` | [BE-17](#be-17) | `finance.read` | — | 200 | R49 |
| `getBankTransaction` | `GET /shops/{shopId}/bank-transactions/{resourceId}` | [BE-17](#be-17) | `finance.read` | — | 200 | — |
| `listReconciliationCases` | `GET /shops/{shopId}/reconciliation-cases` | [BE-17](#be-17) | `finance.read` | — | 200 | R49 |
| `getReconciliationCase` | `GET /shops/{shopId}/reconciliation-cases/{resourceId}` | [BE-17](#be-17) | `finance.read` | — | 200 | — |
| `listCODSettlements` | `GET /shops/{shopId}/cod-settlements` | [BE-17](#be-17) | `finance.read` | — | 200 | R49 |
| `getCODSettlement` | `GET /shops/{shopId}/cod-settlements/{resourceId}` | [BE-17](#be-17) | `finance.read` | — | 200 | — |
| `listDebtItems` | `GET /shops/{shopId}/debts` | [BE-17](#be-17) | `finance.read` | — | 200 | R50 |
| `getDebtItem` | `GET /shops/{shopId}/debts/{resourceId}` | [BE-17](#be-17) | `finance.read` | — | 200 | — |
| `listAccountingPeriods` | `GET /shops/{shopId}/periods` | [BE-12](#be-12) | `finance.read` | — | 200 | R50 |
| `createAccountingPeriod` | `POST /shops/{shopId}/periods` | [BE-12](#be-12) | `finance.close` | CSRF, IK | 201 | R50 |
| `getAccountingPeriod` | `GET /shops/{shopId}/periods/{resourceId}` | [BE-12](#be-12) | `finance.read` | — | 200 | — |
| `postJournal` | `POST /shops/{shopId}/journals/{resourceId}/post` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R48 |
| `reverseJournal` | `POST /shops/{shopId}/journals/{resourceId}/reverse` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R48 |
| `matchSettlement` | `POST /shops/{shopId}/reconciliation-cases/{resourceId}/match` | [BE-17](#be-17) | `finance.reconcile` | CSRF, IK | 202 | R49 |
| `matchCODSettlement` | `POST /shops/{shopId}/cod-settlements/{resourceId}/match` | [BE-17](#be-17) | `finance.reconcile` | CSRF, IK | 202 | R49 |
| `closeAccountingPeriod` | `POST /shops/{shopId}/periods/{resourceId}/close` | [BE-17](#be-17) | `finance.close` | CSRF, IK | 202 | R50 |
| `importBankStatement` | `POST /shops/{shopId}/bank-transactions/import` | [BE-17](#be-17) | `finance.reconcile` | CSRF, IK | 200 | R49 |
| `importCODStatement` | `POST /shops/{shopId}/cod-settlements/import` | [BE-17](#be-17) | `finance.reconcile` | CSRF, IK | 200 | R49 |
| `reopenAccountingPeriod` | `POST /shops/{shopId}/periods/{resourceId}/reopen` | [BE-17](#be-17) | `finance.close` | CSRF, IK | 202 | R50 |
| `listOpeningBalances` | `GET /shops/{shopId}/finance/opening-balances` | [BE-12](#be-12) | `finance.read` | — | 200 | R57 |
| `createOpeningBalance` | `POST /shops/{shopId}/finance/opening-balances` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 201 | R57 |
| `getOpeningBalance` | `GET /shops/{shopId}/finance/opening-balances/{openingId}` | [BE-12](#be-12) | `finance.read` | — | 200 | R57 |
| `updateOpeningBalance` | `PUT /shops/{shopId}/finance/opening-balances/{openingId}` | [BE-12](#be-12) | `finance.post` | CSRF, IK, Ver | 200 | R57 |
| `postOpeningBalance` | `POST /shops/{shopId}/finance/opening-balances/{openingId}/post` | [BE-12](#be-12) | `finance.post` | CSRF, IK | 202 | R57 |
| `getLedger` | `GET /shops/{shopId}/finance/ledger` | [BE-12](#be-12) | `finance.read` | — | 200 | R58, R59, R60 |
| `getTrialBalance` | `GET /shops/{shopId}/finance/trial-balance` | [BE-17](#be-17) | `finance.read` | — | 200 | R59 |
| `getBalanceSheet` | `GET /shops/{shopId}/finance/balance-sheet` | [BE-17](#be-17) | `finance.read` | — | 200 | R60 |
| `listStatementFormats` | `GET /shops/{shopId}/finance/statement-formats` | [BE-17](#be-17) | `finance.reconcile` | — | 200 | R49 |
| `previewStatementImport` | `POST /shops/{shopId}/finance/statement-import-preview` | [BE-17](#be-17) | `finance.reconcile` | CSRF, IK | 200 | R49 |
| `listPaymentReviews` | `GET /shops/{shopId}/payment-reviews` | [BE-17](#be-17) | `finance.read` | — | 200 | R65 |

#### API conversations

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listConversations` | `GET /shops/{shopId}/conversations` | [BE-18](#be-18) | `conversations.read` | — | 200 | R05 |
| `getConversation` | `GET /shops/{shopId}/conversations/{conversationId}` | [BE-18](#be-18) | `conversations.read` | — | 200 | R06 |
| `listMessages` | `GET /shops/{shopId}/conversations/{conversationId}/messages` | [BE-18](#be-18) | `conversations.read` | — | 200 | R06 |
| `sendMessage` | `POST /shops/{shopId}/conversations/{conversationId}/messages` | [BE-18](#be-18) | `conversations.reply` | CSRF, IK | 202 | R06 |
| `addInternalNote` | `POST /shops/{shopId}/conversations/{conversationId}/notes` | [BE-18](#be-18) | `conversations.reply` | CSRF, IK | 201 | R06 |
| `takeoverConversation` | `POST /shops/{shopId}/conversations/{conversationId}/takeover` | [BE-18](#be-18) | `conversations.assign` | CSRF, IK | 202 | R06 |
| `releaseConversation` | `POST /shops/{shopId}/conversations/{conversationId}/release` | [BE-18](#be-18) | `conversations.assign` | CSRF, IK | 202 | R06 |
| `resolveConversation` | `POST /shops/{shopId}/conversations/{conversationId}/resolve` | [BE-18](#be-18) | `conversations.assign` | CSRF, IK | 202 | R06 |
| `assignConversation` | `POST /shops/{shopId}/conversations/{conversationId}/assign` | [BE-18](#be-18) | `conversations.assign` | CSRF, IK | 202 | R06 |
| `getInboxMetadata` | `GET /shops/{shopId}/conversations/metadata` | [BE-18](#be-18) | `conversations.read` | — | 200 | R05, R06 |

#### API knowledge

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listKnowledge` | `GET /shops/{shopId}/knowledge` | [BE-18](#be-18) | `knowledge.read` | — | 200 | R23, R26 |
| `createKnowledge` | `POST /shops/{shopId}/knowledge` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK | 201 | R23 |
| `getKnowledge` | `GET /shops/{shopId}/knowledge/{knowledgeId}` | [BE-18](#be-18) | `knowledge.read` | — | 200 | R24 |
| `updateKnowledge` | `PATCH /shops/{shopId}/knowledge/{knowledgeId}` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK, Ver | 200 | R24 |
| `submitKnowledgeReview` | `POST /shops/{shopId}/knowledge/{knowledgeId}/submit-review` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK | 202 | R24 |
| `publishKnowledge` | `POST /shops/{shopId}/knowledge/{knowledgeId}/publish` | [BE-18](#be-18) | `knowledge.publish` | CSRF, IK | 202 | R24 |
| `retireKnowledge` | `POST /shops/{shopId}/knowledge/{knowledgeId}/retire` | [BE-18](#be-18) | `knowledge.publish` | CSRF, IK | 202 | R24 |
| `listKnowledgeRevisions` | `GET /shops/{shopId}/knowledge/{knowledgeId}/revisions` | [BE-18](#be-18) | `knowledge.read` | — | 200 | R24 |
| `createKnowledgeRevision` | `POST /shops/{shopId}/knowledge/{knowledgeId}/revisions` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK | 201 | R24 |
| `getKnowledgeRevision` | `GET /shops/{shopId}/knowledge/{knowledgeId}/revisions/{revisionId}` | [BE-18](#be-18) | `knowledge.read` | — | 200 | R24 |
| `restoreKnowledgeRevision` | `POST /shops/{shopId}/knowledge/{knowledgeId}/revisions/{revisionId}/restore` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK | 201 | R24 |

#### API feedback

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listFeedback` | `GET /shops/{shopId}/feedback` | [BE-18](#be-18) | `knowledge.read` | — | 200 | R25 |
| `createFeedback` | `POST /shops/{shopId}/feedback` | [BE-18](#be-18) | `conversations.read` | CSRF, IK | 201 | R06 |
| `reviewFeedback` | `POST /shops/{shopId}/feedback/{feedbackId}/review` | [BE-18](#be-18) | `knowledge.write` | CSRF, IK | 200 | R25 |

#### API bot

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getBotConfig` | `GET /shops/{shopId}/bot/config` | [BE-19](#be-19) | `bot.read` | — | 200 | R26, R27 |
| `updateBotDraft` | `PATCH /shops/{shopId}/bot/config` | [BE-19](#be-19) | `bot.configure` | CSRF, IK, Ver | 200 | R26 |
| `runPlayground` | `POST /shops/{shopId}/bot/playground` | [BE-19](#be-19) | `bot.configure` | CSRF, IK | 200 | R27 |
| `listEvaluations` | `GET /shops/{shopId}/bot/evaluations` | [BE-19](#be-19) | `bot.read` | — | 200 | R28 |
| `createEvaluation` | `POST /shops/{shopId}/bot/evaluations` | [BE-19](#be-19) | `bot.configure` | CSRF, IK | 202 | R28 |
| `getEvaluation` | `GET /shops/{shopId}/bot/evaluations/{evaluationId}` | [BE-19](#be-19) | `bot.read` | — | 200 | R28 |
| `publishBotConfig` | `POST /shops/{shopId}/bot/config/publish` | [BE-19](#be-19) | `bot.publish` | CSRF, IK | 202 | R26 |
| `pauseBot` | `POST /shops/{shopId}/bot/pause` | [BE-20](#be-20) | `bot.publish` | CSRF, IK | 202 | R04, R26 |
| `listBotRevisions` | `GET /shops/{shopId}/bot/revisions` | [BE-19](#be-19) | `bot.read` | — | 200 | R26 |
| `getBotRevision` | `GET /shops/{shopId}/bot/revisions/{revisionId}` | [BE-19](#be-19) | `bot.read` | — | 200 | R26 |
| `restoreBotRevision` | `POST /shops/{shopId}/bot/revisions/{revisionId}/restore` | [BE-19](#be-19) | `bot.configure` | CSRF, IK | 201 | R26 |
| `listAgentRoles` | `GET /shops/{shopId}/agent-roles` | [BE-20](#be-20) | `bot.read` | — | 200 | R51 |
| `getAgentRole` | `GET /shops/{shopId}/agent-roles/{resourceId}` | [BE-20](#be-20) | `bot.read` | — | 200 | — |
| `updateAgentRole` | `PUT /shops/{shopId}/agent-roles/{resourceId}` | [BE-20](#be-20) | `bot.configure` | CSRF, IK | 200 | R51 |

#### API integrations

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getProviderCatalog` | `GET /shops/{shopId}/integrations/ai/catalog` | [BE-19](#be-19) | `integrations.read` | — | 200 | R30 |
| `listAIConnections` | `GET /shops/{shopId}/integrations/ai` | [BE-19](#be-19) | `integrations.read` | — | 200 | R26, R30 |
| `createAIConnection` | `POST /shops/{shopId}/integrations/ai` | [BE-19](#be-19) | `integrations.manage` | CSRF, IK | 201 | R30 |
| `getAIConnection` | `GET /shops/{shopId}/integrations/ai/{connectionId}` | [BE-19](#be-19) | `integrations.read` | — | 200 | R30 |
| `updateAIConnection` | `PATCH /shops/{shopId}/integrations/ai/{connectionId}` | [BE-19](#be-19) | `integrations.manage` | CSRF, IK, Ver | 200 | R30 |
| `deleteAIConnection` | `DELETE /shops/{shopId}/integrations/ai/{connectionId}` | [BE-19](#be-19) | `integrations.manage` | CSRF, IK, Ver | 204 | R30 |
| `testAIConnection` | `POST /shops/{shopId}/integrations/ai/{connectionId}/test` | [BE-19](#be-19) | `integrations.manage` | CSRF, IK | 202 | R30 |
| `listChannels` | `GET /shops/{shopId}/integrations/channels` | [BE-18](#be-18) | `integrations.read` | — | 200 | R29 |
| `beginChannelConnect` | `POST /shops/{shopId}/integrations/channels/connect` | [BE-18](#be-18) | `integrations.manage` | CSRF, IK | 200 | R29 |
| `getChannel` | `GET /shops/{shopId}/integrations/channels/{channelId}` | [BE-18](#be-18) | `integrations.read` | — | 200 | R29 |
| `reconnectChannel` | `POST /shops/{shopId}/integrations/channels/{channelId}/reconnect` | [BE-18](#be-18) | `integrations.manage` | CSRF, IK | 200 | R29 |
| `disconnectChannel` | `POST /shops/{shopId}/integrations/channels/{channelId}/disconnect` | [BE-18](#be-18) | `integrations.manage` | CSRF, IK | 202 | R29 |
| `checkChannelHealth` | `POST /shops/{shopId}/integrations/channels/{channelId}/check` | [BE-18](#be-18) | `integrations.manage` | CSRF, IK | 202 | R29 |

#### API uploads

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `uploadFile` | `POST /shops/{shopId}/uploads` | [BE-08](#be-08) | — | CSRF, IK | 201 | R06, R10, R11, R13, R23 |
| `getFile` | `GET /shops/{shopId}/uploads/{fileId}` | [BE-08](#be-08) | — | — | 200 | R06, R11, R13, R23 |

#### API imports

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `createProductImport` | `POST /shops/{shopId}/imports` | [BE-08](#be-08) | `catalog.import` | CSRF, IK | 202 | R13 |
| `commitProductImport` | `POST /shops/{shopId}/imports/{jobId}/commit` | [BE-08](#be-08) | `catalog.import` | CSRF, IK | 202 | R14 |

#### API reports

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getReportSummary` | `GET /shops/{shopId}/reports` | [BE-17](#be-17) | `reports.read` | — | 200 | R31 |
| `getMarketingSummary` | `GET /shops/{shopId}/marketing-summary` | [BE-20](#be-20) | `reports.read` | — | 200 | R53 |

#### API exports

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `createExport` | `POST /shops/{shopId}/exports` | [BE-21](#be-21) | `reports.export` | CSRF, IK | 202 | R31 |

#### API jobs

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listJobs` | `GET /shops/{shopId}/jobs` | [BE-10](#be-10) | `jobs.read` | — | 200 | R13, R31, R63 |
| `getJob` | `GET /shops/{shopId}/jobs/{jobId}` | [BE-10](#be-10) | `jobs.read` | — | 200 | R14, R28, R29, R30, R36, R63, Global |

#### API commands

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listCommands` | `GET /shops/{shopId}/commands` | [BE-06](#be-06) | `jobs.read` | — | 200 | R63, Global |
| `getCommand` | `GET /shops/{shopId}/commands/{commandId}` | [BE-06](#be-06) | `jobs.read` | — | 200 | R06, R19, R21, R35, R63, Global |

#### API audit

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listAuditEvents` | `GET /shops/{shopId}/audit` | [BE-06](#be-06) | `audit.read` | — | 200 | R34 |

#### API privacy

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `getPrivacyPolicy` | `GET /shops/{shopId}/privacy/policy` | [BE-21](#be-21) | `privacy.manage` | — | 200 | R35 |
| `updatePrivacyPolicy` | `PATCH /shops/{shopId}/privacy/policy` | [BE-21](#be-21) | `privacy.manage` | CSRF, IK, Ver | 200 | R35 |
| `listPrivacyRequests` | `GET /shops/{shopId}/privacy/requests` | [BE-21](#be-21) | `privacy.manage` | — | 200 | R35 |
| `createPrivacyRequest` | `POST /shops/{shopId}/privacy/requests` | [BE-21](#be-21) | `privacy.manage` | CSRF, IK | 201 | R35 |
| `approvePrivacyRequest` | `POST /shops/{shopId}/privacy/requests/{privacyRequestId}/approve` | [BE-21](#be-21) | `privacy.manage` | CSRF, IK | 202 | R35 |
| `listCustomerConsents` | `GET /shops/{shopId}/customer-consents` | [BE-21](#be-21) | `privacy.manage` | — | 200 | — |
| `listCustomerConsentChallenges` | `GET /shops/{shopId}/customer-consent-challenges` | [BE-21](#be-21) | `privacy.manage` | — | 200 | — |
| `createCustomerConsentChallenge` | `POST /shops/{shopId}/customers/{customerId}/consent-challenges` | [BE-21](#be-21) | `privacy.manage` | CSRF, IK | 201 | — |
| `exchangeConsentChallenge` | `POST /public/consent/challenges/exchange` | [BE-21](#be-21) | — | CSRF, IK | 200 | R61, Global |
| `confirmConsentChallenge` | `POST /public/consent/confirmations` | [BE-21](#be-21) | — | CSRF, IK | 200 | R61, Global |

#### API events

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `subscribeEvents` | `GET /shops/{shopId}/events` | [BE-10](#be-10) | — | — | 200 | Global |

#### API operations

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listWorkItems` | `GET /shops/{shopId}/work-items` | [BE-13](#be-13) | `operations.read` | — | 200 | R37, R63 |
| `getWorkItem` | `GET /shops/{shopId}/work-items/{resourceId}` | [BE-13](#be-13) | `operations.read` | — | 200 | R41 |
| `listApprovals` | `GET /shops/{shopId}/approvals` | [BE-16](#be-16) | `approvals.read` | — | 200 | R38, R45 |
| `createApproval` | `POST /shops/{shopId}/approvals` | [BE-16](#be-16) | `approvals.request` | CSRF, IK | 201 | — |
| `getApproval` | `GET /shops/{shopId}/approvals/{resourceId}` | [BE-16](#be-16) | `approvals.read` | — | 200 | R38 |
| `listBudgetPolicies` | `GET /shops/{shopId}/budget-policies` | [BE-20](#be-20) | `operations.read` | — | 200 | R45, R51 |
| `getBudgetPolicy` | `GET /shops/{shopId}/budget-policies/{resourceId}` | [BE-20](#be-20) | `operations.read` | — | 200 | — |
| `updateBudgetPolicy` | `PUT /shops/{shopId}/budget-policies/{resourceId}` | [BE-20](#be-20) | `operations.manage` | CSRF, IK | 200 | — |
| `listDigests` | `GET /shops/{shopId}/digests` | [BE-20](#be-20) | `operations.read` | — | 200 | R52 |
| `getDigest` | `GET /shops/{shopId}/digests/{resourceId}` | [BE-20](#be-20) | `operations.read` | — | 200 | — |
| `claimWorkItem` | `POST /shops/{shopId}/work-items/{resourceId}/claim` | [BE-13](#be-13) | `operations.claim` | CSRF, IK | 200 | R37, R41, R63 |
| `updateWorkItem` | `POST /shops/{shopId}/work-items/{resourceId}/actions` | [BE-20](#be-20) | `operations.manage` | CSRF, IK | 200 | R37 |
| `decideApproval` | `POST /shops/{shopId}/approvals/{resourceId}/decision` | [BE-16](#be-16) | `approvals.decide` | CSRF, IK | 200 | R38 |
| `controlAutomation` | `POST /shops/{shopId}/automation-control` | [BE-20](#be-20) | `bot.pause` | CSRF, IK | 202 | R51, R52 |
| `getOperationsSummary` | `GET /shops/{shopId}/operations-summary` | [BE-20](#be-20) | `operations.read` | — | 200 | R37, R52 |
| `listPurchaseDelegations` | `GET /shops/{shopId}/purchase-delegations` | [BE-20](#be-20) | `procurement.read` | — | 200 | R38, R45 |
| `updatePurchaseDelegation` | `PATCH /shops/{shopId}/purchase-delegations/{resourceId}` | [BE-20](#be-20) | `procurement.delegation.manage` | CSRF, IK | 200 | R38 |
| `listPurchaseDelegationReservations` | `GET /shops/{shopId}/purchase-delegation-reservations` | [BE-20](#be-20) | `procurement.delegation.manage` | — | 200 | R38 |

#### API notifications

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listDevices` | `GET /shops/{shopId}/devices` | [BE-13](#be-13) | `notifications.manage` | — | 200 | R40 |
| `createDevice` | `POST /shops/{shopId}/devices` | [BE-13](#be-13) | `notifications.manage` | CSRF, IK | 201 | R40 |
| `getDevice` | `GET /shops/{shopId}/devices/{resourceId}` | [BE-13](#be-13) | `notifications.manage` | — | 200 | — |
| `listNotifications` | `GET /shops/{shopId}/notifications` | [BE-13](#be-13) | `notifications.read` | — | 200 | R39 |
| `getNotification` | `GET /shops/{shopId}/notifications/{resourceId}` | [BE-13](#be-13) | `notifications.read` | — | 200 | R39 |
| `revokeDevice` | `POST /shops/{shopId}/devices/{resourceId}/revoke` | [BE-13](#be-13) | `notifications.manage` | CSRF, IK | 200 | R40 |
| `testDevice` | `POST /shops/{shopId}/devices/{resourceId}/test` | [BE-13](#be-13) | `notifications.manage` | CSRF, IK | 202 | R40 |
| `acknowledgeNotification` | `POST /shops/{shopId}/notifications/{resourceId}/acknowledge` | [BE-13](#be-13) | `operations.claim` | CSRF, IK | 200 | R39 |
| `getNotificationPolicy` | `GET /shops/{shopId}/notification-policy` | [BE-13](#be-13) | `notifications.read` | — | 200 | R40 |
| `updateNotificationPolicy` | `PUT /shops/{shopId}/notification-policy` | [BE-13](#be-13) | `notifications.manage` | CSRF, IK | 200 | R40 |
| `beginTelegramPairing` | `POST /shops/{shopId}/telegram-pairing` | [BE-13](#be-13) | `notifications.manage` | CSRF, IK | 200 | R40 |

#### API fulfillment

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listPrepJobs` | `GET /shops/{shopId}/prep-jobs` | [BE-13](#be-13) | `fulfillment.read` | — | 200 | R41 |
| `getPrepJob` | `GET /shops/{shopId}/prep-jobs/{resourceId}` | [BE-13](#be-13) | `fulfillment.read` | — | 200 | R41 |
| `listShipments` | `GET /shops/{shopId}/shipments` | [BE-13](#be-13) | `fulfillment.read` | — | 200 | R42 |
| `createShipment` | `POST /shops/{shopId}/shipments` | [BE-13](#be-13) | `fulfillment.write` | CSRF, IK | 201 | R42 |
| `getShipment` | `GET /shops/{shopId}/shipments/{resourceId}` | [BE-13](#be-13) | `fulfillment.read` | — | 200 | R42 |
| `pickPrepLine` | `POST /shops/{shopId}/prep-jobs/{resourceId}/pick` | [BE-13](#be-13) | `fulfillment.write` | CSRF, IK | 200 | R41 |
| `packPrepJob` | `POST /shops/{shopId}/prep-jobs/{resourceId}/pack` | [BE-13](#be-13) | `fulfillment.write` | CSRF, IK | 200 | R41 |
| `handoverShipment` | `POST /shops/{shopId}/shipments/{resourceId}/handover` | [BE-13](#be-13) | `fulfillment.handover` | CSRF, IK | 202 | R19, R42 |
| `recordShipmentEvent` | `POST /shops/{shopId}/shipments/{resourceId}/events` | [BE-13](#be-13) | `fulfillment.write` | CSRF, IK | 200 | R42 |
| `getShippingPolicy` | `GET /shops/{shopId}/shipping-policy` | [BE-11](#be-11) | `shop.manage` | — | 200 | R62 |
| `updateShippingPolicy` | `PUT /shops/{shopId}/shipping-policy` | [BE-11](#be-11) | `shop.manage` | CSRF, IK, Ver | 200 | R62 |

#### API procurement

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listSuppliers` | `GET /shops/{shopId}/suppliers` | [BE-16](#be-16) | `procurement.read` | — | 200 | R44 |
| `createSupplier` | `POST /shops/{shopId}/suppliers` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 201 | R44 |
| `getSupplier` | `GET /shops/{shopId}/suppliers/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | R44 |
| `updateSupplier` | `PATCH /shops/{shopId}/suppliers/{resourceId}` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 200 | R44 |
| `listSupplierOffers` | `GET /shops/{shopId}/supplier-offers` | [BE-16](#be-16) | `procurement.read` | — | 200 | R44 |
| `createSupplierOffer` | `POST /shops/{shopId}/supplier-offers` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 201 | R44 |
| `getSupplierOffer` | `GET /shops/{shopId}/supplier-offers/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | — |
| `listReorderRules` | `GET /shops/{shopId}/reorder-rules` | [BE-16](#be-16) | `procurement.read` | — | 200 | R45 |
| `createReorderRule` | `POST /shops/{shopId}/reorder-rules` | [BE-16](#be-16) | `procurement.manage` | CSRF, IK | 201 | R45 |
| `getReorderRule` | `GET /shops/{shopId}/reorder-rules/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | — |
| `updateReorderRule` | `PUT /shops/{shopId}/reorder-rules/{resourceId}` | [BE-16](#be-16) | `procurement.manage` | CSRF, IK | 200 | R45 |
| `listPurchaseSuggestions` | `GET /shops/{shopId}/purchase-suggestions` | [BE-16](#be-16) | `procurement.read` | — | 200 | R45 |
| `getPurchaseSuggestion` | `GET /shops/{shopId}/purchase-suggestions/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | — |
| `listPurchaseOrders` | `GET /shops/{shopId}/purchase-orders` | [BE-16](#be-16) | `procurement.read` | — | 200 | R46 |
| `createPurchaseOrder` | `POST /shops/{shopId}/purchase-orders` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 201 | R45, R46 |
| `getPurchaseOrder` | `GET /shops/{shopId}/purchase-orders/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | R46 |
| `listGoodsReceipts` | `GET /shops/{shopId}/goods-receipts` | [BE-16](#be-16) | `procurement.read` | — | 200 | R47 |
| `createGoodsReceipt` | `POST /shops/{shopId}/goods-receipts` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 201 | R47 |
| `getGoodsReceipt` | `GET /shops/{shopId}/goods-receipts/{resourceId}` | [BE-16](#be-16) | `procurement.read` | — | 200 | R47 |
| `evaluateReorder` | `POST /shops/{shopId}/purchase-suggestions/evaluate` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 202 | R45 |
| `requestPurchaseApproval` | `POST /shops/{shopId}/purchase-orders/{resourceId}/request-approval` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 200 | R46 |
| `sendPurchaseOrder` | `POST /shops/{shopId}/purchase-orders/{resourceId}/send` | [BE-16](#be-16) | `procurement.send` | CSRF, IK | 202 | R46 |
| `confirmPurchaseOrder` | `POST /shops/{shopId}/purchase-orders/{resourceId}/confirm` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 200 | R46 |
| `postGoodsReceipt` | `POST /shops/{shopId}/goods-receipts/{resourceId}/post` | [BE-16](#be-16) | `procurement.receive` | CSRF, IK | 202 | R47 |
| `setSupplierStatus` | `POST /shops/{shopId}/suppliers/{resourceId}/status` | [BE-16](#be-16) | `procurement.manage` | CSRF, IK | 200 | R44 |
| `cancelPurchaseOrder` | `POST /shops/{shopId}/purchase-orders/{resourceId}/cancel` | [BE-16](#be-16) | `procurement.write` | CSRF, IK | 202 | — |
| `createPurchaseDelegation` | `POST /shops/{shopId}/purchase-delegations` | [BE-20](#be-20) | `procurement.delegation.manage` | CSRF, IK | 201 | R38 |

#### API warehouse

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listWarehouses` | `GET /shops/{shopId}/warehouses` | [BE-09](#be-09) | `inventory.read` | — | 200 | R18, R55, R57, R66, R67 |
| `createWarehouse` | `POST /shops/{shopId}/warehouses` | [BE-09](#be-09) | `warehouses.manage` | CSRF, IK | 201 | R55 |
| `getWarehouse` | `GET /shops/{shopId}/warehouses/{warehouseId}` | [BE-09](#be-09) | `inventory.read` | — | 200 | R55 |
| `updateWarehouse` | `PATCH /shops/{shopId}/warehouses/{warehouseId}` | [BE-09](#be-09) | `warehouses.manage` | CSRF, IK, Ver | 200 | R55 |
| `archiveWarehouse` | `POST /shops/{shopId}/warehouses/{warehouseId}/archive` | [BE-09](#be-09) | `warehouses.manage` | CSRF, IK | 202 | R55 |

#### API customeraddress

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listCustomerAddresses` | `GET /shops/{shopId}/customers/{customerId}/addresses` | [BE-08](#be-08) | `customers.read` | — | 200 | R08, R18 |
| `createCustomerAddress` | `POST /shops/{shopId}/customers/{customerId}/addresses` | [BE-08](#be-08) | `customers.write` | CSRF, IK | 201 | R08 |
| `getCustomerAddress` | `GET /shops/{shopId}/customers/{customerId}/addresses/{addressId}` | [BE-08](#be-08) | `customers.read` | — | 200 | R08 |
| `updateCustomerAddress` | `PATCH /shops/{shopId}/customers/{customerId}/addresses/{addressId}` | [BE-08](#be-08) | `customers.write` | CSRF, IK, Ver | 200 | R08 |
| `archiveCustomerAddress` | `POST /shops/{shopId}/customers/{customerId}/addresses/{addressId}/archive` | [BE-08](#be-08) | `customers.write` | CSRF, IK | 202 | R08 |

#### API account

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listAccounts` | `GET /shops/{shopId}/finance/accounts` | [BE-12](#be-12) | `finance.read` | — | 200 | R56, R57, R58 |
| `createAccount` | `POST /shops/{shopId}/finance/accounts` | [BE-12](#be-12) | `finance.accounts.manage` | CSRF, IK | 201 | R56 |
| `getAccount` | `GET /shops/{shopId}/finance/accounts/{accountId}` | [BE-12](#be-12) | `finance.read` | — | 200 | R56 |
| `updateAccount` | `PATCH /shops/{shopId}/finance/accounts/{accountId}` | [BE-12](#be-12) | `finance.accounts.manage` | CSRF, IK, Ver | 200 | R56 |
| `archiveAccount` | `POST /shops/{shopId}/finance/accounts/{accountId}/archive` | [BE-12](#be-12) | `finance.accounts.manage` | CSRF, IK | 202 | R56 |

#### API catalog

| Operation | HTTP và đường dẫn | Việc chính | Quyền | Header ghi | Thành công | Màn dùng |
|---|---|---|---|---|---|---|
| `listPromotions` | `GET /shops/{shopId}/promotions` | [BE-11](#be-11) | `catalog.read` | — | 200 | R06, R18, R19, R64 |
| `createPromotion` | `POST /shops/{shopId}/promotions` | [BE-14](#be-14) | `catalog.write` | CSRF, IK | 201 | R64 |
| `updatePromotion` | `PATCH /shops/{shopId}/promotions/{resourceId}` | [BE-14](#be-14) | `catalog.write` | CSRF, IK, Ver | 200 | R64 |
| `decidePromotion` | `PATCH /shops/{shopId}/promotions/{resourceId}/decision` | [BE-14](#be-14) | `shop.manage` | CSRF, IK, Ver | 200 | R64 |

### Danh mục quyền

Các preset và vai trò AI dưới đây phục vụ đối chiếu với nguồn. Quyền thực thi còn phụ thuộc membership, tenant, tài nguyên, trạng thái và ủy quyền. Tất cả quyền được kiểm nền ở BE-05. Cột sử dụng cho biết các việc có operation hoặc màn khai báo quyền này trực tiếp. Ca kiểm cần có quyền hợp lệ, thiếu quyền, thu hồi, object khác shop và thay vai trò.

| Quyền | Preset người dùng | Vai trò AI có trong danh mục | Việc sử dụng trực tiếp |
|---|---|---|---|
| `dashboard.read` | `owner`, `manager`, `sales`, `viewer` | — | [BE-07](#be-07) |
| `conversations.read` | `owner`, `manager`, `sales`, `bot_admin` | `sales_admin` | [BE-18](#be-18) |
| `conversations.reply` | `owner`, `manager`, `sales` | — | [BE-08](#be-08), [BE-18](#be-18) |
| `conversations.assign` | `owner`, `manager`, `sales` | — | [BE-18](#be-18) |
| `customers.read` | `owner`, `manager`, `sales` | `sales_admin` | [BE-08](#be-08) |
| `customers.write` | `owner`, `manager`, `sales` | — | [BE-08](#be-08) |
| `catalog.read` | `owner`, `manager`, `sales`, `warehouse`, `bot_admin`, `viewer` | `sales_admin` | [BE-07](#be-07), [BE-08](#be-08), [BE-11](#be-11), [BE-14](#be-14) |
| `catalog.write` | `owner`, `manager` | — | [BE-07](#be-07), [BE-08](#be-08), [BE-14](#be-14) |
| `catalog.import` | `owner`, `manager` | — | [BE-08](#be-08) |
| `inventory.read` | `owner`, `manager`, `sales`, `warehouse`, `viewer` | `warehouse_buyer` | [BE-09](#be-09), [BE-15](#be-15) |
| `inventory.adjust` | `owner`, `manager`, `warehouse` | — | [BE-12](#be-12), [BE-13](#be-13), [BE-15](#be-15) |
| `orders.read` | `owner`, `manager`, `sales`, `warehouse`, `accountant`, `viewer` | `sales_admin` | [BE-11](#be-11), [BE-13](#be-13) |
| `orders.write` | `owner`, `manager`, `sales` | `sales_admin` | [BE-11](#be-11) |
| `orders.confirm` | `owner`, `manager`, `sales` | `sales_admin` | [BE-11](#be-11) |
| `orders.fulfill` | `owner`, `manager`, `warehouse` | — | BE-05 kiểm theo chính sách |
| `orders.return` | `owner`, `manager`, `warehouse` | — | [BE-13](#be-13) |
| `finance.read` | `owner`, `manager`, `accountant` | `accountant` | [BE-12](#be-12), [BE-17](#be-17) |
| `finance.post` | `owner`, `accountant` | — | [BE-12](#be-12) |
| `finance.refund` | `owner`, `accountant` | — | [BE-12](#be-12) |
| `knowledge.read` | `owner`, `manager`, `sales`, `bot_admin` | — | [BE-18](#be-18) |
| `knowledge.write` | `owner`, `bot_admin` | — | [BE-18](#be-18) |
| `knowledge.publish` | `owner`, `bot_admin` | — | [BE-18](#be-18) |
| `bot.read` | `owner`, `manager`, `bot_admin` | `supervisor` | [BE-19](#be-19), [BE-20](#be-20) |
| `bot.configure` | `owner`, `bot_admin` | — | [BE-19](#be-19), [BE-20](#be-20) |
| `bot.publish` | `owner`, `bot_admin` | — | [BE-19](#be-19), [BE-20](#be-20) |
| `integrations.read` | `owner`, `manager`, `bot_admin` | — | [BE-18](#be-18), [BE-19](#be-19) |
| `integrations.manage` | `owner` | — | [BE-18](#be-18), [BE-19](#be-19) |
| `reports.read` | `owner`, `manager`, `accountant` | `accountant` | [BE-17](#be-17), [BE-20](#be-20) |
| `reports.export` | `owner`, `manager`, `accountant` | — | [BE-21](#be-21) |
| `audit.read` | `owner`, `manager`, `accountant` | — | [BE-06](#be-06) |
| `members.manage` | `owner` | — | [BE-05](#be-05) |
| `shop.manage` | `owner` | — | [BE-11](#be-11), [BE-14](#be-14), [BE-21](#be-21) |
| `privacy.manage` | `owner` | — | [BE-21](#be-21) |
| `jobs.read` | `owner`, `manager`, `sales`, `warehouse`, `accountant`, `bot_admin` | — | [BE-06](#be-06), [BE-10](#be-10) |
| `operations.read` | `owner`, `manager`, `sales`, `warehouse`, `accountant`, `bot_admin`, `viewer` | `supervisor` | [BE-13](#be-13), [BE-20](#be-20) |
| `approvals.read` | `owner`, `accountant` | — | [BE-16](#be-16), [BE-20](#be-20) |
| `approvals.request` | `owner`, `manager` | `supervisor` | [BE-16](#be-16) |
| `notifications.manage` | `owner`, `manager` | — | [BE-13](#be-13) |
| `notifications.read` | `owner`, `manager`, `sales`, `warehouse` | — | [BE-13](#be-13) |
| `fulfillment.read` | `owner`, `manager`, `warehouse` | — | [BE-13](#be-13) |
| `fulfillment.write` | `owner`, `manager`, `warehouse` | — | [BE-13](#be-13) |
| `procurement.read` | `owner`, `manager`, `warehouse` | `warehouse_buyer` | [BE-16](#be-16), [BE-20](#be-20) |
| `procurement.write` | `owner`, `warehouse` | `warehouse_buyer` | [BE-16](#be-16) |
| `operations.claim` | `owner`, `manager` | — | [BE-13](#be-13) |
| `operations.manage` | `owner`, `manager` | `supervisor` | [BE-20](#be-20) |
| `approvals.decide` | `owner` | — | [BE-16](#be-16) |
| `fulfillment.handover` | `owner`, `manager`, `warehouse` | — | [BE-13](#be-13) |
| `procurement.manage` | `owner` | — | [BE-16](#be-16) |
| `procurement.send` | `owner` | — | [BE-16](#be-16) |
| `procurement.receive` | `owner`, `warehouse` | — | [BE-16](#be-16) |
| `finance.reconcile` | `owner`, `accountant` | — | [BE-17](#be-17) |
| `finance.close` | `owner`, `accountant` | — | [BE-12](#be-12), [BE-17](#be-17) |
| `bot.pause` | `owner` | — | [BE-20](#be-20) |
| `warehouses.manage` | `owner`, `manager` | — | [BE-09](#be-09), [BE-15](#be-15) |
| `finance.accounts.manage` | `owner`, `accountant` | — | [BE-12](#be-12) |
| `procurement.delegation.manage` | `owner` | — | [BE-20](#be-20) |

### Danh mục sự kiện

Chủ việc dưới đây chịu trách nhiệm nguồn hoặc tình huống phát tín hiệu. BE-10 chịu trách nhiệm đường truyền và ca resume. Kiểm schema, `shopId`, phiên bản, thứ tự, trùng, token scope, quyền đã thu hồi, và resync khi không đọc tiếp được. Với mỗi event, ghi `resourceType` và client read cần làm mới khi triển khai. Đối chiếu [logic làm mới phía frontend](../BotSalesAI_Frontend/apps/web/src/shared/api/event-invalidation.ts).

| Loại | Việc chính |
|---|---|
| `message.created` | [BE-18](#be-18) |
| `conversation.updated` | [BE-18](#be-18) |
| `inventory.updated` | [BE-09](#be-09) |
| `order.updated` | [BE-11](#be-11) |
| `finance.updated` | [BE-12](#be-12) |
| `job.updated` | [BE-10](#be-10) |
| `command.updated` | [BE-06](#be-06) |
| `knowledge.published` | [BE-18](#be-18) |
| `bot.config.updated` | [BE-19](#be-19) |
| `session.revoked` | [BE-04](#be-04) |
| `resync.required` | [BE-10](#be-10) |
| `work_item.updated` | [BE-13](#be-13) |
| `approval.updated` | [BE-16](#be-16) |
| `notification.updated` | [BE-13](#be-13) |
| `shipment.updated` | [BE-13](#be-13) |
| `purchase.updated` | [BE-16](#be-16) |
| `receipt.updated` | [BE-16](#be-16) |
| `journal.updated` | [BE-12](#be-12) |
| `reconciliation.updated` | [BE-17](#be-17) |
| `agent_role.updated` | [BE-20](#be-20) |
| `budget.updated` | [BE-20](#be-20) |
| `health.updated` | [BE-20](#be-20) |
| `warehouse.updated` | [BE-09](#be-09) |
| `customer_address.updated` | [BE-08](#be-08) |
| `account.updated` | [BE-12](#be-12) |
| `accounting_period.updated` | [BE-12](#be-12) |
| `opening_balance.updated` | [BE-12](#be-12) |
| `consent_challenge.updated` | [BE-21](#be-21) |
| `customer_consent.updated` | [BE-21](#be-21) |
| `purchase_delegation.updated` | [BE-20](#be-20) |
| `purchase_reservation.updated` | [BE-20](#be-20) |
| `purchase_suggestion.updated` | [BE-16](#be-16) |

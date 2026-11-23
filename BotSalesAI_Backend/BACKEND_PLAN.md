# Kế hoạch triển khai và theo dõi backend BotSales AI

**Phiên bản 1.81 · 23/11/2026.** Mỗi hành vi có một nơi triển khai và bộ ca kiểm theo thao tác. Kế hoạch xác định baseline tích hợp, cách kiểm ma trận tự động và tiêu chí nghiệm thu ở từng mốc. Mục tiêu Enterprise-Grade được đánh giá trên mã, dữ liệu và artifact triển khai có bằng chứng.

**Giai đoạn hiện tại [bản thử cục bộ](#bản-thử-cục-bộ--be-22).** Chủ dự án chốt dùng máy cá nhân trong giai đoạn thử với hai shop tổng hợp. Kiểm tích hợp thật, cam kết SLO/RPO/RTO và phát hành tiếp tục theo điều kiện nghiệm thu BE-22–BE-24.

- [Kiến trúc](#kiến-trúc-backend-v1) · [Dữ liệu và giao dịch](#quyền-sở-hữu-dữ-liệu-và-giao-dịch) · [Bảng tiến độ](#bảng-theo-dõi) · [Commit theo nhóm](#commit-theo-nhóm) · [Kiểm chứng từng thao tác](#kiểm-chứng-từng-thao-tác)
- [Mốc nghiệm thu](#mốc-nghiệm-thu) · [Kiểm chứng theo module](#kiểm-chứng-theo-module) · [Nhật ký](#nhật-ký-tiến-độ-và-bằng-chứng) · [Ma trận truy vết](#ma-trận-truy-vết-baseline)

## Hiện trạng ngày 23/11/2026

- BE-01 và BE-02 đã kiểm chứng. BE-03–BE-21 đã kiểm chứng cục bộ trên PostgreSQL 18.7, Redis 8.0.5 và HTTPS thử nghiệm. Đợt 1 đã chốt 10 việc, đợt 2 đạt 9/10. Ma trận đối chiếu 259 operation đã đăng ký và 2 endpoint health. [Bảng tiến độ](#bảng-theo-dõi) · [Nhật ký và kết quả từng mốc](#nhật-ký-tiến-độ-và-bằng-chứng)
- Mã hai đợt và bản thử cục bộ đã lên `main` qua PR #31. PR #32 xử lý hai lỗi CI sau merge. CI trên `main@1054b73f` đạt 27/27 job và gói backend có biên nhận xác minh. [CI hợp nhất hai đợt](#ci-hợp-nhất-hai-đợt)
- Đợt bổ sung bảy chức năng đã hợp nhất qua PR #33. PR #34 và PR #35 xử lý các lỗi frontend phát hiện trong CI. Trên `main@8ac4adc2`, CI sau merge đạt 27/27 job và gói backend có biên nhận cùng SHA. [Bằng chứng CI](#ci-hợp-nhất-đợt-bổ-sung)
- BE-22 đã có lệnh kiểm lặp bản thử trên hai shop. Hai lượt Firefox qua HTTPS đều đạt. Hồi quy cục bộ đạt 73/73 ca tích hợp chọn lọc. Nghiệm thu staging vẫn chờ các đầu vào được cấp. [Kết quả pilot](#hồi-quy-bản-thử-hai-shop--be-22)
- BE-23 đã đo tải hai shop, khôi phục sang cụm PostgreSQL riêng và chạy lại export từ Redis thử mới. Bản phục hồi khớp 31 nhóm đối chiếu. Mục tiêu tải, SLO, RPO và RTO trên staging vẫn chờ xác nhận. [Diễn tập hai shop](#tải-và-khôi-phục-hai-shop--be-23)
- Baseline thiết kế và tích hợp là `main@e22bb99d`. Hợp đồng từ [PR #27](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/27) giữ nguyên sau [PR #28](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/28). Baseline gồm R01–R67, 16 module, 259 thao tác và 376 schema. Hợp đồng sau đợt bổ sung có 381 schema với cùng tập thao tác và màn hình. [Bằng chứng CI](#xử-lý-ci-pr-27-và-chọn-baseline) · [SHA-256](#dấu-vân-tay-nguồn)
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
5. **Khi đóng việc**, đối chiếu bằng chứng với đúng phiên bản mã nguồn, contract, migration và môi trường. Dùng commit nền cùng phần thay đổi đã kiểm khi nhóm còn ở máy cục bộ. Chỉ đánh dấu **Đã kiểm chứng** sau khi đủ ca bắt buộc. Nếu phát hiện sai lệch, sửa tại module sở hữu và chạy lại test của các bên phụ thuộc. Mốc staging và nghiệm thu người dùng được theo dõi ở BE-22–BE-24.

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
2. Khi bắt đầu, đặt trạng thái **Đang thực hiện**. Đánh dấu từng checkbox khi bước đó đạt yêu cầu. Khi đã triển khai và còn chờ kiểm tích hợp, đặt **Đã code** và ghi điều còn thiếu.
3. Khi đủ bằng chứng cho mọi tiêu chí của việc, đặt **Đã kiểm chứng**. Nếu thiếu đầu vào hoặc hạ tầng, đặt **Bị chặn** và ghi yêu cầu cụ thể trong nhật ký. Khi thay đổi hợp đồng, migration hoặc bất biến làm mất hiệu lực của bằng chứng, đưa việc liên quan về **Đã code** và chạy lại ca bị ảnh hưởng.
4. Cuối mỗi phiên, ghi bằng chứng, tình trạng và mã BE tiếp theo. Với thay đổi cục bộ, ghi commit nền, phạm vi đã kiểm và đường dẫn bằng chứng. Điền SHA commit nhóm khi chốt. Đếm tiến độ từ bảng. **Đã code hoặc đã kiểm chứng** cho biết số việc đã có triển khai đủ để đưa đi kiểm. **Đã kiểm chứng** cho biết số việc đã đạt nghiệm thu. Nếu bị chặn, giữ dấu các bước đã hoàn thành và ghi lý do vào [nhật ký](#nhật-ký-tiến-độ-và-bằng-chứng).

### Commit theo nhóm

1. **Mặc định gom khoảng 10 đầu việc đã kiểm chứng thành một commit.** Mỗi mã `BE-xx` tính là một đầu việc. Thực hiện theo độ ưu tiên và phụ thuộc trong bảng tiến độ. Mỗi việc vẫn chạy các ca liên quan và cập nhật tracker ngay khi có kết quả. Phần mã, test, migration và tài liệu của nhóm tích lũy trên nhánh triển khai cho tới lúc chốt.
2. Khi chốt nhóm, rà diff, chạy `npm run verify` và các ca tích hợp liên quan trên toàn bộ thay đổi. Ghi danh sách mã BE và bằng chứng vào nhật ký. Đặt thông điệp commit tiếng Việt ghi rõ phạm vi. Nếu công việc cần một SHA để kiểm trên staging, hoặc nhóm còn việc bị chặn bởi đầu vào bên ngoài, có thể chốt sớm phần đã kiểm chứng và ghi rõ lý do. Nhóm cuối gom toàn bộ đầu việc còn lại đã đủ điều kiện.
3. Khi đưa nhóm lên GitHub, mở PR cho cả nhóm. Kiểm CI trên đúng SHA đầu PR và trên merge commit thực tế của `main`. Ghi PR, SHA và link CI vào nhật ký. Gom phần bổ sung bằng chứng sau merge vào lần commit kế tiếp. Với nhóm cuối, ghi phần này trong bàn giao. [Chính sách CI của repo](../.github/CI_POLICY.md)

| Nhóm dự kiến | Thứ tự đầu việc | Số việc |
|---|---|---:|
| Đợt 1 | BE-03 → BE-04 → BE-05 → BE-06 → BE-07 → BE-10 → BE-08 → BE-09 → BE-11 → BE-12 | 10 |
| Đợt 2 | BE-13 → BE-14 → BE-15 → BE-16 → BE-17 → BE-18 → BE-19 → BE-20 → BE-21 → BE-22 | 10 |
| Đợt cuối | BE-23 → BE-24 | 2 |

Đợt 1 có 10/10 việc đã kiểm chứng cục bộ gồm BE-03–BE-12, chốt tại `b236c446` và đã hợp nhất qua PR #31. BE-01 và BE-02 đã kết thúc trước khi áp dụng cách gom này.

Đợt 2 có 9/10 việc đã kiểm chứng cục bộ. Commit `9724078` chốt phần BE-13–BE-21 và cấu hình chạy thử BE-22. PR #31 hợp nhất phần đã sẵn sàng. BE-22 đang ở giai đoạn dùng thử cục bộ và còn các điều kiện nghiệm thu tích hợp thật. [Bản thử cục bộ](#bản-thử-cục-bộ--be-22)

### CI hợp nhất hai đợt

| Lượt kiểm | SHA theo GitHub Actions | Kết quả từng workflow |
|---|---|---|
| [PR #31](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/31) · `pull_request` | `01feffdabb7f8d0196f04b55273afa170c0fe4df` | 27/27 job đạt. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45015595570/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45015595571/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45015595561/attempts/1) |
| Merge PR #31 · `push` vào `main` | `ca18335f14a931f65ce020a3d38a87e87131dde8` | 23/27 job đạt. UI007 làm shard và hai gate frontend thất bại. Kiểm manifest của gói backend thất bại vì `installed-tree.json` nằm trong cây giải nén. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016438569/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016438567/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016438638/attempts/1) |
| [PR #32](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/32) · `pull_request` | `299c4c7f3c1fc42119608fd2f6d72ab26e4bcde8` | 27/27 job đạt, gồm bước kiểm ứng viên trên SHA checkout của PR. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016997734/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016997639/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45016997682/attempts/1) |
| Merge PR #32 · `push` vào `main` | `1054b73f7174739b04faef74b7b55f9050a12466` | 27/27 job đạt gồm frontend 23/23, backend 1/1 và repository hygiene 3/3. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45017900596/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45017900497/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45017900567/attempts/1) |

- Hai PR đều qua đủ 9 check bắt buộc ở chế độ strict. GitHub kiểm nội dung PR #31 tại SHA checkout `16359fa981c4774c50798755ea112a6eb5f30230` và PR #32 tại `e76c916c9f4b9aa8dfce67f7f0a55713814b2aed`. Cây tệp của mỗi merge commit trùng với cây tệp CI đã kiểm. Commit gốc [`9724078`](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/commit/9724078ff43ce9ae48ffab6a94954a2f1c779920) có trong lịch sử `main`.
- PR #31 giảm JavaScript gzip tải đầu của demo dưới ngưỡng 512.000 byte và đồng bộ hộp thoại UI006 với ID đơn mua vừa tạo. Với đối soát R65, ca bổ sung tái hiện việc tính trùng khoản COD rồi kiểm đơn đã quyết toán, số xác minh đúng và không phát sinh cảnh báo sai. Sau sửa, 6/6 ca tài chính đạt trên PostgreSQL cô lập. [Báo cáo frontend](../BotSalesAI_Frontend/evidence/REPORT.md) · [Bộ ca tài chính](tests/integration/finance/finance.test.mjs)
- PR #32 giữ phản hồi đến khi UI007 đã kiểm trạng thái tải, đạt 20/20 lượt cục bộ trên Chromium và Firefox. Workflow lưu hồ sơ phụ thuộc ngoài cây giải nén và kiểm gói cả ở PR lẫn `main`. Artifact ứng viên được phát hành từ `main`. [Workflow backend](../.github/workflows/backend.yml)
- Artifact ID `14752577027` chứa `1054b73f-QwdtB5.tgz` từ checkout sạch. Đã tải artifact, so SHA-256 gói `54c4f72307cc8817dc9c1def39c1675ce3e627b6c8de11b56217b4e1ad5e8360` và đối chiếu SHA-256 manifest `4e1e67e837fe0ebcbd2949c88ae1e9a2e06318528105005434814655a290c85a` với biên nhận `CANDIDATE_EVIDENCE_VERIFIED`. Kiểm chạy ghi nhận 2 endpoint health, 34 tệp web, 330 gói runtime và export tải được với shop có quyền (200) nhưng bị từ chối với shop khác (404). Phạm vi kết quả là CI trên fixture. [Artifact ứng viên](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45017900497/artifacts/14752577027)

### Thứ tự bổ sung bảy chức năng sau rà soát

Đối chiếu theo [báo cáo BE và FE](../BAO_CAO_DOI_CHIEU_CHUC_NANG_BE_FE.md). Ưu tiên các luồng quyết định và ngoại lệ trước, sau đó dùng chung tín hiệu ngoại lệ cho thông báo. Phần nội dung được duyệt cung cấp nguồn cho kịch bản tư vấn. Tích hợp nhà cung cấp thật giữ điều kiện nghiệm thu BE-22.

| Thứ tự | Chức năng | Bổ sung và điều kiện nghiệm thu |
|---|---|---|
| 1 | F04 · Duyệt theo lô | R38 duyệt các hồ sơ đã chọn trên trang, lưu nội dung theo phiên bản người dùng xác nhận. Mỗi hồ sơ dùng `decideApproval` với cùng khóa shop, quyền, hash, hạn và audit. Hàng cũ bị loại với lý do. Khi kết quả chưa rõ, dừng phần còn lại và tra lệnh hiện có. |
| 2 | F03 · Giám sát ngoại lệ | R37/R63 dùng cùng hàng công việc. Ngưỡng v1 gồm hội thoại chưa trả lời sau 15 phút, vận đơn quá 48 giờ sau bàn giao, tồn theo ngưỡng đã lưu và khoản chưa đối soát sau 24 giờ. Đơn chưa ai nhận hiển thị từ công việc chuẩn bị đã có. Khóa nguồn duy nhất theo shop, tự đóng khi nguồn được xử lý và chờ tối thiểu 30 phút trước khi mở lại. |
| 3 | A06 · Loại thông báo và lịch trực | R40 lưu Tắt/Bình thường/Khẩn cho 5 nhóm. Nhóm đơn giữ hành vi hiện hành mặc định. Bốn nhóm bổ sung dùng R39 khi có cấu hình, quyền nguồn và người nhận hợp lệ. Chỉ chủ shop có quyền cho nhóm Khẩn vượt giờ yên lặng. Luồng đặt lịch, kiểm phiên bản và audit dùng policy hiện có. |
| 4 | G02 · Nội dung sản phẩm | R33 mở trình soạn R23, gắn sản phẩm cùng shop và đường dẫn ảnh nguồn. Lưu bản nháp có cấu trúc, kiểm trường bắt buộc và trạng thái sản phẩm khi gửi duyệt hoặc xuất bản. Phiên bản xuất bản qua đánh giá theo hash và policy. Giá và tồn tiếp tục được đọc qua công cụ nghiệp vụ. |
| 5 | B01 · Kịch bản tư vấn theo ngành | R06 mở trình soạn R23 với ngành, vai trò tư vấn, câu hỏi, dữ kiện bắt buộc, giới hạn, chính sách giao và đổi trả. Chỉ bản đã xuất bản đúng policy mới đủ điều kiện đưa vào cấu hình và ngữ cảnh bot. Kiểm điều kiện thiếu chính sách ở bước gửi duyệt. |
| 6 | E08 · Hỏi đáp theo báo cáo | R22 dùng các câu hỏi xác định trước, đọc đúng snapshot `getProfitLoss` đã lọc và dẫn `sourceJournalIds`. Đổi kỳ hoặc dữ liệu làm ẩn kết quả cũ. Không cấp quyền ghi sổ hoặc gửi dữ liệu sang nhà cung cấp AI. |
| 7 | B08 · Bình luận và bản chép lời | R06 cho phép người có quyền nghe và lưu bản chép lời đã kiểm thành ghi chú nội bộ. Backend kiểm chính xác tệp âm thanh sẵn sàng, tin nhắn, hội thoại và shop, cùng khóa chống lặp và audit. Bản thử hỗ trợ WAV PCM. Bình luận → tin riêng và media thật giữ mở ở BE-22, cần quyền API được phê duyệt và kiểm trực tiếp trên Page được cấp. |

Ba migration cộng thêm lần lượt phiên bản quy tắc ngoại lệ, mức ưu tiên và biểu mẫu tri thức. PostgreSQL 18 cô lập có hai shop mẫu và đã áp dụng đủ 44 migration. Kiểm backend đạt ma trận 259 thao tác, 45/45 unit và 44/44 ca PostgreSQL trong các bộ operations, finance, inbox, orders, privacy và AI. Các ca mới kiểm cô lập shop, xử lý đồng thời, lịch yên lặng, nguồn sản phẩm, điều kiện xuất bản và bản chép lời nội bộ. Ca R22 chạy Firefox qua HTTPS với OIDC thử nghiệm, đối chiếu chứng từ trên giao diện với phản hồi API và kiểm thao tác chỉ đọc. [Kết quả FE](../BotSalesAI_Frontend/evidence/REPORT.md)

CI đầu của [PR #33](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/33) dừng ở hai ca tạo khách hàng đồng thời với HTTP 503. Ca hồi quy tái hiện lỗi trên PostgreSQL 18.7 với sáu yêu cầu, gồm hai yêu cầu dùng chung khóa. Bộ điều phối giao dịch thêm khoảng chờ tăng dần có độ lệch ngẫu nhiên và giới hạn ba lần thử lại sau lỗi xung đột có thể phục hồi. Sau sửa, chạy lặp 10 lượt bộ khách hàng đạt 40/40 và kiểm đúng năm bản ghi cho năm khóa. [Job backend ban đầu](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45044330292/job/137275493358)

Lượt kế tiếp qua bộ khách hàng rồi dừng ở bước chờ outbox của bộ SSE. CI chạy bộ SSE ngay sau OIDC và workspace, trước khi các bộ nghiệp vụ sinh thêm sự kiện cho hai shop. Bộ SSE giữ thời hạn cũ, kiểm đủ bốn luồng và dọn đúng sự kiện lỗi do chính bộ kiểm tạo. PostgreSQL và Redis cô lập đạt OIDC 13/13, workspace 9/9, SSE 4/4, khách hàng 4/4 và điều hành 5/5 theo thứ tự mới. [Job backend lượt kế tiếp](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45045091765/job/137277851369)

Cả bảy chức năng nằm trong một commit [`583efb78`](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/commit/583efb7857eb2d9cec5e1794b50d9823807b9c54). Nghiệm thu tích hợp Meta thật và các điều kiện staging tiếp tục theo BE-22. [Bản thử cục bộ](#bản-thử-cục-bộ--be-22)

#### CI hợp nhất đợt bổ sung

| Lượt kiểm | SHA theo GitHub Actions | Kết quả từng workflow |
|---|---|---|
| [PR #33](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/33) · `pull_request` | `583efb7857eb2d9cec5e1794b50d9823807b9c54` | 27/27 job đạt, đủ 9 check bắt buộc. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45045682592/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45045682503/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45045682700/attempts/1) |
| Merge PR #33 · `push` vào `main` | `5064ed354d7cb1c0f3c655223da0c3784f0ab08a` | 23/27 job đạt. Firefox ghi nhận lỗi FE010 và tiêu điểm bàn phím R31, khiến hai gate frontend thất bại. Backend và repository hygiene đều đạt. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45046690809/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45046690973/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45046690789/attempts/1) |
| [PR #34](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/34) · `pull_request` | `74ab2009a6fd94d14b7ff365d36c710921ec9124` | 27/27 job đạt, đủ 9 check bắt buộc. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45048809626/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45048809604/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45048809595/attempts/1) |
| Merge PR #34 · `push` vào `main` | `5f4bfae8c78969f0f3d461507c98eeea6243739f` | 24/27 job đạt. Firefox ghi nhận lỗi điều hướng trong ca thanh toán liên trang, khiến hai gate frontend thất bại. Backend và repository hygiene đạt. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45049851876/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45049851831/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45049851826/attempts/1) |
| [PR #35](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/35) · `pull_request` | `7d57a3cd11fcbd5c69e96b9c6f9702052b54f106` | 27/27 job đạt, đủ 9 check bắt buộc. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45050391235/attempts/1) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45050391222/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45050391230/attempts/1) |
| Merge PR #35 · `push` vào `main` | `8ac4adc27b5ce0daea83393ee88f6fa4c604e838` | 27/27 job đạt gồm frontend 23/23, backend 1/1 và repository hygiene 3/3. [frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45051450963/attempts/2) · [backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45051451037/attempts/1) · [repository-hygiene](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45051450950/attempts/1) |

- Trên `main@8ac4adc2`, lượt 1 của frontend gặp HTTP 500 khi tra cứu job build. Toàn bộ workflow frontend được chạy lại trên cùng SHA, với artifact của đúng lượt chạy. [Job gặp HTTP 500](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45051450963/job/137297252166)
- GitHub checkout nội dung PR #33 tại `3764657793e1225d55ecabe9964bcc5e5562efc4`, PR #34 tại `907a82540dd78d2df40974cc7adda35cb0b32a2b` và PR #35 tại `c7e1749c5d5d183e83138143b8fe1d6a2bd3b5dc`. Cây tệp của mỗi merge commit trùng với cây tệp CI đã kiểm trước merge.
- PR #34 đồng bộ ca FE010 với danh mục đúng shop và ca FE014.S04 với danh sách phê duyệt đã tải. Ở R31, phím Enter trên liên kết bỏ qua chuyển tiêu điểm đến nội dung chính và giữ `#main-content` trên URL. Kiểm lặp trên Chromium và Firefox đạt FE010 10/10, FE014.S04 10/10, UI012 và lô trợ năng R18–R34 12/12. [Báo cáo frontend](../BotSalesAI_Frontend/evidence/REPORT.md)
- PR #35 đồng bộ ca thanh toán với điều hướng và giữ xác nhận số tiền trước và sau thanh toán, chứng từ trong Sổ thu chi khi SSE tắt. Ca này đạt 10/10 lượt trên Chromium và Firefox. [Báo cáo frontend](../BotSalesAI_Frontend/evidence/REPORT.md)
- Artifact ID `14766175632` chứa `8ac4adc2-cTrQ1v.tgz` từ checkout sạch trên `main`. SHA-256 gói `03eef3815efefe99afb712d6620f20aec61ca4b9071e140225da029d9f4fd76d` và SHA-256 manifest `4bb5b47748874fec2ae7799dc279bd1b625e3297b08e81983bedc430f13efc22` khớp biên nhận `CANDIDATE_EVIDENCE_VERIFIED`. Biên nhận chạy thử ghi nhận 2 endpoint health và export tải được ở shop có quyền (200), bị từ chối ở shop khác (404). Kết quả dùng dữ liệu fixture của CI. [Artifact ứng viên](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/45051451037/artifacts/14766175632)

## Bảng theo dõi

| Việc | Ưu tiên | Phụ thuộc | Kết quả cần đạt | Trạng thái |
|---|---|---|---|---|
| [BE-01](#be-01) | P0 | — | Baseline backend, xử lý CI PR #27 và cấu hình thử | Đã kiểm chứng |
| [BE-02](#be-02) | P0 | BE-01 | Workspace, HTTP và kiểm ma trận tự động trong CI | Đã kiểm chứng |
| [BE-03](#be-03) | P0 | BE-02 | PostgreSQL, migration và dữ liệu thử | Đã kiểm chứng |
| [BE-04](#be-04) | P0 | BE-03 | OIDC thử nghiệm và phiên backend | Đã kiểm chứng |
| [BE-05](#be-05) | P0 | BE-04 | Cô lập cửa hàng và quyền server | Đã kiểm chứng cục bộ |
| [BE-06](#be-06) | P0 | BE-05 | Chống ghi trùng, nhật ký và outbox | Đã kiểm chứng cục bộ |
| [BE-07](#be-07) | P0 | BE-06 | Tạo sản phẩm qua frontend live | Đã kiểm chứng cục bộ |
| [BE-10](#be-10) | P1 | BE-06 | Worker và phục hồi tác vụ | Đã kiểm chứng cục bộ |
| [BE-08](#be-08) | P1 | BE-07, BE-10 | Danh mục, biến thể, khách và địa chỉ | Đã kiểm chứng cục bộ |
| [BE-09](#be-09) | P1 | BE-08 | Sổ kho, số tồn và giữ hàng | Đã kiểm chứng cục bộ |
| [BE-11](#be-11) | P1 | BE-09, BE-10 | Đơn nháp, báo giá, chốt đơn, R62 và đọc ưu đãi | Đã kiểm chứng cục bộ |
| [BE-12](#be-12) | P1 | BE-11 | Thu tiền, COD, sổ kép và điều chỉnh kho có đối ứng | Đã kiểm chứng cục bộ |
| [BE-13](#be-13) | P1 | BE-12 | Chuẩn bị, giao, trả hàng và thông báo | Đã kiểm chứng cục bộ |
| [BE-14](#be-14) | P2 | BE-13 | Combo và hoàn theo giá sau giảm R64 | Đã kiểm chứng cục bộ |
| [BE-15](#be-15) | P2 | BE-09, BE-12 | Kiểm kê R66 và chuyển kho R67 | Đã kiểm chứng cục bộ |
| [BE-16](#be-16) | P2 | BE-09, BE-10, BE-12 | Mua và nhận hàng từng phần | Đã kiểm chứng cục bộ |
| [BE-17](#be-17) | P2 | BE-14, BE-15, BE-16 | Đối soát, khóa kỳ, báo cáo và R65 | Đã kiểm chứng cục bộ |
| [BE-18](#be-18) | P2 | BE-08, BE-14 | Inbox, media và tri thức | Đã kiểm chứng cục bộ |
| [BE-19](#be-19) | P2 | BE-11, BE-18 | AI, công cụ bán hàng và đánh giá | Đã kiểm chứng cục bộ |
| [BE-20](#be-20) | P2 | BE-10, BE-17, BE-19 | Điều phối, phê duyệt, marketing và R63 | Đã kiểm chứng cục bộ |
| [BE-21](#be-21) | P2 | BE-20 | Quyền riêng tư, xuất dữ liệu và kiểm toàn phạm vi | Đã kiểm chứng cục bộ |
| [BE-22](#be-22) | P3 | BE-21 | Staging và dịch vụ ngoài đã cấp quyền | Pilot hai shop đạt cục bộ, chờ môi trường và quyền |
| [BE-23](#be-23) | P3 | BE-21 | Bảo mật, tải, phục hồi và CI/CD | Tải và khôi phục hai shop đạt cục bộ, chờ staging |
| [BE-24](#be-24) | P3 | BE-22, BE-23 | UAT, phát hành giới hạn và bàn giao | Hồi quy gói đạt cục bộ, chờ staging và UAT |

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
| P0-07 | BE-06, chạy lại ở BE-07 | Commit DB rồi làm mất phản hồi trước khi UI biết kết quả. Tải lại và tra theo intent bằng quyền hiện hành, đúng người tạo và đúng shop. DB có đúng một membership ở ca BE-06. BE-07 áp dụng lại tiêu chí cho SKU thật. |
| P0-08 | BE-07 | Firefox hoặc Chromium chạy `dev:live` từ R01 → R02 → R04 → R09 → R10 → R11. `getDashboard` 200 theo contract; `listCategories` và `listProducts` trả đúng shop; `createProduct` 201; `getProduct` và danh sách đọc đúng SKU sau reload và sau restart API. Đối chiếu với PostgreSQL. |
| P0-09 | BE-07 | `p0-reader` xem được catalog A nhưng `createProduct` bị 403; API cũng từ chối khi gọi trực tiếp. SKU trùng cùng shop 409, cùng SKU khác shop được phép với người có quyền ghi ở shop đó. Bài thử đối chứng danh sách rỗng vẫn 200 đúng schema. |
| P0-10 | BE-07 | Shell vào shop trong cấu hình SSE còn giới hạn; kiểm trạng thái giao diện và tải lại đọc đúng dữ liệu. Lưu giới hạn realtime trong bằng chứng P0. BE-10 nghiệm thu phát lại và mất kết nối SSE cùng worker. |

P0 kết thúc khi đủ bằng chứng HTTP, PostgreSQL và browser live của các ca trên. BE-08 nhận phần ảnh/chỉnh sửa; BE-10 nhận Redis, worker và SSE thật. Tham chiếu ca và operation hiện hành trong [ma trận truy vết](#ma-trận-truy-vết-baseline).

**Bằng chứng đóng BE-01.** Đủ 5/5 mục chuẩn bị và đã ghi baseline, CI, tracker, toolchain, hồ sơ môi trường và danh mục ca P0. BE-02 nhận cấu hình này để triển khai workspace và kiểm cài trên checkout thực. Các ca runtime của backend được xác nhận ở đầu việc sở hữu sau khi có mã chạy.

### BE-02

**Dựng workspace, kiểm giao tiếp HTTP và ma trận tự động** · T007–T009

- [x] Tạo workspace Node/TypeScript riêng có `apps/api`, manifest, lockfile và tài liệu chạy. Tách việc mở cổng trong `main.ts` khỏi hàm khởi tạo ứng dụng để test và worker tái sử dụng. Khai báo biến môi trường mẫu bằng tên hoặc placeholder.
- [x] Nối tiền tố `/api/v2`, lớp kiểm dữ liệu đầu vào, định dạng lỗi theo contract và mã truy vết. Thêm kiểm tra liveness và readiness cho vận hành. Khai báo phiên bản runtime trong tài liệu bộ công cụ.
- [x] Lệnh `npm run verify` đạt typecheck, lint, test, kiểm ranh giới và hợp đồng trên checkout sạch. GitHub Actions đạt trên đầu PR và merge commit thực tế của `main`.
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
| HTTP qua điểm khởi động thực | Tiến trình build khởi động trên cổng loopback tạm. `GET /api/v2/health/live` và `GET /api/v2/health/ready` trả 200. Query ngoài schema trả 400 `VALIDATION_FAILED` theo `application/problem+json`, với `X-Request-Id` khớp `requestId`. Ca kiểm xác nhận readiness lỗi trả 503, liveness vẫn 200 và readiness trở lại 200; thiếu cấu hình bind/port thoát mã 1. Ca hồi quy của PR #29 xác nhận JSON vượt giới hạn trả 413 `PAYLOAD_TOO_LARGE` theo schema `Problem`, với mã truy vết khớp header. |
| Ma trận và ca đối chứng | `npm run verify` đạt lint, ranh giới, typecheck, build, ma trận và 18/18 ca trên bản chốt PR #29. Snapshot Windows đầu tiên đạt 17/17, trước khi thêm ca 413. Ma trận đối chiếu 9 dấu vân tay, 24 việc, 67 màn, 259 operation và 376 schema, với hai route vận hành đã đăng ký và 0 operation sản phẩm được bật. Hai sai lệch đã biết vẫn có chủ việc ở BE-10 và BE-21. Thử bỏ dòng `getCsrfToken` trong bản sao cho mã thoát 1 và báo đúng operation thiếu. Phục hồi ma trận cho kết quả PASS. |
| CI trước merge | [PR #29](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/29) có đầu nhánh `42790b0d78fa1ee3250d3f4eb78dd643dd1f1894`. Đủ 27/27 job thành công (1 backend, 23 frontend, 3 vệ sinh repo). Mỗi workflow được đối chiếu theo sự kiện `pull_request` và đúng lần chạy. Checkout hợp nhất do GitHub tạo là `be37cac50550f15f46f2200795b33ba100aa285e`. [Backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44865789619/attempts/1) · [Frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44865789635/attempts/1) · [Vệ sinh repo](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44865789632/attempts/1) · [Báo cáo ma trận](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44865789619/artifacts/14691597918) |
| CI sau merge | Merge commit trên `main` là `859fed45ac5b8c4e87f2820acf9af6e806ece976`. Đủ 27/27 job thành công với sự kiện `push`. Báo cáo ma trận đạt, mang đúng SHA merge commit, dùng baseline `e22bb99d` và khớp SHA-256 artifact. [Backend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44866613596/attempts/1) · [Frontend](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44866613542/attempts/1) · [Vệ sinh repo](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44866613509/attempts/1) · [Báo cáo ma trận](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44866613596/artifacts/14692396194) |

**Bằng chứng đóng BE-02.** Đủ 5/5 mục. P0-01 đã đạt trên checkout sạch cục bộ và CI. Ở BE-02, readiness được kiểm bằng điều kiện phụ thuộc thử. BE-03 nối kiểm tra vào PostgreSQL. [Hướng dẫn chạy backend](README.md) · [Phạm vi đăng ký hiện tại](api-scope.json)

### BE-03

**Dựng PostgreSQL và nền dữ liệu** · T013

- [x] Tạo Prisma schema và migration cho user, shop, membership, session và các bảng hạ tầng cần ở BE-06. Có dữ liệu kho tối thiểu dùng chung với BE-09 vì `Shop` yêu cầu `defaultWarehouseId`. Dùng khóa ngoại và unique theo `shopId` cho tài nguyên thuộc cửa hàng. Tách quyền chạy ứng dụng và quyền chạy migration.
- [x] Viết seed dữ liệu thử có thể chạy lại an toàn cho hai shop, thành viên theo quyền khác nhau và kho mặc định thuộc đúng shop. BE-07 thêm danh mục mẫu qua mô hình Catalog. Kiểm cấu hình tiền tệ, thời gian, ID, trường phiên bản và kiểu số chính xác trước khi làm bảng giao dịch.
- [x] Kiểm chứng migration từ DB trống và test tích hợp trên PostgreSQL. Dữ liệu còn sau khi khởi động lại API. Truy vấn có thể tham gia cùng transaction, ghi liên shop sai bị khóa ngoại từ chối, readiness phản ánh việc thiếu DB.

#### Kết quả kiểm BE-03

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| PostgreSQL và migration | PostgreSQL 18.7 trên Ubuntu WSL, Node 24.22.3 và npm 11.17.0 trên Windows. Schema `public` có 0 bảng trước khi chạy `npm run db:migrate`. Lượt đầu áp dụng `20261121000100_be03_foundation`, lượt hai báo hết migration chờ. `prisma migrate diff --from-config-datasource --to-schema apps/api/prisma/schema.prisma --exit-code` báo không có khác biệt. [Schema](apps/api/prisma/schema.prisma) · [Migration](apps/api/prisma/migrations/20261121000100_be03_foundation/migration.sql) |
| Seed và kiểu dữ liệu | `npm run db:seed` tạo 2 shop, 2 kho mặc định cùng shop, 3 user và 3 membership theo preset đã chốt. Hai lượt seed đồng thời giữ nguyên số bản ghi, ID và dữ liệu fixture. A dùng VND và `Asia/Ho_Chi_Minh`, B dùng LAK và `Asia/Vientiane`. Seed và schema kiểm UUID, version dương, phiên hết hạn dạng thời điểm UTC và phép cộng PostgreSQL `NUMERIC` cho kết quả chính xác `0.3`. Bảng nghiệp vụ tiền bắt đầu ở mốc sở hữu. [Fixture](apps/api/prisma/p0-fixture.mjs) |
| Phạm vi shop và rollback | PostgreSQL cho cùng mã kho ở hai shop, từ chối trùng trong cùng shop và từ chối FK kho mặc định, actor của command hay command của outbox tham chiếu sang shop khác. Truy vấn dùng khóa ghép trả rỗng khi tra kho A dưới shop B. Rollback giữ 0 bản ghi phát sinh trong cả command, audit và outbox. Role runtime bị từ chối DDL và cập nhật audit. Quyền truy cập theo membership ở HTTP thuộc BE-05. [Bộ ca tích hợp DB](tests/integration/database/postgres.test.mjs) |
| Readiness và độ bền | Tiến trình API thực trả readiness 503 trước migration và 200 sau migration và seed. Dừng PostgreSQL làm readiness trả 503 `SERVICE_UNAVAILABLE` theo schema `Problem` trong khi liveness vẫn 200. Sau khi khởi động lại PostgreSQL, readiness tự về 200. Khởi động lại API và đọc lại xác nhận cả hai shop cùng dữ liệu fixture vẫn còn. |
| Bộ kiểm và môi trường CI | `npm run verify` đạt 19/19 ca, `npm run test:postgres` đạt 6/6 ca và `npm audit` báo 0 lỗ hổng tại thời điểm kiểm. Giữ Prisma 7.10.1 và khóa phụ thuộc CLI `effect` ở bản vá 3.22.1. Workflow đã nối bộ kiểm PostgreSQL bằng Compose với volume riêng, chờ lượt chạy GitHub Actions khi đưa mã lên PR. Môi trường nghiệm thu cục bộ dùng PostgreSQL tương đương trên WSL. [Workflow](../.github/workflows/backend.yml) · [Bản vá phụ thuộc](https://github.com/advisories/GHSA-7589-6fvf-x4pw) |

**Bằng chứng đóng BE-03.** Đủ 3/3 mục và đạt P0-02 cục bộ. Mã gốc là `main@c873f1eb` cùng thay đổi BE-03 đang kiểm. Log chạy DB ở `test-results/backend/be03/postgres.txt` (SHA-256 `853270129c42aa1cc26c9f78756a02fed658eab9c467f6de26a47de21595cf59`). Snapshot schema ở `test-results/backend/be03/schema.sql` (SHA-256 `3f009537eaa34293e947b3d4b3e4d1eb743205bc91e7fc65e6897288ad4ce015`). [Quy trình cài và khôi phục](README.md)

### BE-04

**Nối đăng nhập OIDC thử nghiệm và phiên** · T014

- [x] Triển khai `getCsrfToken`, `beginLogin`, `completeLogin`, `getSession` và `logout`. Dùng IdP thử nghiệm qua HTTPS, kiểm state, nonce, PKCE và đích quay về. Phiên cookie dùng chính sách cùng origin và bảo vệ CSRF.
- [x] Nối frontend `dev:live` qua origin HTTPS và callback đã chốt ở BE-01. Dùng một đích trả về hợp lệ có sẵn ở mốc này để kiểm callback, cookie, `getSession`, refresh, hết hạn và logout. BE-05 kiểm chuyển sang danh sách shop qua `listShops` và BE-07 kiểm luồng sản phẩm.
- [x] Kiểm chứng phản hồi đúng contract, cookie và CSRF hợp lệ, phiên hết hạn bị chặn, token và nội dung định danh nhạy cảm được loại khỏi log.

#### Kết quả kiểm BE-04

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| P0-03 · Vòng HTTPS | Firefox dùng profile riêng tin CA thử. Frontend `dev:live` tại `https://localhost:5173` gọi API loopback và chuyển tới IdP tại `https://127.0.0.1:9443`. Callback thật trả 302 về `/login`, frontend nhận phiên 200 và giữ phiên sau khi tải lại. Nút tiếp tục hiển thị trên bản dev. Cookie `__Host-bs_session` có Secure, HttpOnly, SameSite=Lax, Path=/ và phạm vi host. [Cách chạy OIDC thử](README.md#chạy-oidc-thử-qua-https) |
| P0-04 · Ca đối chứng | Sáu ca tích hợp HTTPS kiểm đúng response OpenAPI, CSRF, origin, idempotency key và đích quay về. Callback sai state, sai trình duyệt, code, PKCE, nonce, issuer, audience, chữ ký hoặc hết hạn bị từ chối. Hai callback đồng thời chỉ tạo một phiên. Đăng nhập lại thu hồi phiên cũ. Logout trả 204, phiên đã thu hồi hoặc hết hạn trả 401. [Bộ ca OIDC](tests/integration/auth/auth.test.mjs) |
| Dữ liệu và phiên | Lượt đăng nhập trong PostgreSQL có thời hạn 10 phút và xóa nonce/verifier khi callback nhận xử lý. Session lưu hash của cookie và hết hạn sau 8 giờ. Định danh theo issuer/subject. Migrate từ DB trống và từ bản sao BE-03 đều đạt. Seed chuyển ba danh tính fixture sang issuer thực của IdP thử, giữ nguyên ID user, membership, hai shop và hai kho. [Migration OIDC](apps/api/prisma/migrations/20261121000200_be04_oidc/migration.sql) |
| Log và hồi quy | Đã đối chiếu log tiến trình khi chạy Firefox với giá trị cookie, CSRF, client secret, email thử, state và authorization code. Các giá trị này vắng mặt trong log. `npm run verify` đạt 20/20 ca, bộ PostgreSQL 6/6 và bộ OIDC 6/6. Kiểm ma trận xác nhận 5 operation xác thực cùng 2 route vận hành. [Phạm vi đăng ký](api-scope.json) |
| CI và phạm vi tiếp theo | Workflow backend đã nối bộ kiểm HTTPS với DB và chứng thư thử độc lập. Kết quả GitHub Actions sẽ ghi khi đợt 1 lên PR. BE-05 nghiệm thu danh sách shop và quyền trên tài nguyên. BE-22 nghiệm thu IdP được cấp quyền. [Workflow backend](../.github/workflows/backend.yml) |

**Bằng chứng đóng BE-04.** Đủ 3/3 mục và đạt P0-03/P0-04 cục bộ. Mã nền `main@c873f1eb` cùng thay đổi BE-03 và BE-04. Log OIDC ở `test-results/backend/be04/oidc.txt` (SHA-256 `358dd2df6cdded1051d6201e0ba7f9398734f7005407248bff3c3687144bd4b9`). Log Firefox ở `test-results/backend/be04/firefox.txt` (SHA-256 `033875b5e2a5d1d5b3cea01d927c9812c100eba1be16888d34c2b4fdeae8f25a`). Log nâng cấp DB ở `test-results/backend/be04/upgrade.txt` (SHA-256 `b79ca44d8ef0dd85efeab0bae7db0a12ef3dcd577a001459c720c365379f8131`).

### BE-05

**Cô lập dữ liệu và quyền theo cửa hàng** · T015, T018

- [x] Triển khai `listShops`, `getShop` và quyền hiệu lực theo membership. Cùng ngữ cảnh quyền kiểm truy vấn nhân sự, ghi thu hồi và capability `revokeMembership` trả qua `allowedActions`.
- [x] Nối chọn shop ở R02 sau đăng nhập, xem membership và thu hồi quyền trên R32. Kiểm danh sách, chi tiết, ghi và tài nguyên theo ID qua API. SSE và worker tái sử dụng kiểm tra quyền khi có ở BE-10.
- [x] Kiểm chứng P0-05 với shop A và B, người đọc và người quản trị, membership đã bị thu hồi. Quyền UI và khả năng gọi trực tiếp API cho cùng kết quả khi frontend đọc lại phiên và phạm vi shop.
- [x] Hoàn tất `inviteMember` và `updateMemberRoles` của R32 theo ma trận. Kiểm vòng đời lời mời, quyền đổi vai trò, phiên bản quyền, chống ghi trùng và audit.

#### Kết quả kiểm BE-05

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| P0-05 · Phạm vi shop | `p0-reader` và `p0-editor` chỉ nhận shop A, `p0-editor-b` chỉ nhận shop B. Đọc chi tiết shop khác hoặc ID hợp lệ không tồn tại trả cùng dạng 404. Danh sách lọc quyền trước khi phân trang. Ca kiểm có tìm kiếm theo tên và con trỏ qua hai trang cùng phạm vi. [Bộ ca workspace](tests/integration/workspace/shops.test.mjs) |
| Nhân sự và thu hồi | Xem chi tiết member dùng khóa ghép shop và member. Người đọc cùng shop bị từ chối quyền quản trị. Thu hồi hợp lệ tăng `permissionVersion`, ghi audit và command trong một transaction, trả 204. Hai request cùng intent chỉ ghi một lần. Hai chủ shop thu hồi lẫn nhau đồng thời chỉ một yêu cầu thành công, chủ shop còn lại vẫn hoạt động. Server kiểm CSRF, If-Match và scope trước khi ghi. |
| Firefox · R02 và R32 | Frontend `dev:live` trên HTTPS đăng nhập vào R02, chọn shop A và nhận `getShop` 200. Đường dẫn trực tiếp sang B hiện cảnh báo quyền. Chủ shop thu hồi reader qua nút ở R32. Với chính cookie cũ của reader, `getSession` vẫn 200, danh sách shop rỗng và URL shop A bị từ chối. Dữ liệu Tổng quan được nối ở BE-07. [Bộ kiểm trình duyệt](tests/integration/workspace/browser-cases.mjs) |
| Migration và hồi quy | PostgreSQL 18.7 áp dụng từ DB trống và trên bản sao BE-04. Migration bổ sung `created_at` và index phân trang, giữ nguyên shop, membership và phiên hiện có. Prisma không báo lệch schema. `npm run verify` đạt 20/20, PostgreSQL 6/6, OIDC 6/6, workspace 5/5. Ma trận có 10 operation được bật và 2 route vận hành. [Migration](apps/api/prisma/migrations/20261121000300_be05_membership_order/migration.sql) · [Phạm vi đăng ký](api-scope.json) |
| R32 · Tạo và nhận lời mời | `inviteMember` trả 201 và tạo membership `invited` có hạn 7 ngày. Membership chỉ có hiệu lực sau callback của đúng issuer và email đã xác minh. Lời mời hết hạn, đã thu hồi, email chưa xác minh hoặc sai issuer không tạo quyền. Chủ shop có thể mời lại sau khi hết hạn. Người quay lại với email đã thay đổi giữ nguyên danh tính theo issuer/subject và lịch sử membership. Fixture HTTPS kiểm cả trường hợp subject khác dùng cùng email với lời mời đã gắn danh tính. R32 ghi lời mời trong hệ thống. Phần gửi thư cần tích hợp kênh email riêng. [Bộ ca HTTPS OIDC](tests/integration/auth/auth.test.mjs) |
| R32 · Quyền và phiên bản | Quyền được kiểm theo shop và phiên hiện hành. Chỉ cấp preset trong phạm vi quyền của người thao tác. Tự sửa vai trò hoặc cấp/sửa vai trò `owner` bị từ chối. Luồng xác minh nâng cao thuộc BE-21. `updateMemberRoles` trả 428 khi thiếu `If-Match` và 412 với phiên bản cũ. Vai trò thay đổi tăng `permissionVersion` và có hiệu lực ở lần đọc tiếp theo của phiên hiện có. Cùng khóa và nội dung ghi một lần, nội dung khác trên khóa cũ trả 409. Vai trò giữ nguyên không tăng phiên bản. [Bộ ca workspace](tests/integration/workspace/shops.test.mjs) |
| R32 · Transaction và audit | Ghi thay đổi, audit và command trong cùng transaction đối với thao tác quản trị. Callback ghi kích hoạt, audit và phiên đăng nhập trong cùng transaction. Audit lưu shop, actor, member, mã truy vết, phiên bản hoặc thay đổi vai trò theo hành vi. Đã kiểm audit khi tạo, đổi vai trò, nhận lời mời, thu hồi, hết hạn khi mời lại và đối chiếu thành viên quay lại. Email và dữ liệu xác thực không nằm trong audit. |
| R32 · Kiểm giao diện live | Firefox qua HTTPS thực hiện mời và đổi vai trò trên desktop, xác minh hạn và thao tác được phép ở chiều rộng 390 px, rồi kiểm thu hồi với phiên cũ. Frontend dùng `allowedActions` từ server và báo đã tạo lời mời trong hệ thống. Bằng chứng cục bộ có ảnh baseline trước khi sửa câu báo thành công và log kiểm sau sửa. `npm run verify` frontend đạt, gồm 279 ca Vitest và kiểm hash S17 của consumer. [Ca trình duyệt](tests/integration/workspace/browser-cases.mjs) · [Frontend workspace](../BotSalesAI_Frontend/apps/web/src/modules/workspace/index.tsx) |
| R32 · Migration và hồi quy | PostgreSQL 18.7 áp dụng đủ 4 migration từ DB trống và nâng cấp bản sao BE-05 P0. Snapshot trước/sau nâng cấp giữ nguyên shop, membership, phiên và cặp định danh OIDC. Prisma không báo lệch schema. `npm run verify` backend 20/20, PostgreSQL 6/6, OIDC 9/9, workspace 6/6. Ma trận có 12 operation sản phẩm và 2 route vận hành. [Migration lời mời](apps/api/prisma/migrations/20261121000400_be05_member_invites/migration.sql) · [Phạm vi đăng ký](api-scope.json) |
| Trạng thái bàn giao | BE-05 đã kiểm chứng cục bộ, đạt 4/4 mục. Workflow backend gọi các ca PostgreSQL, OIDC và workspace. Kết quả GitHub Actions được ghi theo SHA khi đợt 1 lên PR. [Workflow backend](../.github/workflows/backend.yml) |

Mã nền `main@c873f1eb` cùng thay đổi BE-03 đến BE-05 cục bộ. Log API ở `test-results/backend/be05/workspace-api.txt` (SHA-256 `fe1741f0c7838b56315b5091fec8caa7fa7975c219e14560ffb1c0349a209e09`). Log Firefox ở `test-results/backend/be05/firefox.txt` (SHA-256 `4cf8a272ba0d8fd3c172fab9bf07e4d5da95e8d742b7382559def35d8fe3894d`). Log nâng cấp ở `test-results/backend/be05/upgrade.txt`.

Bằng chứng bổ sung của R32 được lưu cục bộ trong `test-results/backend/be05/r32/`. Các log chính gồm `oidc-and-invite.txt` (SHA-256 `7ed426f25a6b7b8b8c4fb3ca9bb2d45028e9a8f1f1cd73ef505809b6150158ae`), `workspace-api.txt` (SHA-256 `ec41485bf741655d505d36cae88a11362dec8076cb34aaa59b988d18658152cf`), `firefox.txt` (SHA-256 `ee9bf04a57d066c2e1958a623f92942c3302b8be5ce16359cd5cdb52b609b1ca`), `upgrade.txt` và `frontend-verify.txt`. Phạm vi dùng dữ liệu và IdP tổng hợp. IdP được cấp quyền nghiệm thu ở BE-22.

### BE-06

**Chống ghi trùng và ghi nhật ký bền vững** · T016

- [x] Dùng chung bộ ghi command cho R32. Khóa chống trùng theo người tạo, shop và operation, kèm hash nội dung đã chuẩn hóa và tham chiếu kết quả. Giữ `If-Match` ở các thao tác cần phiên bản. Ghi thay đổi nghiệp vụ, audit và outbox trong cùng transaction.
- [x] Nối `listCommands`, `getCommand` và `listAuditEvents` trên hợp đồng hiện có. Chốt tra theo mã đối chiếu trước khi biết `commandId`, phạm vi người đọc, thời gian giữ tham chiếu và trạng thái có thể đối chiếu sau khi tải lại.
- [x] Kiểm 409, 412, 428, ghi song song, rollback, mất phản hồi sau commit, tra sai shop/chủ thể, mất quyền và trạng thái chưa kết thúc. BE-07 áp dụng lại ca mất phản hồi cho SKU thật.

#### Kết quả kiểm BE-06

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| P0-06 · Giao dịch | Gửi hai yêu cầu mời song song cùng khóa và cùng ý nghĩa chỉ tạo một membership, một command, một audit và một sự kiện `command.updated`. Đổi nội dung với khóa cũ trả 409. Sửa vai trò và thu hồi giữ kiểm 412/428. Lỗi chủ động trước commit hủy cả bốn bản ghi. [Bộ ca workspace](tests/integration/workspace/shops.test.mjs) |
| P0-07 · Tra cứu và phân quyền | Nếu đã biết mã lệnh, đọc bằng `getCommand`. Nếu chưa biết, dùng `listCommands` với `kind` là operation và `q` là SHA-256 dạng hex của khóa intent. Transaction đọc yêu cầu membership hiện hành, `jobs.read`, quyền của thao tác nguồn và đúng người tạo. R32 đã đăng ký chính sách nguồn. Lệnh được lọc trước khi phân trang. Phạm vi điều phối liên chủ thể chưa được cấp. Phản hồi chỉ trả tham chiếu kết quả an toàn, không trả khóa gốc hoặc hash yêu cầu. |
| P0-07 · Mất phản hồi sau commit | Firefox qua HTTPS đã xác nhận lỗi baseline làm mất mã đối chiếu khi tải lại. Sau sửa, trình kiểm chuyển đúng POST tới API, nhận 201 từ upstream rồi ngắt phản hồi trước khi frontend thấy kết quả. Tải lại tab và tra được `succeeded` qua GET ở 390 px. Đối chiếu DB có đúng một membership, một command, một outbox và một audit. R34 đọc được bản ghi đó. [Ca trình duyệt](tests/integration/workspace/browser-cases.mjs) |
| Trạng thái và lưu giữ | Trình duyệt ghi mã đối chiếu, operation và phạm vi người dùng/shop vào `sessionStorage` trước khi gửi. Tham chiếu giữ qua tải lại trong cùng tab và được xóa khi xác nhận `succeeded` hoặc `failed`. Không tìm thấy lệnh, `accepted`, `running` và `unknown` tiếp tục giữ chặn gửi lại. Ledger PostgreSQL giữ tham chiếu bền vững. Quy tắc lưu giữ dữ liệu thật thuộc BE-21. |
| R34 · Audit và outbox | `listAuditEvents` yêu cầu `audit.read` trong shop. Phản hồi gồm tác nhân, hành động, tham chiếu tài nguyên, thời gian, tóm tắt và mã truy vết. DB giữ audit chỉ thêm đối với role runtime. Outbox lưu tham chiếu lệnh trong cùng transaction. BE-10 xử lý lease, phát sự kiện và phục hồi phân phối. |
| Migration và hồi quy | PostgreSQL 18.7 chạy đủ 5 migration từ DB trống, Prisma không báo lệch schema. Nâng cấp bản sao BE-05 giữ nguyên snapshot command và số audit/outbox, đồng thời điền mã đối chiếu cho 8/8 command cũ. Backend `verify` 20/20, PostgreSQL 6/6, OIDC 9/9, workspace 9/9. Ma trận có 15 operation sản phẩm và 2 route vận hành. [Migration](apps/api/prisma/migrations/20261121000500_be06_command_lookup/migration.sql) · [Phạm vi đăng ký](api-scope.json) |
| Hồi quy frontend | `npm run verify` đạt với 279 ca Vitest và validator hash S17 cho các consumer đã sửa. Hoàn tất 4/4 ca demo về kết quả lệnh chưa rõ ở R19 và R46 trên Chromium/Firefox. |
| Trạng thái bàn giao | BE-06 đạt 3/3 mục cục bộ. Ca phục hồi đã chạy với lời mời R32 và dữ liệu thử. GitHub Actions được đối chiếu theo SHA khi đợt 1 lên PR. [Workflow backend](../.github/workflows/backend.yml) |

Mã nền `main@c873f1eb` cùng thay đổi BE-03–BE-06 cục bộ. Bằng chứng nằm ở `test-results/backend/be06/`. Các log chính gồm `workspace-api.txt` (SHA-256 `8f12e5cb9c1273cb34b964609a59e4f7f62afe5fd7182c19b3beba9a30a8118d`), `browser-firefox.txt` (SHA-256 `3fd9ad2a46c04e7635f54bdd0b8b1030c8947cad435a6a656324e770c2895c69`), `upgrade-proof.txt` (SHA-256 `85c9412640b03d549da1b06f2cccc18f67df8294a37cf098d05a504c583df3cf`), `frontend-verify.txt` và `frontend-recovery-demo.txt`.

**Kiểm lại ngày 21/11/2026.** BE-06 đã nằm trong commit gom đợt 1 cục bộ `b236c446`. Trên checkout hiện tại gồm SHA này và các thay đổi cục bộ, `npm run verify` đạt 22/22 ca, ma trận khớp 259 operation sản phẩm và 2 route health. Bộ workspace đạt 9/9 trên PostgreSQL thử, gồm ghi song song, rollback, quyền đọc lệnh và audit. Firefox qua HTTPS gửi đúng một POST mời thành viên, ngắt phản hồi sau khi API trả 201, tải lại ở luồng R32 và tìm lại lệnh qua `listCommands` ở 390 px. `getCommand` trả cùng kết quả. R34 hiển thị đúng một dòng audit và PostgreSQL xác nhận đúng một membership, command, audit và outbox. Kiểm lại dùng fixture cục bộ, chưa có kết quả GitHub Actions theo SHA đợt 1.

**Hồi quy trên gói v1.42.** Ca P0-07 đạt lại trong Firefox qua Caddy, chạy API và worker từ bản giải nén có 32 migration. Đối chiếu đúng một POST, một membership, một command, một audit và một outbox sau khi tải lại và tìm theo intent. Bằng chứng `browser-workspace.txt` và checksum trong [hồ sơ gói T069](#tiếp-nhận-webhook-meta-messenger--t069).

Log kiểm lại nằm ở `test-results/backend/be06/recheck/`. SHA-256 của `verify.txt` là `3733f2031aa7a97fbc4c92d88fdd87ced24dd28538bd66ca49bb4c409dd97654`, của `workspace-api.txt` là `71ba6d4e564cee18bd6016d98c292fcf177f66795f9aca21aa419d49249d2548` và của `browser-firefox.txt` là `3fd9ad2a46c04e7635f54bdd0b8b1030c8947cad435a6a656324e770c2895c69`.

**Kiểm lại ngày 22/11/2026.** Dùng phần triển khai BE-06 đã có trong commit gom đợt 1 `b236c446`. Trên checkout gồm SHA này và các thay đổi cục bộ, `npm run verify` đạt 38/38, ma trận xác nhận 259 operation sản phẩm và 2 route health. Bản sao PostgreSQL thử có đủ 35 migration, Prisma không phát hiện lệch schema. `npm run test:workspace` đạt 9/9, gồm ghi song song, xung đột khi đổi nội dung, rollback và kiểm quyền tra cứu. Firefox qua HTTPS ngắt phản hồi R32 sau khi API trả 201. Sau khi tải lại ở 390 px, `listCommands` tra được `succeeded` theo mã đối chiếu, `getCommand` trả cùng kết quả và R34 hiển thị một mục audit. PostgreSQL xác nhận một membership, một command, một audit và một outbox. Bằng chứng dùng fixture cục bộ. Kết quả GitHub Actions theo SHA đợt 1 vẫn chờ đối chiếu khi có PR.

Log cục bộ nằm ở `test-results/backend/be06/recheck-20261122/`. SHA-256 của `backend-verify.txt` là `f3b0ba9aa36d0a2edbed80f20ba6785b31c83734ba8626f20176d01a3b529bb6`, của `workspace-api.txt` là `c9d9b8346d8642072ca345fbfa4682cd9fb16fc754088eb360d43d13c89abb63` và của `browser-firefox.txt` là `3fd9ad2a46c04e7635f54bdd0b8b1030c8947cad435a6a656324e770c2895c69`.

**Đối chiếu commit gom đợt 1 ngày 22/11/2026.** Từ bản trích xuất sạch của `b236c446`, cài backend bằng `npm ci`, áp dụng đủ 17 migration vào PostgreSQL trống, kiểm Prisma khớp schema, rồi seed hai shop. `npm run verify` đạt 22/22 và `npm run test:workspace` đạt 9/9. P0-06 xác nhận một giao dịch khi hai lời mời R32 gửi đồng thời, 409 khi đổi nội dung với cùng khóa và rollback cả membership, command, audit, outbox khi lỗi trước commit. P0-07 xác nhận kiểm lại shop, người tạo và quyền thao tác nguồn khi đọc lệnh.

Firefox qua Caddy chạy lại P0-07 trên gói cục bộ có 36 migration, manifest SHA-256 `79d68437a14e34f1488bee77fde3aaa3f4dacd902c08dd489daaa1b428b27691`. API trả 201 rồi trình kiểm ngắt phản hồi trước khi frontend nhận được. Sau khi tải lại ở 390 px, `listCommands` tìm đúng lệnh `succeeded` theo mã đối chiếu, `getCommand` trả cùng dữ liệu và R34 hiện đúng một mục audit. Ca kiểm xác nhận một POST và đúng một bản ghi membership, command, audit, outbox trong PostgreSQL.

`npm run typecheck` trên bản làm việc hiện tại báo hai lỗi import ở phần Messenger AI đang triển khai của BE-22. Kết quả API ở trên thuộc commit `b236c446`, còn kết quả Firefox thuộc gói cục bộ đã xác minh manifest. CI đợt 1 chờ xác minh trên GitHub theo SHA khi có PR.

Log nằm ở `test-results/backend/be06/recheck-20261122-batch1/`. SHA-256 của `backend-verify.txt` là `0e90849187fd4422d44e6eb51b0fbc9e81e4a0ecdf7737f3386a3ca25421c32a`, của `workspace-api.txt` là `7c4bd3387398ae697ce53aed52de744052d666cfdb88ba7334cc21865228d459` và của `browser-firefox.txt` là `7cbd7fd15da9c08ddd878aaf4efe1dfd693fc5d0d8d5d7c7728f46619d94ad34`.

**Hồi quy BE-06 trên checkout hiện tại.** Trên `b236c446` cùng các thay đổi cục bộ, PostgreSQL trống chạy đủ 38 migration, Prisma khớp schema và seed hai shop thành công. `npm run verify` đạt 40/40, ma trận khớp 259 thao tác sản phẩm và 2 route health. `npm run test:workspace` đạt 9/9. Hai lời mời R32 cùng intent gửi song song trả cùng membership. Đổi nội dung với cùng khóa trả 409. Lỗi trước commit hủy cả membership, command, audit và outbox. Tra cứu kiểm lại shop, người tạo lệnh và quyền hiện tại.

Firefox qua HTTPS nhận 201 ở phía API rồi ngắt phản hồi trước khi giao diện nhận được. Sau khi tải lại ở 390 px, `listCommands` tìm đúng lệnh `succeeded` theo mã đối chiếu và `getCommand` trả cùng kết quả. R34 hiển thị một dòng audit. PostgreSQL xác nhận đúng một membership, một command, một audit và một outbox cho một POST. Đây là kết quả trên dữ liệu thử cục bộ. CI theo SHA đợt 1 vẫn chờ đối chiếu khi có PR.

Log nằm ở `test-results/backend/be06/recheck-current-m38/`. SHA-256 của `backend-verify.txt` là `2fc5d0a7cb810bbb5da2a425076a11f9e0952771433fb6d9748f29ffbcbecf44`, của `workspace-api.txt` là `af50b2e61cb4e1705b1c8f3f4dc368b5607dc0157babcc89a4b713572ef8370b` và của `browser-firefox.txt` là `3fd9ad2a46c04e7635f54bdd0b8b1030c8947cad435a6a656324e770c2895c69`.

**Xác nhận lại BE-06 trên 41 migration.** PostgreSQL thử bắt đầu với 0 bảng ứng dụng, chạy đủ 41 migration, khớp schema Prisma và seed hai shop. `npm run verify` đạt 40/40 với 259 thao tác sản phẩm và 2 route health. `npm run test:workspace` đạt 9/9, gồm ghi trùng đồng thời, 409 khi đổi nội dung, rollback cả giao dịch và kiểm quyền hiện hành khi đọc command. Firefox qua HTTPS tải lại R32 ở 390 px sau khi mất phản hồi 201, tra được `succeeded` qua `listCommands` và nhận cùng kết quả qua `getCommand`. R34 và PostgreSQL xác nhận đúng một lần ghi cho membership, command, audit và outbox. Triển khai BE-06 dùng phần đã có trong commit cục bộ `b236c446`. Kết quả này được kiểm trên checkout có thay đổi cục bộ và dữ liệu thử. CI theo SHA đợt 1 được đối chiếu khi có PR.

Log nằm ở `test-results/backend/be06/recheck-current-m41/`. SHA-256 của `verify.txt` là `5d5c3536f3648ebfc064b4b4a8e40d382ccb012292fe212c59c1fdee9a9b0f72`, của `test-workspace.txt` là `4fcc1b61fa016261c1d6b2159c552f2791c81653f193a6ae6e23112e20c69e4a` và của `test-workspace-browser.txt` là `3fd9ad2a46c04e7635f54bdd0b8b1030c8947cad435a6a656324e770c2895c69`.

**Hồi quy BE-06 trên gói `b236c446-ZAGNhx.tgz`.** Firefox qua Caddy đạt lại P0-07 ở 390 px sau khi ngắt phản hồi hậu commit và tải lại trang. Ca kiểm xác nhận đúng một POST, một membership, một command, một audit và một outbox. API và worker dùng cùng manifest với bộ hồi quy T078. Log `test-results/backend/be24/verified-final-m41/regression/workspace.txt` có SHA-256 `00b9aae4c5753cd0ac9924db1bc6d37457576c4939024b10d45002a618c12f4c`. [Đối chiếu gói](#hồi-quy-sau-thay-đổi-cắt-chuyển-và-giám-sát-kho-tệp)

### BE-07

**Hoàn thành luồng sản phẩm thật đầu tiên** · T019

- [x] Nối `getDashboard` với bộ tổng hợp và hợp đồng phản hồi để mở rộng ở BE-20. Nối `listCategories`, `listProducts`, `createProduct`, `getProduct`, seed danh mục và đăng ký chính sách nguồn `createProduct` cho tra cứu command. Ảnh và chỉnh sửa thuộc BE-08.
- [x] Kiểm HTTP bằng PostgreSQL và trình duyệt `dev:live`. Đăng nhập, chọn shop, tạo SKU, mở chi tiết và kiểm lại danh sách lẫn chi tiết sau khi khởi động lại API.
- [x] Kiểm quyền đọc và ghi, SKU trùng theo shop, danh sách rỗng và mất phản hồi sau commit. Xác nhận cảnh báo khi SSE chưa có và tải lại vẫn đọc được dữ liệu PostgreSQL.

#### Kết quả kiểm BE-07

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| P0-08 · Browser live | Firefox qua HTTPS chạy R01 → R02 → R04 → R09 → R10 → R11. Tổng quan 200, chọn được danh mục từ API, tạo SKU 201, đọc được cùng sản phẩm qua danh sách và chi tiết sau restart API. Giao diện hiển thị cảnh báo mất cập nhật trực tiếp của P0. [Ca trình duyệt](tests/integration/catalog/browser-cases.mjs) |
| P0-07 · Mất phản hồi SKU | API commit rồi phản hồi tạo SKU bị chặn trước trình duyệt. Tải lại tab và tra theo khóa đối chiếu nhận `succeeded` cùng ID sản phẩm. DB có đúng một sản phẩm, biến thể, command, audit và outbox. |
| P0-09 · Quyền và dữ liệu | Viewer đọc được nhưng POST trả 403. SKU không phân biệt hoa thường khi kiểm trùng trong một shop. Hai yêu cầu tranh cùng SKU trong shop trả 201 và 409, cùng SKU ở hai shop hợp lệ. Tra ID hoặc gắn danh mục ngoài shop bị từ chối. Bộ lọc và cursor áp dụng trước phân trang. Giá lưu và đọc dạng thập phân chính xác. [Ca HTTP](tests/integration/catalog/catalog.test.mjs) |
| Tổng quan | Trả bot `unconfigured`, tài chính `null` và cảnh báo nguồn chỉ số chưa kết nối. Số liệu theo nguồn nghiệp vụ thuộc BE-20. |
| Migration và hồi quy | Đạt trên PostgreSQL 18.7 từ DB trống và bản sao BE-06, không có drift Prisma. Seed chạy lại giữ nguyên danh mục. Backend `verify` 20/20, PostgreSQL 6/6, OIDC 9/9, workspace 9/9, catalog 4/4 và hai ca Firefox live đạt. Ma trận có 20 operation sản phẩm và 2 route vận hành. Workflow dùng bộ ca HTTP catalog qua script PostgreSQL. [Migration](apps/api/prisma/migrations/20261121000600_be07_product_catalog/migration.sql) |

BE-07 đạt 3/3 mục cục bộ trên `main@c873f1eb` cùng thay đổi BE-03–BE-07. Log ở `test-results/backend/be07/`, gồm `catalog-browser.txt` (SHA-256 `b599d77c221d31106339b2a6deb76d5208d78ffeb637089e12a0684fb1030cd8`), `catalog-api.txt` (SHA-256 `9a1c75da976324b253e13973c4ae75ec5e4753e175f6981ba84b4369422a76f7`) và `upgrade.txt` (SHA-256 `3e07f6e4701db4985294296d7fb43a64c011ac6248bffa04ab19379126d639d3`).

## P1 Luồng bán hàng và vận hành cốt lõi

### BE-10

**Dựng worker và realtime** · T017

- [x] Worker BullMQ/Redis chạy trên outbox và job bền vững trong PostgreSQL. Dùng lease và số lần thử theo ID. Dùng chung ledger command và tra cứu hiện hành. Gắn API `listJobs` và `getJob` cho mốc kế tiếp.
- [x] SSE `text/event-stream` dùng schema chuẩn cho `onmessage`, phát lại theo shop bằng `Last-Event-ID` và yêu cầu tải lại khi cursor ngoài cửa sổ phát lại. Kiểm phiên, membership và quyền nguồn trong stream. Worker báo trạng thái và độ trễ outbox. [Frontend SSE](../BotSalesAI_Frontend/apps/web/src/app/ScopeEvents.tsx) · [Chuẩn SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html#the-last-event-id-header)
- [x] Kiểm restart worker, mất Redis thật, phát lại từ DB, nối lại sau ngắt, cursor khác shop, lịch sử hết hạn, thu hồi quyền và giới hạn retry. Kiểm kết quả chưa rõ với nhà cung cấp tổng hợp.

#### Kết quả kiểm BE-10

| Phạm vi | Bằng chứng ngày 21/11/2026 |
|---|---|
| Outbox và Redis | PostgreSQL giữ trạng thái xuất bản, lease và sequence tăng trong shop. BullMQ dùng định danh ổn định. Khi dừng Redis, API vẫn commit command và outbox ở DB. Khởi động Redis trống, worker đang chạy nối lại và phát đúng một sự kiện. Sự kiện lỗi bị loại khỏi hàng chờ sau 3 lần. |
| SSE | Bộ ca 3/3 đạt HTTP, schema, thứ tự phát lại, sai shop, cursor hết hạn và thu hồi quyền trên stream đang mở. Cửa sổ phát lại thử là 24 giờ. Firefox qua HTTPS nhận `command.updated` của SKU thật bằng `EventSource.onmessage` và hồi quy luồng SKU vẫn đạt. [Bộ ca SSE](tests/integration/workers/events.test.mjs) · [Ca Firefox](tests/integration/catalog/browser-cases.mjs) |
| Worker và job | Bộ ca 2/2 đạt job đến hạn, dừng tiến trình trước tác động, thay hàng đợi rỗng rồi khôi phục từ DB. Job dùng `dueAt` dạng timestamp UTC do nguồn nghiệp vụ tính. Dừng tiến trình sau khi adapter thử báo nhận để lại command `unknown` và job `awaiting_confirmation`, giữ số lần chạy ở 1. Kiểm dừng mềm của worker sau khi xử lý. [Bộ ca job](tests/integration/workers/jobs.test.mjs) |
| Truy cập | `listJobs`, `getJob` và command gắn job kiểm đúng người tạo, shop, `jobs.read` và quyền nguồn hiện hành. API chỉ trả trường công khai và tham chiếu tối thiểu. Bộ xử lý nhập sản phẩm thật được nối ở BE-08 qua cùng worker. |
| Migration và hồi quy | Áp dụng 8 migration từ DB trống và nâng cấp bản sao BE-07. Giữ sản phẩm, SKU, command, audit và trạng thái outbox; Prisma không báo drift. Backend `verify` 20/20, PostgreSQL 6/6, OIDC 9/9, workspace 9/9, catalog 4/4, SSE 3/3, job 2/2 và hai ca Firefox live đạt. Có 23 operation sản phẩm và 2 route vận hành. Script CI đã gọi các bộ worker. GitHub Actions được đối chiếu khi đợt 1 lên PR. |

BE-10 đạt 3/3 mục cục bộ trên `main@c873f1eb` cùng thay đổi BE-03–BE-07 và BE-10. Log ở `test-results/backend/be10/`, gồm `events.txt` (SHA-256 `a797fd5dc772926db4f0f686128554a46fe2fad66d21d194a324680a3442d8b4`), `jobs.txt` (SHA-256 `285c9c8a275172fd6d643165776ef0600b74c2554f7228137aaad5649f024096`), `redis-recovery.txt` (SHA-256 `59945f6f2818e599583691e7a71cf95d9ef06612b85aa7c61c8b6a428c289d30`) và `catalog-browser.txt`.

### BE-08

**Hoàn thiện danh mục và khách hàng** · T020–T021

- [x] Hoàn thiện biến thể, SKU, giá, danh mục, tra cứu khách và CRUD địa chỉ giao hàng. Lưu nguồn định danh khách theo phạm vi shop và kênh. Tạo snapshot địa chỉ để dùng trong báo giá và giao hàng.
- [x] Nối ảnh, upload và import theo contract. `uploadFile` và `getFile` dùng một pipeline metadata, kiểm loại/kích thước, cách ly và quyền tải. Ảnh và import catalog dùng policy theo mục đích. R13–R14 đọc trạng thái qua `listJobs` và `getJob` của BE-10. Import có bước xem trước, lỗi từng dòng và commit chống lặp qua cùng quy tắc của catalog.
- [x] Kiểm chứng phân trang và tìm kiếm trên dữ liệu vượt một trang, tệp sai quyền, dòng nhập trùng và thay đổi địa chỉ sau khi đã lưu snapshot. Chạy R13 → R14 qua `dev:live` gồm xem trước, tra job và commit một lần.

#### Kết quả kiểm BE-08

| Phạm vi | Kết quả trên fixture |
| --- | --- |
| Catalog và khách hàng | 7/7 ca catalog và 3/3 ca customers đạt. Khóa SKU theo shop, giá decimal, sửa biến thể giữ ID, soft archive, `If-Match`, cây danh mục không chu trình và phân trang ổn định. Định danh khách theo kênh không gộp nhầm. Địa chỉ giữ bản chụp lịch sử và cấm đọc hoặc ghi trường đã che. |
| Tệp | PNG, JPEG và WebP qua kiểm MIME và decode. CSV UTF-8 và XLSX giới hạn 5 MB và 1.000 dòng dữ liệu. Tệp sai cấu trúc được cách ly theo metadata. URL đọc ký trong 5 phút, ràng buộc chủ thể và kiểm lại quyền hiện hành. Blob lưu trong PostgreSQL ở môi trường thử. Bộ điều hợp kho đối tượng và quét tệp staging thuộc BE-22. |
| Import và phục hồi | 3/3 ca import qua PostgreSQL, Redis và worker. CSV ghi dòng hợp lệ và giữ lỗi từng dòng. XLSX giữ giá decimal chính xác. Token dùng một lần trong 30 phút, gắn với shop, chủ thể và phiên bản catalog. Gửi lại cùng intent trả về cùng job, tra command được sau mất phản hồi và audit ghi một lần. |
| Frontend live | Firefox qua HTTPS xác nhận R13 → R14 từ upload CSV đến kết quả nhập một phần, có một SKU hợp lệ. R13 chọn được XLSX và báo rõ tệp bị máy chủ cách ly. Kiểm bố cục 1440 và 390 px. Frontend `verify` đạt, gồm 280 ca Vitest và gate S17. Native zoom và trình đọc màn hình chưa có bằng chứng mới cho lượt này. |
| Migration và hồi quy | 11 migration áp dụng từ PostgreSQL 18.7 trống và từ bản sao BE-10. Prisma diff xác nhận hai database khớp schema. Backend `verify` 20/20, PostgreSQL 6/6, OIDC 9/9, workspace 9/9, SSE 3/3, jobs 2/2. Ma trận đối chiếu 46 operation sản phẩm và 2 route vận hành. Firefox kiểm lại ca BE-06 mất phản hồi sau commit, có đúng một lần ghi membership, command, audit và outbox. |

Bằng chứng tại `test-results/backend/be08/`. Log `fresh-verify.txt` có SHA-256 `8dd0bac31c29e88c5d7366f512c1e01abb86ac901108660c18378c65c37cb13b`, `fresh-test-imports.txt` có SHA-256 `50af364389c8d7f907dc79ad2e90b673dd8a29ae12d44a3a729caa65cf5f157d` và `fresh-test-imports-browser.txt` có SHA-256 `3c2596470673545332f80bbf97068d719b3cb5b2fe2b58d1ea1c4d882e3ddf29`. BE-09 nối điều kiện tồn và giữ hàng khi lưu trữ biến thể. BE-11 nối dòng đơn, bản chụp địa chỉ và liên kết yêu cầu sau bán với đơn. CI GitHub của mốc đi cùng đợt 1.

### BE-09

**Xây sổ kho và giữ hàng** · T022–T023

- [x] Tạo kho, vị trí tồn, lịch sử biến động và projection `listStockSnapshots`. Phân biệt tồn thực, giữ hàng, khả dụng và hàng đang đi. Ràng buộc không âm ở tầng ghi và kiểm theo một nguồn dữ liệu. Kiểm sổ trên fixture PostgreSQL. `createInventoryAdjustment` mở ở BE-12 cùng phần ghi đối ứng, dùng lại cổng ghi của Inventory.
- [x] Xây tạo, giải phóng, tiêu thụ giữ hàng trong transaction theo SKU và kho. Dùng projection cùng giao dịch để chặn lưu trữ biến thể còn tồn hoặc còn giữ hàng. Cung cấp use case hết hạn để BE-10 có thể gọi khi BE-11 nối luồng đơn.
- [x] Kiểm chứng tranh mua SKU cuối, đặt nhiều SKU rồi rollback khi một SKU thiếu, giải phóng và tiêu thụ đúng một lần. Kiểm đối chiếu tồn hiện tại với sổ biến động.

#### Kết quả kiểm BE-09

| Phạm vi | Kết quả trên fixture |
| --- | --- |
| Tồn và sổ biến động | `listStockSnapshots` và `listStockMovements` áp dụng bộ lọc trước cursor. Tồn khả dụng bằng tồn có thể bán trừ lượng giữ. Hàng cách ly, đang giao và đang về theo dõi riêng. Giá vốn che theo `finance.read`. PostgreSQL chặn tồn âm, giữ vượt tồn và sửa lịch sử bằng role runtime. |
| Cạnh tranh và phục hồi | 100 yêu cầu giữ SKU còn một đơn vị có 1 thành công và 99 conflict. Lỗi khóa dòng retry có giới hạn. Thiếu một SKU rollback toàn bộ. Nhận lại cùng intent, giải phóng, tiêu thụ và hết hạn giữ hàng đều kiểm một lần ghi. Tổng số lượng và giá trị đối chiếu với movement. |
| Kho và catalog | Tạo, đọc, sửa và lưu trữ kho theo shop, quyền, phiên bản và audit. Chặn kho mặc định, kho/biến thể còn hàng và race giữa nhập kho với lưu trữ kho. Worker phát metadata `warehouse.updated` theo quyền đọc kho. |
| Browser và hồi quy | Firefox qua HTTPS đạt R55 tạo/sửa/ngừng dùng kho, R15 tồn, R16 lịch sử. `verify` 20/20, inventory 6/6, catalog 7/7, import 3/3, SSE 4/4 và jobs 2/2. Có 53 operation sản phẩm và 2 route vận hành. Prisma diff khớp sau migration thứ 12 từ DB trống và DB đã có dữ liệu BE-08. |

Bằng chứng tại `test-results/backend/be09/`. SHA-256 của `test-inventory.txt` là `e46cd2bfeaee42188689917e4c779e659a02e8efbb1a06a4c93982ba6ca160dd`, của `browser.txt` là `f5d50b077307aa5f0f13183adc91db59247e4d8d245007b1da9b57e2141300d8`. BE-11 nối giữ hàng và mở/đóng nghiệp vụ đơn trong cùng giao dịch. Khi bổ sung đơn, giao hàng, chuyển kho và mua, module tương ứng phải dùng khóa kho chung và mở rộng phép kiểm nghiệp vụ còn mở trước khi lưu trữ kho. BE-12 nối endpoint điều chỉnh và bút toán đối ứng. CI GitHub đi cùng đợt 1.

### BE-11

**Chốt luồng đơn hàng, biểu phí giao R62 và đọc ưu đãi** · T024–T026

- [x] Nối đơn nháp, báo giá, bằng chứng khách xác nhận và chốt đơn. API tính giá, phí và thời hạn qua cùng pipeline định giá cho nháp, báo giá và kiểm khi chốt. Dùng snapshot `unitPrice`, `discount`, `lineTotal` của `OrderLine` từ đầu, với số giảm bằng 0 khi không có ưu đãi. Gắn báo giá với khách, phiên bản, nội dung và thời hạn hiệu lực.
- [x] Chốt quy tắc độ chính xác, làm tròn và phân bổ phần dư cho giá, giảm giá, hoàn và giá vốn trước migration liên quan. Thêm [bộ ca phân bổ dùng chung](#ca-đối-chứng-phân-bổ-từng-phần), dùng lại ở BE-12–BE-17.
- [x] Nối biểu phí R62 theo khu vực, lưu phí dự kiến trong snapshot và tách phí thực tế. Gắn chốt đơn, giữ tồn, audit và outbox vào một transaction. Nối tác vụ hết hạn. Triển khai `listPromotions` của Catalog ngay vì R18 đọc khi người dùng có quyền catalog. Query đọc dữ liệu thật, lọc quyền và hiệu lực theo shop trước cursor. Môi trường P1 của luồng bán dùng shop chưa có combo hoạt động. BE-14 nối điều kiện áp dụng và vòng đời combo trên cùng nguồn dữ liệu.
- [x] Kiểm chứng R18–R19 qua `dev:live`. Tạo bằng chứng khách tổng hợp gắn với báo giá đã lưu, qua mô hình tin nhắn/định danh dùng lại ở BE-18 trên DB thử. Kiểm thiếu hoặc sai `sourceMessageId`, xác nhận không còn hiệu lực, tranh SKU cuối, retry khi timeout, phí dự kiến và danh sách ưu đãi rỗng hợp lệ. Kiểm `listPromotions` bằng fixture riêng có combo hiệu lực, hết hạn và khác shop. Chỉ bật áp dụng ưu đãi khi BE-14 đạt, kể cả với yêu cầu API có `promotionId` gửi trực tiếp. Chỉ mở xác nhận bằng tin thật khi nguồn tiếp nhận tương ứng đã được kiểm.

#### Kết quả kiểm BE-11

| Phạm vi | Kết quả trên fixture |
| --- | --- |
| Đơn và báo giá | Dùng giá SKU hiện hành, decimal đến 18 chữ số lẻ và snapshot dòng đơn. Báo giá thử hiệu lực 15 phút, hash gắn khách, dòng, địa chỉ, phí và phiên bản. Giá, địa chỉ hoặc biểu phí đổi làm báo giá cũ không còn hiệu lực. Sau chốt, sửa địa chỉ hiện tại giữ nguyên snapshot. |
| Chốt và giữ hàng | Tin tổng hợp đúng shop, hội thoại, định danh, báo giá và thời điểm mới được ghi nhận. Hai đơn tranh đơn vị cuối cho một lệnh thành công. Tra intent khôi phục kết quả một lần. Giữ hàng thử cho COD là 24 giờ. Worker chuyển đơn chưa thu tiền và đang giữ sang hủy cùng giao dịch giải phóng khi hết hạn. |
| R18–R19 và R62 | Firefox HTTPS đạt chọn khách, hội thoại và địa chỉ, tạo nháp, báo giá có phí dự kiến, nhập bằng chứng và chốt COD. `listConversations` mở phần đọc chọn hội thoại trên nguồn sẽ dùng tiếp ở BE-18. `listPromotions` kiểm hiệu lực/trùng scope trước cursor. Áp dụng combo thuộc BE-14. |
| Migration và hồi quy | 15 migration áp dụng từ DB trống và DB có dữ liệu trước mốc. Prisma diff khớp ở hai DB. `verify` 22/22, orders 5/5, inventory 6/6, customers 3/3, catalog 7/7, imports 3/3, SSE 4/4 và jobs 2/2. Có 65 operation sản phẩm và 2 route vận hành. |

Log tại `test-results/backend/be11/`. SHA-256 của `verify.txt` là `02a72b8fc139df248aaeaa5559394bd45b6cd8bc2a1480d33b92e5a0206a9c5a`, của `test-orders.txt` là `405a7a6fdc140de53970618ee22e81822a9fb3af962953a58a5eda8f107f0f6a` và của `browser.txt` là `38062dc8b3c58a177144a8c4d4ff4ecf1de1f5b24002764271ce4a427db83a5a`. Log tích hợp có cảnh báo deprecation từ Prisma PostgreSQL adapter khi chuẩn bị nâng `pg` lên 9. Kiểm tiền trả trước ở BE-12, luồng chuẩn bị/giao ở BE-13 và nguồn tin nhắn thật ở BE-18/BE-22.

### BE-12

**Dựng thu tiền, COD, sổ kép cơ sở và điều chỉnh kho** · T027–T030

- [x] Thực hiện ghi nhận tiền, bằng chứng thu, COD và số còn phải thu. Phân biệt xác minh ảnh, tiền khách trả hãng và tiền đã được quyết toán về shop.
- [x] Tạo tài khoản, bút toán cân bằng, nguồn chống trùng và cơ chế khóa kỳ dùng chung với BE-17. Dùng số thập phân chính xác trong DB và chuỗi thập phân trên API. Ghi sửa sai bằng bút toán đảo theo quyền và chính sách kỳ. Triển khai `createInventoryAdjustment` cùng cổng ghi Inventory của BE-09 và đối ứng Finance khi phát sinh giá trị.
- [x] Kiểm chứng các bước tài chính thuộc phạm vi BE-12 trong [ca nghiệp vụ tài chính chuẩn](../botsales-kit/docs/10_TESTING_ACCEPTANCE.md#golden-business-fixtures). Đạt thu từng phần, trùng chứng từ, từ chối ghi kỳ khóa, đúng currency và rollback khi ghi đối ứng điều chỉnh kho thất bại. Thử nghiệm dùng dữ liệu tổng hợp.

#### Kết quả kiểm BE-12

| Phạm vi | Kết quả trên fixture |
| --- | --- |
| Thu, hoàn và COD | Đơn trả trước cần bằng chứng đã xác minh đúng shop, đơn, nguồn và số tiền. Sum theo chuỗi thập phân giữ đủ số đã trả, đã hoàn và còn phải thu. Lặp bằng chứng bị chặn. COD đã thu qua hãng có trạng thái riêng và chưa làm tăng tiền đã về shop. Thu/hoàn chỉ ghi nhận chứng từ đã có. |
| Sổ kép và kỳ | Tài khoản và kỳ theo quyền. Bút toán chặn mất cân bằng và sửa lịch sử sau ghi. Phép đảo có chứng từ và liên kết gốc. Ledger tính số đầu kỳ, cuối kỳ và tổng Nợ/Có trên toàn cửa sổ, sau đó phân trang dòng. Mở sổ khớp tồn với giá trị tài khoản hàng tồn kho và ghi một lần. |
| Điều chỉnh kho | Tồn, giá trị, bút toán, audit và biên nhận command cùng transaction. Ca thiếu tài khoản đối ứng rollback cả stock movement và số tồn. Kiểm kỳ khóa, phiên bản cũ, tiền sai và tài khoản khác shop. |
| Hồi quy và browser | PostgreSQL 18.7 đạt migration từ DB trống và nâng cấp DB có dữ liệu. Prisma diff khớp sau 17 migration. `verify` 22/22 và ma trận 93 operation sản phẩm, 2 route vận hành. Finance 4/4, orders 5/5, inventory 6/6, customers 3/3, catalog 7/7, imports 3/3, SSE 4/4 và jobs 2/2. Firefox HTTPS đạt điều chỉnh R15, ghi khoản thu R19 và xem bút toán R48. |

Log tại `test-results/backend/be12/`. SHA-256 của `verify.txt` là `0933e2407e1a75e277d0cd4ec3b3712314ae5e72992403e6f2dfa214d24b72b0`, của `test-finance.txt` là `56b939b234df4a396604bcc73be524034e8069e81834019ea289a31cfd5adb92` và của `browser.txt` là `fdac4e5cb52715a546d79737e3c1fa8c28766654c53c8eebeae73c851035d15d`. Quyết toán COD, đối soát ngân hàng và thao tác khóa/mở kỳ nối ở BE-17. Các khoản thu/hoàn kiểm trên chứng từ tổng hợp. CI GitHub sẽ được đối chiếu khi có PR đợt 1.

### BE-13

**Nối chuẩn bị, giao hàng, trả hàng và thông báo** · T031–T036

- [x] Làm luồng nhận việc, lấy, đóng gói, bàn giao và trạng thái vận đơn với phân quyền và phiên bản. `getWorkItem`, `listWorkItems` và `claimWorkItem` thuộc Operations, phục vụ chuẩn bị ở mốc này và phục vụ BE-20 về sau. Tiêu thụ giữ hàng cùng transaction khi chuyển trạng thái tương ứng.
- [x] Chốt luồng quyền R41 trước khi code. Preset hiện cho `owner` và `manager` quyền `operations.claim`, còn `warehouse` có quyền tác nghiệp kho nhưng thiếu quyền nhận việc. Với phạm vi giữ quyền hiện tại, kiểm actor có quyền nhận và người được giao mới thực hiện bước kho. Nếu cần quản lý giao lại việc hay nhân viên kho tự nhận, rà API phân công, quyền theo tài nguyên và phụ thuộc với BE-20, cập nhật hợp đồng nếu cần rồi mới bật. [Danh mục quyền](../botsales-kit/contracts/permission-catalog.json) · [Điều kiện nhận việc trên R41](../BotSalesAI_Frontend/apps/web/src/modules/fulfillment/index.tsx)
- [x] Nối nhận trả từng phần, kiểm hàng, nhập lại phần đạt và nghĩa vụ hoàn có chứng từ. Tính phần hoàn từ `lineTotal` đã lưu và giới hạn số lượng, số tiền còn đủ điều kiện, kể cả khi có giảm giá. Tạo thông báo trong ứng dụng và nối adapter thử nghiệm cho Web Push và Telegram theo quyền nhận.
- [x] Kiểm chứng hai người có quyền tranh một việc, vai trò kho chưa có quyền nhận, người chưa được giao thử lấy hàng, bàn giao mất phản hồi, hàng hoàn chưa kiểm, giới hạn hoàn và thông báo trùng. Chạy luồng Firefox từ chốt đơn đến giao và trả với backend thử nghiệm. Kiểm nhiều lần hoàn theo bộ ca phân bổ.

Phạm vi cục bộ dùng một vận đơn giao thủ công cho toàn bộ kiện của đơn đã đóng gói. Bàn giao chuyển tồn giữ sang đang giao. Sự kiện của vận đơn tham chiếu bản ghi bằng chứng theo shop và vận đơn, do fixture tạo trong bộ kiểm. Khi có bằng chứng giao, backend ghi giá vốn cùng doanh thu và khoản phải thu COD còn lại. Quyết toán tiền hãng về ngân hàng thuộc BE-17. Hồ sơ trả chỉ ghi biến động kho sau kiểm nhận và dùng giá ròng đã chốt. Hàng cách ly giữ ngoài tồn bán được. Khoản chưa thu làm giảm công nợ, còn khoản đủ điều kiện hoàn được chuyển thành nghĩa vụ, rồi chi hoàn theo bằng chứng riêng.

Adapter thiết bị chỉ chạy khi `NOTIFICATION_FIXTURE_ADAPTER=1` và OIDC là cấu hình loopback thử nghiệm. Duy trì trạng thái tiếp nhận, thất bại và chưa xác định riêng với thời điểm đã xem và việc được nhận. Nguồn vận đơn từ hãng, nhãn/mã vận chuyển và kênh thông báo thật cần adapter đã cấp quyền ở BE-22. Kiểm giảm tiền từ combo thật thuộc BE-14. Lịch nhắc cho việc đang chờ gắn phiên bản policy hiện hành lúc tạo và dừng khi nhận việc, hủy, hết hạn hoặc đổi policy.

#### Kết quả kiểm BE-13

| Kiểm tra | Kết quả cục bộ |
|---|---|
| `npm run verify` tại backend | Guard ranh giới, Prisma, build và 22/22 ca. Ma trận duyệt 120 thao tác sản phẩm đã mở cùng 2 health handler và ánh xạ ca kiểm. |
| `npm run test:orders` | 10/10 ca trên PostgreSQL. Hai actor tranh việc nhận được 200/412. Quyền kho và assignee sai bị từ chối. Mất phản hồi bàn giao vẫn tra được lệnh và chỉ có một lần xuất, một audit và một command outbox. Sự kiện đến muộn giữ nguyên trạng thái đã giao. Ca thất bại rồi hoàn kho không ghi doanh thu giao hàng. |
| Đối chiếu nghiệp vụ trả | Phân bổ ba lần theo giá ròng và giá vốn ban đầu, kiểm vượt lượng và vượt nghĩa vụ hoàn. COD chưa thu làm giảm phải thu. COD hãng đã thu vẫn tách khỏi tiền ngân hàng. Hàng cách ly và hồ sơ chưa kiểm giữ ngoài tồn bán được. |
| Job, thông báo và SSE | `test:jobs` 2/2, `test:events` 4/4. Bộ orders kiểm quyền hiện hành, worker trùng, thu hồi thiết bị trước xử lý, thời gian yên lặng, Telegram dự phòng, mã liên kết sai shop, hết hạn/dùng lại và chuyển sang trạng thái `unknown` khi chưa xác định được kết quả. |
| Migration | Áp dụng 20 migration từ DB trống. DB trống sau migration và DB fixture nâng cấp đều khớp Prisma schema. Các đơn xác nhận còn giữ hàng từ schema trước được bổ sung việc chuẩn bị. Thông báo tự động áp dụng khi xác nhận đơn mới. |
| `npm run test:fulfillment:browser` | Firefox desktop trên HTTPS thật và OIDC loopback. R39 xem và xác nhận thông báo, R41 nhận việc/lấy/đóng gói, R42 tạo/bàn giao/ghi bằng chứng, R43 mở và kiểm trả. R40 gửi qua worker/Redis bằng Web Push fixture, thu hồi và hiển thị mã Telegram thử. |
| Frontend | `npm run verify` qua 280/280 Vitest và các gate nguồn, build, S17. Hồi quy demo đạt 6/6 trên Chromium và Firefox. Nguồn giao diện thay đổi nhãn xác nhận đã xem ở R39, điều kiện chọn đơn ở R43 và hướng dẫn trả hàng về vị trí trước khi hủy ở R19. Baseline `b236c446`. |

Log tại `test-results/backend/be13/`. SHA-256 của `verify.txt` là `feee6583f99580781a4f95be226f007620ff1aa6454448dd774f368ebdefea9d`, của `test-orders.txt` là `c7ad553d64018c818832021e4244bc7092e5d895f81c8fed56d828a2f4d664d8` và của `browser.txt` là `ccf6df1ef3018549566f88a5623f9a2fd9b8e3f10b1a3a40264500df26be36ee`. Một lượt chạy hai suite dùng chung fixture đồng thời trả HTTP 503 ở hai thao tác catalog. Bộ orders đạt khi chạy riêng. BE-23 kiểm tải và contention với relay chủ động xử lý backlog. CI GitHub, giao vận và thiết bị thật còn theo các gate tương ứng.

## P2 Nghiệp vụ mở rộng và hoàn thiện phạm vi

### BE-14

**Nối combo R64 với đơn, báo giá và hàng trả** · R64

- [x] Thực hiện tạo nháp, duyệt bật, tạm dừng, thời hạn, tính đủ điều kiện theo tồn, giá vốn và biên lợi nhuận. Đưa phiên bản ưu đãi và số giảm vào pipeline định giá BE-11, với kết quả phân bổ theo dòng đơn.
- [x] Dùng lại `listPromotions` của BE-11 cho Inbox và đơn. Kiểm luồng hoàn BE-13 bằng đơn có combo từ API và đối chiếu số tiền theo `lineTotal`, giới hạn và chứng từ. Kiểm nguồn số liệu báo cáo trên snapshot đã chốt. Endpoint báo cáo thuộc BE-20.
- [x] Kiểm chứng combo hết hạn hoặc đổi phiên bản, thiếu tồn, giá vốn chưa có, biên lợi nhuận không đạt, xác nhận báo giá cũ và hoàn từng phần sau giảm.

#### Kết quả kiểm BE-14

- R64 dùng quyền `catalog.write` để tạo/sửa nháp và `shop.manage` để duyệt/tạm dừng. API từ chối đổi chương trình đang bật, yêu cầu phiên bản hiện tại và lưu audit. `listPromotions` lọc phiên bản đang hiệu lực theo ngày cửa hàng trước khi phân trang.
- Pipeline định giá kiểm các SKU thành phần, tồn khả dụng tại kho của đơn và biên sau giảm. Khi giá trị ghi sổ của tồn bằng 0, luồng combo yêu cầu bổ sung giá vốn trước khi áp dụng. Tiền giảm phân bổ theo giá trị những lượng hàng đủ điều kiện, giữ đến 18 chữ số thập phân và phân bổ hết phần dư.
- Báo giá khóa phiên bản ưu đãi và tiền từng dòng. Đổi phiên bản, tạm dừng hoặc thay giá làm điều kiện xác nhận cũ mất hiệu lực. Đơn trả trước áp ưu đãi kiểm lại giá trước khi ghi tiền. Đơn đã chốt lưu bản chụp riêng với tổng, giảm giá, ngày áp dụng và phần giá ròng của từng dòng. BE-20 dùng dữ liệu này để nhóm hiệu quả theo ưu đãi.
- `npm run test:orders` đạt 11/11. Ca PostgreSQL chặn sai shop, sai quyền/phiên bản, sai SKU, tồn thiếu, giá vốn chưa đủ, biên thấp, chưa hiệu lực và hết hạn. Sau khi chương trình đổi mức giảm, ba lần kiểm trả cộng đúng phần giá ròng đã chốt. Mỗi lần ghi một bút toán. `test:finance` 4/4.
- Firefox qua HTTPS chạy R64 tạo và duyệt combo, R18 chọn hai SKU và combo, R19 báo giá, ghi bằng chứng và xác nhận. Sau tạm dừng ở R64, R19 vẫn hiển thị đúng phiên bản và số tiền cũ. `npm run verify` đạt 22/22 và báo 123 thao tác sản phẩm đã mở cùng 2 health handler. Hai DB nâng cấp đều khớp Prisma sau migration thứ 21.

Log tại `test-results/backend/be14/`. SHA-256 của `verify.txt` là `5da8aeb37f451cfa89603db77c5c2ba82c3aee6417f061a7054ecd252e6fd576`, của `test-orders.txt` là `e9aa8ee2f9915b4d3696bfc457f1d4a4b5cca953076078c0e74fb2d9aaf84055` và của `browser.txt` là `15b3e12a2af08763a60466a499a877639a29a2a3ca402e8c73a2b91cf4c2c153`.

### BE-15

**Nối kiểm kê R66 và chuyển kho R67** · R66–R67

- [x] Kiểm kê ghi mốc theo kho và SKU, số đếm, người đếm, người duyệt và phiên bản. Khi có xung đột chỉ yêu cầu đếm lại các SKU bị ảnh hưởng. Dùng giao dịch ghi chênh và đối ứng từ BE-09/BE-12 với nguồn là phiếu kiểm kê đã duyệt.
- [x] Chuyển kho qua lúc xuất, đang đi, nhận từng phần và kết thúc thiếu có lý do. Dùng lại cổng ghi kho, phân bổ giá vốn theo giá trị đã xuất và gửi đối ứng qua Finance. Bảo toàn tham chiếu phiếu trên hai đầu kho. Chặn lưu trữ kho đích khi còn phiếu đang đi, kể cả kho có tồn bằng 0. Xuất hàng và lưu trữ kho dùng cùng khóa nghiệp vụ và isolation Serializable.
- [x] Kiểm chứng duyệt hai lần, chênh phiên bản, nhận vượt số lượng, phiếu khác shop, nhận hai phần, chốt thiếu và HTTP 409 khi lưu trữ kho đích đang có hàng chuyển đến. Sau lỗi 409, kho vẫn hoạt động và phiếu còn nhận được. Đối chiếu tổng số lượng, giá vốn và sổ trước với sau chuyển. Chạy bộ ca phân bổ khi giá vốn không chia hết theo số lượng.

#### Kết quả kiểm BE-15

- `test:inventory` đạt 9/9. Kiểm kê phân tách quyền đếm/duyệt, chỉ xóa số đếm của SKU có version tồn đổi, chặn duyệt cũ và ghi một lần trong ca duyệt cạnh tranh 200/412. Chênh giảm đối chiếu 20 VND vào tài khoản mất hàng, chênh tăng 10 VND vào tài khoản tăng kho. Tăng từ mốc không có giá vốn cần chứng từ điều chỉnh tồn có giá đã xác minh trước khi ghi kiểm kê.
- Chuyển 3 đơn vị theo giá vốn 10,01 VND. Hai lần nhận ghi được đúng phần giá vốn lũy kế và phần thiếu dùng toàn bộ giá trị còn lại. Kiểm gửi lại cùng khóa, nhận vượt, sai shop, thiếu quyền đóng phiếu và hai kho cùng tham chiếu phiếu. Kiểm lưu trữ kho đích với tồn bằng 0 nhận 409 khi có phiếu đang đi. Ca chạy đồng thời bảo đảm chỉ xuất hoặc lưu trữ thắng. Sự kiện `inventory.updated` dùng phiên bản vị trí tồn đã ghi.
- `npm run test:inventory-documents:browser` đạt R66/R67 qua Firefox HTTPS và kiểm lại R15/R16/R55. Tạo phiên, đếm, gửi duyệt, duyệt ghi sổ, xuất, nhận một phần và đóng thiếu đều đi qua API thật.
- `npm run verify` đạt 22/22 và ma trận 130 thao tác cùng 2 health handler. Hồi quy orders 11/11, finance 4/4, events 4/4. Cơ sở dữ liệu fixture có dữ liệu và cơ sở dựng từ trống đã qua 22 migration và khớp Prisma schema.

Log tại `test-results/backend/be15/`. SHA-256 của `verify.txt` là `1d01877502738ac8eed4579365de4bae85f39dc2c2819981bffabf98c6b72a8f`, của `test-inventory.txt` là `33268a3070f5dfb2f260bb11b0f5d78bab0ac0ed1b3b92ca38325a80687d07e1` và của `browser.txt` là `f577332e92d4b1d5cd2c31d20428bb8928295a00072edf2db410be738e83d8f3`.

### BE-16

**Nối nhà cung cấp, mua và nhận hàng** · T043–T048

- [x] Làm hồ sơ nhà cung cấp, báo giá theo MOQ và bội đóng gói, quy tắc gợi ý mua và đơn nháp. Dùng một mô hình Operations cho `listApprovals`, `getApproval`, `createApproval` và `decideApproval` ràng buộc nội dung, phiên bản, phạm vi và thời hạn. Đơn nháp chờ duyệt. Tự gửi theo hạn mức và ủy quyền được nối ở BE-20.
- [x] Lưu ý định gửi trước khi gọi cổng fixture. Worker kiểm lại quyền, phiên bản phê duyệt và điều kiện nhà cung cấp. Kết quả chưa rõ cần chứng từ xác nhận nguồn trước khi chuyển sang hàng sẽ về. Phiếu nhận được phép ghi từng phần, đưa hàng lỗi vào cách ly và ghi công nợ cùng giao dịch với phần đạt.
- [x] Kiểm gợi ý trùng và hai lần tạo cạnh tranh, duyệt sai phiên bản, gửi chưa rõ, gửi lại cùng khóa, nhận một phần, hàng lỗi, sai shop và một bút toán công nợ theo phiếu.

#### Kết quả kiểm BE-16

- `npm run test:procurement` đạt 3/3 ca tích hợp. So hợp đồng báo giá, quyền từng shop và trạng thái duyệt. Đối chiếu gợi ý với tồn khả dụng, hàng đang về và đề nghị mở. Cổng gửi fixture kiểm cả kết quả thành công lẫn chưa rõ, sau đó xác nhận bằng chứng từ nguồn. Ca nhận một phần đối chiếu hàng đạt, cách ly và công nợ cùng một lần ghi.
- `npm run test:procurement:browser` đạt R44, R45, R46, R38 và R47 trên Firefox qua HTTPS với API/PostgreSQL/Redis. R45 đã tách payload tạo quy tắc theo `ReorderRuleCreate`. Sau khi nhận 2 món đạt, 1 món lỗi, còn 1 món đang về và giá vốn tồn bán được là 26,5 VND. Phiếu có đúng một bút toán công nợ.
- `npm run verify` đạt 22/22 và đăng ký khớp 160 thao tác cùng 2 health handler. Migration `20261121002300_be16_procurement_approvals` nâng cấp được cơ sở fixture đang có dữ liệu và cơ sở kiểm từ trống. Hai cơ sở khớp Prisma schema. `npm run verify` ở Frontend đạt đủ các bước, gồm 280 unit test và kiểm fingerprint S17. Log `frontend-verify.txt` có SHA-256 `366a057736283b6cf348274168b5b3ecd86bbb0f47013fb60815d8c091317a31`.

Log tại `test-results/backend/be16/`. SHA-256 của `verify.txt` là `fcd3a28b4c24f925c0d11f9a373dd0906e453bcceb01be20d1849b9468eace87`, của `test-procurement.txt` là `f7f5aa5202fb0ce29de494f8ed34191bc5310ca5857d4d87af73abc4515fa616` và của `browser.txt` là `0a05fbf396b695f68a49090f4527622f2f396355cb8207abc9586d85c8585d3f`. Cổng gửi mua đã kiểm với fixture cục bộ qua `PROCUREMENT_FIXTURE_ADAPTER=1`; kết nối nhà cung cấp thực được kiểm ở mốc tích hợp. Các thay đổi đợt 2 tiếp tục gom cục bộ.

### BE-17

**Nối đối soát, báo cáo và hàng đợi R65** · T049–T054, R65

- [x] Nối sao kê CSV, quyết toán COD, phí, phân bổ, công nợ, khóa và mở lại kỳ vào sổ BE-12. Dùng pipeline BE-08 theo mục đích và chủ tệp. Token xem trước ràng buộc shop, người nhập, file, mã đợt, định dạng, nguồn và dòng được chấp nhận. Worker kiểm lại trước khi nhập. Gợi ý theo tham chiếu và xác nhận của người có quyền đi qua chung cổng ghi sổ. Báo cáo tổng tại server theo ngày kế toán của shop.
- [x] Dựng hàng đợi thu và hoàn R65 từ bút toán, chứng từ, số đã xác minh, nghĩa vụ và người phụ trách. Lưu liên kết đến từng khoản phân bổ, công nợ và chứng từ ngân hàng. Khi cùng khoản thu của đơn cũng được hãng quyết toán, chỉ trừ phần trùng đã liên kết. Các khoản thu độc lập vẫn được cộng vào số xác minh.
- [x] Kiểm nhập trùng, retry dùng cùng khóa, phân bổ nhiều lần, COD sau phí, chênh lệch chứng từ, quyền từng shop và khóa kỳ. Trường hợp hai khoản thu độc lập 50.000 và 249.000 VND hiển thị 299.000 VND ở hàng chờ đối chiếu. Trường hợp 249.000 VND được áp dụng vào cùng công nợ cho số xác minh 249.000 VND và trạng thái đã xử lý. Kiểm thêm chứng từ hoàn 9.900 VND, phân công, phí COD 20.000 VND và số chi của sổ tiền.

#### Kết quả kiểm BE-17

- `npm run test:finance` đạt 6/6. Một giao dịch được phân bổ 90.000 rồi 159.000 VND. Đổi phiên bản trả 412, gửi lại cùng khóa trả cùng command, và tổng phân bổ khớp 249.000 VND. Khi sao kê và phiếu ngân hàng đến theo hai thứ tự, cùng mã chứng từ liên kết đúng một khoản thu. Ca quyết toán COD hai lần nhận 229.000 VND vào ngân hàng, phí 20.000 VND và giảm công nợ 249.000 VND. Ca 299.000 VND tạo công việc chênh lệch để phân công.
- Các báo cáo đối chiếu 80.000 VND lợi nhuận gộp, 30.000 VND lợi nhuận sau chi phí, tổng phát sinh Nợ/Có và phương trình cân đối quản trị. Thu chi ròng bỏ phần chuyển giữa các tài khoản tiền nội bộ. Khóa kỳ chặn chứng từ nháp và chênh lệch còn mở. Mở lại cần phê duyệt đúng kỳ, phiên bản, policy và thời hạn. Phê duyệt được dùng một lần.
- `npm run test:reconciliation:browser` đạt R49, R50, R65, R20, R22, R31, R59 và R60 trên Firefox HTTPS với PostgreSQL/Redis. Browser nhập tệp, đi đến job thành công, xác nhận ghép công nợ, mở chứng từ khoản chênh lệch, khóa và mở lại kỳ, rồi đọc các báo cáo qua API.
- `npm run verify` đạt 22/22. Ma trận áp dụng cho 182 thao tác sản phẩm và 2 health handler. Hai migration BE-17 nâng cấp được cơ sở fixture đã có dữ liệu và cơ sở kiểm dựng từ trống. Diff Prisma khớp trên cả hai cơ sở. Hồi quy cuối đạt imports 3/3, orders 11/11, inventory 9/9, procurement 3/3, events 4/4 và jobs 2/2.

Log tại `test-results/backend/be17/`. SHA-256 của `verify.txt` là `e3b39bd67de9f37a3720543983a4fd9908fb441fbdebe3fccd16767b7c93a03e`, của `test-finance.txt` là `9c303d784b16b89799ff7c5b19c199127540c9b7f9eaf6a3919eb75c32142fe8` và của `browser.txt` là `423fe5f7c13ea97df7e28cdb3a8ad0838e3a9d5a86b6a7d72b93a0dfd99725c8`. Định dạng sao kê và nguồn chứng từ phí dùng fixture tổng hợp; kiểm nguồn ngân hàng và hãng giao thực ở BE-22. Báo cáo trả phạm vi số đã ghi trong sổ quản trị với trạng thái `provisional`.

### BE-18

**Nối Inbox, tệp và tri thức** · T037–T039

- [x] Nối Messenger thử nghiệm với mô hình người dùng và hội thoại BE-11. Kết nối có trạng thái ký, hết hạn và dùng một lần. Khóa định danh theo page và shop. Sự kiện trùng giữ nguyên số chưa đọc; tin đến muộn được thêm vào lịch sử và giữ mốc tin mới nhất. Lệnh gửi giữ phiên bản tiếp quản và phiên bản kết nối để worker kiểm lại quyền trước khi xử lý.
- [x] Gửi và nhận trạng thái tin nhắn theo sự kiện fixture. Tệp ảnh có giới hạn loại, dung lượng và hội thoại khi tải và gửi. Tệp tri thức dùng TXT, CSV hoặc PDF có lớp văn bản. Worker lập chỉ mục riêng theo phiên bản. Xuất bản cần quyền và kết quả đánh giá đúng hash, phiên bản và policy. R06 dẫn ưu đãi đang hiệu lực sang đơn nháp R18.
- [x] Kiểm callback dùng lại, chữ ký sai, tin đến muộn, cùng định danh bên ngoài ở hai shop, tệp được đoán hoặc dùng sai hội thoại, cửa sổ gửi đã hết và bản nháp bot bị tiếp quản. Kiểm phản hồi đã loại thông tin riêng tư tạo nguồn nháp, sửa giữ lịch sử, xuất bản và ngừng truy xuất bản cũ.

#### Kết quả kiểm BE-18

- `npm run test:inbox` đạt 3/3. Ca ký callback kiểm cô lập shop và page, lặp mã sự kiện, lặp mã tin, thứ tự và kết nối lại. Ca gửi kiểm replay, mất quyền theo tiếp quản, tệp chờ đính kèm, URL đọc gắn phiên người dùng, ghi chú nội bộ và trạng thái không lùi từ đã đọc. Ca tri thức kiểm PDF hợp lệ và PDF cách ly, tệp riêng tư, job lập chỉ mục, RBAC, sửa phiên bản, hash đánh giá sai, bản nghỉ và phản hồi tạo nháp.
- `npm run test:inbox:browser` đạt R29, R05, R06, R18, R23, R24 và R25 qua Firefox HTTPS với PostgreSQL/Redis. Một combo đi từ hộp thư sang đơn nháp giá 19.000 VND. Trình duyệt tải nguồn TXT, chờ job, gửi mã đánh giá fixture và xuất bản đúng phiên bản.
- `npm run verify` đạt 22/22. Ma trận khớp 211 thao tác sản phẩm và 2 health handler. Hai route authorize/event thử nghiệm chỉ được đăng ký khi bật `MESSENGER_FIXTURE_ADAPTER=1` cùng cấu hình OIDC loopback. Hai migration nâng cấp cơ sở có dữ liệu và cơ sở kiểm dựng từ trống, Prisma diff sạch. `npm ci` từ manifest/lockfile ở thư mục sạch và nạp PDF.js 6.5.438 đạt. Hồi quy imports 3/3, orders 11/11, events 4/4, jobs 2/2 và finance 6/6.

Log tại `test-results/backend/be18/`. SHA-256 của `verify.txt` là `53ae1ebb6b972c7e1b2aecf6c1eed2433392082b73bc1cfa29bb8ce195502509`, của `test-inbox.txt` là `7a7c2ee57889695cee74c47e45ed332acfce9219cc28463cd348e47a52bef91e`, của `browser.txt` là `43a20a3d40bd5b1185bda42b5244208fdd6557a5206c42e3a73d65ea1ca07bb8` và của `clean-install.txt` là `3fd003a5d7b159a3d35811b2ef645c3c39fb9e0d34a6f471a838717749b2356b`. Cổng gửi, nhận và duyệt nguồn đã chạy bằng dữ liệu tổng hợp. Đánh giá tự chạy nối ở BE-19. Kết nối Meta thật và cấu hình media theo provider thuộc BE-22.

### BE-19

**Nối AI và công cụ bán hàng có giới hạn** · T040–T042

- [x] Dựng adapter AI thử nghiệm theo danh mục cố định, khóa mã hóa theo shop và kết nối, job kiểm khóa, ngân sách số thập phân theo ngày của shop và giới hạn bước công cụ. Công cụ kiểm quyền hiện hành và trả phiên bản cấu hình, nguồn và chi phí tổng hợp. Replay phòng thử đọc bản ghi cũ.
- [x] Nối giá và tồn khả dụng qua Catalog và Inventory, tri thức qua cổng nguồn đang xuất bản và đơn nháp qua Orders. Worker gắn nháp với tin đến và lệnh đã ghi, lưu nguồn và dùng chung đường gửi Messenger. Xác nhận đơn tiếp tục qua BE-11 với bằng chứng khách, tồn, thanh toán và chính sách hiện hành. Hợp đồng cấu hình yêu cầu người xác nhận. Các điều kiện ủy nhiệm bổ sung thuộc BE-20.
- [x] Kiểm hết ngân sách, ngữ cảnh khách không được cấp, nội dung nguồn chứa chỉ dẫn sai, giới hạn bước, quyền đã thu hồi và chuyển người xử lý. Bộ ca cố định gắn phiên bản, dấu vân tay của cấu hình, dữ liệu nguồn và chính sách. Publish chạy job kiểm lại bằng chứng và đổi thế hệ bot. Restore tạo bản nháp mới.

#### Kết quả kiểm BE-19

- `npm run test:ai` đạt 3/3. Kết nối thử khóa sai, xoay khóa, chỉ trả bốn ký tự cuối và tra theo shop. Ba lượt dùng hợp lệ trừ đúng ba đơn vị thử, phát lại cùng khóa giữ nguyên kết quả và lượt tiếp theo trả trạng thái hết hạn mức. Đánh giá cấu hình đạt 5/5 và đánh giá nguồn đạt 4/4. Bằng chứng khác phiên bản bị chặn. Ca Inbox nhận trùng chỉ tạo một nháp 24.690 VND và một tin fixture, sau khi thu hồi quyền worker chuyển người xử lý và chỉ có một work item cho hội thoại.
- `npm run test:ai:browser` đạt R30, R27, R28 và R26 trên Firefox HTTPS, PostgreSQL và Redis. Tạo kết nối có khóa ẩn, chạy job kiểm, lấy kết quả thử không gửi tin, theo dõi đánh giá 5/5, tra command xuất bản và đối chiếu bản chạy sau tải lại.
- `npm run verify` đạt 22/22, 228 thao tác sản phẩm và 2 health handler. Migration `20261121002800_be19_ai_profiles_and_runtime` áp dụng trên database đang dùng và database đối chứng ban đầu trống, Prisma diff sạch ở cả hai. Hồi quy inbox 3/3, orders 11/11, events 4/4 và jobs 2/2.

Log tại `test-results/backend/be19/`. SHA-256 của `verify.txt` là `abc650271715ffc09174b2350307b07247288e1d475738a83e83f6cc2e91c630`, của `regression-ai.txt` là `0e40a39b12d7b9f18a046848b94ed9ff7bee6adae7a8b1f650357659b852d2c2` và của `browser.txt` là `a9575b6a6f0359f0b7edebe47488f87fba779a970fad011d1fd722da77e46261`. Bằng chứng áp dụng cho cổng và dữ liệu tổng hợp. Đo token, chất lượng mô hình, vault khóa thật và giới hạn nhà cung cấp cần cấu hình BE-22.

### BE-20

**Nối điều phối, phê duyệt, marketing và ngoại lệ R63** · T055–T060, R63

- [x] Nối bốn vai trò AI, người chịu trách nhiệm, giới hạn công cụ, phiên bản policy, nút dừng shop/vai trò/hội thoại và cập nhật công việc. Phê duyệt hạn mức dùng hàng duyệt chung và yêu cầu người có quyền quyết định khác người đề nghị. Đơn mua tự gửi qua ủy quyền có kho, nhà cung cấp, phiên bản báo giá và hạn mức cụ thể. Worker giữ tiền cam kết trước gửi và kiểm lại quyền, thế hệ, điều khoản và tồn khả dụng lúc thực hiện.
- [x] Nối bản tin theo ngày địa phương, dấu thời gian kiểm worker, và dữ liệu Tổng quan từ hội thoại, đơn, kho và sổ tài chính. R53 tính tổng giảm và doanh số từ đơn đã chốt, giữ nguồn chưa xác định riêng và trả `null` cho chi quảng cáo thiếu chứng từ. R63 lọc trước cursor và mở đúng hồ sơ R46 qua mã. Lệnh chưa rõ giữ khoản cam kết và việc cần đối chiếu.
- [x] Kiểm phê duyệt hết hạn, tự duyệt và mức tiền bị thay, vai trò sai phạm vi, tạm dừng ủy quyền và dừng rồi mở lại shop trước khi thực hiện lệnh cũ, bản tin chạy đồng thời, worker mất dấu kiểm và ngoại lệ phát sinh từ luồng mua hàng tổng hợp.

#### Kết quả kiểm BE-20

- `npm run test:operations` đạt 4/4. Đơn mua fixture 120 VND giữ ngân sách một lần. Tạm dừng trước gửi giải phóng khoản giữ. Lệnh chưa rõ giữ khoản cam kết tới lúc đối chiếu bằng chứng nhà cung cấp, sau đó chốt khoản giữ, cập nhật command và đóng công việc. Dừng rồi mở lại shop vẫn chặn tác vụ thế hệ cũ. Hạn mức thấp hơn giá trị đơn không tạo khoản giữ. Hai worker cùng chạy kỳ chỉ tạo một bản tin và một thông báo nội bộ. Worker có dấu kiểm cũ hiển thị chưa xác minh.
- `npm run test:operations:browser` đạt R04, R37, R38, R45, R46, R51, R52, R53 và R63 trên Firefox HTTPS với PostgreSQL/Redis. R63 mở đúng nội dung đơn mua từ ngoại lệ. R45 lưu ủy quyền và ngân sách đã áp dụng. R53 hiển thị combo có tiền hàng 190 VND sau giảm 10 VND. Bằng chứng danh sách R45 cần tải thêm trang kho khi kho được chọn nằm ngoài trang đầu. Suite tạo dữ liệu và Firefox dùng cùng khóa ký của cổng AI thử.
- `npm run verify` đạt 22/22. Ma trận khớp 245 thao tác và 2 health handler. Hồi quy AI 3/3, inbox 3/3, orders 11/11, procurement 3/3, events 4/4, jobs 2/2 và workspace 9/9. Bộ kiểm workspace tìm thành viên qua trang được lọc thay vì giả định luôn nằm trang đầu.
- Migration `20261121002900_be20_operations_governance` bổ sung thời điểm cập nhật cho dữ liệu mồi và trigger tạo shop sau khi lần kiểm nâng cấp phát hiện thiếu trường. Kiểm lại trên DB đang dùng và DB đối chứng trống mới đều đạt, Prisma diff sạch. DB đối chứng provisioning hai lần vẫn có 2 phần điều khiển shop, 8 vai trò và 6 chính sách ngân sách.

Log tại `test-results/backend/be20/`. SHA-256 của `verify.txt` là `c642d84529506614279608ce220a5185c5c09bbb05d6992cab600b07be97d8f9`, của `operations.txt` là `50a75bbfbe2aed43fdfa008b3a55fc0e3ed132056368f43977b93d019dbd9f5c` và của `operations-browser.txt` là `066686b97787f6f942ee71860a464bbbae86a6557a9b6d01840e8aa194f76994`. Gửi đơn và chi phí AI/thông báo trong ca kiểm là dữ liệu tổng hợp. Ghi nhận chi quảng cáo thực tế cần nguồn được cấp quyền.

### BE-21

**Hoàn thiện onboarding, quyền riêng tư và kiểm toàn phạm vi** · T061–T066

- [x] Nối thiết lập shop, consent, opt-out, lưu giữ và yêu cầu privacy trên dữ liệu thử. Dùng phép tổng hợp Finance và pipeline tệp dùng chung cho export. Xác minh lại theo phiên thử với token ngắn hạn và dùng một lần.
- [x] Đối chiếu 259 operation với route, quyền, tham số, phiên bản và ca kiểm. Bổ sung ca canonical `SC2-C07-CONSENT`, kiểm thất lạc phản hồi, xung đột khóa, scope hai shop và thu hồi quyền tải.
- [x] Chạy migration từ PostgreSQL trống, hồi quy tích hợp và luồng `dev:live` R03/R33/R35/R61/R31/R14 theo phạm vi cục bộ. Di trú dữ liệu thật, IdP và kết nối ngoài được theo dõi ở BE-22–BE-24.

#### Kết quả kiểm BE-21

| Phạm vi | Kết quả |
|---|---|
| Thiết lập shop | Tạo shop, membership chủ shop, kho mặc định, bốn vai trò và ba nhóm hạn mức trong một giao dịch. Hai POST đồng thời cùng khóa trả về một shop. Firefox làm mất phản hồi đầu và gửi lại cùng khóa trong form đang mở. PostgreSQL có một shop, một lệnh và một audit. R33 dùng `If-Match`; sửa múi giờ làm mới phiên bản policy áp dụng. |
| Consent | Challenge ràng buộc shop, khách, kênh, mục đích, phiên bản nội dung và thời hạn 24 giờ. Khi đã cấp consent, challenge tiếp theo đặt hành động rút quyền với nội dung riêng. Đối chiếu lặp, link hết hạn, sai shop, sai phiên bản và yêu cầu CSRF. Sau khi rút quyền, cổng dùng chung từ chối phiên bản consent cũ. Adapter phát link và hàng đợi gửi marketing thật thuộc BE-22. |
| Chính sách và xác minh lại | Bản nháp cấu hình và khả năng phê duyệt đọc từ API. Luồng fixture bật bằng `PRIVACY_FIXTURE_ACTIONS=1` với IdP loopback. Token gắn một phiên, thời hạn tối đa 5 phút và chỉ dùng một lần; kiểm khóa tạm sau năm lần sai. Worker kiểm lại quyền và phiên bản chính sách. Ca legal hold giữ hồ sơ, ca đủ điều kiện ẩn định danh, dữ liệu liên hệ và tin nhắn, thu hồi link xuất cũ và dọn nội dung tệp đã hết hạn. |
| Tệp export và quyền tải | CSV giữ dữ liệu đã chụp khi tiếp nhận lệnh và ghi cả mốc chụp lẫn mốc báo cáo người dùng xem. Job xuất JSON quyền riêng tư theo khách và shop, gồm metadata tệp đính kèm. URL ký được kiểm lại theo phiên, vai trò, chủ thể và nguồn, có hạn tối đa 5 phút. Tệp giữ 24 giờ hoặc ngắn hơn khi có yêu cầu xóa phù hợp. Hồi quy thử nội dung sau khi thu hồi quyền và sau khi hết hạn. |
| PostgreSQL và ma trận | Migration 30 áp dụng được trên DB đang dùng và từ trống, chạy lại hết migration chờ, diff schema sạch. `npm run verify` đạt 22/22 ca và 259/259 operation đăng ký. Suite BE-21 đạt 4/4. Toàn bộ 16 suite PostgreSQL/OIDC/worker trên cluster fixture mới đạt 86/86. Sai lệch sự kiện lịch sử `journal.updated` còn được ghi tại BE-10. |
| Giao diện | Firefox HTTPS đạt R03, R33, R35, R61, R31 và R14. R35 xác minh và phê duyệt ở 390 px. R61 chạy với phiên khách công khai. Kiểm bản demo R35 đạt 2/2 trên Chromium/Firefox. `npm run verify` frontend đạt 280 Vitest, 122 ca domain/network và kiểm bằng chứng S17. Native zoom, screen reader và UAT do người dùng nghiệm thu vẫn được theo dõi ở phạm vi tương ứng. |

Log cục bộ `test-results/backend/be21/` gồm `verify.txt` SHA-256 `6ffd2005b3d967349612d3991c6db1742e69b72b04002ff239c5c2cb7b107e3f`, `fresh-migrations.txt` SHA-256 `6970f93d9891b0faeb66aa309a818ed90cb74a177ab2881cef5bfd94290c234a`, `regression-privacy.txt` SHA-256 `2f1be263289e7f99b2b0b5505ba5e5112c03c5bfcfe5b0f270294ea402bc22ad`, `browser.txt` SHA-256 `9948a804b43d43a02c01f59284db67f5a19e4c690f158a6c336d3b1feb831290`, và `frontend-verify-final.txt` SHA-256 `c55faf7f753c37d2ca817d473c0d0186d45a7bec6375bc724a17474179131f19`. Kiểm frontend cuối BE-20 lưu riêng ở `test-results/backend/be20/frontend-verify-final.txt` SHA-256 `62c4909e781e85ab1691094dbe56bad3ea30db0db5033eb26de92f21a5eb391e`. Dữ liệu các ca đều là fixture tổng hợp.

## P3 Staging và phát hành

### BE-22

**Dựng staging và tích hợp được cấp quyền** · T067–T072

- [ ] Chốt region, ngân sách, người phụ trách, dữ liệu thử, domain và callback. Tách DB, Redis, lưu tệp và thông tin xác thực khỏi production. Dùng HTTPS cùng origin cho frontend và API.
- [ ] Kết nối IdP, Meta/AI, Web Push/Telegram và hãng vận chuyển/nhà cung cấp/nguồn sao kê theo từng đầu vào đã được duyệt. Nhà cung cấp chưa chọn có thể giữ quy trình thủ công theo phạm vi đã xác nhận.
- [ ] Chạy ca tích hợp thật trên staging, kiểm grant, callback, giới hạn nhà cung cấp, thu hồi quyền và quy trình khi tác động đã gửi nhưng chưa nhận kết quả.

#### Bản thử cục bộ · BE-22

- Quyết định ngày 22/11/2026 dùng Windows 11 và Ubuntu WSL2 trên máy chủ dự án cho giai đoạn dùng thử. Chi phí thuê hạ tầng bằng 0. Giao diện `dev:live` chạy qua trình khởi động HTTPS hiện có, phục vụ tại `https://localhost:5173/workspaces`. Dữ liệu gồm hai shop tổng hợp trong PostgreSQL 18.7 riêng, Redis 8.0.5, kho SeaweedFS 4.54 riêng và ClamAV 1.5.4 với chữ ký thử.
- Chế độ `P0_LOCAL_PILOT=1` tạo tài khoản OIDC tổng hợp `p0-pilot` có quyền chủ shop ở cả hai cửa hàng để dễ chuyển qua lại. Hai tài khoản thử một shop giữ nguyên phạm vi cho các ca cách ly. Tùy chọn pilot chỉ dùng với DB fixture loopback và IdP thử. Firefox dùng profile riêng tin CA thử. Khóa, cấu hình bí mật và profile nằm ngoài Git.
- Các adapter AI, Messenger, thông báo và mua hàng chạy ở chế độ mô phỏng đã có. Dữ liệu thử, tệp và hoạt động nền xử lý trên máy. T067–T072 giữ nguyên tiêu chí kiểm hạ tầng được cấp và nhà cung cấp thật cho giai đoạn staging.
- Đã áp đủ 41 migration từ PostgreSQL trống, chạy seed hai lần và đạt `npm run verify` 45/45. Firefox qua HTTPS đăng nhập và mở được **BotSales P0 A** và **BotSales P0 B**. Hai tài khoản một shop đều nhận `404` khi đọc shop còn lại. Mỗi shop có một SKU mẫu được tạo qua API. Gửi lại yêu cầu tạo với cùng khóa trả đúng cùng sản phẩm.
- ClamAV chấp nhận tệp CSV tổng hợp. Worker chuyển tệp sang SeaweedFS, xóa bản bytes tạm và xác nhận lại checksum của một object với 0 sai lệch. Worker hoàn tất ca kết nối AI mô phỏng. Trong ca smoke, trình duyệt ghi 0 yêu cầu HTTP ra ngoài máy. Phiên chạy chỉ lắng nghe loopback. Đã mở màn **Chọn cửa hàng** trên Firefox và giữ các dịch vụ chạy để chủ dự án thử.
- Hồ sơ cục bộ `test-results/backend/local-pilot/verification.json` có SHA-256 `4a9cb60470d1d3d358ab8943213241fdcb05662ea6397cd3aba52de4575e86da`. Việc dùng thử của chủ dự án được thực hiện sau ca smoke. CI ứng viên đã đạt trên `main@1054b73f`. Tiếp tục kiểm dịch vụ thật và nghiệm thu phát hành theo các điều kiện BE-22–BE-24. [Bằng chứng CI](#ci-hợp-nhất-hai-đợt)

#### Hồi quy bản thử hai shop · BE-22

Triển khai và kiểm theo thứ tự phụ thuộc. Lệnh `npm run test:pilot:browser` mở IdP, API, worker và frontend `dev:live` trên loopback. Bộ kiểm chỉ nhận fixture cục bộ và từ chối cấu hình nhà cung cấp thật trước khi mở dịch vụ. [Cách chạy](README.md#kiểm-bản-thử-cục-bộ-với-hai-shop)

| Ưu tiên | Phạm vi BE-22 | Kết quả trên máy |
|---|---|---|
| 1 | T067–T068 · Dữ liệu, HTTPS và phân quyền | PostgreSQL 18.7 trống áp dụng đủ 44 migration, seed pilot hai lần. Tiền kiểm khớp 44 checksum, Redis 8.0.5 có AOF và `noeviction`. Firefox xác nhận callback 302, phiên sau tải lại 200, logout 204 và sau logout 401. Tài khoản một shop đọc shop mình 200 và shop kia 404 theo cả hai chiều. |
| 2 | T069 · Messenger mô phỏng và B08 | Cả shop A (VND) và B (LAK) nhận đúng một tin dù dùng lại cùng mã sự kiện giữa hai Page và gửi lại trong từng Page. Chữ ký sai trả 404. Worker hoàn tất gửi WAV thử. Firefox đọc được metadata âm thanh và lưu bản chép lời nội bộ có đúng tệp và tin nguồn. Phát lại lệnh ghi trả cùng bản ghi, không sinh lượt gửi cho ghi chú. Đọc hội thoại hoặc tệp từ shop kia trả 404. |
| 3 | T070 · Thông báo mô phỏng | Mỗi shop gửi thử một thiết bị qua worker. Cùng khóa chống lặp chỉ tạo một thông báo, lưu trạng thái `accepted_by_provider`, giữ `openedAt` và `acknowledgedAt` rỗng rồi thu hồi thiết bị. Bộ Orders kiểm thêm Web Push, Telegram dự phòng, giờ yên lặng và phản hồi chưa rõ. |
| 4 | T071–T072 · Chứng từ và luồng nghiệp vụ | Bộ Orders, Procurement và Finance chạy lại luồng vận chuyển thủ công, bàn giao đơn mua, phiếu nhận và đối soát COD. Bộ Inbox và AI kiểm lại xác nhận báo giá bằng tin có chữ ký, tạo một đơn nháp hoặc bàn giao khi chưa rõ kết quả mô phỏng. |

Hai lượt pilot liên tiếp đạt trên cùng fixture và mỗi lượt ghi 0 yêu cầu trình duyệt ra ngoài. `npm run verify` đạt 45/45 và ma trận 259 thao tác. Hồi quy trên database chuẩn dựng riêng đạt 73/73 gồm PostgreSQL 7, OIDC 13, Workspace 9, Inbox 9, AI 6, Orders 14, Procurement 4, Finance 6 và Operations 5. Lượt thử PostgreSQL ban đầu dùng lại DB pilot nên sai kỳ vọng về số tài khoản và phiên. Chạy lại từ DB dành cho seed chuẩn đạt 7/7. Sau kiểm đã dừng hai bộ dịch vụ riêng của lượt này.

Hồ sơ cục bộ tại `test-results/backend/be22/local-pilot-v180/verification.json`, SHA-256 `19b94b1def363e7fef6df4a99eb57b1c385dbea9a3fd86bfeceba8cfe0aced21`. Hồ sơ gắn với `main@1448fbfc` và checksum phần mã kiểm sửa cục bộ. Lượt này dùng kho tệp fixture trong PostgreSQL và kiểm frontend qua HTTPS development. Tiền kiểm staging trả `BLOCKED` với 7 nhóm đầu vào còn thiếu. Điện thoại thật, Meta/OpenAI và kết nối vận chuyển, mua hàng, sao kê được cấp tiếp tục theo T067–T072.

#### Chuẩn bị và điều kiện mở BE-22

- Gói `test-results/backend/be23/release/botsales-backend-local-candidate.tgz` được tạo từ checkout cô lập tại `b236c446` và phần thay đổi cục bộ. Hai workspace cài mới bằng `npm ci`, giữ hash lockfile. Gói có 580 tệp đã đối chiếu theo manifest, 30 migration, API và worker cùng với web live tĩnh. SHA-256 `039695abc2c4683c8500b8ed29d927524a5f4d654955a4eae7f21547e350a6d8`. Source gói có thay đổi cục bộ và cần có SHA phát hành được duyệt trước khi dùng làm bản staging chính thức. [Runbook](infra/RELEASE_RUNBOOK.md)
- `npm run check:staging` báo `BLOCKED` do thiếu người phụ trách, vùng/ngân sách, domain và cấu hình hạ tầng, tài khoản OIDC, grant Meta/AI, thiết bị/Telegram và kết nối vận chuyển/nhà cung cấp hoặc lựa chọn quy trình thủ công đã duyệt. Kết quả chỉ nêu tên đầu vào và nhóm biến. Log cục bộ `test-results/backend/be22/preflight.txt`. [Nguồn đầu vào](../botsales-kit/execution/owner-inputs.json)
- T067.S04 kiểm riêng cấu hình `NODE_TLS_REJECT_UNAUTHORIZED`. Giá trị `0` làm tiền kiểm báo `BLOCKED` và thoát mã 1 kể cả khi chưa cấp cấu hình phê duyệt AI. Ca kiểm xác nhận giá trị `1` qua được điều kiện TLS này. Lượt tiền kiểm cục bộ vẫn ghi 7 đầu vào từ T067–T072 còn thiếu. Hồ sơ `test-results/backend/be23/staging-tls-outbox-20261122/staging-tls-preflight.json` có SHA-256 `22dd0f0a1b31a12b22a67c26bfae62f60be37b17c2ec677585443c001ae7d540`. [Kiểm cấu hình staging](infra/RELEASE_RUNBOOK.md#kiểm-cấu-hình-staging)
- T067.S04 và T068 dùng chung quy tắc đích khai báo cho tiền kiểm cấu hình, PostgreSQL, Redis, OIDC và HTTPS. Chế độ staging từ chối dải loopback IPv4, IPv6 loopback, IPv6 ánh xạ IPv4 loopback và tên dưới `.localhost`. Địa chỉ lắng nghe mọi giao diện bị từ chối ở cả hai chế độ. Ca kiểm OIDC và HTTPS xác nhận từ chối trước khi kết nối dịch vụ. [Quy tắc phạm vi](infra/RELEASE_RUNBOOK.md#kiểm-cấu-hình-staging)
- Backend `verify` đạt 45/45, OIDC qua HTTPS đạt 13/13. Từ gói giải nén `b236c446-rA4hPL.tgz`, kiểm dữ liệu nhận đúng 41 migration và Redis 8.0.5 trong fixture, đồng thời chặn cùng cấu hình nếu chạy chế độ staging. Smoke qua Caddy xác nhận API, worker, web và xuất CSV trên cùng manifest `d67bc1789acdf949012c10cd22caa033bc85187304b5e62bbf613a1e060de3ee`. Hồ sơ `test-results/backend/be22/staging-probe-scope/verification.json` có SHA-256 `5ea58af9125461f9f4670719493a11a36f911d61c2115d145cc80e27d989c7fa`. Kết quả này dùng fixture cục bộ. Nghiệm thu staging cần đích và cấu hình được cấp.
- Gói giải nén đã chạy smoke trên dữ liệu tổng hợp, web và API cùng origin HTTPS, worker với Redis fixture. Gate BE-22 cần môi trường được giao và nguồn cấp thật cho từng adapter. Giữ đợt 2 ở 9/10 mốc đã kiểm chứng.
- Tại lần kiểm 15:00 UTC, API GitHub trả danh sách môi trường rỗng và truy vấn deployment của `staging` trả 0 bản ghi. Thông tin staging ngoài GitHub và quyền tích hợp vẫn cần chủ dự án cung cấp. Log `test-results/backend/be23/pitr/github-environments.json`. [GitHub Environments](https://api.github.com/repos/LonelyTraderBay/Bot-AI-Ban-hang-FB/environments)
- Gói thử v1.30 là `test-results/backend/releases/b236c446-58Nydc.tgz`, SHA-256 `33125faf10566dd1956fb8e45b93c42a047154280854fc86ae93341d70173cb9`. Bản giải nén đã kiểm 580 tệp và 30 migration, cài lại runtime dependencies và chạy smoke HTTPS với PostgreSQL fixture. Kết quả của gói v1.28 phía trên vẫn gắn với digest lịch sử.
- Gói thử v1.32 là `test-results/backend/releases/b236c446-IEGvAU.tgz`, SHA-256 `4142276bd83cc14d50182373e9b30ea5f0935f5a2132bd9d1fc2f469344a0022`. Đã kiểm 585 tệp và 31 migration sau giải nén. Công cụ thu bằng chứng chạy từ gói. HTTPS trả 200 cho web, readiness và phiên. Lệnh export trả 202, worker hoàn tất và URL ký trả 200. Gói được build từ checkout có thay đổi cục bộ.
- Gói thử v1.33 là `test-results/backend/releases/b236c446-6VawJf.tgz`. SHA-256 archive `6951d0e0649019859d5fe8dbcf8f8b2c78dacf2e1acdcebd723933b33c58410f`, SHA-256 manifest `8f6eaac4ecac6cbc08aea2a02c58392465ecb5dc63f5acf8b5ac32d25394e1ae`. Đã kiểm 586 tệp và 31 migration sau giải nén. Lệnh `check:release-runtime` đối chiếu 34 tệp web, đường dẫn trực tiếp `/workspaces` và manifest API qua HTTPS. Worker hoàn tất job thử từ cùng gói và báo đúng mã manifest. Chế độ staging yêu cầu artifact từ checkout sạch. Preflight chạy lại trên cấu hình fixture vẫn báo `BLOCKED` với 7 nhóm đầu vào chủ dự án chưa cung cấp. [Đối chiếu runtime](infra/RELEASE_RUNBOOK.md#đối-chiếu-gói-đang-phục-vụ-qua-https)
- Gói thử v1.34 là `test-results/backend/releases/b236c446-XtiClF.tgz`. SHA-256 archive `0564b7d1db5b7543944157085e5fd892879c9ce9e68838f78ee8988f752d201b`, SHA-256 manifest `3b6dc4482d4db0d2993ce535f310363b82c8bad43ab30e08408b42adc5341856`. Kiểm 588 tệp và 31 migration sau giải nén. Smoke HTTPS, worker và phép kiểm toàn vẹn đạt từ gói cài bằng lockfile runtime. Gói thử này có thay đổi cục bộ.
- T068 có lệnh `check:oidc-provider` dùng chung cấu hình và kiểm discovery của API. Đã xác minh issuer, S256, phương thức client và khóa JWKS trên IdP thử qua HTTPS. Ca sai issuer, token endpoint HTTP, thiếu S256, phương thức client không khớp, JWKS chuyển hướng, khóa không hợp lệ và TLS thiếu tin cậy đều bị chặn. Tất cả yêu cầu tiền kiểm đã đo là GET công khai. Trình duyệt Firefox đạt callback 302, phiên sau tải lại 200, logout 204 và phiên sau logout 401 trên fixture. Tài khoản, quyền client, callback và xác minh lại R35 ở tenant staging vẫn chờ nghiệm thu. [Tiền kiểm OIDC](infra/RELEASE_RUNBOOK.md#tiền-kiểm-nhà-cung-cấp-oidc)
- Gói thử v1.36 là `test-results/backend/releases/b236c446-tZIX1F.tgz`. SHA-256 archive `bf0aba9b145faf81123d87f1a6b3d4736df6db1053a6485130864b94e8004676`, SHA-256 manifest `e3ede84141e195fe459ac214ad533dce7947917a6649d483a04595919f03aa76`. Kiểm 589 tệp và 31 migration. Gói giải nén cài runtime từ lockfile, chạy tiền kiểm OIDC trên fixture và đối chiếu 291 gói runtime với SBOM. Audit dùng kết quả lockfile trùng từng byte của v1.35.

Log T068 ở `test-results/backend/be22/oidc-provider/`. SHA-256 của `https-suite.txt` là `ebd5f9134618b4a9c1aab8f3f6cd64b12840d69c3104d3deecb62c477430c2c8`, của `firefox.txt` là `033875b5e2a5d1d5b3cea01d927c9812c100eba1be16888d34c2b4fdeae8f25a`, của `packaged-oidc.txt` là `94341f1066236e0c69705c7c10044931b76aecbd8656bf889857c80d8ec11213`. Backend `verify` đạt 22/22, ma trận khớp 259 operation và bộ OIDC đạt 11/11 trên HTTPS/PostgreSQL fixture.

- T067 có lệnh chỉ đọc `check:staging-data` để kiểm hai role cùng database, readiness, quyền hiệu dụng, 31 migration và checksum. Redis dùng chung cấu hình kết nối với worker và kiểm TLS, `PING`, primary độc lập, `noeviction` và trạng thái AOF. Ca dương đạt trên PostgreSQL 18.7 và Redis 8.0.5 với TLS được xác minh. Ca âm chặn đúng loopback ở chế độ staging, URL đổi đích, phiên runtime chỉ đọc, Redis thiếu CA tin cậy, thừa quyền sửa audit, migration sai checksum/chưa hoàn tất và Redis bật loại bỏ khóa. Kiểm checksum chấp nhận chuyển đổi LF/CRLF tương đương. [Tiền kiểm dữ liệu](infra/RELEASE_RUNBOOK.md#tiền-kiểm-postgresql-và-redis)
- Gói thử v1.37 là `test-results/backend/releases/b236c446-CDnVBH.tgz`. SHA-256 archive `650f26a6a95b311d5d2f251d1da45fb59daf06bc54c16e4316f8c1520468fda4`, SHA-256 manifest `28b1145d517d955b680eeadfad6ff5bfde4b7a5a69e945b96b1b87c621b3effb`. Đã kiểm 592 tệp và 31 migration, cài từ lockfile trùng v1.36. Công cụ từ gói đạt trên fixture TLS. API đã nhận một lệnh export, worker hoàn tất qua Redis TLS và tải ký trả 200. SBOM khớp 291 vị trí cài runtime trên Windows.

Log T067 ở `test-results/backend/be22/data-services/`. SHA-256 của `probe-suite.txt` là `590012a88f289cc151cc2c3d24830904dd06a3a16397e62b5ded4808236848de`, của `final-packaged-preflight.txt` là `54bffacb3735272eabedcb4b1d98eb323e178f38271c3e918a5179ee5effd25f`, của `final-package-smoke.txt` là `72fac5e84a721daaedfef000c483c9363dccc95a8769a0e47fa9b62d18227b4a`. Backend `verify` đạt 24/24, SSE và jobs đạt 7/7. Đã thêm bước tiền kiểm fixture vào script PostgreSQL của CI và kiểm cú pháp Bash. Staging vẫn cần quyền hạ tầng và cấu hình thực tế.

#### Quét tệp tải lên · T067.S02–S04

- `uploadFile` kiểm phiên, CSRF, quyền và khóa chống trùng trước khi gửi tệp tới `clamd`. Bộ quét chạy ngoài giao dịch DB qua socket Unix hoặc loopback TCP. API giới hạn tệp 5 MiB, bốn lượt quét đồng thời trên mỗi tiến trình và thời hạn năm giây. Tệp bị đánh dấu chỉ sinh metadata cách ly. Lỗi, phản hồi thiếu hoặc chưa cấu hình scanner ngoài fixture trả 503 cho lần ghi mới. Tra lại lần ghi đã hoàn tất vẫn trả đúng lệnh cũ.
- Readiness kiểm phản hồi từ daemon. Tiền kiểm staging phát hiện cấu hình scanner thiếu. Ca PostgreSQL kiểm CSRF sai và khóa sai không gọi scanner, lỗi giữa phiên không sinh command mới, replay giữ mã tệp, và yêu cầu mới thành công khi scanner phục hồi. ClamAV 1.5.4 trên loopback quét đúng một CSV sạch và một CSV có dấu hiệu thử vô hại. Backend `verify` đạt 40/40. Catalog 10/10, Imports 3/3, Inbox 8/8, AI 6/6 và Finance 6/6 trên fixture có 40 migration. [Runbook scanner](infra/RELEASE_RUNBOOK.md#quét-tệp-tải-lên-bằng-clamav)
- Firefox qua Caddy đạt ba luồng nhập sản phẩm, hội thoại và tri thức, nhập sao kê từ gói `b236c446-kq7TEe.tgz` đã cài runtime. PostgreSQL ghi thêm bốn audit quét sạch cho tệp nhập sản phẩm, tệp kiến thức và sao kê. SHA-256 archive `38bb4b26b678484f2e0171a28da28305f0cd30827e4e260b4a5b229bfe5b6f86`. SHA-256 manifest `a4fbfaf16a1453617a2e66b562f03f7979e7d59953e96f5006fefc246adb953f`. Hồ sơ `test-results/backend/be22/file-scanner/file-scanner-verification.json` có SHA-256 `3ba23bd882834e159bf06370b8846d20be79ddc544125e1d7ceba9e652b802be`. Dữ liệu thử dùng chữ ký tổng hợp của daemon cục bộ. Kho đối tượng riêng, bộ chữ ký và môi trường được cấp tiếp tục thuộc nghiệm thu BE-22.

#### Kho đối tượng riêng tương thích S3 · T067.S02–S04

- PostgreSQL giữ bytes tạm và tham chiếu bền vững theo shop. Worker giữ lease khi chuyển, dùng một khóa S3 cho mỗi nội dung và chỉ chuyển nguồn đọc sau khi đọc lại đúng SHA-256 và kích thước. Tham chiếu và việc bỏ bytes tạm cập nhật trong một giao dịch. Ca mất kết quả sau ghi dùng lại cùng object và tạo đúng một audit. Khi thu hồi quyền đọc của tệp trong lúc chuyển, API chặn URL ký và worker xử lý dọn ở lần sau. [Runbook kho đối tượng](infra/RELEASE_RUNBOOK.md#kho-đối-tượng-riêng-tương-thích-s3)
- Cổng dùng AWS SDK v3, kiểm riêng định danh cấu hình bucket và yêu cầu kho riêng chưa bật versioning. S3 lỗi hoặc mất object đã ghi trả 503 sau kiểm quyền. URL trực tiếp trong fixture bị từ chối. Tiền kiểm staging bắt buộc cấu hình kho. `check:object-storage` đọc lại bytes của các tham chiếu đã chuyển và báo số lượng sai lệch cùng digest. Báo cáo phục hồi PostgreSQL gắn trạng thái chuyển trong dấu vân tay file metadata.
- Migration 41 đạt trên PostgreSQL trống và bản sao từ migration 40. Bản nâng cấp giữ 20 metadata và 14 blob cũ. Prisma khớp schema. Backend `verify` đạt 40/40. Object Storage 2/2, Catalog 9 ca đạt và ca scanner tùy chọn đã có bằng chứng tại mục trước. Imports 3/3, Inbox 8/8, Finance 6/6 và Privacy 4/4.
- Gói `b236c446-q1gxxv.tgz` đã kiểm 654 tệp và 41 migration. Firefox qua Caddy đạt bốn nhóm nhập sản phẩm, hội thoại và tri thức, đối soát sao kê, quyền riêng tư và tải báo cáo. Ca nhập sản phẩm, tri thức và sao kê kiểm bytes đã ở S3 trước khi tiếp tục. Công cụ từ gói kiểm 15 object đúng SHA-256. Snapshot nguồn và bản sao PostgreSQL khớp 27 nhóm. Hai bản dùng chung bucket SeaweedFS 4.54 cục bộ và cho cùng digest 15 object. SHA-256 archive `e78a9b42a87502e6dec6f966bb8c40d387f1e61a0731b5f2a2e055160695edae`. SHA-256 manifest `71ec86d4172bc9e6c5aa4df8da94d1613934fb47729b7069f83c0de7a6c93034`. Hồ sơ `test-results/backend/be22/object-storage/object-storage-verification.json` có SHA-256 `9b821ced4584c5fbc642b58e9234e84d63291aae6500b53ccef0cf47218e179f`. Bucket, quyền và phục hồi kho độc lập cần nghiệm thu trên staging.

#### Cổng HTTPS tham chiếu · T067.S02–S04

- Caddyfile nằm trong gói, phục vụ web tĩnh cùng origin với API loopback. Cổng giữ nguyên `/api`, xử lý deep link, cho kiểm lại cache web, trả đúng 404 khi tệp tĩnh thiếu và lọc request khỏi log lỗi. Dùng chuỗi chứng chỉ và khóa do môi trường cấp. [Cấu hình](infra/edge/Caddyfile) · [Runbook](infra/RELEASE_RUNBOOK.md#cổng-https-cùng-origin)
- Kiểm trên Caddy 2.11.9 Windows x64 và gói thử `b236c446-BAroBq.tgz` sau cài runtime. Gói có 593 tệp, 31 migration và 34 tệp web đã đối chiếu qua HTTPS. SHA-256 archive `ab9709bf6242aaaf38602ba567ee45b456d79e469c6bbbae53cb3e13d720b32f`, SHA-256 manifest `d6c3ea1e087ce9af266499ee232e7edd653e40af493aaadd2b401f1ee7fbf110`. API và worker chạy từ cùng bản giải nén. Backend `verify` đạt 24/24 với 259 thao tác và 2 endpoint health.
- Firefox chạy đạt cả ba nhóm catalog, workspace và privacy trên PostgreSQL/Redis/IdP thử nghiệm. Đã kiểm callback 302, phiên sau reload, logout, cô lập shop, phục hồi lệnh sau mất phản hồi, SSE, khởi động lại API và tải URL ký. Mỗi nhóm kiểm 404 của tài nguyên thiếu, 502 khi API dừng và giá trị callback thử không xuất hiện trong log lỗi. `caddy validate` từ chối site HTTP và tệp chứng chỉ thiếu. Ca `dev:live` vẫn đạt. Hồ sơ ở `test-results/backend/be22/https-edge/edge-verification.json`.
- Gói v1.39 áp dụng bốn giới hạn CSP `base-uri`, `frame-ancestors`, `object-src` và `form-action`. Gói v1.40 bổ sung giới hạn script và worker bên dưới. Cần cấu hình chứng chỉ, kết nối và quyền trên staging được giao để nghiệm thu cổng ở môi trường đích.

#### Chính sách script và kiểm hợp đồng trên trình duyệt · T068.S04

- Cấu hình Caddy áp dụng `script-src 'self'`, `script-src-attr 'none'` và `worker-src 'self'`. Frontend tạo validator Ajv từ cùng 376 schema và 23 dạng tham số dùng bởi 259 thao tác. Trong đó 19 dạng tham số khai báo trực tiếp được biên dịch, 4 dạng trỏ tới schema thành phần. API client, SSE, router và MSW dùng các validator đã tạo. NestJS tiếp tục kiểm hợp đồng phía máy chủ.
- Ca catalog phát hiện form Zod vẫn thử biên dịch động dưới CSP. Điểm khởi động frontend đặt Zod ở chế độ `jitless` và chạy lại ca trên gói mới. Firefox xác nhận script cùng origin chạy được, script nội tuyến và `Function` bị chặn, còn biểu mẫu, phiên và xử lý sự kiện tiếp tục chạy.
- Gói `b236c446-YyjQxA.tgz` có 593 tệp, 31 migration và 34 tệp web. SHA-256 archive `eff51352068605b3bf6edd082e2548926d8029c26ea308cd12887c5d45646873`, SHA-256 manifest `40c6113af1070b7017c9fa94b6483ff0ccd8e2844bf20b54f4f6c513669cc5b4`. Caddy nén riêng web và giữ API/SSE ngoài bộ nén. Trên gói này, 7 script tải ban đầu của trang web đạt 384.129 byte khi tính gzip từ tệp, tăng 39.102 byte so với v1.39. Khối validator đạt 98.170 byte gzip và 1.335.566 byte trước nén. Thời gian parse trên thiết bị mục tiêu thuộc phép đo staging T074.
- Hồi quy Firefox qua Caddy đạt 16/16 nhóm trên gói này. Ca inbox giới hạn tìm nội dung trong danh sách tin nhắn và kiểm API chỉ lưu một tin có cùng mã với command. Các bước `verify` backend và frontend đạt, gồm 24 ca backend, 282 ca Vitest, 122 ca simulator và MSW HTTP/SSE. Bản demo đạt 6/6 ca, kiểm 67 route ở 390 và 1440 px trên Chromium và Firefox. `dev:live` qua HTTPS đạt từ cache Vite mới sau khi đưa runtime helper vào bước tối ưu lúc khởi động. Bản build live và demo sau sửa khớp checksum từng tệp hoặc checksum tổng đã chạy browser. Hồ sơ kiểm gói ở `test-results/backend/be22/csp/final/csp-verification.json`.
- Kiểm cục bộ dùng tenant OIDC thử nghiệm. Quyền client, callback, thu hồi và step-up trên IdP được cấp vẫn cần kiểm ở staging. [Runbook](infra/RELEASE_RUNBOOK.md#cổng-https-cùng-origin)

#### Xác minh lại phiên R35 qua OIDC · T068

- `stepUp` hỗ trợ bắt đầu và hoàn tất OIDC theo OpenAPI `2.6.1`, giữ thao tác và đường dẫn hiện có. Callback yêu cầu xác thực lại, kiểm `auth_time` trong ID token đã xác minh, đối chiếu cùng issuer và subject, kiểm quyền shop rồi xoay token phiên. Cookie cũ bị vô hiệu ngay và phiên giữ thời hạn ban đầu. Audit ghi người thao tác, shop, mã yêu cầu và phương thức OIDC. [Cách kiểm R35](infra/RELEASE_RUNBOOK.md#xác-minh-lại-phiên-để-phê-duyệt-r35)
- Grant chỉ được lấy một lần trong tối đa năm phút và được dùng cho đúng phiên, cửa hàng và yêu cầu. Phê duyệt tiếp tục kiểm quyền, phiên bản và chính sách hiện hành trong transaction. Callback gắn đồng thời với trình duyệt và token phiên mở xác minh. Hash của callback và grant step-up có tiền tố riêng để bản API cũ không nhận nhầm chúng. Mật khẩu cũ vẫn phục vụ ca tích hợp loopback chạy theo hợp đồng cũ.
- PostgreSQL 18.7 áp dụng migration 32 từ bản sao ở migration 31 và chạy đủ 32 migration từ DB trống. Seed hai shop đạt, tên vai trò và checksum 32 migration khớp, Prisma không phát hiện lệch schema. Bộ OIDC HTTPS đạt 13/13, quyền riêng tư đạt 4/4 và backend `verify` đạt 24/24. Ca âm kiểm sai origin, shop, tài khoản, `auth_time` thiếu/cũ, replay callback, cookie của phiên khác và sai phạm vi grant. Frontend `verify` đạt 282 ca Vitest và S17. Bộ tài liệu chuẩn đạt 544/544 ca kiểm tĩnh.
- Gói `b236c446-AL9jyJ.tgz` có 594 tệp, 32 migration và 34 tệp web. SHA-256 archive `8d75e7f83e89cbd3a127472acae55961028a69f0da03fad873d4dd52299b64bf`, SHA-256 manifest `50a17882f3388915c982bfd803a7e414e52d163f4b0b47144f1f1e2aa7ff69a4`. Firefox qua Caddy thực hiện R35 ở 390 px, đăng nhập lại, về đúng yêu cầu, phê duyệt và tải JSON ký từ worker với cấu hình mật khẩu fixture bỏ trống. Hồi quy workspace đạt trên cùng gói. Hồ sơ `test-results/backend/be22/oidc-step-up/step-up-verification.json` gắn checksum với từng log.
- Kiểm đăng nhập và đăng xuất trên gói v1.40 khi kết nối schema 32 đã đạt. BE-22 tiếp tục chờ tenant và người dùng staging được cấp. Mức xác thực do tenant IdP áp dụng. Phê duyệt chính sách lưu giữ và mở xử lý dữ liệu thật thuộc T079.

#### Tiếp nhận webhook Meta Messenger · T069

- API hỗ trợ GET challenge và POST có chữ ký HMAC-SHA256 trên body gốc. Endpoint mặc định tắt. Cấu hình gồm bí mật của ứng dụng, verify token và ánh xạ mỗi Page vào một shop cùng danh sách PSID thử được duyệt. Tin ngoài phạm vi, echo, sự kiện chỉ có tệp và kết nối đã ngắt được bỏ qua. [Cấu hình và cách kiểm](infra/RELEASE_RUNBOOK.md#tiếp-nhận-webhook-meta-messenger)
- Cổng thử và cổng Meta dùng chung giao dịch tạo định danh, hội thoại, tin và outbox. Khóa ledger gắn với kênh và MID của Meta. Gửi lại cùng sự kiện phản hồi thành công sau khi đối chiếu dữ liệu đã ghi. Payload khác cùng MID trả 409. Bản ghi mới giữ thứ tự theo thời điểm xảy ra. Danh tính đã xóa không được tái tạo. Gói v1.42 kiểm kênh có quyền nhận văn bản.
- Backend `verify` đạt 27/27, ma trận khớp 259 thao tác và 2 route health. Suite HTTP/PostgreSQL Inbox đạt 5/5, gồm chữ ký sai, hai shop, replay song song, một tin và một outbox, thứ tự, thoát kết nối, dấu xóa và hồi quy cổng thử. Tiền kiểm xác nhận ba trạng thái cấu hình `UNCONFIGURED`, `INVALID` và `CONFIGURED`. Staging vẫn `BLOCKED` với 7 nhóm đầu vào chủ dự án chưa cung cấp.
- Gói thử `b236c446-Dh00NE.tgz` chứa 600 tệp và 32 migration. SHA-256 archive `76036b909301be33a4f4d8c8fadce34bac3a4bdfa52ff4847c1bb78f50c96637`, SHA-256 manifest `1253b6d80e3a5cb604cca1d7ae19b996c6ce581d2b046f758eadb847ab1cba9a`. Đã giải nén, kiểm SHA các tệp trước và sau cài runtime. Firefox qua Caddy đạt R05/R06 từ webhook HTTPS, đối chiếu một tin dù webhook được gửi hai lần, và đạt lại P0-07 của BE-06. Hồ sơ `test-results/backend/be22/meta-inbound/meta-inbound-verification.json` gắn checksum gói và từng log.
- T069 tiếp tục chờ app, Page, các quyền Meta, dữ liệu thử, phiên bản Graph API và quyền AI theo môi trường được duyệt. Bằng chứng hiện tại dùng dữ liệu tổng hợp và ký webhook cục bộ. BE-22 vẫn mở để nghiệm thu callback, quyền nhận/gửi và AI trên staging.

#### Trả lời Meta Messenger trong phạm vi thử · T069.S02, S04

- R06 dùng lại `sendMessage`, chống ghi trùng theo intent và mã tin phía máy khách. Chỉ Page có token riêng và phiên bản Graph được cấu hình mới công bố quyền gửi văn bản. API và worker kiểm shop, Page, PSID thử, phân quyền, tiếp quản và tin đến gần nhất trong cửa sổ 24 giờ. Worker kiểm lại phiên bản hội thoại và kênh, hồ sơ đã xóa và nội dung đã ẩn trước khi gọi `RESPONSE` của Graph. [Runbook trả lời R06](infra/RELEASE_RUNBOOK.md#trả-lời-meta-messenger-từ-r06)
- Worker lưu `started_at` trước khi gọi Graph và giới hạn một lần chờ gửi Meta mỗi vòng thăm dò. Nhận được mã tin hợp lệ thì ghi `sent` và command `succeeded` cùng outbox. Từ chối rõ ràng được ghi `failed`. Mất phản hồi, lỗi còn mơ hồ hoặc dừng sau khi đánh dấu lần gửi được ghi `unknown` để đối chiếu. Lần gửi đang dang dở được chốt `unknown` sau 60 giây và lệnh đó không được gửi lại tự động. Audit chỉ ghi mã lệnh, trạng thái và mã lý do. [Migration 33](apps/api/prisma/migrations/20261121003300_be22_meta_send_attempt/migration.sql)
- PostgreSQL đã áp dụng migration 33 trên bản sao có 32 migration và áp dụng đủ 33 migration trên database trống. Prisma xác nhận hai đích khớp schema. Backend `verify` đạt 28/28, ma trận 259 thao tác và 2 route health. Inbox đạt 7/7, AI fixture đạt 3/3. Ca Inbox bao phủ hai worker tranh một lệnh, không gửi khi thu hồi quyền hoặc hết cửa sổ, Meta mô phỏng từ chối token và giới hạn tốc độ, mất phản hồi và rollback sau khi Meta mô phỏng đã nhận.
- Gói `b236c446-LOU34u.tgz` có 603 tệp và 33 migration. SHA-256 archive `6353edd27b17eb0f5ff2a6f0b98adf877487f964e976b36a4060d8df7b2e66bb`, SHA-256 manifest `a1d07de56fea09759b183644b5aa7ac604b1975fc4b8fce0d8e0ac70a565ee47`. Firefox qua Caddy xác nhận nhận webhook, tiếp quản ở R06 và đúng một POST từ worker trong gói đến lớp mô phỏng Graph. Ca cấu hình chỉ nhận cũng đạt. Hồ sơ cục bộ `test-results/backend/be22/meta-outbound/meta-outbound-verification.json` đính checksum từng log.
- `check:staging` phân biệt cấu hình nhận và gửi. Với cấu hình thử đầy đủ, staging vẫn thiếu 7 nhóm đầu vào. T069 vẫn cần quyền Page/app, phiên bản Graph được duyệt và phép kiểm callback, token, cửa sổ, giới hạn tốc độ và gửi trên tài khoản thật được cấp. AI provider và bàn giao khả năng thực tế tiếp tục mở. Đợt 2 giữ ở 9/10 mốc.

#### Chuẩn bị đánh giá nhà cung cấp AI · T069.S01, S03

- Lệnh `eval:staging-ai` có chế độ lập kế hoạch ngoại tuyến và chế độ thực thi trên gói staging đã duyệt. Adapter tham chiếu dùng OpenAI Responses. Tệp phê duyệt gắn project, vùng, snapshot model, giá và thời điểm hết hạn với checksum bộ ca và manifest gói. Thực thi kiểm lại checksum bằng cấu hình đã cấp và yêu cầu gói từ checkout sạch. [Cách chạy đánh giá](infra/RELEASE_RUNBOOK.md#đánh-giá-nhà-cung-cấp-ai-trên-staging)
- Bộ tám ca tổng hợp có SHA-256 `b13179ff80d17c3b2172e78bc1154359ab2c28dae7821f0c1a753dab7dd5f790`. Bao phủ đọc danh mục và tồn, đề xuất nháp, yêu cầu xác nhận, chỉ thị không đáng tin, ảnh chuyển khoản, yêu cầu dữ liệu cá nhân và chuyển người xử lý. Công cụ chỉ nhận nhãn có cấu trúc, gửi `store: false` và kiểm lại model, tier cùng usage quan sát được. R06 và đường thực hiện nghiệp vụ tiếp tục dùng cơ chế quyền và xác nhận hiện có.
- Chặn khi mức USD dự trù cho toàn bộ đếm và sinh vượt phê duyệt. Hồ sơ khóa `runId` một lần trong thư mục được cấp, ghi mã yêu cầu trước khi gọi và đồng bộ xuống đĩa. Ca mất phản hồi, lỗi quyền hoặc giới hạn token dừng theo mã kết quả. Hồ sơ chỉ giữ mã lần chạy, checksum, mã yêu cầu, nhãn và số token để đối chiếu phí.
- Backend `verify` đạt 33/33, ma trận 259 thao tác và 2 route health. Hồi quy AI fixture trên PostgreSQL đạt 3/3. Năm ca kiểm mới bao phủ trần USD tính bằng số thập phân, dữ liệu gửi cố định, lỗi quyền và giới hạn, hai lượt đồng thời cùng mã lần chạy, phản hồi chưa rõ, usage thiếu và nội dung ngoài schema. Đã giải nén và cài runtime gói `b236c446-jB7DDd.tgz` có 606 tệp và 33 migration. SHA-256 archive `9de8237105a1cf76a7d49fcf9abef543f358253cec7b54c0ddde08ecef73e285`, SHA-256 manifest `e0bd6b85c7b56830259e795bfe58abfb86c7e104c9307e4c9c99721c3fdafb8b`. CLI từ gói đạt lập kế hoạch và chặn trường hợp thiếu grant, sai checksum, gói dirty và vượt trần. Hồ sơ `test-results/backend/be22/ai-staging-eval/ai-staging-verification.json` gắn từng log với digest gói.
- Đánh giá trực tiếp T069.S03 tiếp tục chờ chủ dự án cấp nhà cung cấp, project, model, giá, phê duyệt dữ liệu và ngân sách. Trạng thái AI trên staging, chi phí thực tế và nghiệm thu chuyển tiếp từ Inbox đến thao tác nghiệp vụ còn mở.

#### Kiểm quyền truy cập model OpenAI từ R30 · T069.S01

- R30 liệt kê model OpenAI khi shop có cấu hình Project, vùng, snapshot và thời hạn. API dùng quyền `integrations.manage` và luồng kết nối hiện có. Khóa API được mã hóa gắn với shop, kết nối và phạm vi đã cấu hình. Worker kiểm quyền, phiên bản và khóa hiện hành, lưu dấu bắt đầu rồi gọi đúng một `GET /v1/models/{model}` theo job. [Cách chuẩn bị và kiểm](infra/RELEASE_RUNBOOK.md#kiểm-quyền-truy-cập-model-openai-từ-r30)
- Khi phản hồi mất, job giữ `awaiting_confirmation` và lần chạy lại tự động không gọi thêm. Cấu hình đổi Project bị chặn trước khi gọi. Kết quả đến sau khi xoay khóa không thay đổi kết nối phiên bản mới. Trạng thái `connected` là kết quả kiểm quyền đọc model. Các khả năng sinh nội dung, dùng công cụ, giá và điều kiện xuất bản bot tiếp tục dùng phê duyệt tương ứng. `eval:staging-ai` dùng chung tầng gọi OpenAI và nhận cả snapshot có dấu chấm trong tên.
- Backend `verify` đạt 38/38, AI 4/4, Jobs 3/3. Đã kiểm cấu hình trống, hợp lệ, hết hạn và sai định dạng, cùng ciphertext fixture tạo ở bản trước. Firefox qua Caddy từ gói `b236c446-dChPyU.tgz` kiểm R30 và xác nhận worker gói phát đúng một GET đến lớp truyền tải thử nghiệm. Hồi quy R26–R28 dùng fixture trên cùng gói. Gói có 624 tệp và 35 migration, SHA-256 archive `40f8b5a08bff10d641ed03a208fee1325df031406fdc5e712529ab14a267ba84`, SHA-256 manifest `47ac500b0f1af3a28d3a1162b8936f67bbf451855ab8bf0097c6ebe5724efd6e`. Hồ sơ `test-results/backend/be22/openai-model-check/openai-model-verification.json` liên kết log, gói và mã nguồn.
- Tiền kiểm tiếp tục báo thiếu `AI_PROVIDER_GRANT`. Cần Project, vùng, khóa đã giao và phê duyệt dữ liệu, giá cùng ngân sách để đánh giá trực tiếp. Nối suy luận vào luồng Messenger còn thuộc T069/T072. Đợt 2 giữ 9/10 mốc.

#### Đánh giá OpenAI đã phê duyệt từ R28 · T069.S03

- R28 nhận `botsales-staging-ai-v1` qua hợp đồng hiện có. Phê duyệt gắn một shop, bản nháp, cấu hình, chính sách, Project, vùng, snapshot model, checksum dữ liệu, digest gói checkout sạch và trần USD. PostgreSQL giữ một evaluation cho mỗi `runId`. Cùng khóa intent trả lại lần đánh giá đã tạo. [Runbook R28](infra/RELEASE_RUNBOOK.md#đánh-giá-openai-đã-phê-duyệt-từ-r28) · [Migration 36](apps/api/prisma/migrations/20261121003600_be22_approved_ai_evaluation/migration.sql)
- Worker dùng chung bộ chạy tám ca tổng hợp của `eval:staging-ai`, kiểm trước từng lần gọi và bổ sung năm ca nghiệp vụ cục bộ. Audit liên kết `reportJobId`, request ID, nhãn, token quan sát và chi phí ước tính theo giá đã duyệt. Nội dung gửi là mẫu cố định, còn hash bản nháp liên kết bằng chứng với phạm vi đã xét. Ca mất phản hồi giữ job `awaiting_confirmation`. Ca đổi bản nháp giữa đếm token và sinh dừng trước yêu cầu sinh. Kết quả R28 tiếp tục cần adapter tác nghiệp đã duyệt trước khi dùng để xuất bản R26.
- Backend `verify` đạt 38/38, AI 5/5 và Jobs 3/3. Ca R28 qua HTTP, PostgreSQL và worker handler đạt 13/13 với provider mô phỏng. PostgreSQL áp dụng migration 36 từ bản sao và áp dụng đủ 36 migration từ database trống. Prisma xác nhận schema khớp, seed đủ hai shop. Bốn bản ghi đánh giá có sẵn giữ nguyên checksum dữ liệu qua nâng cấp.
- Gói `b236c446-ILHdhO.tgz` có 627 tệp và 36 migration, đã kiểm giải nén và cài runtime. SHA-256 archive `5a36883c6c5b1c0ef87219ca36f0c0df67e5803f662b28f86488852b97cae005`, SHA-256 manifest `79d68437a14e34f1488bee77fde3aaa3f4dacd902c08dd489daaa1b428b27691`. CLI từ gói kiểm bộ dữ liệu ngoại tuyến và từ chối lấy mô tả phê duyệt staging từ gói có thay đổi cục bộ. Firefox qua Caddy đạt hồi quy R26–R28 với fixture và R30 với lớp truyền tải thử nghiệm. Hồ sơ tại `test-results/backend/be22/approved-ai-evaluation/approved-ai-evaluation-verification.json`.
- Tiền kiểm staging vẫn thiếu `AI_PROVIDER_GRANT`. Cần cấp scope, phê duyệt dữ liệu và trần USD theo gói staging checkout sạch, rồi chạy và đối chiếu provider thật để nghiệm thu T069. BE-22 vẫn mở và đợt 2 ở 9/10.

#### Web Push cho R40 và đơn cần chuẩn bị · T070

- Đăng ký thiết bị lưu endpoint và khóa dưới dạng AES-GCM gắn shop, chủ thể và fingerprint. R40 dùng API hiện có để tạo, gửi thử và thu hồi. Adapter ký VAPID và mã hóa nội dung `aes128gcm` bằng `web-push` 3.6.7. Worker chỉ gửi tới đích HTTPS đã hỗ trợ, khóa riêng ở backend và khóa công khai dùng cho cấu hình web. HTTP 201/202 ghi nhà cung cấp tiếp nhận, còn dấu mở và nhận việc được ghi qua luồng nghiệp vụ. [Runbook Web Push](infra/RELEASE_RUNBOOK.md#đăng-ký-và-thử-web-push-trên-r40)
- Thông báo đơn dùng cùng lịch trực, giới hạn số lần và read model hiện có. Khi ghi ý định gửi, database buộc thiết bị thuộc đúng người nhận và shop. Worker kiểm lại thiết bị, quyền, phiên bản công việc, giờ yên lặng và hạn trước khi gửi ngoài transaction. Link trỏ tới chi tiết đơn nội bộ. Dấu bắt đầu lần gửi ngăn hai worker hoặc lần phục hồi gửi lại cùng ý định. Mất phản hồi hoặc dừng giữa chừng chuyển `unknown`. Mã 404/410 đóng đăng ký đã hết hiệu lực và xóa dữ liệu bí mật đã mã hóa. [Migration 34](apps/api/prisma/migrations/20261121003400_be22_web_push_delivery/migration.sql)
- PostgreSQL áp dụng migration 34 từ bản sao có 33 migration và áp dụng đủ 34 từ database trống, cả hai khớp Prisma schema. Backend `verify` đạt 36/36, ma trận khớp 259 thao tác và 2 route health. Orders đạt 13/13. Kiểm độc lập chữ ký VAPID, giải mã bằng khóa thiết bị tổng hợp, chống gửi trùng, thiết bị thu hồi, công việc đã nhận và phục hồi quan sát sau mất phản hồi.
- Gói `b236c446-dfQpUF.tgz` có 611 tệp và 34 migration. SHA-256 archive `6e95c7999cb281b704f6666d501b66ce8ee2d9d253d9cd8dbe679db4f3ca4b5d`, SHA-256 manifest `7eaf47f937f69e8bd7bb7edf6e2a519d56bca9c6267353cca182474f0484af28`. Firefox qua Caddy đạt R40 với đăng ký tổng hợp, thao tác **Gửi thử**, đúng một POST mã hóa từ worker trong gói và thu hồi thành công. Hồ sơ `test-results/backend/be22/web-push/web-push-verification.json` gắn checksum từng log với gói.
- T070 cần chạy trên thiết bị iOS và Android được cấp với trình duyệt hoặc ứng dụng đã đóng, đối chiếu nhận thông báo và thao tác nhận việc. Tiền kiểm staging tiếp tục thiếu 7 nhóm đầu vào, bao gồm điện thoại và ghép Telegram.

#### Telegram dự phòng và ghép thiết bị · T070

- R40 tạo mã ghép có chữ ký và thời hạn năm phút cho đúng shop, thành viên và bot đã cấu hình. Webhook kiểm secret, tin `/start` từ chat riêng và ánh xạ Telegram đã duyệt. Thao tác ghi quan sát `update_id`, dùng mã một lần, kiểm lại quyền và lưu mã chat đã mã hóa trong cùng transaction. Thu hồi xóa dữ liệu mã hóa. Ghép lại bằng mã mới đổi phiên bản thiết bị để các lượt đã xếp hàng từ phiên bản cũ bị chặn. [Runbook Telegram](infra/RELEASE_RUNBOOK.md#ghép-telegram-và-gửi-dự-phòng-từ-r40)
- Telegram và Web Push dùng chung hàng đợi, giới hạn, trạng thái và cơ chế phục hồi. Mỗi lượt nhắc chọn tối đa một Telegram dự phòng khi thiếu đích Web Push hoặc các lượt chính của cùng ý định đều bị từ chối rõ ràng. Lượt chính có kết quả `unknown` giữ chờ đối chiếu. Nút trên Telegram mở link HTTPS đến ứng dụng để đăng nhập và nhận việc theo quyền hiện hành. Phản hồi Bot API chỉ cập nhật kết quả gửi, còn trạng thái mở và nhận việc thuộc luồng ứng dụng.
- PostgreSQL áp dụng migration 35 từ bản sao có 34 migration và áp dụng đủ 35 migration trên database trống. Cả hai khớp Prisma schema. Backend `verify` đạt 38/38, ma trận 259 thao tác và 2 route health. Orders đạt 14/14. Các ca Telegram kiểm sai secret, sai shop, chat nhóm, lặp `update_id`, hết hạn, quyền bị thu hồi, ghép lại, đúng một lượt dự phòng và không phát thêm khi Web Push chưa rõ kết quả. [Migration 35](apps/api/prisma/migrations/20261121003500_be22_telegram_fallback/migration.sql)
- Gói `b236c446-xVR6z1.tgz` có 618 tệp và 35 migration. SHA-256 archive `62281eb90113a404e0d5ce75b1c1c4b4b02271ba397f5804b35702a5c2de4886`, SHA-256 manifest `41bcdb0f787e12e1eb85b2ab533cf1c4db49164ff62be2b92b5e2104e69f426d`. Firefox qua Caddy đạt tạo mã R40, webhook qua HTTPS và đúng một lần gửi thử từ worker trong gói đến Telegram mô phỏng, rồi thu hồi thiết bị. Hồi quy Web Push qua Caddy đạt trên cùng gói. Hồ sơ `test-results/backend/be22/telegram/telegram-verification.json` gắn checksum từng log với gói.
- Nghiệm thu T070 cần bot, webhook và tài khoản thử đã cấp, cùng ca iOS/Android thật khi ứng dụng đã đóng. Tiền kiểm staging vẫn `BLOCKED` với 7 nhóm đầu vào, đợt 2 giữ ở 9/10 mốc đã kiểm chứng.

#### Vận chuyển, mua hàng và sao kê · T071

- Luồng nhập sao kê chỉ coi phiếu thu là cùng nguồn nếu bút toán có dòng tiền vào đúng tài khoản. Ca hồi quy tái hiện trạng thái `disputed` khi trùng mã với phiếu thu của tài khoản khác. Sau sửa, giao dịch giữ `unmatched`, chưa gắn phiếu thu và còn xuất hiện trong danh sách cần đối soát. Phiếu thu đã ghi đúng tài khoản vẫn khớp mà không phát sinh bút toán mới. Phạm vi nhập hiện tại dùng tài khoản ngân hàng hệ thống của shop.
- Bộ kiểm R49/R50/R65 nhập tệp COD thủ công qua parser và job hiện có. Một dòng hợp lệ và một dòng lặp tạo đúng một đợt. Xem trước lại cùng tệp dưới mã nhập mới báo hai dòng trùng. Hai khoản thực nhận tổng 229.000 VND và hai chứng từ phí tổng 20.000 VND tất toán phải thu 249.000 VND. Tắt adapter mua hàng thử nghiệm trả 503, giữ trạng thái `approved` và không tạo lượt gửi. Khi bật fixture, kết quả `unknown` được tra lại trên lệnh gốc và chỉ chuyển trạng thái khi có xác nhận đã kiểm.
- PostgreSQL thử có 35 migration và Prisma không phát hiện lệch schema. `verify` đạt 38/38, ma trận khớp 259 operation và 2 route health. Finance đạt 6/6, Procurement 3/3 và Orders 14/14. Firefox qua Caddy chạy API và worker từ gói `b236c446-YaLPuG.tgz` đã cài lại runtime và kiểm 618 tệp. Đạt luồng bàn giao có chứng từ R42, gửi đơn mua thử và nhập một phần R46/R47, nhập sao kê và đối soát R49/R50/R65. SHA-256 archive `bafbbbd143dcb7a3aa2fdd22743ea9ea2a854b6460605a76e989c011f70acaed`, SHA-256 manifest `6bc73634ec9dd867b888069bf4751ddfca4856edb1567b730c6e309205cebd53`. Hồ sơ `test-results/backend/be22/commerce-finance/commerce-verification.json` gắn log với bản nguồn và gói đã kiểm.
- `CARRIER_SUPPLIER_CONNECTOR` vẫn `NOT_PROVIDED`. Cần chốt vùng, hãng hoặc quy trình thủ công đã duyệt, kênh xác nhận của nhà cung cấp, nguồn chứng từ và định dạng sao kê thực tế. T071 và BE-22 giữ mở. Đợt 2 vẫn 9/10. [Quy trình nghiệm thu](infra/RELEASE_RUNBOOK.md#nghiệm-thu-vận-chuyển-mua-hàng-và-sao-kê--t071)

##### Bàn giao đơn mua và nhập chứng từ thủ công

- R46 chỉ mở bàn giao thủ công khi cấu hình cấp đúng cặp shop và nhà cung cấp dùng phương thức `manual`. Tác vụ kiểm quyền, phiên bản, giá, nội dung đã duyệt và hạn phê duyệt trong cùng giao dịch. Hai yêu cầu cùng khóa trả cùng lệnh `accepted`. Đơn giữ `unknown` với đúng một việc đối chiếu. PostgreSQL chặn đặt lịch worker cho bàn giao thủ công.
- Công cụ `record:procurement-evidence` đối chiếu SHA-256 của hồ sơ đã duyệt với tệp chứng từ và buộc hồ sơ khớp phiên bản, intent, shop, nhà cung cấp, đích PostgreSQL và quyền của người kiểm. Phát lại cùng hồ sơ trả đúng mã bằng chứng. Thay đổi nội dung với cùng mã ngoài trả xung đột. R46 kiểm mã bằng chứng đúng phiên bản trước khi hoàn tất lệnh gốc và ghi hàng đang về. R47 chỉ nhận chứng từ đã kiểm cho đơn mua thủ công. [Runbook vận hành](infra/RELEASE_RUNBOOK.md#bàn-giao-và-nhập-chứng-từ-mua-hàng-thủ-công)
- Backend `verify` đạt 40/40, ma trận có 259 thao tác và 2 route health. Procurement 4/4, Operations 4/4, Finance 6/6 và Orders 14/14. Migration 39 đạt trên DB trống và bản sao có 38 migration. Đối chiếu nâng cấp giữ nội dung 4 bản ghi điều phối và 3 chứng từ cũ. Prisma khớp schema trên cả hai.
- Firefox qua Caddy chạy từ gói `b236c446-iHwx4E.tgz` đã cài runtime và kiểm đủ 639 tệp, 39 migration. Ca thủ công đạt ở R44–R47 và R38, gồm nút bàn giao ở 390 px, chứng từ nhập từ gói và một phiếu nhận ghi đúng tồn/công nợ. SHA-256 archive `56e4db73a010aef595d71827cf59f892e647d434d663f887a22afe4ec623ebcb`. SHA-256 manifest `6baffa321d383dfbc41bbd885efbc513523c98b62de850541fd9bcb46f70797f`. Hồ sơ và log ở `test-results/backend/be22/manual-purchase/`. Chứng từ dùng dữ liệu tổng hợp. Nghiệm thu T071 chờ kênh, nhà cung cấp, chứng từ và quyền staging được cấp.
- Cùng gói đạt hồi quy đường adapter thử ở R44–R47 và R38. Frontend `npm run verify` đạt, gồm 282 ca Vitest và xác minh dấu vân tay S17 ở trạng thái đang thực hiện. Hồ sơ `manual-purchase-verification.json` gắn SHA nguồn, log và ảnh kiểm tra với gói. SHA-256 hồ sơ `780292daa5f9983b9f256c5dd2fc1725934eaae450cd871a372ba6158477f1bc`.

##### Nhập chứng từ hành trình thủ công ở R42

- `record:shipment-evidence` dùng chung bước kiểm tệp và đích PostgreSQL với công cụ mua hàng. Nguồn thủ công cần đúng shop được cấp, quyền hiện hành `fulfillment.write`, mã vận đơn, mã đơn và phiên bản. Chứng từ sau bàn giao chứa loại, thời gian và mã sự kiện bên vận chuyển. PostgreSQL lưu một mã bằng chứng cho cùng hồ sơ, kèm SHA-256 và thời điểm nhập. Audit lưu người kiểm và dấu vết nguồn. [Runbook chứng từ R42](infra/RELEASE_RUNBOOK.md#nhập-chứng-từ-hành-trình-thủ-công)
- Bộ hồi quy kiểm từ chối sai shop, sai quyền, sai phiên bản, sai chứng từ và sự kiện trước bàn giao. Nhập song song trả cùng mã. Thay nội dung với cùng mã sự kiện trả xung đột. R42 giữ trạng thái đã giao khi nhận thông tin thất bại đến muộn. Tồn đang giao về 0 một lần, còn COD chưa thanh toán. Dấu vân tay phục hồi phát hiện cả chứng từ có trong PostgreSQL nhưng chưa được áp dụng.
- Backend `verify` đạt 40/40, ma trận 259 thao tác và 2 route health. Orders 14/14, Procurement 4/4 và Finance 6/6. Migration 40 chạy từ DB trống và từ bản sao có 39 migration. Sau nâng cấp, nội dung 7 chứng từ và 10 sự kiện cũ giữ nguyên. Prisma khớp schema trên cả hai.
- Firefox qua Caddy chạy từ gói `b236c446-ADMucO.tgz` đã cài runtime, kiểm 644 tệp và 40 migration. Ca R42 nhập chứng từ qua công cụ trong gói rồi ghi sự kiện giao thành công trên giao diện và kiểm nhập hàng trả R43. SHA-256 archive `0c8bb7634e69b31359ea9431fe80054458f2e0227de64e978048741a6d665671`. SHA-256 manifest `1fffdb05fd87c3d735fd5d4a42ab7fb559d70f2d09630b87c959b3aed06cc93b`. Dữ liệu thử là chứng từ tổng hợp. Kênh vận chuyển, nguồn sự kiện và chứng từ staging tiếp tục chờ cấp.
- Cùng gói đạt hồi quy mua hàng thủ công R46/R47 và nhập sao kê, phân bổ, đối soát R49/R50/R65. Hồ sơ `test-results/backend/be22/manual-shipment/manual-shipment-verification.json` gắn hash nguồn, log và gói. SHA-256 hồ sơ `b5f59b155f0e614c49dbdacf3b539b84df20fc5cac71e3bf14eee7f9d00bcb7d`.

#### Smoke xuyên hệ thống · T072

- `recordCustomerConfirmation` và `confirmOrder` dùng chung bước kiểm chứng cứ. R19 nhận được xác nhận từ tin nhắn Messenger đã qua webhook có chữ ký. Backend đối chiếu định danh, Page và người gửi còn được cấp quyền, nội dung khớp đúng mã/hash báo giá, thời hạn và bản ghi webhook của cùng tin nhắn. Chốt đơn kiểm lại phiên bản, quyền và tồn trong một giao dịch. Ca cũ trả 422 ở bước ghi chứng cứ; ca mới kiểm tin có lời diễn giải, sai khách hoặc sai shop, thu hồi nguồn khi khởi động API với cấu hình mới, thiếu tồn và lặp webhook.
- Trên PostgreSQL, thiếu tồn giữ đơn nháp, chưa tạo reservation, audit chốt hoặc việc chuẩn bị. Khi đủ tồn, gửi lại cùng thao tác tạo một reservation, một công việc chuẩn bị, một audit chốt và một outbox theo command. Thao tác đã xem giữ liên kết về công việc hiện có. Hủy đơn đóng đúng công việc. Backend `verify` đạt 38/38. Inbox 8/8, Orders 14/14, AI 3/3, Jobs 3/3, Procurement 3/3 và Finance 6/6. Jobs kiểm restart và mất Redis cũng như kết quả `unknown` sau khi đích thử đã nhận nhưng ứng dụng chưa ghi kết quả.
- Gói `b236c446-aPqmMk.tgz` có 618 tệp và 35 migration, đã đối chiếu checksum và cài runtime. Firefox qua Caddy dùng cùng một hội thoại đi từ webhook ký và lặp ở R06 đến đơn nháp R18, báo giá và xác nhận R19, đã xem R39, nhận việc R41, bàn giao và ghi nhận giao hàng R42. Sự kiện giao và trả hàng dùng chứng từ tổng hợp. SHA-256 archive `becf8b29f58044bf95f84aecfc3793faa9583d6c04fc6c0ed3cf96c392c3723a`, SHA-256 manifest `78483ddfcab5dcd0f4ef8012d7e3f4aec2ab0df1acc08f48c2ee59ff2dbe74b1`. Hồ sơ `test-results/backend/be22/full-workflows/full-workflows-verification.json` gắn nguồn, gói và từng log.
- Lượt AI tác nghiệp của T072 dùng cùng bản đánh giá và cấu hình đã phê duyệt. Cần kết quả quan sát trên Page và OpenAI Project đã cấp, thiết bị nhận thông báo thật và các nguồn vận chuyển/mua hàng/sao kê staging để nghiệm thu. R19 nhập mã định danh và mã tin nhắn qua biểu mẫu hiện có. BE-22 vẫn mở và đợt 2 ở 9/10. [Quy trình nghiệm thu](infra/RELEASE_RUNBOOK.md#smoke-xuyên-hệ-thống--t072)

##### Messenger → OpenAI → đơn nháp theo phê duyệt · T072.S01

- Cấu hình `runtime` có run ID riêng và gắn vào tệp đánh giá R28 trước khi chạy. R26 chỉ xuất bản khi đánh giá đạt trên chính tệp đó. Tác vụ nhận một câu tổng hợp đã duyệt từ đúng shop, Page và người gửi qua webhook đã xác minh. Cửa sổ nhận tin là năm phút. Worker kiểm lại phạm vi, quyền, cấu hình, trạng thái hội thoại và hạn mức trước khi gọi OpenAI. Dùng chung adapter đếm token và phân loại của R28. Chỉ nhãn `draft_proposal` hợp lệ mới đi vào tra giá và tồn ở kho mặc định qua logic bán hàng hiện có.
- Migration 37 giữ một tác vụ cho mỗi run ID. Worker ghi điểm bắt đầu cùng khoản dự trù trước khi chạy OpenAI. Khi mất phản hồi hoặc mất worker giữa chừng, giữ `provider_unknown` và bàn giao hội thoại nếu còn cùng trạng thái. Đơn nháp, command, audit và outbox ghi cùng giao dịch. Bot chuyển cho nhân viên sau khi lập nháp. Bước chốt đơn tiếp tục yêu cầu tin xác nhận khách có chữ ký và người có quyền.
- PostgreSQL trống chạy đủ 37 migration và seed hai shop. Nâng cấp bản sao có dữ liệu đạt và Prisma khớp schema. Ca T072 tắt hai adapter fixture, dùng webhook ký trong bộ thử và lớp truyền tải OpenAI mô phỏng. Ca kiểm đối chiếu đúng câu, một khoản dự trù, trùng webhook, hai lượt xử lý đồng thời và phục hồi tác vụ đã ghi nhận lần gọi. Trên cùng đơn, PostgreSQL kiểm một đơn nháp và chưa giữ tồn, sau đó báo giá, xác nhận Messenger, giữ tồn, tạo đúng một việc chuẩn bị và ghi nhận đã xem thông báo qua API. `check:staging -- --manifest` có ca xác nhận cấu hình hợp lệ và từ chối sai digest hoặc sai tài khoản thử.
- Backend `verify` đạt 39/39. Năm bộ tích hợp trên PostgreSQL đạt tổng 35/35 gồm AI 6, Inbox 8, Orders 14, Operations 4 và Jobs 3. Gói thử `b236c446-U4Gxu5.tgz` có 632 tệp và 37 migration, đã xác minh trước và sau khi cài runtime. Firefox qua Caddy đạt hồi quy webhook, chứng cứ báo giá, thao tác thông báo và vận chuyển thử từ gói này. SHA-256 archive `0a71c3b961cfd70f08395e75cb28c93ee7a41ed56f769692854c4cecc574410a`, SHA-256 manifest `65e8f073f211bfe704cf1c17e7bdddc30bf138a8a1d9896ae9956e89af60ccdc`.
- Tiền kiểm tại môi trường hiện tại báo thiếu đầu vào staging, quyền Meta/OpenAI, điện thoại và đầu nối vận chuyển/nhà cung cấp. Gói có thay đổi cục bộ dùng cho hồi quy. Bằng chứng quan sát thật của T072 vẫn mở. Hồ sơ nguồn, gói và log nằm ở `test-results/backend/be22/messenger-ai-stage/messenger-ai-stage-verification.json`. [Chạy ca T072.S01](infra/RELEASE_RUNBOOK.md#chạy-một-lượt-messenger--openai--đơn-nháp--t072s01)

### BE-23

**Kiểm bảo mật, tải, phục hồi và CI/CD** · T073–T077

- [ ] Bổ sung CI chạy trên checkout sạch, kiểm lỗ hổng dependency, quyền theo shop, quyền tải tệp và log đã lọc dữ liệu nhạy cảm. Có cảnh báo, đối chiếu command, độ trễ worker và theo dõi nguồn sai lệch kho hoặc tiền.
- [ ] Sau khi có môi trường BE-22, đo theo tải đã thống nhất, thử mất dịch vụ ngoài, restart worker, restore DB và tệp, kiểm migration và diễn tập rollback. Ghi mục tiêu tải và phục hồi theo đầu vào của chủ dự án.
- [ ] Kiểm chứng bản khôi phục bằng truy vấn đối chiếu tồn, tiền và công việc đang chờ. Kiểm thử CI/CD trên artifact đầy đủ và ghi kết quả thực tế cùng điều kiện phát hành.

#### Tải và khôi phục hai shop · BE-23

Lượt diễn tập từ `main@d6d9ede5` với thay đổi cục bộ chạy trên Windows 11 và Ubuntu WSL2, 24 luồng xử lý, RAM 63,5 GiB, PostgreSQL 18.7, Redis 8.0.5 và 44 migration. Shop A dùng VND và shop B dùng LAK. Mỗi shop có tồn, một bút toán đã ghi, đơn nháp, tệp và job export tổng hợp. [Cách chạy](infra/RELEASE_RUNBOOK.md#diễn-tập-postgresql-với-hai-shop-mẫu)

| Ưu tiên | Mục | Kết quả trên máy |
|---|---|---|
| 1 | T074 · Tải và cô lập hai shop | Mỗi lượt: 720/720 GET hợp lệ trả 200, 80/80 đọc chéo shop trả 404, 64/64 lượt ghi lặp trả 201. Mỗi shop có đúng một khách, một command, một audit và một outbox cho intent. Qua hai lượt cuối, p95 toàn nhóm đọc ở mức 6, 12 và 24 đồng thời lần lượt là 16,5–16,9 ms, 26,5–26,9 ms và 34,8–35,2 ms. Ở mức 24, tải chia A:B là 3:1 và p95 của A là 33,9–34,1 ms, của B là 36,6–37,1 ms. |
| 2 | T075 · Backup và phục hồi sang cụm khác | Dump custom 497.902 byte mất 60 ms. Giải mã từ archive GnuPG AES256 khớp SHA-256 dump. `pg_restore --single-transaction` mất 240 ms, gồm tạo báo cáo đích là 270 ms. Báo cáo định dạng 3 khớp 31 nhóm, sai lệch kho, journal và tệp đều 0. Hai bản ghi đánh dấu được thêm sau snapshot chỉ có ở nguồn. Khoảng đo từ mốc lấy snapshot đến dấu thử là 260 ms. |
| 3 | T075.S04 · Kiểm thất bại và PITR | Sai khóa bị từ chối, dump bị cắt lỗi và để schema đích trống. Bỏ blob của tệp còn hiệu lực làm bộ kiểm mới báo đúng một lỗi. Tệp hết hạn không bị tính thiếu và rollback khôi phục trạng thái sạch. WAL đạt hai mốc `0/4000090` và `0/5017530`, mỗi mốc mất 520 ms tới pause. Mốc sau giữ rút consent, dấu xóa và tin đã che của A, dữ liệu đối chứng của B giữ nguyên, giao dịch sau mốc không xuất hiện. API ở trạng thái pause trả liveness 200 và readiness 503. Bản thiếu segment đích bị từ chối. |
| 4 | T076 · API và hàng đợi sau phục hồi | API trên cụm đích trả readiness 200, tải tệp đúng shop trả 200 và chéo shop 404. Kiểm API và job đang chờ mất 1.252 ms. Từ lúc khởi động vòng worker đến kiểm xong hai export mất 1.458 ms. Cả hai job hoàn tất đúng một lần, SHA-256 CSV khớp bản đã đóng băng trước backup. Kiểm tại chỗ ghi 0 job đến hạn và 0 lease quá hạn. `test:jobs` đạt 5/5, gồm gián đoạn Redis, kết quả provider chưa rõ và burst 104 job ở A. A giữ tối đa ba lease, B hoàn tất một lần trong 836 ms. |
| 5 | T073, T077 · Hồi quy và gói cục bộ | `npm run verify` đạt 45/45, ma trận 259 operation. Bản gói có 666 tệp và 44 migration, đã kiểm manifest sau giải nén. Công cụ so restore từ gói cũng khớp cả 31 nhóm. Lượt đóng gói dùng checkout có thay đổi cục bộ. |

Lượt đo thời gian đầu bị nhảy đồng hồ hệ thống. Các số liệu trên lấy từ lượt đo lại bằng đồng hồ đơn điệu và được ghi riêng theo công đoạn. Ca kiểm lặp trên một đích mới xác nhận Redis trống, hai job chạy đúng một lần và lệnh từ chối chạy lại khi cả hai job đã hoàn tất. Hồ sơ `test-results/backend/be23/local-rehearsal-v181/verification.json` có SHA-256 `f1000095ba15f8923143a2b571f0e9f1c345a7098e33986cac8c3136ab92767b`. Hồ sơ lưu hash mã, báo cáo và log. Các cụm PostgreSQL và Redis riêng đã dừng sau kiểm.

Lượt này kiểm bytes tệp trong PostgreSQL và kho WAL trên máy. Nghiệm thu backup ngoài máy, S3 staging, lịch giữ bản sao, mất nhà cung cấp thật, CI trên commit mới và các mục tiêu `WORKLOAD_SLO_RPO_RTO` tiếp tục theo BE-22–BE-24. [Đầu vào cần xác nhận](../botsales-kit/execution/owner-inputs.json)

#### Kết quả diễn tập cục bộ BE-23

| Phạm vi | Kết quả quan sát |
|---|---|
| Cài sạch và ma trận | Checkout cô lập từ `b236c446` với phần thay đổi đã đối chiếu từng tệp. Cài sạch backend và frontend giữ lockfile. Backend `verify` đạt 22/22, đủ 259 operation và hai health. 86/86 ca PostgreSQL, OIDC và worker đạt trên cluster mới. |
| Dependency và kiểm quyền | `npm audit --omit=dev --audit-level=high` ghi 0 advisory ở lượt kiểm. Workflow backend lưu thêm báo cáo audit. Kiểm đủ quyền, thiếu quyền hai shop, token phiên, log xác thực và quyền tải tệp thông qua suite và Firefox local. Hosted CI của thay đổi này chờ đợt commit và PR. |
| Tải thử | 240 GET chạy đồng thời 12, trả 200 toàn bộ, khoảng 459,2 yêu cầu/giây và p95 49 ms. 40 GET chéo shop trả 404 đúng. 32 POST cùng khóa, đồng thời 8, trả 201, PostgreSQL có một khách, một command, một audit và một event. Đây là mẫu tải trên dữ liệu và máy thử. |
| Backup và restore | PostgreSQL 18.7, dump custom 780.446 byte mất 179 ms. Restore sang DB mới và đối chiếu mất 390 ms. Fingerprint khớp 55 vị trí kho, 76 movement, 46 journal, 110 dòng sổ, 8 blob, 6 job chờ xác nhận, 8 command chưa rõ và 30 migration. Ba số sai lệch tồn, cân bằng journal và tệp bằng 0. Giữ dấu xóa và consent có tại snapshot. |
| Mất DB và mở lại | Readiness của API trả 503 khi dừng cluster thử. Liveness trả 200. Sau restart, readiness và đọc shop đúng quyền phục hồi trong 229 ms ở lượt đo; truy cập shop khác trả 404. Số command chưa rõ ban đầu còn đủ 8. |
| Smoke từ gói và quay lui | Bản giải nén cài `npm ci --omit=dev`. Web, API và phiên trả 200 qua HTTPS. Lệnh báo cáo trả 202, worker chạy từ gói hoàn tất và URL ký tải thử trả 200. Build trước tại `b236c446` đọc được health, shop và lệnh trên schema V30 trong phạm vi P0 đã thử, không đổi schema. |
| Lỗi restore · T075.S04 | Trên bản sao PostgreSQL 18.7 và GnuPG 2.4.8, thiếu khóa, sai khóa và ciphertext bị sửa đều bị từ chối. Giải mã đúng khóa trả byte trùng dump gốc. Role runtime bị PostgreSQL từ chối quyền tạo đối tượng. Dump bị cắt vẫn đọc được mục lục nhưng lỗi khi khôi phục. Sau mỗi lỗi `pg_restore --single-transaction`, số bảng, sequence và view của DB đích vẫn bằng 0. Dùng dump hợp lệ và role phục hồi, dữ liệu đối chiếu khớp snapshot. |
| Gián đoạn Redis · T076.S01/S03 | `npm run test:jobs` đạt 3/3. Một worker đang chạy mất toàn bộ kết nối Redis qua proxy loopback thử. Job ghi trong thời gian gián đoạn vẫn `queued`, có 0 lượt chạy. Sau khi nối lại, cùng worker hoàn tất một lượt, command tra cứu trả đúng job và ba mốc outbox được phát. Ca worker chết sau khi provider thử nghiệm tiếp nhận vẫn giữ kết quả `unknown`. |
| Build gói tại SHA CI · T077.S02 | Workflow backend đối chiếu Git HEAD với `GITHUB_SHA`, dùng checkout sạch, cài hai lockfile, dựng một gói, kiểm SHA-256 tệp nén và từng tệp sau giải nén trước khi upload. Chạy phần build và kiểm gói trên checkout cô lập có diff cho kết quả 580 tệp và 30 migration. Hai kiểm âm từ chối checkout có diff và checksum sai. Sửa đường dẫn đầu vào `tar` để Git Bash chạy được cùng lệnh. GitHub chưa chạy bản workflow này trên SHA mới. |
| Required checks · T077.S04 | REST GitHub lúc 14:52 UTC trả `main` được bảo vệ tại `c873f1eb06d36184bdd5cd7b01256fa910e96133`. Job `verify backend (matrix and HTTP)` đã đạt trên chính SHA này. Tên job backend chưa có trong 9 check bắt buộc được trả về ở branch protection, và API rules của nhánh chưa trả quy tắc required status checks bổ sung. Cấu hình GitHub cần được xác nhận trước khi tính backend CI là điều kiện merge bắt buộc. [Nhánh main](https://api.github.com/repos/LonelyTraderBay/Bot-AI-Ban-hang-FB/branches/main) · [Job backend của SHA đã kiểm](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/actions/runs/44868208704/job/136736575298) |
| PITR và consent sau backup · T075.S03 | `pg_verifybackup` đạt. Cùng base backup và WAL trên PostgreSQL 18.7, mốc `0/4000090` còn consent phiên bản 1 và tin nhắn gốc. Mốc `0/5087E28` có consent đã rút, bằng chứng rút được giữ và quyền dùng phiên bản 1 bị chặn. Hành động xóa đã che hồ sơ, định danh và tin nhắn. Bản ghi cùng mã tại shop khác giữ nguyên, giao dịch sau mốc đích bị loại. Máy nguồn đã dừng trước các lần replay. Khởi động đến pause ở mốc sau thao tác mất 621 ms trên dữ liệu thử. |
| Áp lại quyền riêng tư sau snapshot cũ · T075.S03 | Thu manifest của shop từ bản sao mới hơn, gồm hai quyết định rút consent và hai dấu xóa. Bản đích từ mốc `0/4000090` nhận lại một opt-out, chặn quyền dùng phiên bản cũ và hết hạn challenge cũ. Chủ thể opt-out phát sinh sau điểm đích vẫn vắng mặt trong bản đích. Hai dấu xóa áp dụng thành công, gồm một hồ sơ đã có dữ liệu và một hồ sơ mới chỉ gồm bản ghi che thông tin và bí danh băm. Shop B có cùng mã khách vẫn nguyên. Sai SHA, sai shop, sai nguồn gốc, trùng bằng chứng và cấu hình kết nối đổi cổng bị từ chối. Bản sao có chứng từ cần giữ rollback toàn bộ manifest. Giao dịch so sánh thời điểm ở UTC để DB dùng múi giờ khác vẫn nhận đúng nguồn. Áp lại lần hai không thêm audit hoặc outbox. Migration 31 khớp Prisma trên DB trống và hai bản nâng cấp. [Runbook phục hồi](infra/RELEASE_RUNBOOK.md#áp-lại-rút-consent-và-dấu-xóa-lên-bản-sao-cũ) |
| Segment WAL thiếu và readiness | Bản sao thiếu segment chứa mốc đích dừng với lỗi trước khi đạt đích. API cũ báo readiness 200 ở bản sao đang pause. Sau sửa, hai bản sao đang phục hồi và phiên chỉ đọc trả readiness 503. Liveness vẫn 200. Bản sao đã đối chiếu, sau khi promote và kết nối ở chế độ đọc/ghi, trả readiness 200. |
| Đóng gói từ thư mục sạch · T077.S02 | Tái hiện gói 584 tệp từ workspace đã build, gồm bốn JS và source map sót lại từ hai source đã bỏ. Biên dịch API trong thư mục gói mới loại được bốn tệp đó, dù `dist` cũ còn trên máy. Gói còn 580 tệp. Sau giải nén, API và web trả 200, job export nhận 202, worker hoàn tất và URL tải trả 200. |
| Nhận diện bản đang chạy · T077.S02 | Gói v1.33 giải nén cài lại runtime từ lockfile. Qua HTTPS fixture, hai endpoint health trả 200 đúng manifest, 34 tệp web và `/workspaces` khớp checksum. Worker báo cùng manifest sau khi kiểm hàng đợi và hoàn tất job export. Sai checksum, chọn nhầm chế độ loopback, gói dirty ở chế độ staging, API cũ, một asset cũ và chuyển hướng 302 đều bị phát hiện. |
| Tương thích khi quay lui sau recovery · T077.S03 | Chạy ba gói đã giải nén lần lượt trên cùng DB V31 đã áp lại consent. API v1.30 vẫn đọc trạng thái `withdrawn`, nhưng mô tả bằng chứng là challenge của khách và thiếu tham chiếu. API v1.32 và v1.33 đều trả `system`, `verified_opt_out` và tham chiếu audit. Sau khi có bằng chứng mới, chỉ quay về gói đã kiểm hiểu migration 31 và giữ nguyên dữ liệu. |
| Kiểm chỉ số queue và sai lệch · T076.S04, T083.S03 | `check:operations` đọc PostgreSQL trong transaction chỉ đọc. Khi worker chạy, heartbeat đo 557 ms. Sau khi dừng 31 giây và tạo backlog trên bản sao, lệnh trả mã 2 cho heartbeat quá hạn, outbox chậm, job đến hạn, lease quá hạn và lệnh cần đối chiếu. Đối chiếu dữ liệu ghi nhận đúng một sai lệch tồn, một bút toán lệch và một blob sai checksum trên bản sao đã tạo lỗi. Bản tốt trả mã 0, DB không truy cập được trả mã 1. Truy vấn đối chiếu dùng chung với restore và giữ nguyên kết quả JSON của bản trước trên cùng snapshot. [Quy trình giám sát](infra/RELEASE_RUNBOOK.md#đọc-chỉ-số-và-phát-hiện-sai-lệch-vận-hành) |
| Đồng nhất thời gian PostgreSQL | Trên bản sao mặc định `Asia/Bangkok`, worker bản đầu lưu heartbeat lệch 7 giờ. Factory kết nối mới chuẩn hóa UTC cho API và worker, giữ tham số kết nối khác. Ca PostgreSQL kiểm round-trip timestamp và `application_name`. Diễn tập trên bản sao mặc định `Asia/Bangkok` đọc được heartbeat mới và đủ dấu xóa cũ. Các báo cáo, bản tin và kỳ sổ tiếp tục tính theo múi giờ nghiệp vụ đã kiểm. |
| SBOM, audit và giấy phép · T073.S02 | Cài lại cùng gói v1.34 bằng Node 24.22.3 và npm 11.17.0 trên Windows x64 và Linux x64. SBOM CycloneDX toàn lockfile có 442 mục. Cây đã cài có 291 gói bên thứ ba trên Windows và 292 trên Linux, đều khớp lockfile và có trong SBOM. Hai lần audit toàn lockfile báo 0 advisory tại thời điểm chạy. Tìm thấy 127 vị trí cài có cờ `devOptional` trên mỗi nền tảng, gồm Prisma CLI. `busboy@1.6.0` và `streamsearch@1.1.0` thiếu trường giấy phép trong manifest và đều có tệp LICENSE, đã ghi SHA-256. Quyết định sử dụng và kiểm ảnh môi trường staging còn mở. |
| Ràng buộc bằng chứng với gói · T073.S02, T077.S02 | Workflow backend audit toàn lockfile ở bước verify. Bước main cài runtime từ đúng archive, kiểm cây trên đĩa, xuất SBOM và kết quả audit cùng báo cáo checksum. Ca kiểm âm từ chối bản giải nén thuộc archive khác, gói đổi phiên bản, report thiếu gói, SBOM `--omit=dev` thiếu thành phần và audit mức cao. Workflow đã kiểm parse YAML và cú pháp Bash. Bước hậu kiểm archive đã chạy trên Windows và Linux cục bộ. GitHub Actions trên SHA phát hành còn chờ. [Runbook thành phần phụ thuộc](infra/RELEASE_RUNBOOK.md#bằng-chứng-thành-phần-phụ-thuộc-của-gói) |

Log ở `test-results/backend/be23/`. SHA-256 của `clean-postgres-suite.txt` là `a70861b76997cf21343a0f4e03f67f1c79a3205449cb53c7201fb51bdc79d118`, `local-load.txt` là `2eac9236294b19718deb87d6561d5e39209bf23e4300cdc8eb72cad5d22b3fab`, `restore.txt` là `c9676e029502abd3996dababf048af085be606f97f8c8ab5cad675bd61020b83`, và `archive-smoke.txt` là `2159102bdd122738ac001b0c0f9315bf358d5969639ca16943aae07b1aacee94`. Kiểm staging còn mục tiêu tải/SLO/RPO/RTO, cảnh báo và trực vận hành, PITR, áp lại opt-out/dấu xóa phát sinh sau snapshot từ sổ độc lập, mất provider thật và quay lui theo môi trường phát hành. [Truy vấn đối chiếu](infra/backup/verify-restore.sql) · [Runbook](infra/RELEASE_RUNBOOK.md)

Log bổ sung `restore-failures.txt` có SHA-256 `cf545b5409e407f9b5f1eae203b0e0e183879235713152abac3fb0945dc05f80`, `redis-partition.txt` có SHA-256 `92079b70b3b8caf4b573e561e71db152d5011554820c0fe41010c2b6fea5cbc1`, `release-ci-build.txt` có SHA-256 `a85ae0b38504ddf0130c6b3ae05933871356262123a9a5211ab85ade21cd14b8`, `required-checks.json` có SHA-256 `c862793cabfdac63f1dc00f2f51aadfcb86677967b6c3a7ec7b7db6d410394ff`. Archive diễn tập lệnh CI có SHA-256 `6171ee7b6b640fcd9c4dcc7507f2a9b9b72849245a2ba52fe0df9aa132e63c6c`. Kết quả smoke BE-22 gắn với SHA-256 của gói cục bộ ghi trong mục BE-22.

Log v1.32 nằm ở `test-results/backend/be23/privacy-replay/`. SHA-256 của manifest nguồn là `6bc2a32c17b0915bf552a7328900605a772bb41c4c9668617d93d34a38953f3a`, của `replay.txt` là `c18526ec677596a1548ca7b4c3d9d41407f1555ff2f7a8eb8066a1f1ff614afd`, của `privacy-regression.txt` là `40ece32b1493a572831628ab2bf13a8d19dac98e9594e79fedc523a8ff25092b` và của `package-smoke.txt` là `fd7b9053474eddd3366fd2ddf54eae372dda903a6a1da3cc0b4dcb5acc98e0cb`. Backend đạt 22/22 và ma trận 259 operation. Hồi quy privacy đạt 4/4. Bằng chứng dùng hai bản sao PostgreSQL fixture và một nguồn đã replay WAL, còn nghiệm thu kho bằng chứng độc lập và chính sách phục hồi ở staging.

Log v1.33 nằm ở `test-results/backend/be23/release-runtime/`. SHA-256 của `runtime.txt` là `5a7b7645b790b903e55849b5cc268416eb21764c36f22e9c93acd8a70cf328ac`, của `rollback-consent.txt` là `c0dc6f65f095bb41a716285887bc8e68a29eeae86a2047918bcb239c92d97a8f`. Backend `verify` đạt 22/22 và khớp ma trận 259 operation. Kết quả quay lui kiểm nghiệp vụ đọc consent trên DB fixture sau recovery, số liệu triển khai và rollback staging còn chờ xác nhận theo môi trường.

Log v1.34 nằm ở `test-results/backend/be23/operations-probe/`. SHA-256 của `observations.txt` là `a81b70a19879238688e015c49b82ef133934290652a55ae6bea0dc8840bc93e3`, của `fresh-regression-final.txt` là `4fd47d01c089d37865f57c3903a488d83fedd666943e2b15c7346a81b3818b13` và của `package-smoke.txt` là `ae5f8a86e769be9cdd63b87a4e26885dc5a5688ac2a8232ba97b3684b6c1f047`. Backend `verify` đạt 22/22, ma trận khớp 259 operation và 16 suite tích hợp đạt 88/88 trên PostgreSQL 18.7 với IdP và Redis thử. Ngưỡng queue, lịch đọc đối chiếu và kênh báo người trực còn chờ cấu hình đã duyệt tại staging.

Log v1.35 nằm ở `test-results/backend/be23/supply-chain/`. SHA-256 của báo cáo dependencies của gói `b236c446-XtiClF.tgz` trên Windows là `62405eb30149b588bca27bb9a6cf223056207c3e13ce585a310dd56df8fa1666`, trên Linux là `8b6a7393e6566eab1ac74c85621305ae7ccadfd5387a1cb971b48a3a8a4f07ef`. Log `negative-proof.txt` có SHA-256 `06c1d76dca079fc827108620977032202752c5e4b1d9320e8301c015e8a47311`. Backend `verify` đạt 22/22 và ma trận vẫn khớp 259 operation.

Bằng chứng PITR nằm ở `test-results/backend/be23/pitr/`. `before.txt` có SHA-256 `4726abe7d6b77c049642bf1c1d91c4be950c6373ce91c1ba38377b2f09c2d4d5`, `after.txt` có SHA-256 `e8e7e0ddf11edf86408440e2480e9a87ee1c13de0275f12444ddfa8747bc7722`, `missing-wal.txt` có SHA-256 `b7ac6004cbede7d5f0c6fa6c3bbd86ef042f10d30ab7d2e4ef8870e1f5dcf4e4` và `package-smoke.txt` có SHA-256 `8592e91f54504b01ab9a007715e65df017fd49a7eecec04e1f721fa68a48f73a`. Diễn tập chứng minh khôi phục được các thao tác quyền riêng tư nằm trong WAL đã giữ. Kho WAL độc lập, diễn tập theo mục tiêu staging và áp lại thao tác phát sinh khi chọn mốc đích sớm hơn vẫn cần kiểm tại môi trường được giao. [Runbook PITR](infra/RELEASE_RUNBOOK.md#khôi-phục-đến-một-thời-điểm-bằng-wal-pitr)

#### Cô lập worker khi provider chậm · T076.S01, S04 và S05

- Bản trước chờ provider ngay trong vòng relay. Ca giữ một lần gửi ngoài ở trạng thái chưa trả kết quả làm worker thiếu heartbeat sẵn sàng trong cửa sổ kiểm. Bản mới tách vòng relay, bảo trì và từng nhóm gửi ngoài. Mỗi nhóm giữ tối đa một lượt xử lý trên mỗi worker. PostgreSQL tiếp tục giữ lease và dấu bắt đầu tác động để xử lý cạnh tranh giữa nhiều worker.
- Ca PostgreSQL và Redis giữ lần gửi ngoài ở trạng thái chờ. Nhóm gửi ngoài khác vẫn chạy, worker ghi heartbeat, hoàn tất một job và phát đủ ba bản ghi outbox trước khi mở khóa lần gửi. Tín hiệu dừng chặn lượt mới và chờ lượt đang chạy hoàn tất. Các ca mất Redis, khởi động lại với hàng đợi trống, kết quả bên ngoài chưa rõ và outbox lỗi vẫn đi qua bộ kiểm hồi quy.
- `check:operations -- queue` đọc thêm số lượng và độ trễ từng nhóm gửi ngoài. Ca Messenger AI xác nhận cảnh báo `EXTERNAL_DISPATCH_LAG` khi tác vụ đang chờ quá ngưỡng, chuyển số đếm sang `recordedUnknown` khi mất phản hồi và chỉ xuất dữ liệu tổng hợp. Ngưỡng, thời gian chờ dừng và kênh báo người trực của staging vẫn cần được nghiệm thu. [Quy trình giám sát](infra/RELEASE_RUNBOOK.md#đọc-chỉ-số-và-phát-hiện-sai-lệch-vận-hành)
- `verify` đạt 39/39. Sáu bộ tích hợp đạt 39/39 gồm Jobs 4, Events 4, AI 6, Inbox 8, Orders 14 và Procurement 3. Gói `b236c446-hYPztj.tgz` có 632 tệp và 37 migration. Firefox qua Caddy đạt hồi quy webhook, báo giá, giữ tồn, thông báo và giao hàng thử. Lệnh giám sát từ gói trả 0 với ngưỡng thử và trả 2 khi hạ ngưỡng đối chiếu xuống dưới tuổi lệnh `unknown` đang lưu. SHA-256 archive `fe46bee18e156da848931af67557bb1a434d061d2922c177fb099ef2f579fa8e`. SHA-256 manifest `b21fd8fcca43965d52f05bc6e298931e18b24c8dc334329aa934ea7f0b446aa1`. Hồ sơ nằm ở `test-results/backend/be23/dispatch-isolation/dispatch-isolation-verification.json`.

#### Phân lượt job theo shop khi tải tăng · T074.S02–S05

- Ca trước sửa đặt 104 job đến hạn của shop A và một job đến hạn của shop B. Shop B chưa hoàn tất sau cửa sổ chờ 10 giây trong khi các job đầu của shop A bị giữ. Bản sửa nạp ứng viên theo số lease còn trống của từng shop. Vòng nạp ưu tiên ứng viên đầu của các shop trước khi lấy ứng viên tiếp theo mỗi shop. Worker giữ bốn slot, tối đa ba lease job hợp lệ cho mỗi shop trên PostgreSQL dùng chung. Khóa giao dịch theo shop bảo vệ bước giành lease, kể cả với mục đã xếp hàng ở Redis. Job chờ giữ nguyên số lần thử.
- Migration 38 bổ sung hai index để tìm job đến hạn và lease đang chạy theo shop. Nâng cấp bản dữ liệu thử đạt và Prisma khớp schema. PostgreSQL trống áp dụng đủ 38 migration, seed hai shop và chạy lại ca burst. Shop B hoàn tất một lần sau 852 ms tính từ khi ghi job, trong khi shop A vẫn giữ ba lease. Còn 101 job shop A ở trạng thái chờ với số lượt thử bằng 0. Khi dừng worker, ba job đang giữ hoàn tất trước khi tiến trình thoát.
- Trên Windows 11 và PostgreSQL 18.7 qua WSL, phép đo loopback `test:load:local` có 240 GET ở mức đồng thời 12, đạt 240 phản hồi 200 và p95 36,1 ms. 40 GET chéo shop trả 404. 32 yêu cầu ghi cùng intent ở mức đồng thời 8 trả 201 với p95 35,5 ms, PostgreSQL có một khách, một command, một audit và một outbox. Đây là số đo của máy và dữ liệu thử. Tải, quota provider và chỉ tiêu SLO của staging còn chờ đầu vào đã duyệt.
- Firefox qua HTTPS từ gói `b236c446-gtJ3WF.tgz` đo 473 ms đến khi màn chọn shop xuất hiện sau đăng nhập, 388 ms khi tải lại và 1.097 ms từ điều hướng danh sách đến khi tin Messenger xuất hiện sau thao tác mở hội thoại. Gói có 633 tệp và 38 migration. SHA-256 archive `5c500ca4ef47056e1c5083f66d3205f92c2a9991bc950eede8f0a8f23f762012`. SHA-256 manifest `d105aab083f6b195403c2b0aea3539b6d28118547202dfcc311c8215d6a439d0`.
- Backend `verify` đạt 39/39. Năm bộ tích hợp đạt 22/22 gồm Jobs 5, Events 4, AI 6, Operations 4 và Imports 3. Firefox từ gói đạt thêm luồng chứng cứ Messenger, thông báo và giao hàng thử. Hồ sơ chứa cấu hình máy, log và checksum nguồn trong `test-results/backend/be23/tenant-fairness/tenant-fairness-verification.json`.

#### Đối chiếu bản ghi tác động ngoài sau phục hồi · T075.S03–S05

- Báo cáo phục hồi định dạng 2 giữ các phép đối chiếu kho, sổ, command/job, outbox, file và consent. Bổ sung 11 nhóm dấu vân tay SHA-256 cho webhook/gửi Messenger, đánh giá và lượt chạy AI, hạn mức ngày, đơn mua, thông báo ngoài, thiết bị, lượt ghép Telegram và sự kiện vận chuyển. Báo cáo chụp trong giao dịch chỉ đọc cùng snapshot và xuất số lượng với dấu vân tay từng nhóm. `check:restore-evidence` kiểm SHA-256 nguồn, dấu vân tay hai kết nối và kết quả toàn vẹn trước khi báo các nhóm lệch.
- Trên PostgreSQL 18.7 ở migration 38, phục hồi thành công bản dump tổng hợp 812.044 byte bằng `pg_restore --exit-on-error --single-transaction`. Gói đã xác minh chạy `verify-restore.sql` và công cụ so sánh. Kết quả khớp 27 nhóm, cả 11 nhóm tác động ngoài có dữ liệu. Giữ nguyên tám command `unknown` và chín job `awaiting_confirmation`. API từ gói thật trả readiness 200 với đúng manifest, cho hai tài khoản đọc shop của mình và trả 404 khi đọc chéo.
- Trên bản sao đã phục hồi, xóa dấu bắt đầu một lượt Messenger AI và đổi một thông báo ngoài từ `unknown` sang `failed` trong khi giữ số dòng. Công cụ trả mã 2 và chỉ đúng hai nhóm lệch. Tệp nguồn dùng lại làm tệp đích và checksum nguồn sai trả mã 1. Bản sạch trả mã 0. Backend `verify` đạt 40/40. Gói `b236c446-AyRJ3a.tgz` có 635 tệp và 38 migration. SHA-256 archive `4b6610a2f9c6679ffb5fee918e7465b22553edf6ff0620020a883aca81847ced`, SHA-256 manifest `4fd83bf236d46d2ec618f77efbf77dd80844dca179d2c34bb1cc4a35aa36678a`.
- Lượt đo cục bộ mất 83 ms để dump và 911 ms để restore trên dữ liệu thử. Phép đo ở staging, RPO/RTO, quyền khóa lưu trữ và đối chiếu tác động phát sinh sau snapshot vẫn cần được nghiệm thu. Hồ sơ `test-results/backend/be23/restore-effects/restore-effects-verification.json` gắn bản dump, nguồn, gói và các log. [Cách so báo cáo](infra/RELEASE_RUNBOOK.md#so-báo-cáo-nguồn-và-bản-phục-hồi)

#### Khôi phục PostgreSQL và kho tệp độc lập · T075.S03–S05

- Trên dữ liệu thử migration 41 đã dừng ghi, tạo dump PostgreSQL custom và archive thư mục dữ liệu SeaweedFS. Dừng tiến trình kho nguồn, giải nén archive vào thư mục dữ liệu mới và mở cùng endpoint logic. Khôi phục PostgreSQL vào database riêng bằng `pg_restore --exit-on-error --single-transaction`. SHA-256 sai của archive bị từ chối trước giải nén.
- Công cụ từ gói `b236c446-q1gxxv.tgz` đối chiếu khớp 27 nhóm PostgreSQL và 15 object từ kho khôi phục. Digest object nguồn và đích đều là `3b60513be99763ee56d29a00351462e54b7d0487c623587f78bc8382cc30a18c`. API của gói phục vụ đúng 38 byte của tệp cũ, SHA-256 khớp và phiên shop khác nhận 404. Đích SeaweedFS có thư mục dữ liệu riêng, còn PostgreSQL đích là một database mới trên cùng cụm fixture.
- SHA-256 dump `23ea09cafdbe9894d090a408d9ca70811bf50d468e3ba97aa32b5e0ae0d537c2`. SHA-256 archive kho `0b71945322a6c6fac18d97aa7129308bcf0a3e231577221d17210c4021f0996c`. Hồ sơ `test-results/backend/be23/object-restore/independent-restore-verification.json` có SHA-256 `1249b65ec3d714196b4f832334dddacc5647f3eabea7ef0eb188dbac1352daf0`. Chính sách backup, thời gian phục hồi và kho staging vẫn cần nghiệm thu. [Quy trình khôi phục hai nguồn](infra/RELEASE_RUNBOOK.md#khôi-phục-postgresql-và-kho-tệp-độc-lập)

#### Dọn tệp sau khi áp lại quyền riêng tư · T075.S03–S05

- CLI `recovery:privacy -- apply ... --purge-files` dùng quy trình xóa đã có của worker theo shop trong manifest. Chỉ dọn tệp đã bị từ chối hoặc hết hạn. Khi vẫn còn bytes do lease, thời điểm retry hoặc sai định danh kho, lệnh trả `2` với `files.pending`. Lệnh thành công với `files.pending=0` là điều kiện chuyển sang kiểm mở phục vụ. Quy trình này áp dụng trên database và bucket fixture loopback. [Runbook](infra/RELEASE_RUNBOOK.md#áp-lại-rút-consent-và-dấu-xóa-lên-bản-sao-cũ)
- Khôi phục PostgreSQL từ dump và SeaweedFS từ archive được tạo trước lúc rút consent và xóa hồ sơ thử. CLI và API chạy từ gói migration 41. Trước replay, tải đúng tệp trả 200 và phiên shop khác nhận 404. Sau replay, quyền tiếp thị theo phiên bản cũ bị chặn và URL ký cũ trả 404. Khi tệp còn chờ retry, lệnh trả `2` và object vẫn hiện diện. Chạy lại sau thời điểm được xử lý xác nhận object trả 404, bytes staging của tệp đã thu hồi bị xóa và mỗi tệp có đúng một audit dọn. Bản ghi shop khác, object đối chứng và tệp staging còn hiệu lực giữ nguyên. Áp lại lần nữa không tăng số thay đổi hoặc audit. [Ca kiểm phục hồi](tests/recovery/privacy-object-replay.mjs)
- Backend đạt 40/40, kho tệp 2/2 và quyền riêng tư 4/4. Hồ sơ `test-results/backend/be23/privacy-object-replay/verification.json` có SHA-256 `ba3679033148f31ded169e59308223b36360c791348ad39e0c360436ca0a54e8`. Ca đạt trên bộ backup mới, có kiểm ghi và đọc sau restore. Kết quả tái hiện timeout khi ghi trên archive cũ và bước kiểm trước mở phục vụ được ghi bên dưới. Quyền kho, chính sách lưu bằng chứng, RPO/RTO và diễn tập trên staging còn chờ xác nhận.

#### Xác minh kho nhận ghi sau phục hồi · T075.S03–S05

- Trên hai archive SeaweedFS 4.54, tra metadata bucket trả 200 trong khi master từ chối cấp volume vì topology đang nạp. Ghi có điều kiện vượt timeout của client. Trên archive cũ, object của lần ghi đã timeout xuất hiện sau lần kiểm trả 404. Giữ định danh lần ghi để đối chiếu khi kết quả chưa rõ. [Khởi động leader SeaweedFS 4.54](https://github.com/seaweedfs/seaweedfs/blob/5ef99c1d8dbbeb4a035c055e3b464620506aefac/weed/server/master_server.go#L290-L317)
- Gói `b236c446-HnYkDu.tgz` chạy `check:object-storage --probe-write` và `--resolve-write <probeId>` trên đích loopback. Lần đầu trả `ATTENTION` và mã thoát `2`. Lần đối chiếu sau xác nhận bytes đến muộn, dọn đúng object và trả `RESOLVED`. Ghi mới, đọc lại và dọn đạt `WRITABLE` sau khoảng 17 giây trong ca thử. Cả hai object thử trả 404 sau đối chiếu. 15 object đã phục hồi giữ nguyên số lượng và digest. Kho fixture đã vượt bước kiểm nhận ghi. [Quy trình khôi phục](infra/RELEASE_RUNBOOK.md#khôi-phục-postgresql-và-kho-tệp-độc-lập)
- Backend đạt 40/40 và kho tệp 3/3 trên archive cũ. Cùng gói vượt ca dọn tệp và áp lại consent trên một bản phục hồi độc lập khác. Hồ sơ `test-results/backend/be23/object-restore/writable-gate/final/verification.json` có SHA-256 `000a47915bb94d8832b84780c1372c847ab14a618ae3949ba80b5439fa9542ca`. Đoạn ghi thử cục bộ chưa xác lập RTO hay quyền ghi ở kho staging.

#### Kiểm kho tệp trong CI · T073.S03, T077.S01

- Workflow backend gọi `test:object-storage` qua `verify-postgres.sh`, sau kiểm workspace và trước bộ catalog/import. Fixture khởi động SeaweedFS 4.54 từ archive Linux x64 đã ghim SHA-256, dùng bucket loopback và thông tin xác thực tạo riêng cho lượt chạy. Kiểm topology trước khi ghi. Mã thoát của bộ kiểm truyền qua `tee` để job thất bại nếu ca hỏng. Log `object-storage-ci.txt` đi cùng artifact của job. [Script fixture](scripts/verify-object-storage.sh) · [Workflow](../.github/workflows/backend.yml) · [SeaweedFS 4.54](https://github.com/seaweedfs/seaweedfs/releases/tag/4.54)
- Trên workspace Linux cô lập cài bằng `npm ci`, Node 24.22.3 và npm 11.17.0, PostgreSQL 18.7 áp dụng 41 migration từ DB trống. Backend đạt 40/40, workspace 9/9, kho tệp 3/3, catalog 9/9 và import 3/3. Ba ca kho kiểm mất phản hồi ghi, quyền tải, thu hồi trong lúc chuyển tệp và lệnh xác minh khả năng ghi dùng sau phục hồi. Archive sai SHA-256 bị từ chối trước khi có listener S3. Kiểm cú pháp Bash, YAML và đường dẫn artifact đạt. Hồ sơ `test-results/backend/be23/object-storage-ci/verification.json` có SHA-256 `32eb542af4a5036c133444d8aea8ec8ea7f59ab1af3ab45f4d4f8ecd3dc54e4d`. Kết quả dùng PostgreSQL native thử ở WSL. Lượt GitHub Actions với Compose, artifact và SHA mới vẫn chờ xác nhận.

#### Chạy ứng viên phát hành trước khi tải artifact · T077.S02

- Bước main xác minh bản giải nén và cài runtime từ lockfile. `verify-postgres.sh --release` chạy Prisma CLI của CI với cấu hình, schema và migration từ gói trên PostgreSQL thử trống. Seed dùng dữ liệu thử từ workspace. Runner khởi động API và worker từ bản đã cài, phục vụ tài nguyên web cùng gói qua HTTPS fixture và gửi job xuất CSV. Trước khi tải artifact, workflow yêu cầu báo cáo `.runtime.json` khớp `GITHUB_SHA` và digest manifest ở cả API lẫn worker. [Workflow backend](../.github/workflows/backend.yml) · [Runbook gói phát hành](infra/RELEASE_RUNBOOK.md#đóng-gói-bản-chạy)
- Trên Linux cục bộ đã áp đủ 41 migration vào DB trống, kiểm hai health route, 34 tệp web và deep link `/workspaces` từ `b236c446-HnYkDu.tgz`. API nhận job với 202, worker hoàn tất, chủ thể tạo job tải CSV 200 và phiên shop khác nhận 404. Manifest sai bị từ chối trước khi dựng môi trường. Cùng điều kiện kiểm của workflow chấp nhận báo cáo thật và từ chối SHA nguồn hoặc checksum worker sai. Firefox kiểm lại luồng workspace và mất phản hồi P0-07 trên cùng gói. [Ca tích hợp HTTPS](tests/integration/auth/browser-smoke.mjs)
- Hồ sơ `test-results/backend/be23/candidate-runtime-ci/verification.json` có SHA-256 `9ad9bb1db75bd722b09e9d7a9a95270cd2af34eb483640933277aa21838a9c8d`. Ca Linux dùng PostgreSQL và Redis native cô lập, còn lượt GitHub Actions với Compose, ứng viên checkout sạch và tải artifact theo SHA phát hành vẫn chờ nghiệm thu.

#### Cắt chuyển S3 và quay lui trên schema 41 · T077.S03

- `FILE_OBJECT_STORE_TRANSFER_NEW_FILES=0` giữ tệp mới ở PostgreSQL, vẫn tải được object đã chuyển và vẫn dọn tệp hết hạn hoặc bị thu hồi. Bản mới giữ cùng định danh kho khi đổi cờ. Lượt đầu triển khai phải dừng worker cũ và kiểm digest quay lui trước khi chuyển bytes sang S3. Cấu hình mặc định của bản mới tiếp tục chuyển tệp khi kho đã được thiết lập. [Runbook cắt chuyển](infra/RELEASE_RUNBOOK.md#cắt-chuyển-kho-tệp-với-migration-41)
- Diễn tập cục bộ trên PostgreSQL nâng từ migration 40 lên 41, dùng API và worker của các gói `b236c446-kq7TEe.tgz`, `b236c446-q1gxxv.tgz` và `b236c446-EklbOI.tgz`. Khi bytes còn trong PostgreSQL, gói 40 vẫn trả 200 qua URL ký trên schema 41. Sau khi worker chuyển bytes, gói 40 báo readiness 200 và URL ký của chủ thể có quyền trả 404. Quay về gói 41 có hỗ trợ S3 cho URL 200 đúng checksum, vẫn trả 404 cho shop khác và worker chuyển được thêm tệp. Bật lại chế độ tạm dừng giữ tệp mới ở PostgreSQL, xác nhận tệp đã thu hồi được dọn và tệp đã chuyển vẫn đọc được. Schema giữ ở 41 trong suốt ca quay lui.
- Backend đạt 42/42 và kho tệp đạt 4/4. Truy vấn trong runbook chạy bằng role `botsales_runtime` trên DB thử và đếm được ba object còn hiệu lực chỉ có bytes ở S3. Hồ sơ `test-results/backend/be23/object-storage-rollback/verification.json` có SHA-256 `78bb7341236ee92a3f52b26e52050dcfe49d48c4b92e43c3dcaa370299dc5adf`. Ca dùng PostgreSQL, Redis và SeaweedFS loopback. Quyết định digest quay lui, kho và thời gian phục hồi trên staging vẫn chờ nghiệm thu.

#### Giám sát tệp chờ chuyển và chờ dọn · T076.S04

- `check:operations -- file-storage` đọc số lượng và tuổi tệp đang chờ từ PostgreSQL. Có hai ngưỡng do người vận hành cấp. `FILE_TRANSFER_LAG` nhắc tệp mới quá ngưỡng khi bật chuyển sang S3. `FILE_PURGE_LAG` nhắc tệp hết hạn hoặc bị thu hồi còn chờ dọn, kể cả khi tạm dừng chuyển mới. Khi tệp bị từ chối thiếu mốc hết hạn đã qua, báo cáo đếm riêng số tệp có tuổi ước tính từ ngày tạo. [Runbook giám sát](infra/RELEASE_RUNBOOK.md#đọc-chỉ-số-và-phát-hiện-sai-lệch-vận-hành)
- Với ngưỡng thử 60 giây, SeaweedFS và PostgreSQL ghi đúng hai cảnh báo trước khi dọn, chỉ còn cảnh báo dọn khi tạm dừng và trả `OK` sau khi dọn. Tệp chờ vẫn được đếm trong lúc dừng và số chờ về 0 sau khi mở chuyển lại. Gói `b236c446-ZAGNhx.tgz` chạy được phép kiểm bằng role chỉ có `SELECT` trên ba bảng tệp. PostgreSQL từ chối quyền ghi, và phép kiểm báo đúng một tệp cần dọn mà không cần thông tin xác thực S3. DB không truy cập được và cờ cấu hình sai trả mã thoát 1.
- `verify` đạt 42/42 và kho tệp đạt 4/4. Hai phép kiểm `queue` và `integrity` cho trạng thái dự kiến trên DB thử. Cùng gói đạt lại ca áp manifest quyền riêng tư và dọn bytes trên bản phục hồi độc lập. Hồ sơ `test-results/backend/be23/file-storage-operations/verification.json` có SHA-256 `61014270f12378c4c88dd3adef52d598c9339b2963b386b5a490213a6d6c81fd`. Ngưỡng chính thức, lịch chạy và kênh trực staging vẫn chờ xác nhận.

#### Cảnh báo outbox hết lượt thử · T076.S04

- `check:operations -- queue` trả `ATTENTION` với `OUTBOX_TERMINAL_FAILURE` khi có sự kiện outbox đã hết lượt thử. Tín hiệu độc lập với ngưỡng độ trễ vì sự kiện thất bại đã rời hàng chờ xuất bản. Lệnh giữ giao dịch chỉ đọc và số `terminalOutboxFailures` để người trực đối chiếu lần đo. [Runbook giám sát](infra/RELEASE_RUNBOOK.md#đọc-chỉ-số-và-phát-hiện-sai-lệch-vận-hành)
- PostgreSQL 18.7 bắt đầu từ 0 bảng, áp đủ 41 migration và seed hai shop. Worker trên Redis 8.0.5 thử đúng 3 lần, đánh dấu một sự kiện lỗi và giải phóng lease. Lần đo trước lỗi có 0 sự kiện hết lượt thử. Lần đo sau có 1, độ trễ outbox bằng 0 và lệnh thoát mã 2. `npm run test:events` đạt 4/4, `npm run verify` đạt 42/42. SHA-256 `test-results/backend/be23/staging-tls-outbox-20261122/test-events.txt` là `b4b2fc784d2502d1432bf1939548f354a35e19b1b30e21b856078531b3d4cb8b`.
- Gói cục bộ `b236c446-a1vJNH.tgz` có 654 tệp, 41 migration và chứa đúng bản probe kiểm ở trên. SHA-256 archive `525c8354f1d1ff1a1f7a8da09ea9dbccefaecc2974fa0675fa2fbb4cb6cbdfea`, manifest `657ca3bf93dd2f8704f19b58753596752b46b3d414173233e9facb3923d28ae9`. Kết quả chạy probe thuộc fixture cục bộ. Theo dõi trên staging cần người trực và kênh cảnh báo đã duyệt.

### BE-24

**Nghiệm thu, phát hành giới hạn và bàn giao** · T078–T084

- [ ] Chạy hồi quy đúng artifact phát hành. Chốt dữ liệu, chính sách quốc gia, tiền tệ, lưu giữ và phạm vi tác động ngoài. Người dùng nghiệm thu luồng bán hàng, kho, tài chính và thiết bị theo phạm vi đã cam kết.
- [ ] Ghi phê duyệt phát hành, người trực, cách giám sát và điều kiện quay lui. Triển khai giới hạn sau khi đủ bằng chứng và được phép. Kiểm luồng trọng yếu ngay sau phát hành.
- [ ] Bàn giao cách chạy, cảnh báo, xử lý sự cố, restore, quản lý thông tin xác thực, chủ sở hữu và các mục còn mở. Tính hoàn tất theo các mục đã kiểm chứng trong phạm vi được duyệt.

[Runbook bàn giao](infra/RELEASE_RUNBOOK.md) đã ghi cách đóng gói, chạy staging, đối chiếu command/job, backup, restore và quay lui. Cần kết quả staging BE-22/23, người trực, chính sách kinh doanh và lưu giữ được duyệt, UAT người dùng và phê duyệt phân phối trước khi mở rollout.

#### Hồi quy gói cục bộ · T078

- Chạy `npm run test:release:browser` với chính gói v1.37 `b236c446-CDnVBH.tgz` đã giải nén và cài runtime. Kiểm lại đủ 592 tệp trước và sau hồi quy. SHA-256 archive là `650f26a6a95b311d5d2f251d1da45fb59daf06bc54c16e4316f8c1520468fda4`, SHA-256 manifest là `28b1145d517d955b680eeadfad6ff5bfde4b7a5a69e945b96b1b87c621b3effb`. Ca kiểm âm từ chối thiếu dấu cài runtime, sai checksum tệp web và tệp thừa ngoài thư mục npm được phép.
- Firefox đạt 16/16 nhóm qua HTTPS với PostgreSQL, Redis và IdP thử nghiệm. Mỗi nhóm đối chiếu manifest từ API và worker, hai endpoint health, 34 tệp web và truy cập trực tiếp `/workspaces`. Ca catalog lần đầu gặp shop đã cấu hình bot từ bộ dữ liệu dùng chung. Chạy lại đạt trên database P0 riêng, migrate từ trống và seed hai shop, giữ nguyên kiểm tra. Đã kiểm truy vấn sau khi mất phản hồi, SSE đã commit và đọc lại SKU sau khi khởi động lại API.
- `npm run verify` đạt 24/24, ma trận khớp 259 thao tác và 2 endpoint health. Ca đăng nhập trên `dev:live` cũng đạt. Hồ sơ `test-results/backend/be24/packaged-browser/packaged-regression.json` lưu kết quả, checksum từng log và cả lần chạy catalog đầu tiên. T078 vẫn cần chạy trên artifact staging được truy vết về SHA phát hành và được người dùng nghiệm thu.

##### Hồi quy tự động trên gói 38 migration

- `tests/release/packaged-regression.mjs` chạy lại các luồng Firefox hiện có theo thứ tự fixture, kiểm archive, manifest và nội dung gói trước và sau suite. Runner lưu checksum log và nguồn fixture, kết quả ma trận và quan sát release của từng nhóm. Ca âm từ chối archive sai checksum, manifest sai và bản giải nén thuộc gói khác trước khi mở trình duyệt.
- Gói `b236c446-AyRJ3a.tgz` có 635 tệp và 38 migration. Trên PostgreSQL mới seed, Redis loopback và Firefox qua Caddy, **20/20 nhóm đạt**. Có đủ 16 nhóm nghiệp vụ và bốn nhóm Messenger, OpenAI, Web Push, Telegram. Các nhóm nghiệp vụ gồm giao diện và API kho, bán hàng, tài chính, mua hàng, điều phối và quyền riêng tư. Mỗi nhóm dùng cùng manifest và chạy API/worker từ gói. Bốn ca provider dùng dữ liệu, cấu hình và lớp truyền tải thử riêng.
- SHA-256 archive `4b6610a2f9c6679ffb5fee918e7465b22553edf6ff0620020a883aca81847ced`. SHA-256 manifest `4fd83bf236d46d2ec618f77efbf77dd80844dca179d2c34bb1cc4a35aa36678a`. Kiểm lại 22 log và 320 tệp fixture khớp checksum. Backend `verify` đạt 40/40. Hồ sơ mới nằm ở `test-results/backend/be24/full-m38/regression/packaged-regression.json`. [Lệnh hồi quy](infra/RELEASE_RUNBOOK.md#chạy-toàn-bộ-hồi-quy-gói-cục-bộ--t078)

##### Hồi quy tự động trên gói 41 migration

- Trên PostgreSQL dựng trống và seed hai shop, Firefox qua Caddy đạt **21/21 nhóm**. Có thêm nhóm bàn giao mua hàng thủ công. API và worker dùng cùng gói `b236c446-q1gxxv.tgz`, ClamAV 1.5.4 loopback và SeaweedFS 4.54 vừa phục hồi. Runner kiểm ma trận 259 thao tác, checksum 23 log cùng nguồn fixture và nội dung gói sau suite. Ca âm dùng endpoint kho ngoài loopback bị chặn trước khi chạy nhóm.
- Công cụ từ gói kiểm đủ 5 object mới của database hồi quy, không báo sai lệch. Backend `verify` đạt 40/40. SBOM CycloneDX có 481 thành phần và đối chiếu đủ 329 gói runtime đã cài. npm audit báo 0 phát hiện tại lúc kiểm. Hai gói thiếu trường license trong metadata có tệp LICENSE được ghi checksum trong báo cáo phụ thuộc.
- SHA-256 archive `e78a9b42a87502e6dec6f966bb8c40d387f1e61a0731b5f2a2e055160695edae`. SHA-256 manifest `71ec86d4172bc9e6c5aa4df8da94d1613934fb47729b7069f83c0de7a6c93034`. Hồ sơ `test-results/backend/be24/full-m41/verified-record.json` có SHA-256 `fa042e028d60fda0646a9f5734ed381060cb8b1a3fa8cd026d1944776d2ab7c3`. Kết quả cục bộ gắn với worktree có thay đổi.

##### Hồi quy sau thay đổi cắt chuyển và giám sát kho tệp

- Gói `b236c446-ZAGNhx.tgz` chứa 654 tệp và 41 migration. Dựng PostgreSQL 18.7 từ 0 bảng ứng dụng, áp migration, đối chiếu schema Prisma và seed hai shop. **21/21 nhóm đạt** trên Firefox qua Caddy, cùng Redis 8.0.5, ClamAV 1.5.4 và SeaweedFS 4.54 cục bộ. Kiểm HTTP sau suite đối chiếu cùng manifest cho API và worker. Công cụ kiểm kho từ gói đối chiếu đủ 5 object với 0 sai lệch.
- `npm run verify` đạt 42/42 trên mã nguồn của gói. Runner đối chiếu 259 thao tác sản phẩm và 2 route health, checksum của 23 log và 328 tệp nguồn fixture. Bản cài Linux từ đúng archive có 330 gói runtime và 481 thành phần SBOM. npm audit ghi 0 phát hiện tại lượt kiểm. Chế độ `--verify-candidate --fixture` đối chiếu archive, manifest, lockfile, hồ sơ dependency và kết quả chạy gói.
- SHA-256 archive `2bcde2d45ea8b39b5a588fed05c95773b602922669545ac5b411dcb9231da6a0`. SHA-256 manifest `6d7fffa898f55dde73d4290696acc30591e9ca3e63c7d3ffead846b544289828`. Hồ sơ `test-results/backend/be24/verified-final-m41/verification.json` có SHA-256 `c9c692be763bbb6cd0198b6d3b644016ca7951c44b70f3e9972959d470b8bfa5`.
- Kết quả mang phạm vi `LOCAL_PACKAGED_FIXTURE`. Tiền kiểm staging vẫn chặn manifest của gói này. Tại lượt kiểm, GitHub `main` ở `c873f1eb` và registry còn 15 đầu vào `NOT_PROVIDED`. Tiếp tục BE-22 khi có đích staging và nơi quản lý cấu hình được cấp quyền. CI của ứng viên từ checkout sạch, ngưỡng vận hành, UAT và phê duyệt phát hành vẫn chờ bằng chứng.

#### Rà soát đầu vào phát hành · T081.S01–S02

Tại lượt kiểm, `owner-inputs.json` còn 15 đầu vào thiếu, gồm `PRODUCTION_RELEASE_APPROVAL`. Hồ sơ `test-results/backend/be24/full-m38/release-review-inputs.json` ghi trạng thái theo ID, digest ứng viên và nguồn kiểm. Gói hiện tại lấy từ working tree có thay đổi và mang phạm vi `LOCAL_PACKAGED_FIXTURE`. T078–T081 còn cần gói checkout sạch, CI đúng SHA, bằng chứng staging và phục hồi theo mục tiêu, chính sách T079, UAT T080 và xác nhận phát hành ràng buộc đúng digest. [Cách rà trước rollout](infra/RELEASE_RUNBOOK.md#rà-soát-trước-khi-xin-phê-duyệt--t081)

Lượt rà với gói 41 migration ghi tại `test-results/backend/be24/full-m41/release-review-inputs.json`. `origin/main` đang ở `c873f1eb`, GitHub trả 0 environment và 0 bản ghi deployment `staging`. Tiền kiểm vẫn chặn release manifest tạo từ worktree đang có thay đổi. Cả 15 đầu vào chủ dự án vẫn chờ cấp, gồm phê duyệt phát hành.

#### Đối chiếu hồ sơ ứng viên · T077.S02, T081.S01

- Workflow yêu cầu `--verify-candidate` đạt trước khi tải artifact. Chế độ này đối chiếu SHA Git và SHA-256 archive đã ghi nhận với manifest, lockfile trong archive, SBOM, audit, hồ sơ dependency và kết quả chạy API, worker, web và CSV. Báo cáo `.verified.json` lưu digest từng tệp để người rà kiểm lại sau khi tải. Ứng viên từ worktree có thay đổi bị chặn ở chế độ mặc định. [Lệnh đối chiếu](scripts/release-dependency-evidence.mjs) · [Runbook](infra/RELEASE_RUNBOOK.md#đóng-gói-bản-chạy)
- Gói `b236c446-HnYkDu.tgz` đạt kiểm cục bộ trên Linux với 481 mục SBOM và 330 gói runtime. Audit không ghi advisory mức high hoặc critical tại lượt chạy. Kiểm thực tế từ chối tám trường hợp sai, gồm SHA nguồn, digest archive, kết quả tải chéo shop, digest worker, SBOM và audit bị thay. `npm run verify` đạt 42/42. Hồ sơ `test-results/backend/be24/candidate-evidence/verification.json` có SHA-256 `d93eb76d2c298fb6123a4dd04f8b44ab8df2fdbcad56e10ffe945b5b614ea5c2`.
- Đối chiếu lại GitHub `main` tại `c873f1eb` và đọc trực tiếp `owner-inputs.json`. Còn 15 đầu vào ở trạng thái `NOT_PROVIDED`, gồm `PRODUCTION_RELEASE_APPROVAL`. Gói và bằng chứng trên thuộc fixture cục bộ. T081 vẫn chờ CI của SHA phát hành, staging, chính sách T079, UAT T080 và quyền triển khai đã được xác nhận. [SHA main đã đối chiếu](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/commit/c873f1eb06d36184bdd5cd7b01256fa910e96133) · [Đầu vào của chủ dự án](../botsales-kit/execution/owner-inputs.json)

##### Đối chiếu đủ phụ thuộc runtime của ứng viên

- T073.S02 và T077.S02 đối chiếu danh sách runtime với lockfile và SBOM cả khi lập báo cáo lẫn khi kiểm lại ứng viên. Chặn gói chỉ dùng để phát triển, gói bắt buộc bị thiếu, đường dẫn trùng hoặc tên và phiên bản sai. Gói `optional` và `devOptional` được đối chiếu nếu có mặt trên nền tảng đang kiểm. [Quy trình đọc hồ sơ phụ thuộc](infra/RELEASE_RUNBOOK.md#bằng-chứng-thành-phần-phụ-thuộc-của-gói)
- Cài lại gói `b236c446-a1vJNH.tgz` trên Linux bằng Node 24.22.3 và npm 11.17.0. Xác nhận 330 gói runtime gồm đủ 195 gói bắt buộc và 127 gói `devOptional` có mặt. SBOM có 481 thành phần, audit ghi 0 phát hiện tại lượt chạy và hồ sơ liệt kê 2 gói thiếu trường giấy phép. Việc cài thêm nhóm dev từ cùng archive bị từ chối. Ca kiểm báo cáo chặn khi bỏ gói bắt buộc, lặp đường dẫn, đổi phiên bản hoặc sửa cờ tùy chọn. `npm run verify` đạt 43/43.
- Trên cùng manifest `657ca3bf93dd2f8704f19b58753596752b46b3d414173233e9facb3923d28ae9`, smoke từ gói xác nhận 41 migration từ DB trống, hai health route, 34 tệp web và worker hoàn tất xuất CSV. Phiên người tạo tải được và shop khác nhận 404. Đối chiếu hồ sơ đạt `LOCAL_CANDIDATE_EVIDENCE_VERIFIED`. Chế độ mặc định từ chối gói có thay đổi cục bộ. Hồ sơ `test-results/backend/be24/runtime-dependency-gate/verification.json` có SHA-256 `38a652e6a971c68d0eab84bef701c3a57883227e2b749f7a174669eee27d8b97`.

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

Khi đóng việc, ghi mã test hoặc vị trí suite, kết quả, phiên bản mã nguồn, baseline hợp đồng và môi trường. Review toàn bộ diff để đối chiếu handler, chính sách và nguồn dữ liệu đã dùng lại. Các ca bỏ qua hoặc chưa chạy thuộc trạng thái đang mở của chính đầu việc.

### Ca đối chứng phân bổ từng phần

Dùng chung fixture tổng hợp cho BE-11–BE-17. Giá và tổng nội bộ lưu đến 18 chữ số thập phân. Giữ số chính xác khi nhân số lượng và cộng dòng. Phân bổ theo thứ tự nguồn ổn định bằng chênh lệch giá trị cộng dồn đã làm tròn half-even ở độ chính xác của nguồn. Phần cuối nhận đúng phần còn lại để bảo toàn tổng. Ví dụ 100 đơn vị tiền chia ba phần ở độ chính xác 0 chữ số cho `33, 34, 33`. Cổng nghiệp vụ của chứng từ cung cấp độ chính xác và currency đã chốt. [Hàm tính tiền](apps/api/src/platform/money/index.ts) · [Ca đối chứng](tests/money.test.mjs)

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
| 21/11/2026 | BE-02 · T007–T009 | Đã kiểm chứng | [PR #29](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/29) · `main@859fed45` | 5/5 mục. CI trước và sau merge đều đạt 27/27 job. Báo cáo ma trận khớp SHA checkout và SHA-256 artifact. [Kết quả](#kết-quả-kiểm-be-02) | BE-03 dựng PostgreSQL, migration và seed hai shop. |
| 21/11/2026 | BE-03 · T013 | Đã kiểm chứng | `main@c873f1eb` + thay đổi BE-03 cục bộ | 3/3 mục. PostgreSQL 18.7 trống migrate, seed replay giữ dữ liệu, cô lập hai shop và readiness phục hồi sau restart. 19/19 ca nền và 6/6 ca DB đạt. [Kết quả](#kết-quả-kiểm-be-03) | BE-04 nối OIDC thử nghiệm và phiên. |
| 21/11/2026 | — | Cập nhật kế hoạch v1.8 | Thay đổi cục bộ | Gom khoảng 10 việc đã kiểm chứng thành một commit. Giữ kết quả từng việc trong tracker và kiểm CI theo SHA ở cấp nhóm. [Commit theo nhóm](#commit-theo-nhóm) | Đợt 1 có BE-03 đã kiểm chứng. Tiếp tục BE-04. |
| 21/11/2026 | BE-04 · T014 | Đã kiểm chứng | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Firefox qua HTTPS đạt callback, refresh và logout. 20/20 ca nền, 6/6 ca DB và 6/6 ca OIDC. [Kết quả](#kết-quả-kiểm-be-04) | Đợt 1 đạt 2/10. Tiếp tục BE-05. |
| 21/11/2026 | BE-05 · T015, T018 | Đang thực hiện | `main@c873f1eb` + thay đổi cục bộ | P0-05 đạt. Chọn shop, xem và thu hồi thành viên được kiểm trên HTTP và Firefox. Bộ workspace 5/5. [Kết quả](#kết-quả-kiểm-be-05) | Hoàn tất mời thành viên và đổi vai trò ở R32 trước khi chốt BE-05. |
| 21/11/2026 | BE-05 · T015, T018 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 4/4 mục. R32 mời và đổi vai trò đạt API, PostgreSQL, OIDC và Firefox qua HTTPS. [Kết quả](#kết-quả-kiểm-be-05) | Đợt 1 đạt 3/10. Tiếp tục BE-06. |
| 21/11/2026 | BE-06 · T016 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. P0-06 đạt ghi đúng một lần và rollback. P0-07 đạt mất phản hồi sau commit, tải lại và đối chiếu qua Firefox. [Kết quả](#kết-quả-kiểm-be-06) | Đợt 1 đạt 4/10. Tiếp tục BE-07. |
| 21/11/2026 | BE-07 · T019 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Tạo và đọc SKU sau restart API, phục hồi khi mất phản hồi, kiểm quyền và SKU trùng theo shop. [Kết quả](#kết-quả-kiểm-be-07) | Đợt 1 đạt 5/10. Tiếp tục BE-10. |
| 21/11/2026 | BE-10 · T017 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Cưỡng bức mất Redis, phục hồi từ PostgreSQL, kiểm crash worker, SSE và API job. [Kết quả](#kết-quả-kiểm-be-10) | Đợt 1 đạt 6/10. Tiếp tục BE-08. |
| 21/11/2026 | BE-08 · T020–T021 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Catalog, khách hàng, upload riêng tư và import CSV/XLSX đạt các ca tích hợp. R13–R14 đạt trên Firefox qua HTTPS. [Kết quả](#kết-quả-kiểm-be-08) | Đợt 1 đạt 7/10. Tiếp tục BE-09. |
| 21/11/2026 | BE-09 · T022–T023 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Chiếc cuối 1/100 giữ được, rollback khi thiếu SKU, đối chiếu sổ, cùng luồng R15/R16/R55 qua Firefox. [Kết quả](#kết-quả-kiểm-be-09) | Đợt 1 đạt 8/10. Tiếp tục BE-11. |
| 21/11/2026 | BE-11 · T024–T026 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 4/4 mục. R18–R19 đạt từ nháp đến COD đã giữ hàng. API kiểm phí R62, phiên bản giá, nguồn xác nhận, chống trùng và hết hạn. [Kết quả](#kết-quả-kiểm-be-11) | Đợt 1 đạt 9/10. Tiếp tục BE-12. |
| 21/11/2026 | BE-12 · T027–T030 | Đã kiểm chứng cục bộ | `main@c873f1eb` + thay đổi cục bộ | 3/3 mục. Thu từng phần, COD, sổ kép, mở sổ, điều chỉnh có đối ứng và rollback. R15/R19/R48 kiểm qua Firefox. [Kết quả](#kết-quả-kiểm-be-12) | Đợt 1 đạt 10/10. Chốt commit cục bộ rồi tiếp tục BE-13. |
| 21/11/2026 | BE-13 · T031–T036 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 4/4 mục, 10/10 ca orders và luồng R39–R43 trên Firefox. Mất phản hồi bàn giao tra được lệnh và không ghi tồn hai lần. [Kết quả](#kết-quả-kiểm-be-13) | Đợt 2 đạt 1/10. Tiếp tục BE-14. |
| 21/11/2026 | BE-14 · R64 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Combo qua R64, R18, R19 và ba lần kiểm trả đối chiếu giá ròng trên PostgreSQL. [Kết quả](#kết-quả-kiểm-be-14) | Đợt 2 đạt 2/10. Tiếp tục BE-15. |
| 21/11/2026 | BE-15 · R66/R67 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Kiểm kê chọn dòng cần đếm lại, chuyển kho nhận từng phần, sổ đối ứng, race kho đích và Firefox. [Kết quả](#kết-quả-kiểm-be-15) | Đợt 2 đạt 3/10. Tiếp tục BE-16. |
| 21/11/2026 | BE-16 · T043–T048 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Đơn mua kiểm phiên bản duyệt, gửi chưa rõ, nhận đạt và lỗi riêng, đúng một công nợ. [Kết quả](#kết-quả-kiểm-be-16) | Đợt 2 đạt 4/10. Tiếp tục BE-17. |
| 21/11/2026 | BE-17 · T049–T054, R65 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. CSV, phân bổ, phí COD, khóa kỳ, báo cáo và ca R65 299.000/249.000 VND có bằng chứng API/PostgreSQL và Firefox. [Kết quả](#kết-quả-kiểm-be-17) | Đợt 2 đạt 5/10. Tiếp tục BE-18. |
| 21/11/2026 | BE-18 · T037–T039 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Callback và tin lặp, quyền theo hội thoại, chặn nháp bot cũ, combo từ Inbox, tri thức có hash và bản ngừng truy xuất. [Kết quả](#kết-quả-kiểm-be-18) | Đợt 2 đạt 6/10. Tiếp tục BE-19. |
| 21/11/2026 | BE-19 · T040–T042 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Adapter thử, đúng hạn mức, giá/tồn/nguồn theo quyền, xuất bản theo đánh giá, một đơn nháp khi nhận lặp và chuyển người sau thu hồi quyền. [Kết quả](#kết-quả-kiểm-be-19) | Đợt 2 đạt 7/10. Tiếp tục BE-20. |
| 21/11/2026 | BE-20 · T055–T060 và R63 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. Bốn vai trò, quyền ủy nhiệm, giữ và đối chiếu ngân sách, dừng tác vụ cũ, bản tin đúng kỳ, báo cáo combo và ngoại lệ mở đúng đơn. [Kết quả](#kết-quả-kiểm-be-20) | Đợt 2 đạt 8/10. Tiếp tục BE-21. |
| 21/11/2026 | BE-21 · T061–T066 | Đã kiểm chứng cục bộ | `b236c446` + thay đổi cục bộ | 3/3 mục. 259 operation được đối chiếu, 86 ca PostgreSQL/HTTPS/worker trên cluster mới, Firefox xác nhận shop, step-up, consent và export. [Kết quả](#kết-quả-kiểm-be-21) | Đợt 2 đạt 9/10. Chuẩn bị BE-22 và kiểm cục bộ BE-23. |
| 21/11/2026 | BE-22 · T067–T072 | Chờ đầu vào staging | `b236c446` + thay đổi cục bộ | Gói, manifest và preflight đã xác minh trên fixture. [Chuẩn bị](#chuẩn-bị-và-điều-kiện-mở-be-22) | Chờ môi trường và grant. Giữ đợt 2 ở 9/10. |
| 21/11/2026 | BE-23 · T073–T077 | Đã diễn tập cục bộ | `b236c446` + thay đổi cục bộ | Cài tách biệt, audit, tải thử, đối chiếu restore, mất DB, gói chạy và đọc bằng bản trước. [Kết quả](#kết-quả-diễn-tập-cục-bộ-be-23) | Chờ mục tiêu tải/phục hồi, CI và diễn tập staging. |
| 21/11/2026 | BE-23 · T075, T076, T077 | Bổ sung bằng chứng lỗi và artifact | `b236c446` + thay đổi cục bộ, đối chiếu `main@c873f1eb` | Ca sai khóa, tệp hỏng, thiếu quyền restore đạt. Worker tiếp tục sau khi Redis nối lại. Kiểm gói và checksum CI đã diễn tập. | Chờ kiểm staging, GitHub Actions đúng SHA mới và xác nhận required backend check. |
| 21/11/2026 | BE-23 · T075, T077 | Bổ sung PITR và smoke gói mới | `b236c446` + thay đổi cục bộ | Replay trước và sau opt-out/xóa, từ chối WAL thiếu, sửa readiness khi DB chỉ đọc và loại JS cũ khỏi gói. Smoke đạt từ bản giải nén. | Chờ kho WAL và chính sách staging, thời điểm phục hồi do chủ dự án chốt và GitHub Actions của SHA mới. |
| 21/11/2026 | BE-24 · T078–T084 | Hồ sơ bàn giao chuẩn bị | `b236c446` + thay đổi cục bộ | [Runbook](infra/RELEASE_RUNBOOK.md) ghi chung điều kiện phát hành và vận hành. | Chờ BE-22/23, chính sách, UAT và phê duyệt. |
| 21/11/2026 | BE-06 · T016 | Kiểm lại đạt cục bộ | `b236c446` + thay đổi cục bộ | Workspace 9/9. Firefox tra lại được lệnh sau khi mất phản hồi đã commit, đối chiếu đúng một command, audit, outbox và membership. [Kết quả](#kết-quả-kiểm-be-06) | Giữ bản cập nhật kế hoạch cục bộ. |
| 21/11/2026 | BE-23 · T075.S03 | Áp lại bằng chứng sau snapshot đạt trên fixture | `b236c446` + thay đổi cục bộ | Migration 31, thu và áp lại theo shop, rollback khi có chứng từ, replay lặp an toàn và smoke gói mới. [Kết quả](#kết-quả-diễn-tập-cục-bộ-be-23) | Chờ kho bằng chứng và chính sách lưu giữ, quyền staging và diễn tập theo RPO/RTO đã chốt. |
| 21/11/2026 | BE-22 · T067, BE-23 · T077 | Kiểm gói đang phục vụ và tương thích quay lui trên fixture | `b236c446` + thay đổi cục bộ | Header API, log worker, 34 tệp web và đường dẫn trực tiếp được đối chiếu. Kiểm đọc consent sau recovery trên ba gói. [Kết quả](#kết-quả-diễn-tập-cục-bộ-be-23) | Chờ staging và checksum từ CI trên commit phát hành. |
| 21/11/2026 | BE-23 · T076.S04, BE-24 · T083.S03 | Chỉ số và đối chiếu đạt trên fixture | `b236c446` + thay đổi cục bộ | Hàng đợi, heartbeat, tồn, sổ và tệp kiểm bằng PostgreSQL thật. Sửa múi giờ kết nối, kiểm 88/88 ca tích hợp và smoke từ gói. [Kết quả](#kết-quả-diễn-tập-cục-bộ-be-23) | Chờ mục tiêu staging, lịch giám sát và kênh trực đã duyệt. |
| 21/11/2026 | BE-23 · T073.S02, T077.S02 | Kiểm thành phần phụ thuộc từ gói giải nén | `b236c446` + thay đổi cục bộ | SBOM, audit và kiểm cây runtime trên Windows/Linux, có hash và danh sách giấy phép. [Kết quả](#kết-quả-diễn-tập-cục-bộ-be-23) | Chờ CI trên SHA mới và kiểm hồ sơ của môi trường triển khai được chọn. |
| 21/11/2026 | BE-22 · T068 | Tiền kiểm OIDC đạt trên fixture | `b236c446` + thay đổi cục bộ | API và CLI dùng chung discovery. Ca TLS, metadata và JWKS chặn đúng lỗi. 11/11 ca HTTPS, Firefox và CLI từ gói đạt. [Kết quả](#chuẩn-bị-và-điều-kiện-mở-be-22) | Chờ IdP tenant/client được cấp và bằng chứng đăng nhập, thu hồi, step-up ở staging. |
| 21/11/2026 | BE-22 · T067 | Tiền kiểm PostgreSQL và Redis đạt trên fixture TLS | `b236c446` + thay đổi cục bộ | Role đúng, 31 checksum khớp, kiểm âm và smoke job từ gói đạt. [Kết quả](#chuẩn-bị-và-điều-kiện-mở-be-22) | Chờ quyền hạ tầng, chính sách lưu giữ và CI trên SHA mới. |
| 21/11/2026 | BE-24 · T078 | Hồi quy gói giải nén đạt trên fixture | `b236c446` + thay đổi cục bộ | Firefox 16/16, đúng manifest, kiểm 34 tệp web mỗi nhóm. Catalog đạt trên P0 riêng sau lần đầu lệch dữ liệu. [Kết quả](#hồi-quy-gói-cục-bộ--t078) | Chờ artifact staging trên SHA phát hành và UAT. |
| 21/11/2026 | BE-22 · T067.S02–S04 | Cổng HTTPS tham chiếu đạt trên fixture | `b236c446` + thay đổi cục bộ | Caddyfile từ gói, Firefox 3/3, SSE, lỗi upstream, xác thực và lọc log. [Kết quả](#cổng-https-tham-chiếu--t067s02s04) | Chờ hostname/chứng chỉ và hạ tầng đã duyệt để kiểm staging. |
| 21/11/2026 | BE-22 · T068.S04, BE-24 · T078 | CSP và hồi quy gói đạt trên fixture | `b236c446` + thay đổi cục bộ | Firefox 16/16 trên gói có CSP, API và form kiểm hợp đồng, script nội tuyến và mã động bị chặn. [Kết quả](#chính-sách-script-và-kiểm-hợp-đồng-trên-trình-duyệt--t068s04) | Chờ IdP, cấu hình và bằng chứng staging. |
| 21/11/2026 | BE-22 · T068 | Xác minh lại R35 đạt trên fixture | `b236c446` + thay đổi cục bộ | Migration 32, OpenAPI 2.6.1, grant dùng một lần theo phạm vi và Firefox phê duyệt qua OIDC từ gói. [Kết quả](#xác-minh-lại-phiên-r35-qua-oidc--t068) | Chờ tenant IdP staging và chính sách lưu giữ T079. |
| 21/11/2026 | BE-22 · T069, BE-06 · T016 | Webhook nhận văn bản và hồi quy BE-06 đạt cục bộ | `b236c446` + thay đổi cục bộ | Backend 27/27, Inbox 5/5, Firefox qua Caddy đạt R05/R06 và P0-07 từ gói đã đối chiếu. [Kết quả](#tiếp-nhận-webhook-meta-messenger--t069) | Chờ quyền Meta/AI và bằng chứng staging. |
| 22/11/2026 | BE-22 · T069.S02, S04 | Trả lời văn bản Meta đạt với nhà cung cấp mô phỏng | `b236c446` + thay đổi cục bộ | Migration 33 từ DB trống và nâng cấp, backend 28/28, Inbox 7/7, AI 3/3. Firefox R06 qua Caddy và worker từ gói ghi đúng một POST. [Kết quả](#trả-lời-meta-messenger-trong-phạm-vi-thử--t069s02-s04) | Chờ thử trên Page, token và quyền staging đã cấp. |
| 22/11/2026 | BE-22 · T069.S01, S03 | Công cụ đánh giá AI đạt kiểm cục bộ | `b236c446` + thay đổi cục bộ | 8 ca tổng hợp khóa checksum, backend 33/33 và CLI từ gói đạt kiểm phê duyệt và trần USD. [Kết quả](#chuẩn-bị-đánh-giá-nhà-cung-cấp-ai--t069s01-s03) | Chờ phê duyệt model, vùng, dữ liệu, giá và ngân sách để chạy thật. |
| 22/11/2026 | BE-22 · T070 | Web Push R40 và thông báo đơn đạt trên bộ thử | `b236c446` + thay đổi cục bộ | Migration 34, backend 36/36, Orders 13/13, Firefox qua Caddy và đúng một POST mã hóa từ worker trong gói. [Kết quả](#web-push-cho-r40-và-đơn-cần-chuẩn-bị--t070) | Chờ Web Push trên điện thoại được cấp và Telegram dự phòng. |
| 22/11/2026 | BE-22 · T070 | Ghép Telegram và dự phòng đạt trên bộ thử | `b236c446` + thay đổi cục bộ | Migration 35, backend 38/38, Orders 14/14. Firefox qua Caddy đạt ghép, gửi thử và thu hồi Telegram cùng hồi quy Web Push. [Kết quả](#telegram-dự-phòng-và-ghép-thiết-bị--t070) | Chờ bot/webhook được cấp và ca trên từng điện thoại thật. |
| 22/11/2026 | BE-06 · T016 | Kiểm hồi quy đạt cục bộ | `b236c446` + thay đổi cục bộ | Backend 38/38, workspace 9/9. Firefox qua HTTPS đạt P0-07, đối chiếu một membership, command, audit và outbox sau khi mất phản hồi. [Kết quả](#kết-quả-kiểm-be-06) | Giữ bằng chứng và kế hoạch cục bộ. |
| 22/11/2026 | BE-22 · T071 | Hồi quy vận chuyển, mua hàng và sao kê đạt cục bộ | `b236c446` + thay đổi cục bộ | Backend 38/38, Finance 6/6, Procurement 3/3, Orders 14/14. Firefox qua Caddy đạt ba luồng từ gói có 35 migration. [Kết quả](#vận-chuyển-mua-hàng-và-sao-kê--t071) | Chờ nguồn và quyền staging đã duyệt. |
| 22/11/2026 | BE-22 · T072 | Xác nhận báo giá qua Messenger và luồng giao đạt cục bộ | `b236c446` + thay đổi cục bộ | Backend 38/38 và 37 ca tích hợp. Firefox qua Caddy đạt webhook, xác nhận, nhận việc và bàn giao trên cùng đơn. [Kết quả](#smoke-xuyên-hệ-thống--t072) | Chờ AI runtime được duyệt, thiết bị và dịch vụ staging. |
| 22/11/2026 | BE-22 · T069.S01 | Kiểm kết nối OpenAI R30 đạt trên bộ thử | `b236c446` + thay đổi cục bộ | Backend 38/38, AI 4/4, Jobs 3/3. Firefox qua Caddy và worker gói thực hiện đúng một GET qua lớp thử nghiệm. [Kết quả](#kiểm-quyền-truy-cập-model-openai-từ-r30--t069s01) | Chờ quyền Project và chạy đánh giá thật. |
| 22/11/2026 | BE-22 · T069.S03 | R28 đánh giá theo phê duyệt đạt cục bộ | `b236c446` + thay đổi cục bộ | Backend 38/38, AI 5/5, Jobs 3/3. Ca R28 đạt 13/13, thiếu phản hồi giữ chờ đối chiếu. M36 từ trống và nâng cấp đạt. [Kết quả](#đánh-giá-openai-đã-phê-duyệt-từ-r28--t069s03) | Chờ staging và phê duyệt provider thật. |
| 22/11/2026 | BE-06 · T016 | Đối chiếu đợt 1 đạt cục bộ | `b236c446` và gói thử đã đối chiếu manifest | Commit sạch đạt 17 migration, backend 22/22, workspace 9/9. Firefox từ gói 36 migration đạt P0-07. [Kết quả](#kết-quả-kiểm-be-06) | Giữ cập nhật và bằng chứng cục bộ. CI của đợt 1 chờ PR. |
| 22/11/2026 | BE-22 · T072.S01 | Lượt Messenger → OpenAI → đơn nháp đạt trên bộ thử | `b236c446` + thay đổi cục bộ | Backend 39/39, tích hợp 35/35. Migration 37, một lượt được duyệt, cùng đơn từ nháp đến xác nhận và đã xem. Firefox qua Caddy đạt hồi quy từ gói. [Kết quả](#messenger--openai--đơn-nháp-theo-phê-duyệt--t072s01) | Chờ Page, OpenAI Project, điện thoại và nguồn staging được cấp. |
| 22/11/2026 | BE-23 · T076.S01, S04, S05 | Cô lập vòng xử lý ngoài và kiểm giám sát cục bộ | `b236c446` + thay đổi cục bộ | Backend và tích hợp cùng đạt 39/39. Provider chờ vẫn có heartbeat, một job hoàn tất và ba sự kiện được phát. Probe từ gói đạt mã thoát 0 và 2. [Kết quả](#cô-lập-worker-khi-provider-chậm--t076s01-s04-và-s05) | Chờ chỉ tiêu tải, ngưỡng và kênh cảnh báo staging. |
| 22/11/2026 | BE-23 · T074.S02–S05 | Phân lượt job và đo tải cục bộ | `b236c446` + thay đổi cục bộ | Migration 38, backend 39/39, tích hợp 22/22. Shop B hoàn tất sau 852 ms khi shop A có 104 job đến hạn. HTTP p95 đọc 36,1 ms và có số đo Firefox từ gói. [Kết quả](#phân-lượt-job-theo-shop-khi-tải-tăng--t074s02s05) | Chờ workload, SLO, quota và thiết bị mục tiêu được duyệt. |
| 22/11/2026 | BE-23 · T075.S03–S05 | Đối chiếu dấu vết ngoài đạt trên bản phục hồi cục bộ | `b236c446` + thay đổi cục bộ | Backend 40/40. Gói trên DB phục hồi khớp 27 nhóm và đọc đúng quyền hai shop. Ca thay đổi trạng thái giữ nguyên số dòng phát hiện đúng hai nhóm lệch. [Kết quả](#đối-chiếu-bản-ghi-tác-động-ngoài-sau-phục-hồi--t075s03s05) | Chờ kho lưu bằng chứng, RPO/RTO và đối chiếu provider trên staging. |
| 22/11/2026 | BE-24 · T078, T081.S01–S02 | Hồi quy gói cục bộ đạt, rà đầu vào phát hành | `b236c446` + thay đổi cục bộ | 20/20 nhóm trên cùng manifest có 38 migration. Ma trận và checksum log khớp. Rà thấy 15 đầu vào chủ dự án còn thiếu. [Kết quả](#hồi-quy-tự-động-trên-gói-38-migration) | Chờ ứng viên sạch, staging, chính sách, UAT và quyền phát hành. |
| 22/11/2026 | BE-06 · T016 | Hồi quy checkout hiện tại đạt cục bộ | `b236c446` + thay đổi cục bộ | DB trống lên 38 migration, backend 40/40, workspace 9/9. Firefox qua HTTPS đạt P0-07 và đối chiếu đúng một lần ghi. [Kết quả](#kết-quả-kiểm-be-06) | Giữ cập nhật cục bộ. CI theo SHA đợt 1 chờ PR. |
| 22/11/2026 | BE-22 · T071 | Bàn giao và nhập chứng từ thủ công đạt cục bộ | `b236c446` + thay đổi cục bộ | Migration 39 từ trống và nâng cấp giữ dữ liệu. Procurement 4/4. Firefox từ gói qua R46/R47, có đúng một phiếu và bút toán theo chứng từ. [Kết quả](#bàn-giao-đơn-mua-và-nhập-chứng-từ-thủ-công) | Chờ nguồn và quyền staging đã duyệt. |
| 22/11/2026 | BE-22 · T071 | Nhập chứng từ hành trình R42 đạt cục bộ | `b236c446` + thay đổi cục bộ | Migration 40, Orders 14/14, chứng từ lặp quay về cùng mã, sự kiện muộn giữ trạng thái đã giao. Firefox qua Caddy dùng công cụ từ gói. [Kết quả](#nhập-chứng-từ-hành-trình-thủ-công-ở-r42) | Chờ nguồn và quyền staging đã duyệt. |
| 22/11/2026 | BE-22 · T067.S02–S04 | Quét tệp với daemon cục bộ đạt | `b236c446` + thay đổi cục bộ | ClamAV 1.5.4, Catalog 10/10. Firefox từ gói đạt ba luồng tải tệp. Audit ghi bốn lượt quét sạch mới. [Kết quả](#quét-tệp-tải-lên--t067s02s04) | Kho đối tượng và nghiệm thu staging còn mở. |
| 22/11/2026 | BE-22 · T067.S02–S04 | Kho riêng S3 đạt cục bộ | `b236c446` + thay đổi cục bộ | Migration 41, 2/2 ca kho, 4 nhóm Firefox từ gói. Nguồn và bản sao đối chiếu cùng 15 object. [Kết quả](#kho-đối-tượng-riêng-tương-thích-s3--t067s02s04) | Chờ bucket, quyền và phục hồi staging. |
| 22/11/2026 | BE-23 · T075.S03–S05 | Khôi phục DB và kho trên hai bản độc lập đạt thử cục bộ | `b236c446` + thay đổi cục bộ | `pg_restore` từ dump, SeaweedFS từ archive mới. Khớp 27 nhóm và 15 object. API trả 200 cho chủ thể đúng, 404 khi sai shop. [Kết quả](#khôi-phục-postgresql-và-kho-tệp-độc-lập--t075s03s05) | Chờ nghiệm thu backup, quyền và RPO/RTO staging. |
| 22/11/2026 | BE-06 · T016 | Hồi quy P0-06 và P0-07 đạt trên 41 migration | `b236c446` + thay đổi cục bộ | Backend 40/40, workspace 9/9. Firefox qua HTTPS đổi từ phản hồi bị mất sang tra cứu theo intent sau tải lại, với đúng một lần ghi nghiệp vụ, command, audit và outbox. [Kết quả](#kết-quả-kiểm-be-06) | Giữ cập nhật cục bộ. CI theo SHA đợt 1 chờ PR. |
| 22/11/2026 | BE-24 · T078, T081.S01–S02 | Hồi quy gói 41 migration đạt cục bộ | `b236c446` + thay đổi cục bộ | 21/21 nhóm trên cùng gói, 329 gói runtime đối chiếu, 5 object hồi quy khớp. 15 đầu vào chủ dự án còn thiếu. [Kết quả](#hồi-quy-tự-động-trên-gói-41-migration) | Chờ ứng viên sạch, staging, chính sách, UAT và phê duyệt. |
| 22/11/2026 | BE-23 · T075.S03–S05 | Replay và dọn tệp đạt trên bản phục hồi cô lập | `b236c446` + thay đổi cục bộ | Manifest áp lại rút consent và xóa hồ sơ. Tệp chờ trả mã thoát 2, lần tiếp theo đối chiếu object 404 và `files.pending=0`. Backend 40/40, kho tệp 2/2, quyền riêng tư 4/4. [Kết quả](#dọn-tệp-sau-khi-áp-lại-quyền-riêng-tư--t075s03s05) | Giữ bằng chứng cục bộ. Chờ diễn tập trên staging với quyền và chính sách đã duyệt. |
| 22/11/2026 | BE-23 · T075.S03–S05 | Xác minh kho nhận ghi đạt trên bản phục hồi cũ | `b236c446` + thay đổi cục bộ | Xác định warmup, đối chiếu lần ghi hoàn tất muộn, xác nhận ghi mới và kiểm lại 15 object. Backend 40/40, kho tệp 3/3, replay quyền riêng tư đạt trên cùng gói. [Kết quả](#xác-minh-kho-nhận-ghi-sau-phục-hồi--t075s03s05) | Chờ diễn tập theo quyền và RTO staging. |
| 22/11/2026 | BE-23 · T073.S03, T077.S01 | Nối bộ kiểm kho S3 vào workflow backend | `b236c446` + thay đổi cục bộ | Fixture ghim SHA, chờ topology, kho tệp 3/3 trên Linux cô lập. Archive sai SHA bị từ chối trước khởi động. [Kết quả](#kiểm-kho-tệp-trong-ci--t073s03-t077s01) | Chờ GitHub Actions đúng SHA và artifact. |
| 22/11/2026 | BE-23 · T077.S02 | Nối kiểm chạy gói vào bước ứng viên main | `b236c446` + thay đổi cục bộ | Linux áp 41 migration từ gói, kiểm API, worker, web và CSV theo hai shop. Cổng kiểm từ chối SHA nguồn hoặc checksum worker sai. [Kết quả](#chạy-ứng-viên-phát-hành-trước-khi-tải-artifact--t077s02) | Chờ CI đúng SHA và artifact của checkout sạch. |
| 22/11/2026 | BE-24 · T081.S01, BE-23 · T077.S02 | Đối chiếu archive và hồ sơ trên cùng ứng viên | `b236c446` + thay đổi cục bộ | `--verify-candidate` đạt với gói Linux cục bộ, từ chối tám trường hợp sai. Backend 42/42. GitHub main và 15 đầu vào còn mở được kiểm lại. [Kết quả](#đối-chiếu-hồ-sơ-ứng-viên--t077s02-t081s01) | Chờ CI của SHA phát hành và nghiệm thu. |
| 22/11/2026 | BE-23 · T077.S03 | Kiểm nâng 40 lên 41 và quay lui kho tệp | `b236c446` + thay đổi cục bộ | Gói 40 đọc được tệp staging và mất đường đọc sau khi chuyển sang S3. Gói 41 quay lui đọc đúng checksum và worker chuyển được thêm tệp. Tạm dừng chuyển giữ tải và dọn tệp. [Kết quả](#cắt-chuyển-s3-và-quay-lui-trên-schema-41--t077s03) | Chờ digest quay lui và diễn tập staging. |
| 22/11/2026 | BE-23 · T076.S04 | Thêm tín hiệu vận hành cho kho tệp | `b236c446` + thay đổi cục bộ | Cảnh báo chuyển và dọn kiểm độc lập, hoạt động đúng khi tạm dừng. Gói chạy bằng role chỉ đọc. Backend 42/42, kho tệp 4/4 và privacy replay đạt. [Kết quả](#giám-sát-tệp-chờ-chuyển-và-chờ-dọn--t076s04) | Chờ ngưỡng và kênh báo staging. |
| 22/11/2026 | BE-06 · T016, BE-24 · T078 và T081.S01–S02 | Hồi quy gói sau cắt chuyển và giám sát kho tệp đạt cục bộ | `b236c446` + thay đổi cục bộ | 21/21 nhóm, gồm P0-07. Đối chiếu 23 log, 5 object và hồ sơ phụ thuộc Linux của cùng gói 41 migration. [Kết quả](#hồi-quy-sau-thay-đổi-cắt-chuyển-và-giám-sát-kho-tệp) | Giữ cập nhật cục bộ. Chờ cấu hình staging, CI của ứng viên sạch và nghiệm thu. |
| 22/11/2026 | BE-22 · T067.S04, BE-23 · T076.S04 | Tiền kiểm TLS và cảnh báo outbox đạt cục bộ | `b236c446` + thay đổi cục bộ | TLS tắt xác minh bị chặn. Outbox hết 3 lượt thử trả cảnh báo khi độ trễ bằng 0. Backend 42/42, worker/SSE 4/4. [Kết quả](#cảnh-báo-outbox-hết-lượt-thử--t076s04) | Giữ cập nhật cục bộ. Chờ môi trường staging và người trực đã xác nhận. |
| 22/11/2026 | BE-23 · T073.S02 và T077.S02, BE-24 · T081.S01 | Đối chiếu đủ phụ thuộc runtime trên cùng ứng viên | `b236c446` + thay đổi cục bộ | Linux xác nhận 330 gói runtime, chặn cài nhóm dev và hồ sơ thiếu gói bắt buộc. API, worker, web và CSV đạt trên cùng manifest. Backend 43/43. [Kết quả](#đối-chiếu-đủ-phụ-thuộc-runtime-của-ứng-viên) | Giữ cập nhật cục bộ. Chờ CI trên SHA ứng viên, staging và quyết định giấy phép. |
| 22/11/2026 | BE-22 · T067.S04 và T068 | Đồng bộ điều kiện phạm vi cho các tiền kiểm staging | `b236c446` + thay đổi cục bộ | Backend 45/45, OIDC 13/13, gói 41 migration đạt đọc dữ liệu fixture và smoke HTTPS. Cấu hình loopback bị từ chối ở chế độ staging. [Kết quả](#chuẩn-bị-và-điều-kiện-mở-be-22) | Giữ cập nhật cục bộ. Chờ hostname, quyền cấu hình và IdP staging. |
| 22/11/2026 | BE-22 · Bản thử cục bộ | Đã mở giao diện để dùng thử | `b236c446` + thay đổi cục bộ | HTTPS, hai shop, OIDC thử, phân quyền chéo shop, hai SKU, quét và lưu tệp, worker AI mô phỏng đạt. Backend 45/45. [Kết quả](#bản-thử-cục-bộ--be-22) | Giữ bản thử chạy trên máy. Tiếp nhận phản hồi dùng thử. |
| 22/11/2026 | Đợt 1–2 · BE-17, BE-22 | Gộp mã và bản thử cục bộ | [PR #31](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/31) · `main@ca18335f` | 27/27 job trước merge. Sau merge ghi nhận lỗi UI007 và kiểm manifest backend. Đối soát COD trực tiếp đạt 6/6 ca tài chính cục bộ. [Bằng chứng CI](#ci-hợp-nhất-hai-đợt) | Xử lý hai lỗi sau merge qua PR #32. |
| 22/11/2026 | BE-23 · T077.S02, BE-24 · T081.S01 | CI và ứng viên xác minh trên main | [PR #32](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/32) · `main@1054b73f` | 27/27 job trước merge, 27/27 sau merge. Biên nhận ứng viên, checksum và smoke fixture cùng SHA. [Bằng chứng CI](#ci-hợp-nhất-hai-đợt) | Tiếp tục dùng thử BE-22. Nghiệm thu staging, khôi phục, UAT và phát hành theo từng mốc. |
| 23/11/2026 | Đợt bổ sung · 7 chức năng | Hợp nhất nhóm thay đổi ưu tiên | [PR #33](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/33) · `main@5064ed35` | 27/27 job trước merge, 23/27 sau merge. Backend đạt, Firefox ghi nhận hai lỗi frontend. [Bằng chứng CI](#ci-hợp-nhất-đợt-bổ-sung) | Xử lý qua PR #34. |
| 23/11/2026 | FE010, R31, FE014.S04 | Hợp nhất bản sửa frontend | [PR #34](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/34) · `main@5f4bfae8` | 27/27 job trước merge. Sau merge, Firefox ghi nhận ca đồng bộ thanh toán chưa điều hướng đến Tổng quan. [Bằng chứng CI](#ci-hợp-nhất-đợt-bổ-sung) | Xử lý qua PR #35. |
| 23/11/2026 | Kiểm thanh toán liên trang · BE-23 | Xác minh CI và ứng viên sau sửa | [PR #35](https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB/pull/35) · `main@8ac4adc2` | 27/27 job trước và sau merge. Gói backend và biên nhận kiểm fixture cùng SHA. [Bằng chứng CI](#ci-hợp-nhất-đợt-bổ-sung) | Tiếp tục dùng thử cục bộ và theo dõi điều kiện nghiệm thu BE-22. |
| 23/11/2026 | BE-22 · T067–T072 | Kiểm lặp pilot hai shop | `1448fbfc` + thay đổi cục bộ | Hai lượt Firefox qua HTTPS, 73/73 ca tích hợp và 45/45 ca verify. Hai shop đều đạt webhook, tệp WAV, bản chép lời, thông báo và cô lập dữ liệu. [Kết quả](#hồi-quy-bản-thử-hai-shop--be-22) | Giữ thay đổi cục bộ. Chờ môi trường, thiết bị và quyền tích hợp thật. |
| 23/11/2026 | BE-23 · T073–T077 | Đo tải và phục hồi hai shop | `d6d9ede5` + thay đổi cục bộ | Hai lượt tải, 31 nhóm restore khớp, WAL hai mốc và lỗi thiếu segment, 5/5 job và 45/45 verify. [Kết quả](#tải-và-khôi-phục-hai-shop--be-23) | Giữ thay đổi cục bộ. Chờ mục tiêu và nghiệm thu staging. |

## Ma trận truy vết baseline

**Phạm vi thiết kế.** Bảng này gắn mã BE vào đúng danh mục của baseline. Một operation có một việc triển khai chính và có thể phục vụ nhiều màn. Mã việc chính trên một màn là nơi nghiệm thu nghiệp vụ của màn đó. Các tác vụ chưa có API công khai như callback provider, runtime worker, CI, backup và deploy được theo dõi trong các việc BE tương ứng.

- [Dấu vân tay nguồn](#dấu-vân-tay-nguồn) · [Toàn bộ màn hình](#toàn-bộ-màn-hình) · [Toàn bộ tính năng](#toàn-bộ-tính-năng)
- [Toàn bộ thao tác API](#toàn-bộ-thao-tác-api) · [Danh mục quyền](#danh-mục-quyền) · [Danh mục sự kiện](#danh-mục-sự-kiện)

### Dấu vân tay nguồn

Ghim baseline tại commit `e22bb99d6839df9943308556c94499c04e7b7f85`. Khi nguồn đổi, đối chiếu phần thêm, xóa và thay đổi, cập nhật chủ việc, test và dấu vân tay trong cùng PR. Giá trị hash tính từ nội dung tệp theo byte. Có thể đối chiếu bằng `Get-FileHash -Algorithm SHA256` từ root repository.

| Nguồn | Số mục | SHA-256 |
|---|---:|---|
| [openapi.json](../botsales-kit/contracts/openapi.json) | 259 thao tác / 381 schema | `9f59bd830241d011fb83a3ecb6af739a99fddf173c1e386304d9b351f75bdb53` |
| [operation-index.json](../botsales-kit/contracts/operation-index.json) | 259 thao tác | `369c3a08ec3ee76d55c594bc454c1636c08202f2c2a6fad81cf96755c9086909` |
| [route-manifest.json](../botsales-kit/contracts/route-manifest.json) | 67 màn / 16 module | `600f9b92a74aa2c541cd6a1ac97fcfe7bd43246b7803d8444a80360ba1aedfd1` |
| [feature-catalog.json](../botsales-kit/contracts/feature-catalog.json) | 64 tính năng | `0b3f6c8a1fa8739d7ecd53937d40bfe54559c4d8e274e27bb7c4542171b654b0` |
| [permission-catalog.json](../botsales-kit/contracts/permission-catalog.json) | 56 quyền / 7 preset / 4 vai trò AI | `144ff0315d2510e2a0c55df1d3eaa82730bf6b7b678461d548229939d2e29acd` |
| [events.schema.json](../botsales-kit/contracts/events.schema.json) | 32 loại sự kiện phân biệt | `7b67ae36fabe0b22978fbb47e897b635ca4b7518b7599eee486d3a1af23f18fc` |
| [migration-map.json](../botsales-kit/contracts/migration-map.json) | Các mốc tương thích | `7aadcab2a2dfecace76ef92793f2e13521b88d604e5bf12ce051e1568f06248e` |
| [core-acceptance-scenarios.json](../botsales-kit/fixtures/core-acceptance-scenarios.json) | 55 ca màn hình | `b3abc6055884194d8b9e5a0912c3d40420ab6f2e00d7f3d69c03a5d5004be5b8` |
| [acceptance-scenarios.json](../botsales-kit/fixtures/acceptance-scenarios.json) | 69 ca theo tính năng, gồm ca bổ sung cho R61 | `485633643bcb58ef13854561c7d8fe19d0c46098f4b8359985e025a1be1618c4` |

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
| `SC2-C07-CONSENT` | [BE-21](#be-21) | R35, R61 | Challenge đúng shop, khách, kênh, nội dung và hạn. Ghi một lần với cùng khóa và nội dung. Rút quyền chặn phiên bản consent cũ. |


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

# Nguồn dữ liệu mô phỏng frontend

`apps/web/src/mocks/seed.json` là fixture tổng hợp, chỉ dùng để xem xét và nghiệm thu frontend. Không có dữ liệu khách hàng thật, tài khoản thật, token/provider thật hoặc giao dịch thật trong fixture này.

Seed gồm hai shop tách biệt, bảy role preset và dữ liệu catalog, tồn kho, hội thoại, knowledge, đơn nháp cùng một đơn mẫu đã hoàn tất. Các quote, xác nhận, notification, công việc kho, shipment, return, purchase order, goods receipt, finance entry, journal, debt, command và audit liên quan được ghi lại từ luồng simulator trong `tests/domain-scenarios.cjs`; ID của nhóm bản ghi này có tiền tố `seed-` để không trùng ID mà simulator sinh trong lúc chạy. Giá trị, ngày và trạng thái chỉ là ví dụ nhất quán nội bộ cho giao diện.

`resetService()` trong `apps/web/src/mocks/service.ts` nạp lại seed và đưa sequence, role, fault, đăng nhập, idempotency cache về trạng thái ban đầu. Clock của record dùng giờ cố định để kết quả demo và test có thể lặp lại. SSE sequence tăng liên tục trong vòng đời trang để tránh phát lại event ID cũ.

MSW được nạp ở mode `demo`; production mode từ chối `VITE_ENABLE_MOCKS=true` và không khởi động mock worker. Banner trong ứng dụng ghi rõ dữ liệu mô phỏng. Các trang đối soát ngân hàng/COD vẫn có empty state trước khi người xem import CSV mẫu; import không mô phỏng xác nhận với ngân hàng, đơn vị vận chuyển hoặc backend thật.

Nguồn kiểm: canonical `../botsales-kit/contracts/openapi.json`, `route-manifest.json`, `feature-catalog.json`, `permission-catalog.json`, `events.schema.json`, database được reset từ seed và transcript do `npm run test:domain` sinh. Fixture không chứng minh hành vi backend, provider, production, đồng thời thật hay tính đúng đắn nghiệp vụ tài chính.

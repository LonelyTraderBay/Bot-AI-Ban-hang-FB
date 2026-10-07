# 17 — Truy vết yêu cầu → màn hình → kế hoạch → kiểm thử

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Sinh từ feature-catalog.json bằng scripts/generate-reference.py. Đây là liên kết đặc tả, không là bằng chứng đã chạy.

| Yêu cầu | Màn hình | Task | Kịch bản |
|---|---|---|
| A01 — Đăng ký thiết bị nhận thông báo | R40 | T033, T034, T066, T070 | SC2-A01 |
| A02 — Báo đơn đủ điều kiện chuẩn bị | R39 | T031, T033, T036, T072 | SC2-A02 |
| A03 — Mở đơn an toàn từ thông báo | R39 | T034, T061, T070 | SC2-A03 |
| A04 — Xác nhận nhận chuẩn bị | R39 | T031, T036, T070, T080 | SC2-A04 |
| A05 — Nhắc hạn và dự phòng | R40 | T034, T056, T070 | SC2-A05 |
| A06 — Loại thông báo và lịch trực | R40 | T034, T070 | SC2-A06 |
| A07 — Theo dõi gửi/mở/nhận việc | R39 | T033, T034, T070 | SC2-A07 |
| A08 — Chống trùng và bảo vệ thông báo | R40 | T033, T034, T070 | SC2-A08 |
| B01 — Kịch bản tư vấn theo ngành hàng | R06 | T038, T039, T066 | SC2-B01 |
| B02 — Giá/tồn từ dữ liệu nghiệp vụ | R06 | T019, T024, T040, T041, T069 | SC2-B02 |
| B03 — Thu thập và xác nhận đặt hàng | R06 | T021, T024, T025, T026, T029, T041 | SC2-B03 |
| B04 — Tự chốt đơn có điều kiện | R06 | T023, T026, T030, T041, T069, T072 | SC2-B04 |
| B05 — Bán kèm theo chương trình | R06 | T041 | SC2-B05 |
| B06 — Chăm sóc sau mua | R54 | T038, T042 | SC2-B06 |
| B07 — Bot/người thật tiếp quản | R06 | T037, T038, T069 | SC2-B07 |
| B08 — Bình luận/ảnh/tin thoại | R06 | T037, T042, T069 | SC2-B08 |
| C01 — Bảng chuẩn bị hàng | R41 | T029, T031, T036, T061, T066, T080 | SC2-C01 |
| C02 — Phiếu lấy hàng theo SKU | R41 | T032 | SC2-C02 |
| C03 — Kiểm đóng gói | R41 | T032 | SC2-C03 |
| C04 — Phí và vùng giao hàng | R42 | T027, T035 | SC2-C04 |
| C05 — Vận đơn và bàn giao | R42 | T032, T035, T071 | SC2-C05 |
| C06 — Trạng thái giao độc lập | R42 | T025, T035, T036, T062, T071, T072 | SC2-C06 |
| C07 — Đổi/trả từng phần | R43 | T035, T062 | SC2-C07 |
| C08 — Sửa/hủy theo giai đoạn | R43 | T023, T025, T026, T029, T030 | SC2-C08 |
| D01 — Tồn theo trạng thái và SKU | R47 | T013, T020, T022, T047, T066 | SC2-D01 |
| D02 — Nhà cung cấp hàng hóa | R44 | T043, T048 | SC2-D02 |
| D03 — Quy tắc nhập lại | R45 | T022, T043, T044, T048 | SC2-D03 |
| D04 — Nguy cơ hết hàng | R45 | T044, T048 | SC2-D04 |
| D05 — Vòng đời đơn mua | R46 | T045, T046, T048, T071, T080 | SC2-D05 |
| D06 — Tự gửi đơn mua có giới hạn | R46 | T045, T046, T048 | SC2-D06 |
| D07 — Ngăn đặt trùng và vượt vốn | R45 | T044, T045, T046, T048 | SC2-D07 |
| D08 — Nhận và đối chiếu hàng | R47 | T047, T048, T071, T072 | SC2-D08 |
| E01 — Chứng từ và sổ kép | R48 | T013, T028, T030, T047, T054, T066 | SC2-E01 |
| E02 — Giá vốn và lợi nhuận | R48 | T028, T035, T036, T049, T054, T062, T079 | SC2-E02 |
| E03 — Chi phí và phân bổ | R48 | T049, T051, T054 | SC2-E03 |
| E04 — Đối soát ngân hàng | R49 | T027, T050, T054, T071 | SC2-E04 |
| E05 — Đối soát COD | R49 | T027, T051, T054, T071, T072 | SC2-E05 |
| E06 — Công nợ | R50 | T047, T049, T050, T051, T052, T054 | SC2-E06 |
| E07 — Khóa kỳ và điều chỉnh | R50 | T052, T054, T079 | SC2-E07 |
| E08 — Báo cáo và hỏi đáp có nguồn | R22 | T053, T054, T064, T080 | SC2-E08 |
| F01 — Bốn vai trò AI | R51 | T040, T055, T057, T060, T066 | SC2-F01 |
| F02 — Bảng công việc chung | R37 | T031, T056, T060, T072 | SC2-F02 |
| F03 — Giám sát ngoại lệ | R37 | T056, T060 | SC2-F03 |
| F04 — Hàng chờ duyệt | R38 | T045, T055, T060 | SC2-F04 |
| F05 — Ủy quyền | R38 | T015, T041, T055, T057, T060 | SC2-F05 |
| F06 — Bản tin chủ shop | R52 | T056, T060, T080, T084 | SC2-F06 |
| F07 — Trạng thái hệ thống | R37, R52 | T059, T060 | SC2-F07 |
| F08 — Đánh giá chất lượng | R52 | T042, T059, T060 | SC2-F08 |
| G01 — Onboarding vận hành | R33 | T002, T010, T011, T014, T018, T059, T063, T066, T068, T079 | SC2-G01 |
| G02 — Nội dung sản phẩm | R33 | T019, T020, T024, T039 | SC2-G02 |
| G03 — Chính sách phiên bản | R33 | T039, T063 | SC2-G03 |
| G04 — Hồ sơ khách liên kết | R54 | T021, T038 | SC2-G04 |
| G05 — Consent và ngừng liên hệ | R33 | T021, T063, T075, T079 | SC2-G05 |
| G06 — Vòng cải thiện có duyệt | R33 | T039, T042, T063 | SC2-G06 |
| G07 — Thông tin marketing cho chủ shop | R53 | T053, T058, T064 | SC2-G07 |
| G08 — Hiệu quả chiến dịch | R53 | T053, T058 | SC2-G08 |
| H01 — Worker phía máy chủ | R52 | T007, T017, T037, T066, T067, T074, T076, T082 | SC2-H01 |
| H02 — Kill switch | R51 | T057, T076, T083 | SC2-H02 |
| H03 — Chi phí và failover | R51 | T017, T040, T057, T069, T074, T076 | SC2-H03 |
| H04 — Chống trùng và phục hồi | R52 | T009, T016, T017, T023, T028, T030, T036, T037, T046, T050, T062, T065, T072, T076, T083 | SC2-H04 |
| H05 — Quyền xuyên mọi entrypoint | R34 | T004, T008, T009, T011, T013, T014, T015, T018, T055, T061, T064, T065, T068, T073, T078 | SC2-H05 |
| H06 — Audit | R34 | T002, T004, T006, T016, T073, T084 | SC2-H06 |
| H07 — Phòng thử | R34 | T001, T003, T005, T006, T007, T008, T010, T012, T065, T073, T077, T078 | SC2-H07 |
| H08 — Khôi phục và readiness | R52 | T001, T003, T005, T059, T067, T074, T075, T077, T078, T079, T081, T082, T083, T084 | SC2-H08 |

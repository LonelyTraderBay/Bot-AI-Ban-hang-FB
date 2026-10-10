# Đồng bộ readiness của các fixture UI

Revision trước sửa ad103f6765aadf312ac85ef1082823bedec25176. Run 38020914430 chạy hết 406 E2E mỗi browser: Chromium 405 PASS / 1 FAIL, Firefox 404 PASS / 2 FAIL. Verify/audit PASS cả hai; built-demo bị skip do E2E FAIL. Raw log, trace, error-context và digest artifact được giữ ở đây; không nhận run đó là PASS.

Reports: fixture đo geometry trước khi query canonical và SVG ổn định. Hosted ghi chartSvg=null; local ghi chart viewport mất trong chuyển tiếp implicit→canonical, 1 FAIL / 5 PASS. Fixture cuối đăng ký waiter trước navigation, kiểm GET có đủ fromDate/toDate/bucket về 200 và SVG/nhãn đã render trước khi đo. Giữ sáu width, toàn bộ spacing/overflow và HTTP-write assertions. Kiểm lại cả spacing và vùng bấm tải báo cáo: 12/12 PASS.

Knowledge: trace hosted ghi route-loading còn hiện khi assertion heading hết hạn. Fixture cuối chờ đúng API detail/revisions 200 và route-loading kết thúc trước heading, geometry và dialog. Predicate dùng đường dẫn /api/v2/shops/shop-demo/knowledge/k3 chính xác. Lần fixture đầu chỉ dùng suffix và khớp HTML document 304: 6 FAIL / 48 PASS trong suite 54; log đầy đủ và hai trace đại diện của sáu lỗi này được giữ riêng. Sau sửa predicate, hai ca Knowledge chạy ba lượt mỗi browser: 12/12 PASS. Không chấp nhận document 304 thay API 200.

Channels: trace hosted kiểm progressbar khi URL đã đổi nhưng Dashboard cũ còn render bốn loader. Fixture cuối chờ heading Kết nối Facebook của trang đích trước kiểm pending query. Giữ strict mode, delay mock 900ms, HTTP/status/payload, absence của empty state và assertion hết loading sau response. Tất cả 42 lượt Channels trong suite 54 kể trên PASS; sáu FAIL chỉ thuộc Knowledge với predicate đầu. Source Channels giữ nguyên sau 42 lượt này. Mười hai screenshot của empty-state R29/R30 được lưu tại owner UI008 với hash riêng.

## Gate nguồn cuối

| Kiểm tra | Kết quả |
|---|---|
| Reports / Knowledge / Channels theo source cuối | 12 / 12 / 42 PASS, tổng 66 lượt theo từng phạm vi |
| Composition / layout / validator | 41/41, 86/86, 11/11 PASS |
| Full npm run verify | PASS exit 0, gồm lint/typecheck, domain/network, 238 unit test, build và UI gates |
| S17 | 275 fingerprint và ba command/log record khớp; COMPLETE trong phạm vi governance nguồn |
| Playwright discovery | 406/project, 69 file/project; 812 E2E tổng |
| Hosted trên SHA sau push | PENDING_AT_COMMIT |

Các log reports-only và before-api-prefix là snapshot trước edit tiếp theo, không dùng làm gate nguồn cuối. local-validation.json ghi hash raw proof, screenshot, source scope và kết quả đã chạy. Không thay app, hook, mock service, schema, style, ngưỡng spacing, timeout hoặc retry; các bước chờ đều theo API/render readiness thực.

Commit 34: P1 Reports fixture; 35: P1 Knowledge fixture; 36: P1 Channels fixture; 37: P2 trace/log/screenshot, gate/manifest và báo cáo. Xác nhận hosted phải lấy từ run thật trên SHA sau push. Phạm vi Frontend/mock; không tái chứng nhận canonical FE receipts, owner, screen-reader speech hoặc Backend/production.

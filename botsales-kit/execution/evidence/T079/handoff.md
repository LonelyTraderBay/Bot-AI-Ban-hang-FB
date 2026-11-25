# T079 · Dự thảo chính sách vận hành tại Việt Nam

**Bản 0.2 · 25/11/2026 · Đã xác nhận một phần · E02 và G01**

## Phạm vi

Chủ dự án chọn Việt Nam làm căn cứ, xác nhận loại hình **cá nhân kinh doanh** và dùng **VND** làm tiền tệ gốc cho shop dự kiến. Đề xuất dùng `Asia/Ho_Chi_Minh` cho ngày nghiệp vụ. R51 đã kiểm `VN`/`VND`/`Asia/Ho_Chi_Minh` trên shop mẫu và dùng shop `LAK` làm đối chứng. Chủ dự án cho biết chưa tạo shop trong BotSales AI. Hồ sơ áp dụng thật cần mã shop, ngày hiệu lực và cấu hình vận hành được xác nhận. [Đầu vào T079](../../owner-inputs.json) · [Kết quả audit R51](../../../../PROJECT_AUDIT_CLEANUP_PLAN.md#659-căn-cứ-việt-nam-cho-e02-và-g01-ở-r51)

Chính sách này mô tả sổ quản trị của BotSales AI và quy trình xét quyền vận hành theo từng hành động. Quyền ghi sổ trên đích thật và quyền chạy Messenger chờ phê duyệt riêng ở mục 4. Chính sách bao quát E02 và G01. Các tiêu chí E07, G05 và H08 thuộc T079 vẫn theo đầu việc gốc. [Phiếu T079](../../tasks/T079.md) · [Cấu hình live](../../../docs/27_RUNTIME_POLICY.md)

## 1. Căn cứ kế toán tại Việt Nam

| Nội dung | Căn cứ và cách dùng trong hồ sơ |
| --- | --- |
| Đơn vị tiền tệ và chế độ kế toán | Chủ dự án xác nhận dùng đồng Việt Nam (`VND`) cho sổ quản trị của shop dự kiến. Người rà soát kế toán xác nhận chế độ áp dụng cho hoạt động cá nhân kinh doanh. [Luật Kế toán 88/2015/QH13](https://vanban.chinhphu.vn/?docid=183198&pageid=27160) · [Luật sửa đổi 56/2024/QH15](https://vanban.chinhphu.vn/?docid=212484&pageid=27160) · [Nghị định 174/2016/NĐ-CP](https://vanban.chinhphu.vn/?docid=187897&pageid=27160) |
| Loại hình đơn vị | Cá nhân kinh doanh. Dùng hướng dẫn dành cho hộ, cá nhân kinh doanh làm căn cứ rà soát. Doanh thu năm chưa ước tính và chưa có người rà soát. Phương pháp thuế và nhóm sổ chứng từ chờ xác nhận theo hồ sơ thực tế. [Thông tư 152/2025/TT-BTC](https://vanban.chinhphu.vn/?docid=216533&pageid=27160) |
| Thuế và hóa đơn | Người phụ trách kế toán xác nhận phương pháp thuế, đối tượng chịu thuế, giá gồm thuế hay chưa gồm thuế, loại hóa đơn, thời điểm lập và cách điều chỉnh khi hoàn hàng. Với bán hàng hóa, đối chiếu thời điểm chuyển quyền sở hữu hoặc quyền sử dụng và các ngoại lệ theo Điều 9 của nghị định về hóa đơn điện tử. Event giao hàng và ngày tiền COD về được đối soát riêng với thời điểm lập hóa đơn. [Văn bản hợp nhất Luật thuế GTGT](https://vanban.chinhphu.vn/?docid=216941&pageid=27160) · [Luật sửa đổi 09/2026/QH16](https://vanban.chinhphu.vn/?docid=218095&pageid=27160) · [Nghị định 254/2026/NĐ-CP](https://vanban.chinhphu.vn/?docid=218689&pageid=27160) · [Thông tư 91/2026/TT-BTC](https://vanban.chinhphu.vn/?docid=219006&pageid=27160) |
| Lưu hồ sơ | Lập danh mục theo từng loại chứng từ và xác định thời điểm bắt đầu tính hạn. Nếu áp dụng Điều 41 Luật Kế toán, mốc tham chiếu là ít nhất 5 năm đối với tài liệu quản lý thuộc nhóm tương ứng, ít nhất 10 năm đối với hồ sơ trực tiếp ghi sổ và báo cáo thuộc nhóm tương ứng, và lưu vĩnh viễn với nhóm tài liệu luật quy định. Người phụ trách xác nhận phân loại, ngoại lệ và trường hợp đang phải giữ hồ sơ. [Luật Kế toán 88/2015/QH13](https://vanban.chinhphu.vn/?docid=183198&pageid=27160) · [Nghị định 174/2016/NĐ-CP](https://vanban.chinhphu.vn/?docid=187897&pageid=27160) |

## 2. Chính sách kế toán quản trị cho E02

Chủ dự án đã đồng ý ba quy tắc cho đơn giao tận nơi. Giá vốn được tính theo bình quân gia quyền liên hoàn và chốt khi bàn giao cho bên vận chuyển. Doanh thu và giá vốn được ghi khi khách đã nhận hàng và có xác nhận giao thành công.

| Sự kiện | Xử lý trong sổ quản trị | Căn cứ ghi nhận |
| --- | --- | --- |
| Nhập hàng | Dùng bình quân gia quyền liên hoàn, cập nhật số lượng và giá trị tồn sau mỗi lần nhập đã xác nhận. Chỉ chuyển giá trị phần hàng đã bán sang giá vốn. | Phiếu nhập, lượng đã nhận và chứng từ chi phí. Người phụ trách kế toán duyệt các khoản được vốn hóa và cách xử lý chênh lệch chứng từ. |
| Bàn giao vận chuyển | Cố định giá vốn theo dòng giao, chuyển giá trị từ tồn kho sang hàng đang giao. Doanh thu và giá vốn trên báo cáo giữ nguyên tại bước này. | Phiếu bàn giao và phiên bản chính sách hiệu lực. Lô nhập sau giữ nguyên giá vốn đã cố định. |
| Xác nhận đã giao | Với đơn giao tận nơi, ghi doanh thu và giá vốn đúng một lần khi khách đã nhận hàng và có xác nhận giao thành công. Hạch toán phần khách trả trước từ khoản nhận trước và phần COD qua phải thu hãng. | Chứng cứ đối chiếu đúng shop, đơn, vận đơn, dòng hoặc số lượng giao, mốc thời gian và người xác minh. Giao thiếu, giao một phần hoặc có tranh chấp đưa sang đối soát thủ công trước khi ghi. |
| Nhận tiền, hoàn và điều chỉnh | Tiền COD về dùng để đối soát phải thu và phí có chứng từ. Hoàn hàng dùng chứng cứ kiểm hàng, nghĩa vụ hoàn và giá vốn lịch sử. Sửa bút toán đã ghi bằng bút toán đảo hoặc thay thế có dấu vết theo quyền được cấp. | Biên bản đối soát, chứng từ tiền thực nhận hoặc thực trả, lý do điều chỉnh và liên kết tới bút toán gốc. |
| Ngày ghi sổ và khóa kỳ | Dùng ngày nghiệp vụ theo múi giờ đã duyệt. Từ chối ghi vào kỳ khóa, kể cả yêu cầu lùi ngày. Đưa ngoại lệ sang người có quyền xử lý kỳ. Ghim phiên bản chính sách trên bút toán và giao dịch liên quan. | Kỳ mở, quyền ghi sổ và phiên bản phù hợp. Kiểm xuất báo cáo giữ nguyên dữ liệu nguồn. |

Xác nhận của chủ dự án áp dụng cho sổ quản trị của đơn giao tận nơi. Khi có kiểu giao khác hoặc điều khoản chuyển giao khác, ghi quy tắc và chứng cứ tương ứng để chủ dự án và người rà soát kế toán duyệt. Cách làm tròn VND, thuế, hóa đơn, khóa kỳ và lưu chứng từ vẫn chờ rà soát. [Đặc tả tài chính](../../../docs/24_FINANCE.md) · [Ca SC2-E02](../../../fixtures/acceptance-scenarios.json#L578)

## 3. Điều kiện kích hoạt theo hành động

| Hành động | Điều kiện cho phép | Khi thiếu điều kiện hoặc khi phê duyệt hết hiệu lực |
| --- | --- | --- |
| Khai báo shop, lập nháp, xem dữ liệu được cấp quyền | Quyền theo shop và theo thao tác. Người có quyền khai mã quốc gia riêng với tiền gốc và múi giờ. Giao diện hiển thị nhóm thiết lập đang thiếu. | Giữ các thao tác độc lập theo quyền. Mỗi thao tác phụ thuộc bị chặn theo điều kiện của chính nó. |
| E02 · Ghi sổ đơn và giao hàng | Shop, quốc gia, tiền và múi giờ khớp hồ sơ được duyệt. Chính sách ghi nhận còn hiệu lực và đúng phiên bản. Chứng cứ hợp lệ, kỳ mở, quyền ghi sổ hợp lệ. Chạy nghiệm thu trên đích được duyệt trước khi dùng nghiệp vụ thật. | Giữ giao dịch ở trạng thái chờ đối soát hoặc từ chối ghi sổ. Ghi lý do, giữ số sổ và phiên bản đã ghi trước đó, giao cho người có quyền xử lý. |
| G01 · Xuất bản hoặc chạy bot Messenger | Khai rõ quốc gia và các trường áp dụng cho hành động. Phê duyệt staging xác định đúng shop, Page, người gửi thử, quyền Meta, dự án và mô hình AI, vùng xử lý, giới hạn chi phí, hành động được phép và thời hạn. Cấu hình, tri thức, kết quả đánh giá và phiên bản chính sách phải khớp lượt được duyệt. | Chặn gửi hoặc lệnh tự động bị ảnh hưởng. Đưa việc về hàng chờ người xử lý. Phạm vi thử đề xuất chỉ gồm tài khoản thử và dữ liệu tổng hợp trên staging. |
| Vận hành giao hàng và mua hàng | Xác nhận lịch chốt, người phụ trách và dự phòng, vùng giao, COD hoặc trả trước, phí và điều khoản dịch vụ. Đề xuất bàn giao thủ công khi chưa duyệt tích hợp hãng. Mua hàng dùng chế độ `draft_for_approval`. | Giữ thao tác thủ công được cấp quyền. Chỉ kích hoạt kết nối hãng hoặc tự gửi đơn mua khi có quyền và hạn mức tương ứng. |

Phê duyệt hồ sơ chính sách cho phép chuyển sang bước kiểm điều kiện trên đích tương ứng. Quyền thử staging và quyền triển khai production có phạm vi và biên bản riêng. Khi thu hồi quyền hoặc hết hạn, dừng hành động phụ thuộc và chuyển phần đang chờ cho người phụ trách. [Quy tắc runtime](../../../docs/27_RUNTIME_POLICY.md) · [Ca SC2-G01](../../../fixtures/acceptance-scenarios.json#L849)

## 4. Các quyết định cần duyệt

Nội dung dưới đây ghi nhận các câu trả lời của chủ dự án trong trao đổi ngày 25/11/2026.

| Ai quyết định | Đã ghi nhận | Còn cần xác nhận |
| --- | --- | --- |
| **Chủ dự án · hồ sơ shop** | Việt Nam làm căn cứ. Loại hình cá nhân kinh doanh. Tiền tệ gốc là VND. Doanh thu năm chưa ước tính. Chưa tạo shop. | Mã shop, ngày hiệu lực, múi giờ, lịch làm và giờ chốt, người phụ trách và dự phòng, điều khoản và phương án giao. |
| **Chủ dự án · chính sách E02** | Đồng ý bình quân gia quyền liên hoàn, chốt giá vốn tại bàn giao, ghi doanh thu và giá vốn khi khách nhận hàng có xác nhận giao thành công. Phạm vi xác nhận là đơn giao tận nơi trong sổ quản trị. | Người có quyền ghi sổ, quyền xử lý ngoại lệ và khóa hoặc mở lại kỳ. Quy tắc cho kiểu giao khác nếu có. |
| **Người có chuyên môn kế toán và pháp lý khi áp dụng** | Chưa có người rà soát. | Xác nhận chế độ kế toán, chứng cứ chuyển giao, cách làm tròn, thuế, hóa đơn, khóa kỳ, lưu chứng từ và cách xử lý ngoại lệ phù hợp với hồ sơ thực tế. |
| **Chủ dự án và người có quyền cấp staging/provider** | Chưa có môi trường staging được cấp quyền thử Messenger. | Sau khi có môi trường, xác nhận shop và Page thử, người thử, hành động, phạm vi dữ liệu, provider, chi phí, cửa sổ thử và phương án dừng. |

Mỗi quyết định cần người duyệt và căn cứ thẩm quyền, thời điểm duyệt, phạm vi, ngày hiệu lực, phiên bản và SHA-256 của hồ sơ đã duyệt. Thông tin xác thực lưu ở kho bí mật. Sau khi đủ phê duyệt và xác định được shop, chốt bản `docs/OPERATING_POLICIES.md` và cập nhật đúng các đầu vào chính thức trong [sổ đầu vào](../../owner-inputs.json). Ghi nhận xét và kết quả nghiệm thu tại hồ sơ này. [T079.S01–S05](../../tasks/T079.md)

## 5. Bằng chứng và tiêu chí chốt

| Ca | Bằng chứng đã có | Cần bổ sung để chốt |
| --- | --- | --- |
| **E02** | R51 đã kiểm shop VN/VND, chốt giá vốn tại bàn giao, nhập thêm hàng, giao có chứng cứ và gửi lại cùng khóa. Đơn và bút toán giao cùng phiên bản ghi nhận. Orders 24/24 và Finance 15/15. | Trên đúng bản ứng viên, kiểm hồ sơ hợp lệ cho đúng shop và đối chứng khi thiếu, sai phiên bản hoặc hết hiệu lực. Kiểm giữ sổ nguyên vẹn khi kỳ khóa hoặc khi sự kiện giao bị phát lại, kiểm xuất giữ dữ liệu nguồn. Luồng ghi sổ hiện hành dùng phiên bản của shop. Cần chứng minh điểm kiểm ràng buộc phiên bản đó với hồ sơ T079 đã duyệt trước khi cho phép ghi sổ thật. |
| **G01** | R51 đã kiểm khai `VN`, phiên bản cấu hình, shop LAK đối chứng và chặn thử xuất bản khi thiếu quốc gia. Workspace 10/10 và AI 13/13. | Kiểm hồ sơ G01 hoàn chỉnh trên staging được cấp quyền. Xác minh chỉ hành động đúng shop, Page, người gửi, phiên bản, phạm vi và hạn mức được chạy. Khi thiếu hoặc thu hồi một điều kiện, chỉ hành động phụ thuộc bị chặn và luồng độc lập tiếp tục theo quyền. Ghi kết quả các trường hợp cho phép và từ chối từ đúng đích. |

R51 có 62/62 kiểm thử cục bộ. Bản 0.2 cập nhật các xác nhận của chủ dự án dựa trên kết quả đã có. Chưa có kết quả staging. E02 và G01 giữ trạng thái một phần. T079 còn điều kiện đầu vào của S01–S05 và phụ thuộc T078 khi đóng đầu việc. [Nhật ký và bằng chứng R51](../../../../PROJECT_AUDIT_CLEANUP_PLAN.md#64-bằng-chứng-theo-lượt-thực-thi) · [T078](../../tasks/T078.md)

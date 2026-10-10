# Baseline trước sửa VS01

HEAD54 bcdf5414015fe045482278f3f115b53e9e7c4262; source gốc khớp nguyên byte Git. Chromium run38050319695/job114207967205 completed FAIL:406PASS/1VS01FAIL; audit/fullverify/uploadPASS, built-demoSKIPPED. Artifact11670631729 SHA256b7f55aee67d750f0c775d47a4c03904f9855b56105b9a885eebf6b11557839c4 đã kiểm. Firefox còn chạy, kết luận cuối chưa có.

Claim200 rồi refetch assignment/prep/list xảy ra; scan fill2543237.342–2543338.173ms, quantity2543338.770–2543367.498ms; pick không gửi vì button disabled. Last frame scan trống, quantity1. PrepDialog không có logic reset scan; shared EditDialog giữ DialogContent inert khi claim.pending cho tới invalidateQueries hoàn tất. Cần probe giữ refetch pending để kiểm input fill trong vùng inert; chưa thay source.

Chỉ VS01 được xem xét. Giữ VS02 readiness mới, mọi identity/status/stock/prep/pick body assertion và toàn bộ flow khác; không đổi app/mock/API/config/timeout/retry/ngưỡng.

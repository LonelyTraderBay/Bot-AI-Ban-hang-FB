# Kết quả local của CI success-only

Phạm vi: gate của workflow repository; không đổi mã ứng dụng, contract, SDK hoặc tracker UI/full-product.

| Kiểm tra | Kết quả và bằng chứng |
|---|---|
| Regression Node | 48/48 đạt: 41 case gate mới và 7 case vệ sinh repo; `unit.log`, exit 0 |
| Skipped/neutral | Từng producer trong 7 job bị từ chối với hai kết luận này, kể cả khi needs báo success; fixture trong `require-success.test.mjs` |
| API GitHub thực | CLI hiện tại đọc đúng attempt 1 của frontend `39182884694` và hygiene `39182884686`, baseline `a8257726`; `live-api.log`, exit 0 |
| Frontend verify | Exit 0; gồm 252 unit test, source/type/lint/build và các gate layout/visual/composition/evidence; `verify.log` |
| S17 finalizer | 55 command/log record, 50 coverage row, 289 fingerprint; `owner-validator.log`, exit 0 |
| Bảo tồn S17 | Giữ nguyên 52 record và 47 coverage row trước đó; chỉ thay hash workflow frontend, thêm hash root hygiene workflow và hai file gate |

Mỗi log kiểm chứng đầu vào gắn SHA-256 của bốn file CI đang thay đổi. API baseline chứng minh tích hợp của CLI với dữ liệu GitHub thực; không được nhận là hosted CI của commit mới. `skipped/neutral` được kiểm bằng fixture job metadata; hosted skipped-job và merge enforcement, nếu chạy, được báo riêng.

Ba JSON output tự sinh của full verify chỉ đổi `checkedAt`. Bản output thực và hash được giữ ngoài repo, bản tracked được trả về đúng byte trước lượt chạy; không commit churn timestamp.

Không nhận E2E mới hoặc branch protection đã kích hoạt từ các log local này. Hai gate mới phải thực thi trên GitHub và tên/App ID phải được đối chiếu lại khi thêm vào required checks.

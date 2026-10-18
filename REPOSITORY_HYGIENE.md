# Quy tắc giữ repository sạch

## Phạm vi

Repository gồm `botsales-kit`, workspace `BotSalesAI_Frontend` và tooling chung trong `.github`. Mỗi thành phần giữ nguồn chuẩn, generator và bằng chứng của mình. Kiểm tra vệ sinh Git không thay thế test ứng dụng, rà soát bảo mật, nghiệm thu hay bằng chứng Backend/staging/production.

## File cần lưu trong Git

- Source, tests, contract, token, lockfile, cấu hình mẫu và tài liệu thuộc đúng component.
- Đầu ra generator do component yêu cầu phân phối; cập nhật bằng generator sở hữu.
- Ảnh, trace, log và manifest bằng chứng cuối có mục đích và nguồn rõ ràng. Giữ nguyên byte của bằng chứng lịch sử; ảnh trùng nội dung có thể là frame khác thời điểm trong trace.
- Các bản chụp source cục bộ phục vụ so sánh lịch sử khi có phạm vi rõ ràng. Không sao chép toàn bộ hai workspace, dependency và lịch sử evidence để làm một môi trường cài đặt mới bên trong repository.

Dependency, bytecode, cache, build output, Playwright output tạm, giá trị `.env` thật và file phát sinh do chuyển hướng shell không thuộc Git. Chỉ commit `.env.example` hoặc `.env.<môi-trường>.example` chứa giá trị mẫu an toàn. `.gitignore` giúp giảm file thừa; bộ kiểm index vẫn phát hiện khi artifact bị ép stage bằng `git add -f`.

## Output tạm và môi trường tái hiện

- Dựng bản cài đặt sạch hoặc Git worktree tại thư mục tạm ngoài repository; lưu đường dẫn, revision, lệnh và kết quả trong record của task.
- Dùng thư mục `test-results/`, `playwright-report/`, `coverage/` hoặc `dist/` thuộc component cho output tái tạo được. Các thư mục này đã được ignore.
- Khi cần bằng chứng bền vững, chọn artifact cuối cần thiết vào `evidence/` cùng report/manifest. Không ignore toàn bộ `evidence/` để che trạng thái Git.
- Các thư mục `evidence/**/clean-install-r<lần-chạy>/` và file `BotSalesAI_Frontend/0`, `1` được ignore để ngăn lặp lại sự cố đã quan sát. Bản sao workspace đầy đủ ở tên khác vẫn bị bộ kiểm index phát hiện.

## Kiểm tra trước khi giao thay đổi

Chạy tại repository root:

```bash
node --test .github/scripts/check-repository-hygiene.test.mjs
node .github/scripts/check-repository-hygiene.mjs
git diff --cached --check
```

Bộ kiểm đọc đúng Git index, phát hiện cache/dependency/output, file môi trường thật, file shell thừa, workspace lồng nhau và conflict chưa giải quyết. Nó cho phép ảnh/trace và bản chụp source lịch sử có phạm vi. Không đọc hay xuất giá trị secret; nhận diện file môi trường không thay thế công cụ quét secret trong nội dung/lịch sử.

Sau khi commit và trước khi kết luận checkout sạch:

```bash
node .github/scripts/check-repository-hygiene.mjs --require-clean
git status --porcelain=v1 --untracked-files=all
```

Workflow `.github/workflows/repository-hygiene.yml` chạy test và kiểm checkout trên Ubuntu/Windows, chỉ có quyền `contents: read`, action được ghim bằng SHA. Cấu hình required checks/branch protection được quản lý riêng; workflow tồn tại hoặc chạy thành công không tự chứng minh nhánh được bảo vệ.

Evidence lịch sử có đường dẫn dài. Runner Windows bật `core.longpaths` trước checkout; cấu hình global này chỉ tồn tại trên runner dùng cho job. Khi clone mới trên Windows, ghi cấu hình vào repository mới ngay từ lệnh clone:

```bash
git clone -c core.longpaths=true https://github.com/LonelyTraderBay/Bot-AI-Ban-hang-FB.git
```

Với checkout đã tồn tại, `git config --local core.longpaths true` áp dụng cho riêng repository đó.

## Xử lý checkout đã tích tụ thay đổi

1. Ghi HEAD, upstream, index và danh sách staged/unstaged/untracked; đối chiếu nội dung với upstream và lịch sử. Không lấy phiên bản cũ ghi đè lên các bản sửa mới hơn.
2. Bảo tồn file cần giữ ngoài repository, ghi SHA-256 và trạng thái index; giữ một ref khôi phục local cho staged tree. Kiểm containment, reparse point và tiến trình ghi trước khi di chuyển dữ liệu.
3. Kiểm lại hash archive và thử lấy lại source, JSON, ảnh từ bản lưu. Chỉ đưa các đường dẫn đã đối soát về baseline rồi fast-forward khi quan hệ Git cho phép.
4. Giữ phiên bản khác biệt và probe chưa đưa vào sản phẩm trong archive có hướng dẫn khôi phục. Commit phần cần giữ theo nhóm phụ thuộc, ghi chú tiếng Việt; kiểm local và remote SHA sau push. Không push ref/archive khôi phục chứa bản sao cài đặt.

Không xóa ảnh riêng lẻ trong trace, sửa manifest cũ để làm xanh kiểm tra, dùng reset/clean/force-push hoặc viết lại lịch sử để tạo vẻ sạch.

## Đối soát ngày 18/10/2026

Baseline checkout `ec75644d726ab6d20a7a94045748749fe292b6c4` chậm upstream 23 commit. Upstream đã kiểm tra là `91a492970c83b41639249183d1ef1900ff4a80ee` (UIC13); cả workflow Frontend push `39128455222` và PR `39128459038` của SHA này đã success khi đối soát.

| Hạng mục | Đã quan sát / xử lý |
|---|---|
| Trạng thái ban đầu | 22.542 đường dẫn: 10.000 staged, 12.542 untracked |
| Bản sao `clean-install-r2` | 87.860 file, 1.861.781.615 byte trên đĩa, gồm output đã ignore; chuyển nguyên bản ra archive ngoài repository |
| Bảo tồn | SHA-256 kiểm lại đủ 22.471 file hiện có duy nhất trong danh sách thay đổi; staged tree/index và trạng thái gốc được lưu local |
| Thử khôi phục | Source, JSON và ảnh: 3/3 đạt khi đối chiếu Git object với file gốc |
| Mã/test cũ | Đối soát khác biệt xuống dòng và nội dung; dùng bộ source/kiểm thử UIC13 đã có trên upstream, giữ bản local và diff trong archive |
| Bytecode bị tracked | Bỏ theo dõi đúng một file `evidence/frontend-scope-automation-audit-20261004/__pycache__/audit_docs.cpython-312.pyc`; bản trên đĩa và bản khôi phục được giữ |
| Bằng chứng lịch sử | Giữ ảnh/trace và snapshot đã version; manifest lịch sử tiếp tục mô tả trạng thái tại thời điểm được ghi |
| Phòng ngừa | Kiểm index + regression tests + workflow Ubuntu/Windows + ignore rule có phạm vi |

Archive, `manifest.json`, `index-original.bin`, staged recovery ref, diff đối soát, journal di chuyển và hướng dẫn `RESTORE.md` nằm ở thư mục khôi phục local được báo khi bàn giao. Archive không được push vào repository. Việc di chuyển làm gọn checkout; không được báo là giải phóng dung lượng toàn ổ đĩa.

### Kiểm chứng local sau khi đối soát

Node `24.19.0`, npm `11.17.0`, Windows; source ứng dụng giữ đúng UIC13, thay đổi mới thuộc tooling/chính sách repository.

| Kiểm tra | Kết quả |
|---|---|
| Regression cho chính sách Git | 7/7, gồm fixture Git thật và kiểm ignore không che ảnh bằng chứng |
| Workflow YAML/action pins | Parse đạt, khai báo Ubuntu/Windows, action SHA và quyền đọc đúng phạm vi |
| `git fsck --full --no-dangling` | Exit 0 |
| `npm audit --audit-level=low` | 0 lỗ hổng theo dependency đã khóa tại thời điểm chạy |
| `npm run verify` | Exit 0: source/session 15/15; domain/network 117/117; Vitest 26 file, 252/252; typecheck, lint, generator và production build đạt |
| UI source/evidence gates | Layout 86/86, visual-token 6/6, composition 41/41, evidence validator 11/11; scanner không finding; S17 COMPLETE với 43 record, 38 coverage row, 286 fingerprint |
| Quét nội dung có phạm vi | 15.720 file văn bản tracked; 0 mẫu header private key, token GitHub hoặc AWS access-key ID; 0 merge marker ngoài evidence/reference lịch sử |

Lượt verify đầu gặp giới hạn PATH của terminal, trước khi chạy các gate. Lượt tiếp theo dùng PATH giới hạn cho riêng process và hoàn tất exit 0; không đổi PATH máy hay cấu hình ứng dụng. Ba JSON báo cáo tự sinh của lượt verify được giữ cùng log ngoài repository rồi đưa bản tracked về đúng byte UIC13, tránh commit thay đổi timestamp. Kết quả trên không phải một lượt full browser E2E mới; workflow Frontend trên GitHub tiếp tục kiểm browser ở SHA được push.

Workflow vệ sinh đầu tiên tại `bda97f21` đạt Ubuntu nhưng Windows lỗi `Filename too long` trong checkout, chưa chạy test. Log lỗi được giữ; sửa bootstrap Windows bằng `core.longpaths=true` trước checkout, giữ nguyên coverage và evidence lịch sử. Kết quả hosted của bản sửa phải được đối chiếu trên SHA mới.

Fixture Windows dùng đường dẫn tuyệt đối 352–353 ký tự tái hiện được lỗi: `core.longpaths=false` làm clone/checkout exit 128; bật `true` thì exit 0 và hash file khớp. Fixture dùng `* -text` như repository để kiểm byte độc lập với cấu hình xuống dòng của máy.

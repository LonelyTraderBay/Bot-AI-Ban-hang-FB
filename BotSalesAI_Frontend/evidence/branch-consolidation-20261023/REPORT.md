# Hợp nhất về một nhánh phát triển dài hạn — 23/10/2026

## Phạm vi

Người dùng đã duyệt kế hoạch giữ main là nhánh dài hạn duy nhất; nhánh PR chỉ tồn tại trong một công việc. Baseline main: 7851c03102ee2e0a29d550bf42fdb1979cfed651. Tích hợp công việc Tổng quan/UI61 đang có trong checkout; giữ các sửa CI/FE022 mới trên main. Đợt này không thay hợp đồng Backend hoặc ghi nhận nghiệm thu sản phẩm.

## Bảo toàn và đối soát

Bản khôi phục local: C:\Users\Joker-PC\Documents\Codex\Work\Bot-AI-Ban-hang-FB\consolidate-main-20261023-200028\outputs\recovery. Giữ toàn bộ Git metadata/objects/refs, index, stash và đúng byte của 2.013 tệp modified/untracked. SHA-256 manifest: 77438d400d2211ea3756a113031fcfaefb2bbf3736657c6640f428020eaaa057. Kiểm hash khi sao chép; thử khôi phục bốn mẫu source/JSON/ảnh; Git fsck exit 0. Bản khôi phục không được push.

1.912 tệp tracked chỉ đổi CR/LF được đối chiếu nội dung và đưa về đúng byte HEAD; bản gốc cùng journal được giữ trong recovery/ và outputs/newline-restoration-plan.json. Không tệp nào trong nhóm này nằm trong sourceFingerprints hoặc check.log của S17 hiện hành. 24 tệp tracked có thay đổi nội dung và 77 untracked được giữ để review/tích hợp, gồm 5 source/test mới và 72 evidence.

## Đối soát tất cả nhánh trước khi dọn

| Nhánh | SHA đầu nhánh gốc | Xử lý |
|---|---|---|
| codex/ci-success-only-gates-20261019 | 483522700e8e893ccdc0924faf8f2a699dcc7a72 | Lịch sử đã được main bao gồm; xóa sau closing CI |
| codex/overview-ui-consistency-20261019 | 7851c03102ee2e0a29d550bf42fdb1979cfed651 | Tích hợp working tree qua PR rồi xóa nhánh |
| codex/ui-consistency-plan-20261016 | 8ee1c429456b18333905c5d741e9c49a2a259a52 | Lịch sử đã được main bao gồm; xóa sau closing CI |
| codex/uic07-ci-fix | 16cf6cb0384ba5ed80992ffe1371f8f8321372bd | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic07-corrected-sequence | 91a492970c83b41639249183d1ef1900ff4a80ee | Lịch sử đã được main bao gồm; xóa sau closing CI |
| codex/uic07-fe022-request-readiness | dfe9411b37529f9bcfa87171d90df1d8f10f057e | Lịch sử đã được main bao gồm; xóa sau closing CI |
| codex/uic07-fe022-selector-fix | a73ad951de4943f8d15b94425bd56a245c89c055 | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic07-release-sequence | 1e9a5bf3e79b9136eca6598563c9140caccaced6 | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic07-route-state-fix | 62cfa74090bd5a88261c1367bf99c8fef658dfb4 | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic07-sequence | 37b76d0747af15b9969509cb09b5c446ed32f96b | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic07-sequence-final | a73ad951de4943f8d15b94425bd56a245c89c055 | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic08-local | 53b2ec10ba83cee261c868587e6aa6967d693edb | Giữ lịch sử trong recovery, đối soát nội dung trước xóa |
| codex/uic08-overlay-close-gate | cd1e35fee113773f3a360dd689749153ad6e1e27 | Lịch sử đã được main bao gồm; xóa sau closing CI |
| main | 7851c03102ee2e0a29d550bf42fdb1979cfed651 | Giữ main |

Ở ci-fix/sequence/uic08-local, các tệp code/config/test mà nhánh sửa đã giống main khi bỏ qua CR cuối dòng. Release-sequence giữ cùng code ứng dụng/config và phần lớn test; các khác biệt còn lại là FE022 cũ, tài liệu trạng thái lịch sử và generatedAt. Hai nhánh selector-fix/sequence-final cùng trỏ a73ad951; main đã giữ sửa selector cùng các bước chờ/kiểm phản hồi mới hơn. Route-state-fix chỉ có delta evidence. Không dùng merge chiến lược ours hoặc bản test cũ để thay các sửa mới.

Stash cũ được giữ cả local và recovery: chỉ có generated evidence và log xác minh lịch sử, không có source ứng dụng cần áp lại. Metadata của 11 worktree không còn đường dẫn được sao lưu trước khi prune.

Bảy log attempt/negative và bảy exit receipt có whitespace nguyên bản của test runner được giữ đúng byte trong [historical-attempts.zip](historical-attempts.zip); [manifest](historical-attempts.json) ghi đường dẫn gốc, entry và SHA-256 của từng tệp. Đã mở lại archive và kiểm đủ 14 hash. RESULT.json lịch sử vẫn giữ tên/hash tại thời điểm ghi; giải nén các entry ra thư mục khôi phục riêng để đối chiếu các đường dẫn đó. Không trim log, đổi kết quả thất bại hoặc nới kiểm tra whitespace. Các log này không nằm trong check.log của S17 hiện hành; bản raw cũng còn ngoài repo trong workspace tác vụ.

## Kiểm chứng và giới hạn

CI đầu tiên của PR #5 trên beec91cf chặn tại npm audit: Vite 7.3.6 có advisory nên verify/gate frontend FAIL và E2E SKIPPED. Hygiene push/PR vẫn đạt cả Ubuntu và Windows. Lượt đó không được tính là CI bàn giao. Cập nhật duy nhất Vite lên bản vá 7.3.7 bằng npm install --save-dev --save-exact; lockfile chỉ đổi version/resolved/integrity của Vite, không dùng audit fix --force hoặc thay ngưỡng. [Release chính thức](https://github.com/vitejs/vite/releases/tag/v7.3.7), [advisory](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22). STACK_LOCK được đồng bộ.

Audit sau bản vá báo 0 lỗ hổng; production build, 256 Vitest và full npm run verify đều đạt với log có hash package.json/package-lock.json và phiên bản Vite đã cài. [Owning refresh](refresh-vite-evidence.mjs) xác minh đúng các input/log đó trước cập nhật fingerprint dependency và thêm record S17; giữ nguyên mọi fingerprint không liên quan và các record lịch sử. S17 sau finalize có 67 check, 62 coverage row và 301 fingerprint hợp lệ. [CI thất bại ban đầu](initial-ci-failure.json), [audit trước vá](vite-audit-before.log), [audit sau vá](vite-audit.log) và [full verify](vite-verify.log) được giữ riêng. Browser được kiểm lại sau vá; kết quả cuối/CI closing theo SHA được giữ trong outputs tác vụ. Các số và artifact của lượt trước dưới đây là checkpoint trước vá dependency.

Kiểm trước khi mở PR: repository regression 48/48, npm run verify exit 0 (256 Vitest, 117 domain/network, source/type/lint/build và các gate UI/evidence), build demo exit 0; S17 có 63 command/log, 58 coverage row và 299 fingerprint hợp lệ. Built-demo đạt 6/6 Chromium/Firefox, gồm 244 lượt mở route tại hai viewport; artifact 38 file có SHA-256 9dc7f945abce181dfa8151d5151d03a7135488a07a551eebfde1d24d9c52f7d5. [Record và hash log](local-checks.json) giữ kết quả local; bộ browser source được giữ riêng trong workspace tác vụ.

Chỉ xóa nhánh sau khi PR được merge theo các required checks hiện có và closing CI trên SHA main mới hoàn tất. Kết quả browser, SHA cuối, PR, CI run, hash artifact và journal dọn nhánh được ghi trong outputs của workspace tác vụ; không dùng kết quả lịch sử làm CI của bản mới. Bảo vệ main đã được đọc lại qua API: strict, 9 checks/App ID 15368, 0 approval, enforce admins, chặn force-push/xóa main; không thay cấu hình bảo vệ trong đợt hợp nhất.

Giữ các giới hạn đã ghi của UI61: local Frontend/MSW không chứng minh Backend/provider/production, screen reader, mobile vật lý hoặc owner acceptance. Trạng thái UI và task vẫn thuộc kế hoạch canonical; báo cáo Git này không tạo ledger UI thứ hai.

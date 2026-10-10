import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const output = import.meta.dirname;
const repository = path.resolve(output, '../../..');
const read = file => fs.readFileSync(path.join(output, file), 'utf8');
const verify = read('verify-final.log');
assert.match(verify, /ui-evidence PASS: S17/);
assert.match(verify, /Tests\s+238 passed \(238\)/);
assert.match(verify, /"passed":117/);
assert.match(read('closed-period-regression-final.log'), /\b6 passed \(/);
assert.match(read('built-demo.log'), /\b6 passed \(/);
const history = JSON.parse(fs.readFileSync(path.join(repository, '.git/codex-delivery/commits.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(repository, '.git/codex-delivery/plan.json'), 'utf8'));
const status = JSON.parse(read('fe-status.json'));
const proofFiles = ['verify-final.log', 'domain-produced-final.json', 'closed-period-regression-final.log', 'built-demo.log', 'layout.log', 'composition.log', 'validator-fixtures.log', 'contracts-attempt-02.log', 'kit-validation.log', 'tracker-tests.log', 'workflow-regression.log', 'workflow-structure.log', 'fe-status.json'];
const hashes = Object.fromEntries(proofFiles.map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex')]));
fs.writeFileSync(path.join(output, 'local-proof-hashes.json'), JSON.stringify(hashes, null, 2) + '\n');
const rows = plan.map((row, index) => {
    const commit = history.find(item => item.id === row.id);
    return `| ${index + 1} | ${commit?.sha.slice(0, 8) ?? 'Commit chứa báo cáo này'} | ${row.title} | ${commit?.files ?? row.files.length} |`;
});
const report = `# Bàn giao local trước push — 10/10/2026

Nguồn: repository Bot-AI-Ban-hang-FB, nhánh main, baseline remote 53c0ba8f413b1f1e0fa16a747ed27f728b861dd6. Người dùng yêu cầu commit toàn bộ thay đổi thành các nhóm nhỏ theo thứ tự, ghi chú tiếng Việt và kiểm tra GitHub đầy đủ.

## Kết quả kiểm tra local

| Kiểm tra | Kết quả |
|---|---|
| npm audit --audit-level=low | 0 lỗ hổng |
| npm run verify | Exit 0; generator 15 outputs / 346 schemas / 245 operations / 61 routes; lint/typecheck/build/source/boundaries PASS |
| Domain / network và unit | 117 kiểm tra domain/network; 238 unit test PASS |
| Layout / composition / evidence | 86 layout fixtures; 41 composition/shared fixtures; 11 validator fixtures; 275 source fingerprints PASS |
| Contract / kit / tracker | JSON/YAML tương đương, 346 schema; 532/532 kit checks; 26/26 tracker tests PASS |
| Khóa kỳ kế toán | 6/6; chạy lặp ba lần ở từng browser Chromium và Firefox |
| Built demo | 6/6; 61 route × hai viewport × hai browser, không page error hoặc shell overflow trong các case này |
| Full browser suite local | Attempt 01 phát hiện 696 test; dừng sau lỗi fixture để sửa; không ghi attempt này là PASS |
| Full browser suite hosted | PENDING_AT_COMMIT: workflow sẽ chạy lại toàn bộ trên checkout GitHub sạch; trạng thái cuối đối chiếu theo đúng SHA sau push |

Log thật và SHA-256 nằm trong [local-proof-hashes.json](local-proof-hashes.json). Báo cáo này được chuẩn bị trước push; hosted CI được báo theo run thực ở kết quả bàn giao sau push, không điền PASS từ local hoặc cấu hình.

## Nguyên nhân và thay đổi cần cho bàn giao

- Actions trước đó (run 37589718906, job 112688038980) thiếu executable Chromium khi verify chạy browser audit. Workflow hiện cài cả hai browser trước verify, chạy mọi push/PR, thêm hồi quy built-demo và giữ artifact test-results của cả hai suite. Timeout job 75 phút bao phủ suite mở rộng và bản build; timeout/assertion nghiệp vụ vẫn có giới hạn.
- Hash evidence/source phụ thuộc byte thực. Git attributes giữ nguyên LF/CRLF khi stage/checkout; whitespace check vẫn phát hiện khoảng trắng cuối dòng và dòng trống cuối file, đồng thời nhận CR của CRLF hợp lệ.
- Fixture FE015 gửi opening-balances trước khi đổi dataset hoàn tất, gây 409. Test chờ feedback hoàn tất reset. Lần lặp Firefox còn thao tác trước khi React render; fixture chờ navigation sẵn sàng bằng action wait có giới hạn, giữ nguyên assertion nghiệp vụ. Các lần thất bại và trace được bảo toàn cạnh log cuối.
- Bản ghi frontend-progress.json.91084.tmp từ lượt ghi dở được giữ nguyên byte ở recovery/ cùng provenance; không dùng thay ledger canonical.

## Thứ tự commit

Mỗi nhóm có subject/body tiếng Việt, Conventional Commit, P0/P1/P2 và Signed-off-by. Commit được giữ riêng theo owner và dependency, không gom toàn repository thành một commit.

| Thứ tự | SHA | Nội dung | Số tệp |
|---|---|---|---|
${rows.join('\n')}

SHA của commit chứa chính báo cáo này và SHA remote cuối được đối chiếu từ Git sau commit/push; không ghi SHA tự tham chiếu vào nội dung đã hash.

## Giới hạn đúng phạm vi

Frontend và API mock tổng hợp; không xác minh Backend/provider/production, screen-reader speech hoặc user acceptance. Branch main hiện chưa bật branch protection theo API đã đọc; workflow PASS không tự tạo required-check enforcement.

FE CLI tại snapshot báo ${status.verifiedSteps}/${status.totalSteps} checkpoint hiệu lực, ${status.stale.length} task STALE, ${status.blocked.length} task BLOCKED. Receipt lịch sử giữ nguyên; báo cáo sinh phản ánh trạng thái hiệu lực, không tự tái chứng nhận checkpoint từ một lượt verify. Các số liệu density 624/181/140 trong hồ sơ trước thuộc snapshot lịch sử đó.
`;
fs.writeFileSync(path.join(output, 'REPORT.md'), report);
console.log(JSON.stringify({ report: 'BotSalesAI_Frontend/evidence/github-delivery-20261010/REPORT.md', commitGroups: plan.length, recordedCommits: history.length, proofFiles: proofFiles.length }));

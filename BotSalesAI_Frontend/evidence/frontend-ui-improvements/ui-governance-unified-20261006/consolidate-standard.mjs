// One-off documentation consolidation; not a permanent product gate.
import fs from 'node:fs';
const path = 'docs/FRONTEND_SPACING_STANDARD.md';
let text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
function replaceOnce(before, after) {
  if (text.split(before).length !== 2) throw new Error(`Expected one occurrence: ${before}`);
  text = text.replace(before, after);
}
function section(start, next, body) {
  const a = text.indexOf(start), b = text.indexOf(next, a);
  if (a < 0 || b < a) throw new Error(`Section missing: ${start}`);
  text = text.slice(0, a) + body.trimEnd() + '\n\n' + text.slice(b);
}
section('## 12. Checklist cho AI sửa UI', '## 13. Quy trình', `## 12. Đường vào thực hiện cho AI sửa UI

Thực hiện [workflow duy nhất §0](#unified-workflow), dùng catalog CURRENT/TARGET và plan §16. Phần này không có checklist rút gọn cạnh tranh. Quy tắc chi tiết giữ SPC IDs bên dưới; fields bằng chứng tại §13.2. Task nhỏ ghi ngắn trong artifact hiện có; shared change mở đủ consumer/route/slot/state impact. Không sửa generated plan/full-product ledger để đóng việc.`);
section('### 13.1. Quy trình ngắn', '### 13.3. Mẫu đối chiếu', `### 13.1. Quy trình cho mỗi lần thêm hoặc sửa UI

Áp dụng nguyên [workflow §0](#unified-workflow): intake → inventory → intent/contract → baseline → reproduction → owner/consumer edit → source checks → rendered behavior → reconciliation/handoff. Không có workflow thứ hai trong catalog/AGENTS/plan. Các task hiện hành của plan §16 dùng đúng đường này, với depth theo impact.

### 13.2. Fields bằng chứng của chính task

Đây là fields của artifact, không một workflow hoặc tracker mới. Có thể dùng Markdown/JSON hiện có; task nhỏ không phải dựng schema engine. Validator planned S17 kiểm completeness/provenance, không chứng minh nội dung log đúng.

| Nhóm fields | Nội dung cần ghi | Nguồn acceptance |
|---|---|---|
| Identity/scope | Task/step, mode, cwd/revision, dirty work, file treatments/import closure, exclusions/reasons, user request | §0/SPC-064/066/074 |
| Intent/contract | Role/job/outcome, route/operation/local owner, actions/state/keyboard/feedback, assumptions/gaps, N/A reasons | SPC-047/052/054/058/059 |
| Design/owner | Route +slot +state +profile/reference, hierarchy, edge/gap/distribution/wrap, token/unit/geometry, existing/target finite API | SPC-014/035/041/048/060/067–069 |
| Baseline | Before time/hash/seed/browser/viewport/state/artifact; checker version/options; baseline missing label retained | SPC-044/045/049/070 |
| Impact | Every affected file/consumer/route, state/variant cases, portal/fallback/native/style entries, exact expectations | SPC-038/057/066/071 |
| Change/reproduction | Trigger/root cause/invariant, chosen minimal approach, negative +positive +UNKNOWN fixtures, backward behavior | SPC-055/065/072/073 |
| Results | Actual commands/cwd/exit/hash/artifacts; expected/observed; source scan counts vsinventory; reflow/text/zoom/focus/hit methods | SPC-029–031/039/051/056/063/071 |
| Closure | UI/ARCH verdict separate, findings/limits/open proof, final file/route/branch reconciliation, catalog/docs matching | §0.4/SPC-032/040/074/075 |

Acceptance chỉ bốn verdict tại §0.4. Missing mandatory data/checks không PASS hoặc DONE; delivery with limits không thay paired/native/behavior proof. Giữ nguyên failed run và retest riêng; không đổi thresholds/suppress để đóng.`);
replaceOnce('W26–W27 phải bổ sung checker nguồn kiểu AST/style-aware', 'Checker AST/style-aware hiện có phải gia cố coverage theo plan §16 cho');
replaceOnce('Trong khi checker chưa có, mọi task UI phải review source diff đối chiếu theme/token, ghi `VISUAL_SOURCE_REVIEW` cùng file/property/verdict; không thêm raw visual literal mới, và không ghi checker PASS.', 'Mọi task UI vẫn review source diff đối chiếu theme/token, ghi `VISUAL_SOURCE_REVIEW` cùng file/property/verdict cho phần chưa được gate chứng minh. Review không thay strict FAIL/UNKNOWN; không thêm raw visual literal mới hoặc gọi phần chưa kiểm là checker PASS.');
replaceOnce('vẫn phải tuân SPC-033–063', 'vẫn phải tuân SPC-001–075');
replaceOnce('Khi strict toàn app còn đỏ vì migration đã biết, verdict task vẫn phải chứng minh **0 finding phát sinh trong diff** và nêu riêng nợ cũ còn lại; không gọi toàn cục PASS.', 'HISTORICAL_SNAPSHOT: trong migration Wxx trước W26, task từng ghi **0 finding phát sinh trong diff** cùng global debt FAIL. Allowance này đã hết ở workflow hiện hành; không dùng lịch sử để đóng source task mới khi strict toàn scope FAIL.');
replaceOnce('composition không nhận spread.', 'Composition public API không nhận opaque spread. RHF/native field spreads có name/value/ref/event/validation được giữ khi type/source chứng minh nội dung; style hoặc nguồn chưa resolve không được coi hợp lệ.');
replaceOnce('Geometry chỉ gồm key/đơn vị/responsive branch hợp lệ', 'ReactNode children/actions/extra/render và nested MUI slots được kiểm tại source tạo nội dung, không miễn vì wrapper đã đóng props. Geometry chỉ gồm key/đơn vị/responsive branch hợp lệ');
replaceOnce('Profile form/table/detail/dashboard/queue/auth/dialog có invariants riêng.', 'Profile form/table/detail/dashboard/queue/auth/dialog có invariants riêng theo slot/state; một route có thể chứa nhiều profile và portal. Contract phân biệt CSS gap tối thiểu với distributed whitespace từ space-between/wrap/align và content-driven height; không ép mọi edge distance bằng CSS gap.');
replaceOnce('Trước đóng: zero unauthorized findings', 'Trước đóng: reconciliation từng file gồm EDIT/KEEP/GENERATE/ASSET/TOOLING/REFERENCE/THIRD_PARTY/RETIRED với lý do và proof áp dụng; zero unauthorized findings');
fs.writeFileSync(path, text, 'utf8');
process.stdout.write(JSON.stringify({path, rules: [...text.matchAll(/^\*\*SPC-(\d{3}) —/gm)].length, workflow: 'unified-workflow', runtimeChanged: false}) + '\n');

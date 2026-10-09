import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const output = import.meta.dirname, frontend = path.resolve(output, '../..'), repository = path.dirname(frontend);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert = (value, message) => {if (!value) throw new Error(message);};
for (const [stage, pattern] of [['e2e', /\b600 passed \(/], ['regression', /\b20 passed \(/], ['unit', /Tests\s+175 passed \(175\)/], ['built-demo', /\b6 passed \(/], ['verify', /"passed":88/]]) {
    const record = read(path.join(repository, read(path.join(output, stage + '-latest.json')).record));
    assert(!record.exitCode && !record.sourceDrift.length && hash(path.join(repository, record.log.path)) === record.log.sha256, 'Incomplete run: ' + stage);
    for (const [file, digest] of Object.entries(record.sourceFingerprints)) assert(hash(path.join(repository, file)) === digest, 'Stale run source: ' + stage + ':' + file);
    assert(pattern.test(fs.readFileSync(path.join(repository, record.log.path), 'utf8')), 'Required complete result missing: ' + stage);
}
const status = JSON.parse(execFileSync(process.execPath, ['scripts/progress.mjs', 'status'], {cwd: path.join(repository, 'botsales-kit'), encoding: 'utf8'}));
assert(status.verifiedSteps === 140 && status.totalSteps === 140 && !status.stale.length && !status.blocked.length, 'Revalidate canonical FE before claiming current completion');
const uat = read(path.join(output, 'uat-matrix-width-20261008.json'));
assert(uat.summary.fullBrowserCases === 600 && uat.ownerAcceptance === 'PENDING', 'Current actual handoff required');
const finalBrowser = read(path.join(repository, read(path.join(output, 'e2e-latest.json')).record));
const finalSourceHash = crypto.createHash('sha256').update(Object.entries(finalBrowser.sourceFingerprints).map(([file, digest]) => file + ':' + digest).sort().join('\n')).digest('hex');
const report = `# Sửa tận gốc WIDTH.W01–W04 — 08/10/2026

**READY_FOR_ACCEPTANCE_LOCAL_SCOPE.** Bốn finding và mọi lỗi cùng pattern đã xác nhận trong scope được sửa tại owner, đã kiểm lại trên source cuối. Thứ tự/trạng thái duy nhất ở [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status).

## Nguyên nhân và sửa theo ưu tiên

| Ưu tiên | Finding | Sửa tại owner |
|---|---|---|
| P1 | W01: collection một thẻ bị cố định hai track | AI/Workspaces chọn số cột theo dữ liệu0/1/2+; Empty có một CTA; giữ các grid phân vai và pane có chức năng riêng. |
| P2 | W02: full Panel chứa form bị cap760/850 | Gỡ cap Imports/Shop/Shipping; FieldGroup responsive giữ trường liên quan theo cặp, cùng DOM order và hành vi form. |
| P2 | W03: notice chung auto-place trong một ô grid | PageSections giữ grid và notice thành siblings; section gap24 thuộc parent. |
| P2 | W04: DetailLine Fragment trả hai children, parent gap cộng quanh divider | Một Box bao row+divider, không thêm inset; caption/value wrap; gap chỉ giữa logical rows. |

Đã rà15 SectionGrid placements và98 DetailLine calls trong13 module, toàn bộ16 modules/54 routes. [Contract trước sửa](CONTRACT.md), [baseline](baseline.json), [quyết định cho vị trí tương tự](ANALOGOUS_PATTERNS.md). Không đổi API/schema canonical, dependency hoặc token scale.

## Kiểm chứng thực tế

| Kiểm tra | Kết quả quan sát |
|---|---|
| Before/after | Browser10 failures kỳ vọng và unit atomic1 failure trên snapshot trước; source pairing84 inputs. WIDTH sau sửa20/20 cả Chromium/Firefox. |
| Full E2E | Một lần chạy đầy đủ600/600,300 mỗi engine; không ghép targeted retest. |
| Unit/verify | 175/175 unit;75 simulator+13 network; lint/typecheck/source/boundary/generator/production build và toàn bộ verify đạt. |
| UI gates | Contract39/39; layout82/82, scan79 files0 findings1 declared exception; evidence fixtures11/11; source maps16/16. |
| Built demo | 6/6 artifact cases;216 route observations ở320/1920 và50 geometry/axe/keyboard cases ở320/768/1279/1280/1920. |
| Native | 47/47 actual native scenarios:14 WIDTH+33 inherited; browser zoom200% và Firefox text-only200% riêng, không dùng viewport emulation làm bằng chứng native. |
| Cài sạch/build | 10/10 stages trong workspace cách ly; actual npm ci, cùng lock, production không chứa MSW, demo có worker; build lặp lại byte-identical. |
| FE tracker | Canonical CLI140/140,0 stale/blocked sau dependency revalidation; mẫu số giữ140. Đây là checkpoint freshness, không phải tỷ lệ code đã viết. |

Tại1920: thẻ AI phủ1632px thay cho804px; Devices notice1632px, gap24px. Forms phủ vùng inset Panel; capability group có7 logical children thay cho14. [Dữ liệu compiled](built-width-review.json), [UAT matrix](uat-matrix-width-20261008.json), [gate matrix](quality-gate-matrix-width-20261008.json). Source/log/artifact hashes trong các execution records và S19 manifest.

## Lịch sử lỗi được giữ

Lần full đầu bị dừng sau khi test Finance dùng selector DOM trước W04 thất bại; raw log/exit/context giữ trong [record](runs/width-1791470510326-91776/e2e-record.json) và [giải thích](full-attempt-01-interruption.json). Test mới đo wrapper atomic không inset và inner row12px, vẫn giữ header gap16px, body inset16/24px và đúng một divider. Finance2/2 đạt, sau đó chạy lại toàn bộ600 ca độc lập. Các attempt native/built-review lỗi transport, hidden input hoặc beforeUnload prompt cũng giữ nguyên; sửa harness không bỏ invariant sản phẩm.

Hai wrapper browser có snapshot windows trùng nhau khi chốt lượt đầu; [timing audit](historical-overlap-publication/timing-audit.json) giữ timestamp và sửa lời mô tả publication quá sớm. Gate built-demo được chạy lại riêng sau khi full wrapper đã đóng; [kiểm bảo toàn theo từng path](browser-preservation-current.json) và publication mới được ghi sau lượt riêng này. Không thay source/assertion hoặc cộng kết quả giữa hai lượt.

Lượt cập nhật ledger đầu dừng tại FE010.S03 do Windows EPERM khi atomic rename; [record lỗi](canonical-revalidation-r1-failed.json) và raw log giữ nguyên. File không read-only và không quan sát được process Node thứ hai ghi ledger; chưa xác định process giữ khóa. Driver chỉ thử lại tối đa3 lần cho đúng lỗi rename này khi hash ledger trước/sau không đổi, vẫn gọi canonical CLI và giữ mọi exit code. Checkpoint/source/log phải qua validator trước mỗi lần ghi; không sửa ledger bằng tay.

## Bàn giao và giới hạn

[Ca nghiệm thu](ACCEPTANCE_GUIDE.md), demo http://127.0.0.1:4173. Git HEAD baseline53c0ba8f413b1f1e0fa16a747ed27f728b861dd6; giữ staged/dirty work, không reset/clean hoặc xóa evidence lịch sử. Full-product ledger/Universal/workflow được kiểm bảo toàn; các view và FE receipts sinh bằng owner canonical.

Source cuối: SHA-256 ${finalSourceHash} của ${Object.keys(finalBrowser.sourceFingerprints).length} runtime/test/tool inputs trong full E2E; Git HEAD riêng không đại diện các thay đổi đang nằm trong working tree. [Ảnh demo hiện tại](R30-handoff-current-1920.png) và [record preview](handoff-demo-current.json) đối chiếu đúng HTML build được phục vụ ở4173.

Phạm vi React/TypeScript+HTTP MSW tổng hợp trên Windows local. Backend/provider/staging/production hosting ngoài scope; screen-reader speech, broad human conformance, hosted CI và quyết định nghiệm thu người dùng chưa ghi PASS. Cold workspaces được giữ với đường dẫn trong manifest. Regression bảo vệ invariant đã đo, không bảo đảm mọi lỗi UI tương lai đều bị loại bỏ.
`;
function write(relative, text) {
    const file = path.join(frontend, relative), archive = path.join(output, 'before-final-docs', relative);
    if (!fs.existsSync(archive)) {fs.mkdirSync(path.dirname(archive), {recursive: true}); fs.copyFileSync(file, archive);}
    fs.writeFileSync(file, text.trimEnd() + '\n');
}
write('evidence/frontend-width-fixes-20261008/REPORT.md', report);
for (const relative of ['README.md', 'docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md', 'evidence/REPORT.md']) {
    const file = path.join(frontend, relative), text = fs.readFileSync(file, 'utf8');
    const prefix = relative === 'README.md' ? 'evidence/' : relative === 'evidence/REPORT.md' ? '' : '../evidence/';
    const block = `<!-- CORRECTIONS_CURRENT -->
## Kết quả hiện hành — WIDTH.W01–W04 sau A01–A07

[Báo cáo/gates](${prefix}frontend-width-fixes-20261008/REPORT.md) và [ca nghiệm thu](${prefix}frontend-width-fixes-20261008/ACCEPTANCE_GUIDE.md): READY_FOR_ACCEPTANCE_LOCAL_SCOPE. Full E2E600/600,175 unit,39 contracts,6 built-demo,216 route observations/50 focused cases và47 native scenarios đạt trên source cuối. FE canonical140/140,0 stale/blocked lúc tái xác minh; đọc CLI cho freshness hiện tại, giữ mẫu số140. Thứ tự/trạng thái chỉ ở UI plan §16.6. Số580/174/33 của A01–A07 và các số cũ bên dưới là HISTORICAL_SNAPSHOT.

Scope: Frontend+mock API tổng hợp local; screen-reader speech/broad human conformance/hosted CI NOT_RUN, nghiệm thu người dùng PENDING, Backend/provider/staging/production ngoài scope.
<!-- END_CORRECTIONS_CURRENT -->`;
    assert(text.includes('<!-- CORRECTIONS_CURRENT -->') && text.includes('<!-- END_CORRECTIONS_CURRENT -->'), 'Missing current block: ' + relative);
    write(relative, text.replace(/<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->/, block));
}
const relative = 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md';
let plan = fs.readFileSync(path.join(frontend, relative), 'utf8');
plan = plan.replace(/^\*\*CURRENT PHASE[^\n]*$/m, '**CURRENT PHASE — READY_FOR_ACCEPTANCE_LOCAL_SCOPE WIDTH.W01–W04 (08/10/2026):** sửa tại owner theo finding thực tế, full600/600 và required gates đạt; [report](../evidence/frontend-width-fixes-20261008/REPORT.md), [ca nghiệm thu](../evidence/frontend-width-fixes-20261008/ACCEPTANCE_GUIDE.md). Thứ tự/trạng thái duy nhất ở §16.6; speech/hosted CI/Backend/owner acceptance giữ giới hạn riêng.');
const start = plan.indexOf('### 16.6.'), end = plan.indexOf('### 16.7.');
assert(start > 0 && end > start, 'Missing live plan section');
let live = plan.slice(start, end);
live = live.replace('WIDTH.W01–W04: IN_PROGRESS.', 'WIDTH.W01–W04: READY_FOR_ACCEPTANCE_LOCAL_SCOPE.').replaceAll('FIXED_REGRESSION_PASS_FINAL_GATES_PENDING', 'COMPLETE_REGRESSION_ON_FINAL_SOURCE');
live = live.replace(/(\| 5 — P0 chốt \|[^\n]*\|) TODO (\|)/, '$1 READY_FOR_ACCEPTANCE_LOCAL_SCOPE $2');
live = live.replace('**08/10/2026 — xử lý A01–A07', '**HISTORICAL_SNAPSHOT — 08/10/2026 — xử lý A01–A07');
live = live.split('\n').map(line => {
    if (/^\| S\d\d \|/.test(line)) {
        line = line.replaceAll('frontend-component-fixes-20261008/REPORT.md', 'frontend-width-fixes-20261008/REPORT.md').replaceAll('frontend-component-fixes-20261008/ACCEPTANCE_GUIDE.md', 'frontend-width-fixes-20261008/ACCEPTANCE_GUIDE.md');
        if (line.startsWith('| S16 |')) line = line.replace('Native current33/33 gồm A01–A07 và inherited profiles.', 'Native current47/47 gồm WIDTH14 và inherited33; mỗi method có hashes riêng.');
        if (line.startsWith('| S19 |')) line = line.replace('580/580', '600/600').replace('174 unit', '175 unit').replace('54 routes/432 state cells;', '54 routes/432 state cells;216 compiled route observations/50 focused cases/47 native scenarios;');
        if (line.startsWith('| S11 |')) line = line.replace('Lượt này không đổi React layout.', 'WIDTH giữ owner boundary của Panel; DetailLine chuyển sang atomic slot theo W04.').replace('Test Finance được sửa oracle theo first Alert thật,', 'Test Finance đo first Alert thật và atomic DetailLine wrapper/inner row riêng,');
        if (line.startsWith('| S13 |')) line = line.replace('không có runtime defect mới được tái hiện trong scope đồng bộ tài liệu.', 'S13 chỉ là cleanup tùy chọn; các defect W01–W04 đã tái hiện và được xử lý trong mandatory batch trên.');
    }
    return line;
}).join('\n');
plan = plan.slice(0, start) + live + plan.slice(end);
write(relative, plan);
console.log('Current WIDTH handoff docs published from actual passing gates and canonical FE status; historical snapshots retained. Revalidate final document fingerprints with canonical tools.');

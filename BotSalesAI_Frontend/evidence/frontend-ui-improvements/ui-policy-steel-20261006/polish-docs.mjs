import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const replace = (file, pairs, section = null) => {
    const target = path.join(root, file);
    const text = fs.readFileSync(target, 'utf8');
    const index = section ? text.indexOf(section) : 0;
    if (index < 0) throw new Error(`Missing section in ${file}`);
    let changed = text.slice(index);
    for (const [before, after] of pairs) changed = changed.replaceAll(before, after);
    fs.writeFileSync(target, text.slice(0, index) + changed);
};
replace('docs/FRONTEND_SPACING_STANDARD.md', [
    ['**Lượt shared composition hiện hành:**', '**HISTORICAL_SNAPSHOT — lượt shared composition trước audit:**'],
    ['Collector với readiness đúng đo đủ216/216 current renders,0 issues.', 'Collector ở lượt đó đo đủ216/216 current renders,0 issues theo assertions khi đó.'],
    ['| Task và tiến độ UI028 |', '| Task và tiến độ UI/shared enforcement |'],
    ['| Hiện trạng có thể tái lập | [source-inventory.json]', '| Baseline lịch sử 05/10/2026 | [source-inventory.json]'],
    ['Đích triển khai là `apps/web/src/shared/ui/layout.ts`:', 'Owner runtime là `apps/web/src/shared/ui/layout.ts`:'],
    ['API cụ thể chốt bằng typecheck ở W02 của UI028.', 'API hiện hành phải typecheck và tuân SPC-064–075; W02 là bước triển khai lịch sử.'],
]);
replace('docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', [
    ['22 TSX lọt3gates+typecheck;1 CSS lọt2gates;2 probes chỉ lọtvisual và bịlayoutchặn;4 controls bắt đúng', '22 TSX lọt ba gates +typecheck; một CSS lọt hai gates; hai probes chỉ lọt visual và bị layout chặn; bốn controls bắt đúng'],
    ['browser9observations390/806/1440', 'browser đo tại390/806/1440'],
    ['trênba cases', 'trên ba cases'], ['trướcfix', 'trước sửa'], ['sửabody', 'sửa body'], ['giữbottom/inline', 'giữ bottom/inline'],
    ['nếu cóstaleattribute', 'nếu có stale attribute'], ['củaowner khác', 'của owner khác'], ['offset córationale', 'offset có rationale'], ['làinset', 'là inset'], ['tọađộ', 'tọa độ'],
    ['allaffectedroutes', 'mọi affected route'], ['all affected routes', 'mọi affected route'], ['no mutation production source', 'không mutation trong production source'],
    ['3gate coverage', 'ba gate coverage'], ['typecheck/generate', 'typecheck/generator'], ['positive-negative-UNKNOWN', 'positive, negative và UNKNOWN'],
    ['worldspace', 'không gian'], ['source trước:', 'source trước: '],
    ['real native200', 'native200 thật'], ['negative fixtures', 'negative fixtures'], ['no universal240 choinline', 'không minHeight240 chung cho inline queries'],
    ['long text/loading/error/stale/nav/draft giữ đúng', 'giữ long text/loading/error/stale/navigation/draft đúng'],
    ['cóimpact', 'có impact'], ['giữđúngowner', 'giữ đúng owner'], ['córationale', 'có rationale'], ['khôngdummyconsumer', 'không dummy consumer'], ['dựphòng', 'dự phòng'],
    ['allaffected', 'mọi affected'], ['Every mandatory scoped condition', 'Mọi điều kiện bắt buộc trong scope'],
    ['small/largeaffectedroutes', 'small/large affected routes'], ['9widthsprofilematrix', 'matrix9 widths theo profile'],
    ['missingID', 'missing ID'], ['expectedscope', 'expected scope'], ['newexport/type', 'new export/type'], ['existingtaskevidence', 'evidence task hiện có'],
    ['validcast/finitebranches', 'valid cast/finite branches'], ['doublegap/inset', 'double gap/inset'], ['font/border shorthandraw,varundefined', 'font/border shorthand raw, variable không tồn tại'],
    ['Sidebarheadingtreatedasroute', 'Sidebar heading treated as route'], ['Sidebarheading', 'Sidebar heading'], ['pendingloading', 'pending loading'], ['zeroexpectedgroups', 'zero expected groups'],
    ['Mainh1+routeID+requiredstatecontent', 'Main h1 +route ID +required state content'], ['Allaffectedroutes', 'Mọi affected route'], ['currentrender', 'current render'],
    ['Lossdraft', 'Mất draft'], ['Actualaction→observablecontractstate', 'Action thật →contract state quan sát được'], ['Correctprovenance/NAreason/separateverdict', 'Đúng provenance/N/A reason và verdict riêng'],
    ['Localtrusted', 'Local trusted'], ['stalehash/fakebefore/nonzeroexit/missingcoverage/suppression', 'Stale hash/fake before/nonzero exit/missing coverage/suppression'],
    ['hợp lệPASS', 'hợp lệ PASS'], ['đãchạy', 'đã chạy'], ['profileđại diện', 'profile đại diện'], ['mọistate×route×width', 'mọi state×route×width'],
    ['Descarte khổnglồ', 'Descartes khổng lồ'], ['theoimpact', 'theo impact'], ['declareexpectedcoverage', 'khai báo expected coverage'], ['branchmandatory', 'branch bắt buộc'], ['giữNOT_RUN', 'giữ NOT_RUN'],
    ['nội dungcuộndọc', 'nội dung cuộn dọc'], ['200%nativezoom làphépthửriêng của dựán', '200% native zoom là phép thử riêng của dự án'], ['fullWCAGconformance', 'full WCAG conformance'],
    ['checkercoverage', 'checker coverage'], ['fullverify', 'full verify'], ['Full E2EFAIL vàtargetedretest làhairesults', 'Full E2E FAIL và targeted retest là hai kết quả'],
    ['thànhrun PASS', 'thành run PASS'], ['Nativeform', 'Native form'], ['geometryhợp', 'geometry hợp'],
    ['cảbypass/admin', 'cả bypass/admin'], ['tự push/setprotection', 'tự push/set protection'], ['giúpfeedback', 'giúp feedback'], ['cóthểskip', 'có thể skip'], ['requiredcheck', 'required check'], ['Gatechanges', 'Thay đổi gate'], ['SPC072', 'SPC-072'],
    ['đủevidence', 'đủ evidence'], ['nativePASS', 'native PASS'], ['chạy/đủevidence', 'chạy/đủ evidence'], ['paired/full acceptance', 'paired/full acceptance'], ['ngườidùng', 'người dùng'],
    ['no unknown/unauthorized finding', 'không unknown/unauthorized finding'], ['noregession', 'không regression'], ['khôngregression', 'không regression'], ['currenthash/exit', 'current hash/exit'],
    ['zero unauthorized findings/unknown', 'zero unauthorized findings/unknown'],
], '<a id="steel-plan">');
for (const file of ['docs/PROJECT_CONTEXT.md', 'docs/CONTINUE_FRONTEND.md']) replace(file, [
    ['27shared', '27 shared'], ['27 shared exports/112 semantic roles', '27 shared exports /112 semantic roles'],
    ['27shared exports', '27 shared exports'], ['27 shared exports,findings', '27 shared exports, findings'], ['shared exports,20', 'shared exports,20'],
    ['68TS/TSX,28TSX,16modules', '68 TS/TSX,28 TSX,16 modules'], ['176composition uses/21files', '176 composition uses/21 files'],
    ['0findings', '0 findings'], ['fullE2E', 'full E2E'], ['sourcegates', 'source gates'], ['runtime/contracts', 'runtime/contracts'],
    ['widths390', 'widths390'], ['3gates', 'ba gates'], ['sourceJSX', 'source JSX'], ['shared exports/112', 'shared exports /112'],
    ['0/140effective,28stale', '0/140 effective,28 stale'], ['0/140verified,28stale', '0/140 verified,28 stale'], ['không0%code', 'không0% code'], ['implementation0%', 'implementation0%'],
    ['nextFE001.S01', 'next FE001.S01'], ['blocked=[]/next', 'blocked=[] /next'], ['không0%', 'không0%'],
    ['mainh1', 'main h1'], ['native200', 'native200'], ['source-runtime', 'source/runtime'], ['fullsuitePASS', 'full suite PASS'], ['pairedNOT_VERIFIED', 'paired NOT_VERIFIED'], ['handoff limits', 'handoff limits'],
    ['thiếucheck', 'thiếu check'], ['nhậnPASS', 'nhận PASS'], ['foldercha', 'folder cha'], ['sourcehash', 'source hash'], ['tokenrole', 'token role'],
    ['đủaffectedroutes', 'đủ affected routes'], ['khôngnghiệmthu', 'không nghiệm thu'], ['đượcgiao', 'được giao'], ['đượcscopecho phép', 'được scope cho phép'],
    ['Cấu hìnhworkflow không làhostedrunPASS', 'Cấu hình workflow không là hosted run PASS'],
]);
console.log('Polished only current policy/plan/context text; historical evidence unchanged.');

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out = path.resolve('evidence/frontend-component-risk-audit-20261008');
const inventory = JSON.parse(fs.readFileSync(path.join(out, 'inventory.json')));
const review = {
    PageHeader: 'Desktop căn center đã khai báo; action Stack chưa wrap. Baseline hiện hành và fixture ba action không tái hiện tràn; số action/nhãn mới vẫn cần kiểm riêng.',
    Panel: 'Header responsive center; body inset có owner rõ. overflow:hidden là rủi ro cắt Amount dài ở body ngoài table; không dùng việc document không tràn để kết luận nội dung không bị cắt.',
    Stat: 'minWidth:0 và overflowWrap ở value không thắng nowrap của Amount. Fixture Money hợp lệ dài làm tràn tại 320px.',
    Stats: 'Grid 1/2/4 cột có chủ đích. Chiều cao card bằng nhau không phải lỗi nút stretch; min-content của dữ liệu con cần kiểm riêng.',
    Amount: '48 calls, nowrap, Decimal cho phép tối đa 60 ký tự. Table có vùng cuộn riêng; Stat/DetailLine/summary ngoài table chưa xử lý hết chuỗi hợp lệ dài.',
    CopyableCode: 'Wrap anywhere và flexWrap; fixture 120 ký tự không tràn. Clipboard lifecycle không được kiểm lại trong audit bố cục này.',
    Status: 'height:auto để nhãn có thể nhiều dòng. Khi là flex child của row normal/stretch, capsule có thể cao theo đoạn văn; fixture đo 168px. Không sửa bằng height cố định 32px.',
    DataTable: 'TableContainer sở hữu cuộn ngang, min-width mobile 600px có chủ đích; không đánh đồng với page overflow. Header/behavior ngoài mục tiêu audit này giữ gate sở hữu.',
    Empty: 'Các consumer hiện hành dùng thông báo hữu hạn. Fixture mã không có khoảng trắng làm tràn 702px tại viewport 320px; rủi ro API khi dùng nội dung động.',
    QueryState: 'Pending/error/stale wrapper được đọc; action Alert không stretch theo toàn đoạn lỗi trong các probe. Message dài có thể cuộn trong MUI Alert message; không gọi đó là page overflow.',
    ErrorNotice: '89 calls, validation field và unknown command có nội dung động. Fixture lỗi với mã 120 ký tự không làm tràn document; không thay chứng cứ screen reader hoặc mọi lỗi server.',
    Toolbar: '22 calls đã tách form/filters và khai báo center desktop. Audit route hiện tại không tái hiện lỗi submit 130px; generic composition bên cạnh vẫn có nguy cơ riêng.',
    Pager: 'Outer row center; action siblings wrap. Baseline và fixture total dài không tái hiện page overflow; số lớn mới/zoom cần giữ phép thử riêng.',
    LookupLoadMore: 'Row center đã khai báo; loaded caption và action không kéo cao nhau trong probe. Busy/empty/error thuộc consumer.',
    RouteLink: 'Bọc MUI Button; hình dạng ngoài phụ thuộc parent. Có thể stretch nếu bị đặt trong row có sibling nhiều dòng; hiện chưa tái hiện ngoài những owner đã nêu.',
    MutationButton: 'Bọc Button, giữ permission/busy/online. Không có invariant tự ngăn stretch ở component này; phải khóa alignment tại bố cục sử dụng. Audit không lặp lại ma trận mọi role.',
    EditDialog: 'Title flex-start/minWidth:0, actions wrap. 30 trường hợp mở dialog và fixture title 120 ký tự được đo. Body mixed FormFields trong Sửa đơn nháp vẫn kéo IconButton.',
    PartialDataNotice: '0 production calls; đọc owner và render fixture default. Không thêm consumer nhân tạo vào app để tăng coverage.',
    CapabilityUnavailable: '0 production calls; đọc owner và render fixture default. Chỉ là notice của state explicit; không suy có route thật đang unavailable.',
    ConfirmDialog: 'Dùng EditDialog; lý do multiline và action wrap. Các case confirm device/channel/role đã mở; không gửi lệnh xác nhận trong audit.',
    DetailLine: 'Value minWidth:0/wrap nhưng Amount con nowrap. Fixture trong Panel cho thấy nội dung tiền dài vượt box và bị ancestor cắt.',
    FormFields: '75 calls. Mặc định column stretch cần thiết cho form. Khi đổi thành row mà không alignItems, TextField root gồm helper kéo sibling Button/IconButton; đã tái hiện Orders và fixture.',
    FieldGroup: '30 calls. Row không có alignment tại Imports kéo nút Bỏ theo field; fixture helper dài lên 200px. ProductEditor dùng center nhưng căn wrapper lookup nhiều dòng, gây lệch mặt input.',
    SurfaceContent: '31 calls. Default column ổn cho surface flow; direction=row với đoạn văn và Status mặc định có thể stretch chip theo đoạn văn. Fixture xác nhận.',
    ActionGroup: '32 calls. Có flexWrap mặc định; các peer action hiện hành và fixture đã thử không tái hiện thêm stretch. Wrap không chứng minh mọi mixed child/state tương lai an toàn.',
    PageSections: '10 calls. Section gap 24px, column flow có chủ đích. Giữ parent boundary; không đổi thành center toàn cục để xử lý lỗi row ở FormFields.',
    SectionGrid: '15 calls. Card/pane grid stretch có thể hợp lệ; columns 1fr chưa tự đảm bảo dữ liệu unbreakable. Chọn minmax/shrink theo owner, không sửa mọi grid do thấy normal.',
    DraftConflict: 'Ba snapshot dùng pre-wrap/overflowWrap:anywhere, grid minmax và shrinkChildren; đọc cả Comparison private. Audit này không tạo thêm xung đột server hoặc chạy lại speech/native zoom cho nó.',
};
const shared = inventory.sharedUses.filter(c => c.exported).map(c => ({ name: c.name, file: c.file, line: c.line, uses: c.uses.length, assessment: review[c.name] }));
if (shared.length !== 28 || shared.some(c => !c.assessment)) throw new Error('Unreviewed shared export');
const rowReviews = inventory.rowCandidates.map(row => {
    let assessment = 'No additional defect observed in sampled baseline/state; inspect this context again when labels, helper/error, permissions or direction change.';
    if (row.file.endsWith('/orders/index.tsx') && row.line === 123) assessment = 'Observed: mixed line fields and IconButton stretch to helper-root height on R18 and R19 edit dialog.';
    else if (row.file.endsWith('/catalog/imports.tsx') && row.line === 55) assessment = 'Observed: remove action inherits TextField height; verified risk of growth when field content changes.';
    else if (row.owner === 'ProductEditorPage' && row.controls.includes('LookupLoadMore')) assessment = 'Observed: center aligns multiline lookup wrapper rather than input faces.';
    else if (row.tag === 'ActionGroup' && row.props.direction === '"column"') assessment = 'Intentional column action layout; not a horizontal control-stretch candidate.';
    else if (/flexDirection: 'column'/.test(row.props.sx || '')) assessment = 'Explicit vertical flex container; discovery candidate is not itself a row defect.';
    else if (row.tag === 'FormFields' && row.controls.every(c => c === 'TextField')) assessment = 'Field-only row: root stretch can include helper space; no extra action-height defect observed. Input-face alignment must remain independent of helper length.';
    else if (row.props.alignItems || /alignItems/.test(row.props.sx || '')) assessment = 'Explicit alignment exists; review its semantic level and responsive branches. Center on a multiline wrapper does not imply matching input faces.';
    else if (row.controls.includes('Status')) assessment = 'Watch auto-height chip in normal/stretch row; SurfaceContent fixture reproduces growth. Not every current chip height difference is a defect.';
    return { ...row, assessment };
});
const grids = inventory.gridCandidates.map(row => ({ ...row, assessment: 'Review card/pane equality separately from control height; track min-content and explicit scrolling of long data. No default-data page overflow observed in route matrix.' }));
const text = inventory.text.map(row => ({ ...row, assessment: row.owner === 'Amount' || row.owner === 'Panel' ? 'Measured long-money risk at shared owner/consumer composition.' : /noWrap/.test(JSON.stringify(row.props)) ? 'Intentional Inbox preview truncation; complete conversation must remain reachable. No blanket hidden-overflow exemption.' : 'Finite decorative, chart, pane or declared geometry; review content clipping at consumer, not from a height literal alone.' }));
const sourceFiles = Object.keys(inventory.fingerprints).map(file => ({ file, renders: inventory.components.filter(c => c.file === file).map(c => c.name), sourceRole: file.includes('/shared/ui/') ? 'SHARED_OWNER' : file.includes('/modules/') ? 'MODULE_OWNER_OR_SUPPORT' : file.includes('/mocks/') ? 'SYNTHETIC_API_SUPPORT' : 'APP_OR_SHARED_SUPPORT', sha256: inventory.fingerprints[file] }));
const sourceDrift = Object.entries(inventory.fingerprints).filter(([file, expected]) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== expected).map(([file]) => file);
const report = { capturedAt: new Date().toISOString(), mode: 'DIAGNOSTIC_ONLY', head: inventory.head, scope: 'React/TypeScript Frontend source and synthetic local render. Findings, not an acceptance tracker.', sourceDrift, shared, sourceFiles, renderingFunctions: inventory.components, rowReviews, grids, text };
fs.writeFileSync(path.join(out, 'component-assessment.json'), JSON.stringify(report, null, 2));
const rows = shared.map(c => `| ${c.name} | [${c.file}:${c.line}](../../${c.file}#L${c.line}) | ${c.uses} | ${c.assessment} |`).join('\n');
fs.writeFileSync(path.join(out, 'SHARED_COMPONENTS.md'), `# Đối chiếu toàn bộ 28 API UI dùng chung\n\nSource/binding inventory ở [inventory](inventory.json); từng file, hàm render, candidate row/grid/text và rationale ở [assessment](component-assessment.json). Số call site là source AST, không phải số nhánh đã render. Không dùng bảng này để cộng checkpoint FE.\n\n| API | Owner | Call site | Nhận định trong phạm vi audit |\n|---|---|---:|---|\n${rows}\n`);
console.log(JSON.stringify({ shared: shared.length, sharedCallSites: shared.reduce((s,c) => s + c.uses, 0), sourceFiles: sourceFiles.length, renderingFunctions: inventory.components.length, candidateRows: rowReviews.length, grids: grids.length, text: text.length, sourceDrift }));

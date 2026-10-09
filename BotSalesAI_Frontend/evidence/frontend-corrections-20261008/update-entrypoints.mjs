import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '../..');
const files = [
    ['README.md', 'evidence/frontend-corrections-20261008/REPORT.md'],
    ['docs/PROJECT_CONTEXT.md', '../evidence/frontend-corrections-20261008/REPORT.md'],
    ['docs/CONTINUE_FRONTEND.md', '../evidence/frontend-corrections-20261008/REPORT.md'],
    ['docs/KNOWN_GAPS.md', '../evidence/frontend-corrections-20261008/REPORT.md'],
    ['evidence/REPORT.md', 'frontend-corrections-20261008/REPORT.md'],
    ['../botsales-kit/execution/SESSION_HANDOFF.md', '../../BotSalesAI_Frontend/evidence/frontend-corrections-20261008/REPORT.md'],
    ...['FE001','FE003','FE022','FE023','FE028'].map(id => ['../botsales-kit/execution/frontend-evidence/' + id + '/handoff.md', '../../../../BotSalesAI_Frontend/evidence/frontend-corrections-20261008/REPORT.md']),
];
const status = process.argv[2] || 'IN_PROGRESS';
if (!['IN_PROGRESS', 'READY_FOR_ACCEPTANCE_LOCAL_SCOPE'].includes(status)) throw new Error('Invalid observed status');
for (const [file, report] of files) {
    const target = path.join(root, file), archive = path.join(import.meta.dirname, 'entrypoints-before', file.replace(/^\.\.\//, ''));
    if (!fs.existsSync(archive)) { fs.mkdirSync(path.dirname(archive), { recursive: true }); fs.copyFileSync(target, archive); }
    let text = fs.readFileSync(target, 'utf8');
    text = text.replace(/\n<!-- CORRECTIONS_CURRENT -->[\s\S]*?<!-- END_CORRECTIONS_CURRENT -->\n/, '\n');
    const headingEnd = text.indexOf('\n');
    const block = `\n<!-- CORRECTIONS_CURRENT -->\n## Kết quả hiện hành — đợt F01–F09\n\nTrạng thái: **${status}**. [Báo cáo source/gates hiện hành](${report}) và hướng dẫn nghiệm thu đi kèm ghi kết quả của đợt sửa 08/10/2026. UI status/thứ tự thuộc plan §16.6; FE freshness thuộc CLI canonical, giữ mẫu số 140. Các kết quả 512/138 và manifest trước đợt sửa bên dưới là snapshot lịch sử của source trước sửa, không chứng minh source hiện tại.\n\nScope vẫn local React/TypeScript + HTTP MSW tổng hợp. Backend/provider thật, hosted CI, screen-reader speech và quyết định nghiệm thu người dùng giữ trạng thái riêng; không tự điền PASS.\n<!-- END_CORRECTIONS_CURRENT -->\n`;
    // Existing text is retained in the archived snapshot and below the current pointer.
    text = text.slice(0, headingEnd) + '\n' + block + text.slice(headingEnd).replace(/^\s*/, '\n## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09\n\n');
    // Avoid nesting another historical heading when updating the current pointer.
    text = text.replace(/(## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09\n\n)\s*## HISTORICAL_SNAPSHOT — hồ sơ trước đợt F01–F09\n\n/g, '$1');
    fs.writeFileSync(target, text);
}
console.log('Current entrypoint pointers updated; prior content archived and retained as historical.');

import fs from 'node:fs';

const files = ['AGENTS.md', 'README.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md', 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/FRONTEND_SPACING_STANDARD.md', 'botsales-kit/docs/18_CODING_STANDARDS.md'];
for (const file of files) {
    let source = fs.readFileSync(file, 'utf8');
    source = source.split(/(?<=\n)/).map(line => /^v\d/.test(line) ? line : line.replaceAll('SPC-001–060', 'SPC-001–063').replaceAll('SPC-033–060', 'SPC-033–063')).join('');
    if (file === 'docs/FRONTEND_SPACING_STANDARD.md') {
        source = source.replace('**Phiên bản:** 1.22', '**Phiên bản:** 1.23');
        source = source.replace('// Consumer dùng preset đã export từ bridge shared:\n<Stack sx={layoutSx.formFields} />', '// Consumer dùng semantic component đã export từ shared:\n<FormFields />');
        source = source.replace('| `page.gutter` | 16 | 24 | 24 | Shell/global page layout |', '| `page.gutter` | 16 | 24 | 24 | Shell/global page layout |\n| `page.contentInsetBlock` | 24 | 24 | 24 | Shell main top/bottom; trang không thêm page padding lần hai |\n| `composition.childBoundaries` | margin block 0 | margin block 0 | margin block 0 | Semantic composition reset direct-child margins để cha sở hữu gap |');
        source += `
### 13.4. Shared composition bắt buộc và owner duy nhất — 06/10/2026

**SPC-061 — Dùng component cho các quan hệ bố cục lặp lại.** Trong app/module/shared consumer, sáu role chuẩn phải đi qua component tương ứng trong \`apps/web/src/shared/ui/composition.tsx\`: form.fieldGap → FormFields; form.inlineGap → FieldGroup; surface.contentGap → SurfaceContent; actions.inlineGap → ActionGroup; page.sectionGap → PageSections; grid.gutter → SectionGrid. Không viết lại Stack/Box, local wrapper hoặc preset tương đương để né owner. API đóng: không sx/style/className/spacing/gap/margin/padding override, không opaque spread; geometry chỉ là finite shape theo catalog. Giữ component MUI thuần qua theme khi chỉ cần primitive; không tạo wrapper đổi tên hoặc universal form/table engine. Nghiệp vụ/columns/schema/quyền vẫn do module sở hữu. Đọc [shared UI catalog](../apps/web/src/shared/ui/README.md) trước khi code; variant mới phải có rationale và consumer thật theo SPC-053.

**SPC-062 — Chỉ một owner cho mỗi boundary/inset.** Shell main sở hữu page gutter và inset dọc 24 px. Semantic composition sở hữu gap giữa direct children và reset margin-top/bottom của chúng về 0; nội dung bên trong mỗi con giữ owner riêng. Không thêm beforeGap/afterGap cho con đang nằm trong semantic gap parent. Panel bodyMode=inset chứa composition flush; khi Panel flush mới chọn composition inset nếu cần. Không double inset, không local negative margin để bù, không \`!important\` tại consumer. Boundary đứng độc lập chọn named before/after variant đã có. Shared parent và flow/grid cùng tuân quy tắc; profile đặc thù dùng semantic owner theo workflow, không ép mọi mật độ giống nhau.

**SPC-063 — Quy định phải có gate và consumer evidence.** \`npm run test:ui-composition\` chạy AST ownership check và negative fixtures trong \`npm run verify\`, cùng spacing/visual-token gates hiện có. Gate phải chặn raw role wrapper, alias/default/namespace imports, style override, opaque spread/geometry, direct child boundary hoặc inset bị nhân đôi có thể phân tích tĩnh. Source scan không chứng minh browser CSS cascade hoặc dynamic nesting; khi đổi shared owner phải có import graph/route impact matrix và regression render/hành vi theo SPC-057, gồm native form/ref/draft, dialog/navigation khi liên quan. Ghi findings trước/sau, final hashes, command/exit và state/viewports thực tế. Không tự ghi Backend/staging/owner acceptance, tiến độ FE hoặc readiness từ số component/line giảm.

Triển khai đo được và kiểm chứng của lượt này được ghi tại [báo cáo shared composition](../evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md) và §15 trong kế hoạch UI. Các snapshot Wxx ở trên giữ nguyên giá trị lịch sử; không thay bằng chứng của source mới.
`;
    }
    if (file === 'botsales-kit/docs/18_CODING_STANDARDS.md') source = source.replace('## 8. Definition of Ready cho một task', `CODE-034 — Sáu quan hệ spacing chuẩn phải dùng FormFields/FieldGroup/SurfaceContent/ActionGroup/PageSections/SectionGrid từ shared/ui/composition theo SPC-061; không raw wrapper, local equivalent hoặc API sx/style/gap generic. Primitive MUI vẫn qua theme; schema/columns/quyền/operation-specific behavior thuộc module. Catalog API ở apps/web/src/shared/ui/README.md.

CODE-035 — Shell main sở hữu page inset dọc 24 px; semantic parent sở hữu gap và direct-child block margins, Panel/composition không cùng sở hữu inset. Before/after variants chỉ cho boundary độc lập; không negative margin/local override để bù. Theo SPC-062.

CODE-036 — UI composition ownership gate và negative fixtures phải chạy trong verify cùng layout/visual-token gates; thay shared owner cần import/route impact matrix và browser/form/dialog/navigation regression theo rủi ro trên các consumer. Không tính static checker hoặc component count là production/owner proof. Theo SPC-063.

## 8. Definition of Ready cho một task`);
    if (file === 'AGENTS.md') source = source.replace('Task chuẩn:', 'SPC-061–063: đọc apps/web/src/shared/ui/README.md, dùng sáu semantic compositions cho role chuẩn; không local wrapper/generic style override, không double gap/inset. Shell main sở hữu inset dọc24px; Panel và content chọn một inset owner. test:ui-composition + negative fixtures chạy trong verify; lập consumer impact và kiểm browser/hành vi, không suy PASS từ source scan.\nTask chuẩn:');
    if (['README.md', 'DESIGN.md', 'UX-CONTRACT.md', 'docs/CONTINUE_FRONTEND.md', 'docs/FRONTEND_SCOPE.md', 'docs/PROJECT_CONTEXT.md'].includes(file)) {
        const prefix = file.startsWith('docs/') ? '../' : '';
        const standard = file.startsWith('docs/') ? 'FRONTEND_SPACING_STANDARD.md' : 'docs/FRONTEND_SPACING_STANDARD.md';
        source += `\n**Shared composition hiện hành — 06/10/2026:** [SPC-061–063](${standard}#134-shared-composition-bắt-buộc-và-owner-duy-nhất--06102026) bắt buộc dùng sáu semantic owners, API đóng và một owner mỗi gap/inset; Shell main inset dọc24px. Đọc [catalog](${prefix}apps/web/src/shared/ui/README.md); \`test:ui-composition\` chạy trong \`verify\` cùng spacing/visual-token gates. [Evidence lượt mới](${prefix}evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md) áp dụng cho source đã đổi; các số W36/FE trước đây là snapshot tại revision cũ, không chứng minh freshness của lượt này. Giữ Frontend-only, không tự cập nhật ledger/owner acceptance.\n`;
    }
    fs.writeFileSync(file, source);
}
console.log(JSON.stringify({ files, trackerWrites: 0, generatedWrites: 0 }));

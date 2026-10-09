import fs from 'node:fs'; import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
function edit(file, pairs) { let s=fs.readFileSync(path.join(root,file),'utf8'); for(const [a,b]of pairs){if(!s.includes(a))throw Error(file+': '+a);s=s.replaceAll(a,b);} fs.writeFileSync(path.join(root,file),s); }
edit('docs/FRONTEND_SPACING_STANDARD.md',[
 ['inset nội dung 16/24; action gap 8','EditDialog compact inset 16; ConfirmDialog/DraftConflict/dirty-discard comfortable inset 16/24; actions inset 12/gap 8'],
 ['Một list trong surface có thể cần tổng inset trái 40 =24 surface +16 marker indent','Một list báo cáo trong surface operational có thể cần tổng inset trái 32 =16 surface +16 marker indent'],
 ['Stats gap 16; section gap 24','Stats gap 16; section gap 16; nhóm độc lập dùng PageSections rhythm major 24'],
 ['Empty inset 32/48','Empty inset 24/32'],
 ['mobile collapse nhưng giữ accessible control','tools mặc định thu gọn ở mọi viewport, disclosure/summary giữ trạng thái và accessible controls'],
 ['Shell main sở hữu page gutter và inset dọc 24 px','Shell main sở hữu page gutter 16/24 và inset dọc 16 px'],
 ['form.fieldGap → FormFields;', 'form.fieldGap/compactFieldGap → FormFields density comfortable/compact;'],
 ['surface.contentGap → SurfaceContent;', 'surface.contentGap/detail.dividedListGap → SurfaceContent rhythm content/dividedRows;'],
 ['page.sectionGap → PageSections;', 'page.sectionGap/majorSectionGap → PageSections rhythm section/major;'],
 ['Bubble/current p14,4 là candidate cần chuyển về preset, không thay message content/state.', 'Giữ bubble12 theo preset; không thay message content/state.'],
]);
edit('apps/web/src/shared/ui/README.md',[
 ['comfortable đọc dài (16/24 px, header→body theo density)', 'comfortable đọc dài (16/24 px, header→body 16 px)'],
 ['Header h2, inset theo density; header pb 16 px;', 'Header h2, inset theo density; header pb 12/16 px theo profile;'],
 ['Paper inset 16/24 px; value container là div visual h4, gap 12 px; note 8 px;', 'Paper inset 12/16 px; value container là div visual h4, gap 8 px; note 4 px;'],
 ['boundary sau khi đứng độc lập 24 px.', 'boundary sau khi đứng độc lập 16 px.'],
 ['cell inset từ theme.', 'cell inset dọc 8/ngang 12 px từ theme; chiều cao theo nội dung/target.'],
 ['Alert boundary 16 px/content 8 px', 'Alert boundary 12 px/content 8 px'],
 ['inset/gap do layout owner.', 'inset 12 px/gap 8 px do layout owner.'],
 ['description/busy/dirtyGuard/draftCommit/allowEditsWhileBusy tùy chọn.', 'description/busy/dirtyGuard/draftCommit/allowEditsWhileBusy/density tùy chọn.'],
]);
for(const file of ['../botsales-kit/AGENTS.md','../botsales-kit/AI_RULES_PROJECT.md'])edit(file,[['v1.28 SPC-001–075','v1.29 SPC-001–075']]);
console.log('Current normative prose and catalog reconciled; history unchanged.');

import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
const edits=[];
function edit(file, fn) { const before=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n'); const after=fn(before); if(after===before)throw Error('No edit '+file); edits.push([file,after]); }
function replace(source,a,b) { if(!source.includes(a))throw Error('Missing '+a); return source.replaceAll(a,b); }
edit('apps/web/src/app/Shell.tsx',s=> {
 const start=s.indexOf('{[\n',s.indexOf('label="Trạng thái thử"'));
 const end=s.indexOf('].map(([v, l])',start);
 if(start<0||end<0)throw Error('Fault options unavailable');
 const options=s.slice(start+1,end+1);
 s=s.slice(0,start)+'{faultOptions'+s.slice(end+1);
 s=replace(s,'    const controlSx = layoutSx.shell.demoControl;', '    const faultOptions = '+options+' as const;\n    const controlSx = layoutSx.shell.demoControl;');
 return replace(s,"fault === 'normal' ? 'Bình thường' : fault", "faultOptions.find(([value]) => value === fault)?.[1] ?? fault");
});
edit('tests/ui-shell-layout.spec.ts',s=>replace(replace(replace(s,"footerBlockInset).toBe('16px')","footerBlockInset).toBe('8px')"),"mainBlockInset).toEqual(['24px', '24px'])","mainBlockInset).toEqual(['16px', '16px'])"),'    await page.locator(\'button[aria-controls="mock-tools-controls"]\').click();\n        await page.locator(\'button[aria-controls="mock-tools-controls"]\').click();','        await page.locator(\'button[aria-controls="mock-tools-controls"]\').click();'));
edit('tests/ui-finance-layout.spec.ts',s=>replace(replace(replace(replace(s,'one 16px header-to-first-content','one 12px header-to-first-content'),'detailRowPaddingTop: 12','detailRowPaddingTop: 8'),'item.gap - 16','item.gap - 12'),'item.width < 768 ? 16 : 24','item.width < 768 ? 12 : 16'));
edit('tests/ui-panel-layout.spec.ts',s=>replace(replace(replace(s,'one 16px header boundary','one 12px header boundary'),'item.gap - 16','item.gap - 12'),'item.width < 768 ? 16 : 24','item.width < 768 ? 12 : 16'));
edit('tests/ui028-w24-inbox-layout.spec.ts',s=>replace(replace(replace(replace(s,"padding: '16px', gap", "padding: '12px', gap"),"messageInset: '16px'","messageInset: '12px'"),"composerInset: '16px'","composerInset: '12px'"),"width < 768 ? '16px' : '24px'","width < 768 ? '12px' : '16px'"));
edit('tests/ui-composition-layout.spec.ts',s=> {
 s=replace(s,"'page-sections': '24px'","'page-sections': '16px'");
 s=replace(s,"if (group.owner === 'action-group') {",`if (group.owner === 'form-fields') {
                    expect(group.rhythm, context).toMatch(/^(compact|comfortable)$/);
                    expected = group.rhythm === 'compact' ? '12px' : '16px';
                } else if (group.owner === 'surface-content') {
                    expect(group.rhythm, context).toMatch(/^(content|dividedRows)$/);
                    expected = group.rhythm === 'dividedRows' ? '0px' : '12px';
                } else if (group.owner === 'page-sections') {
                    expect(group.rhythm, context).toMatch(/^(section|major)$/);
                    expected = group.rhythm === 'major' ? '24px' : '16px';
                } else if (group.owner === 'action-group') {`);
 s=replace(s,"group.rhythm === 'content' ? '12px' : '24px'","group.rhythm === 'content' ? '12px' : '16px'");
 return replace(s,"Shell main`).toEqual(['24px', '24px'])","Shell main`).toEqual(['16px', '16px'])");
});
edit('tests/ui-catalog-layout.spec.ts',s=> {
 s=replace(s,'shared 24px clearance','shared disclosure boundary');
 s=replace(s,"const control = controls?.querySelector('.MuiInputBase-root');", "const disclosure = document.querySelector('button[aria-controls=\"mock-tools-controls\"]');\n        const control = controls?.querySelector('.MuiInputBase-root');");
 s=replace(s,'if (!alert || !controls || !control || !label)', 'if (!alert || !controls || !control || !label || !disclosure)');
 s=replace(s,'alertBottom: alertRect.bottom,','disclosureClearance: disclosure.getBoundingClientRect().top - alertRect.bottom,\n            disclosureHeight: disclosure.getBoundingClientRect().height,\n            alertBottom: alertRect.bottom,');
 s=replace(s,'expect(geometry!.fieldClearance, JSON.stringify(geometry)).toBeCloseTo(24, 0);','expect(geometry!.disclosureClearance).toBeCloseTo(12, 0);\n    expect(geometry!.disclosureHeight).toBeGreaterThanOrEqual(44);\n    const clearance = geometry!.disclosureClearance + geometry!.disclosureHeight;\n    expect(geometry!.fieldClearance, JSON.stringify(geometry)).toBeCloseTo(clearance, 0);');
 s=replace(s,'labelClearance).toBeCloseTo(24, 0)','labelClearance).toBeCloseTo(clearance, 0)');
 return replace(s,'24 + geometry!.labelHeight + 4','clearance + geometry!.labelHeight + 4');
});
edit('apps/web/tests/shared-ui-render-contract.test.tsx',s=> {
 s=replace(s,"getByTestId('toolbar-fields')).padding).toBe(tokens.space.lg", "getByTestId('toolbar-fields')).padding).toBe(tokens.space.md");
 s=replace(s,"getComputedStyle(sections).gap).toBe(tokens.space.xl", "getComputedStyle(sections).gap).toBe(tokens.space.lg");
 return s+`
describe('Operational density finite profiles', () => {
    it.each([['compact', 12], ['comfortable', 16]] as const)('FormFields preserves its %s profile', (density, gap) => {
        renderWithTheme(<FormFields density={density} data-testid="density-fields"><span>Nhập liệu</span></FormFields>);
        expect(getComputedStyle(screen.getByTestId('density-fields')).gap).toBe(gap + 'px');
    });
    it.each([['content', 12], ['dividedRows', 0]] as const)('SurfaceContent preserves its %s rhythm', (rhythm, gap) => {
        renderWithTheme(<SurfaceContent rhythm={rhythm} data-testid="density-surface"><DetailLine label="Tên">Giá trị</DetailLine></SurfaceContent>);
        expect(getComputedStyle(screen.getByTestId('density-surface')).gap).toBe(gap + 'px');
    });
    it.each([['section', 16], ['major', 24]] as const)('PageSections preserves its %s rhythm', (rhythm, gap) => {
        renderWithTheme(<PageSections rhythm={rhythm} data-testid="density-sections"><span>Nội dung</span></PageSections>);
        expect(getComputedStyle(screen.getByTestId('density-sections')).gap).toBe(gap + 'px');
    });
});
`;
});
edit('tests/ui-composition-checker.test.mjs',s=>s+`
test('density profiles are finite and new spacing paths retain the shared owner', () => {
    const valid = inspectComposition(\`import { FormFields, SurfaceContent, PageSections } from '../../shared/ui/composition'; import { Panel, EditDialog } from '../../shared/ui/components'; const UI=()=> <><FormFields density="compact"/><SurfaceContent rhythm="dividedRows"/><PageSections rhythm="major"/><Panel density="comfortable"/><EditDialog density="comfortable"/></>;\`);
    assert.deepEqual(valid.issues, []);
    for (const [name, prop] of [['FormFields','density'],['SurfaceContent','rhythm'],['PageSections','rhythm'],['Panel','density'],['EditDialog','density']]) {
        for (const value of ['"unknown"','{choice}']) {
            const result = inspectComposition(\`import { \${name} } from '../../shared/ui/\${['Panel','EditDialog'].includes(name)?'components':'composition'}'; const UI=()=> <\${name} \${prop}=\${value}/>;\`);
            assert.ok(result.issues.some(issue => issue.rule === 'composition.value-unknown'), name + ' ' + value);
        }
    }
    for (const role of ['form.compactFieldGap','page.majorSectionGap','detail.dividedListGap']) {
        const result = inspectComposition(\`import { Stack } from '@mui/material'; import { layoutSx } from '../../shared/ui/layout'; const UI=()=> <Stack sx={layoutSx.\${role}}/>;\`);
        assert.equal(result.issues[0]?.rule, 'composition.shared-owner', role);
    }
});
`);
edit('apps/web/src/shared/ui/README.md',s=> {
 const changes=[['Catalog v2.2 · 08/10/2026','Catalog v2.3 · 09/10/2026'],['standard v1.28','standard v1.29'],['Gap 16 px; bodyMode flush/inset/outlined','density compact: gap 12 px; comfortable mặc định: gap 16 px; bodyMode flush/inset/outlined'],['Gap 12 px; bodyMode flush/inset/insetDivider','rhythm content mặc định: gap 12 px; dividedRows: gap 0 px cho DetailLine đã có inset/divider; bodyMode flush/inset/insetDivider'],['Gap 24 px; flow, beforeGap','rhythm section mặc định: gap 16 px; major: gap 24 px; flow, beforeGap'],['gap 16 px/py 12 px','gap 12 px/py 8 px'],['content inset 16/24 px, actions inset 16 px','density compact mặc định: content/title inset 16 px; comfortable: 16/24 px; actions inset 12 px'],['notice after 16 px','notice after 12 px'],['113 type paths','120 type paths']];
 for(const [a,b] of changes)s=replace(s,a,b);
 s=replace(s,'open/title/description/onClose/onConfirm promise;', 'open/title/description/onClose/onConfirm promise; profile comfortable cố định;');
 // Only CURRENT rows change; historical snapshots and target invariants retain their original scope.
 s=s.split('\n').map(line=> {
  if(!/^\| [A-Z]\w* \//.test(line))return line;
  const cols=line.split(' | '); if(cols.length<3)return line;
  let current=cols[1];
  if(line.startsWith('| Panel /'))current=current.replace('bodyMode','density compact mặc định (inset 12/16 px, header→body 12 px), comfortable đọc dài (16/24 px, header→body 16 px); bodyMode').replaceAll('inset 16/24 px','inset theo density').replaceAll('header→body 16 px','header→body theo density');
  if(line.startsWith('| PageHeader /'))current=current.replaceAll('24 px','16 px');
  if(line.startsWith('| Toolbar /'))current=current.replaceAll('16 px','12 px').replaceAll('gap 12 px','gap 8 px');
  if(line.startsWith('| Pager /'))current=current.replaceAll('16 px','12 px');
  if(line.startsWith('| DataTable /'))current=current.replaceAll('12/16 px','8/12 px');
  if(line.startsWith('| Empty /'))current=current.replaceAll('32/48 px','24/32 px');
  cols[1]=current; return cols.join(' | ');
 }).join('\n');
 return s;
});
for(const [file,source]of edits)fs.writeFileSync(path.join(root,file),source);
console.log('Contracts, current catalog, native disclosure and regression expectations reconciled.');

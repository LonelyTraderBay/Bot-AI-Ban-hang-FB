import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');const plans=[];
function edit(file,replacements){let source=fs.readFileSync(path.join(root,file),'utf8').replaceAll('\r\n','\n');for(const [a,b]of replacements){if(!source.includes(a))throw Error('Missing '+file+':'+a);source=source.replace(a,b);}plans.push([file,source]);}
edit('apps/web/src/shared/ui/layout.ts',[
 ['toolbar: {\n        inset: { p: factor.lg },\n        controlGap: { gap: factor.md },','toolbar: {\n        inset: { p: factor.md },\n        controlGap: { gap: factor.sm },'],
 ['pager: {\n        inset: { p: factor.lg },','pager: {\n        inset: { p: factor.md },'],
 ['demoToolsBefore: { mt: factor.xl }','demoToolsBefore: { mt: factor.md }'],
]);
edit('apps/web/src/app/Shell.tsx',[
 ['const [mobileExpanded, setMobileExpanded] = useState(false);','const [expanded, setExpanded] = useState(false);'],
 ['aria-expanded={mobileExpanded} onClick={() => setMobileExpanded(value => !value)} sx={[layoutSx.shell.demoToggle, { display: { xs: \'inline-flex\', md: \'none\' } }]}','aria-expanded={expanded} onClick={() => setExpanded(value => !value)} sx={layoutSx.shell.demoToggle}'],
 ["{mobileExpanded ? 'Ẩn công cụ demo' : 'Công cụ demo'}", "{expanded ? 'Ẩn công cụ demo' : 'Công cụ demo'}"],
 ["display: { xs: mobileExpanded ? 'flex' : 'none', md: 'flex' }", "display: expanded ? 'flex' : 'none'"],
 ['        </Button>\n        <Stack id="mock-tools-controls"', '        </Button>\n        {!expanded && <Typography data-testid="mock-tools-summary" variant="caption" color="text.secondary" sx={{ display: \'block\', overflowWrap: \'anywhere\' }}>{role} · {fault === \'normal\' ? \'Bình thường\' : fault} · {dataset === \'seed\' ? \'Dataset mặc định\' : \'1.000 khách hàng tổng hợp\'}</Typography>}\n        {datasetStatus && !expanded && <Typography role="status" variant="caption" color="text.secondary">{datasetStatus}</Typography>}\n        <Stack id="mock-tools-controls"'],
]);
for(const [file,source]of plans)fs.writeFileSync(path.join(root,file),source);
console.log('P2 Toolbar/Pager and all-viewport state-preserving disclosure implemented.');

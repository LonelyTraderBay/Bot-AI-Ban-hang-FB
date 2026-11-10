const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
function edit(file, replacements) {
 let s=fs.readFileSync(file,'utf8');
 for(const [a,b] of replacements) { if(s.split(a).length!==2) throw Error(`Unexpected match count: ${file}: ${a}`); s=s.replace(a,b); }
 fs.writeFileSync(file,s);
}
edit('apps/web/src/shared/ui/components.tsx',[
 ["'& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'anywhere' }", "'& .MuiChip-label': { whiteSpace: 'normal', overflowWrap: 'normal' }"],
 ["{ display: 'flex', alignItems: 'flex-start' }]}><Box component=\"span\" id={titleId}", "{ display: 'flex', alignItems: 'center' }]}><Box component=\"span\" id={titleId}"]
]);
edit('apps/web/src/shared/ui/theme.ts',[["background: colors.input, borderRadius: tokens.radius.control, '&:hover .MuiOutlinedInput-notchedOutline'", "background: colors.input, borderRadius: tokens.radius.control, '&.MuiInputBase-sizeSmall': { minHeight: tokens.layout.touchTarget }, '&:hover .MuiOutlinedInput-notchedOutline'"]]);
edit('apps/web/src/modules/workspace/index.tsx', [['<Typography variant="h5">{s.name}</Typography>', '<Typography component="h2" variant="h5">{s.name}</Typography>']]);
edit('apps/web/src/modules/orders/index.tsx', [['<Typography variant="h4"><Amount wrap value={order.total}/></Typography>', '<Typography component="div" variant="h4"><Amount wrap value={order.total}/></Typography>']]);
edit('apps/web/src/modules/operations/index.tsx', [['<Typography variant="subtitle2">{dateTime(digest.periodStart, shop.timezone)}', '<Typography component="div" variant="subtitle2">{dateTime(digest.periodStart, shop.timezone)}']]);
const files=execFileSync('rg',['-l',"label: ''",'apps/web/src/modules'],{encoding:'utf8'}).trim().split(/\r?\n/);
let count=0;
for(const f of files) { const s=fs.readFileSync(f,'utf8'); const matches=[...s.matchAll(/key: '([^']+)', label: ''/g)]; if(matches.some(m=>!['action','actions','edit','detail'].includes(m[1]))) throw Error(`Unexpected blank column in ${f}`); count+=matches.length; fs.writeFileSync(f,s.replace(/(key: '(?:action|actions|edit|detail)', label:) ''/g,"$1 'Thao tác'")); }
console.log(`Named ${count} action columns`);

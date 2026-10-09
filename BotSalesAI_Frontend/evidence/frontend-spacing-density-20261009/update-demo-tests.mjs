import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'../..'), testRoot=path.join(root,'tests');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const changed=[];
for(const file of walk(testRoot).filter(f=>f.endsWith('.spec.ts')&&!f.endsWith('ui-density-layout.spec.ts'))){
 let source=fs.readFileSync(file,'utf8'), edits=[];const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const visit=node=>{
  if(ts.isFunctionDeclaration(node)&&['chooseOption','chooseMockOption'].includes(node.name?.text)&&node.parameters.some(p=>p.name.getText(sf)==='label')&&node.body){edits.push({at:node.body.getStart(sf)+1,text:"\n    if (['Vai trò mô phỏng', 'Trạng thái thử', 'Dataset mô phỏng'].includes(label)) await openDemoControls(page);"});}
  if(ts.isExpressionStatement(node)&&node.getText(sf).includes('.click()')){
   const match=node.getText(sf).match(/(\w+)\.(?:getByRole\('combobox',\s*\{\s*name:\s*'(?:Vai trò mô phỏng|Trạng thái thử|Dataset mô phỏng)'|getByLabel\('(?:Vai trò mô phỏng|Trạng thái thử|Dataset mô phỏng)')/);
   if(match)edits.push({at:node.getStart(sf),text:`await openDemoControls(${match[1]});\n    `});
  }ts.forEachChild(node,visit);
 };visit(sf);
 if(file.endsWith('route-role-matrix.spec.ts')){const marker="        await expect(page.getByRole('combobox', { name: 'Vai trò mô phỏng' })).toBeVisible();";const i=source.indexOf(marker);if(i<0)throw Error('Missing role precondition');edits.push({at:i,text:'        await openDemoControls(page);\n'});}
 if(!edits.length)continue;
 for(const edit of edits.sort((a,b)=>b.at-a.at))source=source.slice(0,edit.at)+edit.text+source.slice(edit.at);
 let relative=path.relative(path.dirname(file),path.join(testRoot,'session/demo-controls')).replaceAll('\\','/');if(!relative.startsWith('.'))relative='./'+relative;
 source=`import { openDemoControls } from '${relative}';\n`+source;fs.writeFileSync(file,source);changed.push(path.relative(root,file).replaceAll('\\','/'));
}
// Geometry probes explicitly exercise expanded controls; normal screens remain collapsed.
for(const [file,a,b]of [
 ['tests/ui-toolbar-layout.spec.ts',"if (width < 768) await page.getByRole('button', { name: 'Công cụ demo', exact: true }).click();","await page.locator('button[aria-controls=\"mock-tools-controls\"]').click();"],
 ['tests/ui-shell-layout.spec.ts','await expect(toggle).toBeHidden();','await expect(toggle).toBeVisible();'],
]){let source=fs.readFileSync(path.join(root,file),'utf8');if(!source.includes(a))throw Error('Missing geometry baseline '+file);fs.writeFileSync(path.join(root,file),source.replace(a,b));}
for(const file of ['tests/ui-catalog-layout.spec.ts','tests/ui-shell-layout.spec.ts']){
 let source=fs.readFileSync(path.join(root,file),'utf8');
 source=source.replace(/(const controls = page\.locator\('#mock-tools-controls'\);\s*await expect\((?:notice|alert)\)\.toBeVisible\(\);)/g,'$1\n    await page.locator(\'button[aria-controls="mock-tools-controls"]\').click();');
 // The Shell route probe declares the locator after the alert; open before its visibility assertion.
 if(file.endsWith('ui-shell-layout.spec.ts'))source=source.replace('        await expect(controls).toBeVisible();','        await page.locator(\'button[aria-controls="mock-tools-controls"]\').click();\n        await expect(controls).toBeVisible();');
 fs.writeFileSync(path.join(root,file),source);
}
fs.writeFileSync(path.join(import.meta.dirname,'demo-test-migration.json'),JSON.stringify({changed,reason:'Operate the public all-viewport disclosure before mock selection; business assertions retained.'},null,2)+'\n');
console.log(JSON.stringify({testConsumers:changed.length}));

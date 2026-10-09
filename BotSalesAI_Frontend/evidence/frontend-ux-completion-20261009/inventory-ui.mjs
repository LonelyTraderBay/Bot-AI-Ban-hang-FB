import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve('apps/web/src/modules');
const findings=[];
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);}
for(const file of files(root)){
 const text=fs.readFileSync(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node,owner=''){
  if(ts.isFunctionDeclaration(node)&&node.name)owner=node.name.text;
  if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&['DataTable','DetailLine','Status'].includes(node.tagName.getText(source))){
   const attrs=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attr=>[attr.name.getText(source),attr.initializer?.getText(source)]));
   findings.push({file:path.relative(path.resolve('.'),file).replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,offset:node.tagName.end,owner,component:node.tagName.getText(source),label:attrs.label||null,value:attrs.value||attrs.rows||null,columns:attrs.columns?.match(/label:\s*['"][^'"]+['"]/g)?.slice(0,4)});
  }ts.forEachChild(node,child=>visit(child,owner));
 }visit(source);
}
fs.writeFileSync(new URL('ui-consumers.json',import.meta.url),JSON.stringify(findings,null,2));
console.log(JSON.stringify(findings.filter(row=>row.component==='DataTable').map(({file,line,owner,label,columns})=>({file,line,owner,label,columns})),null,2));

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import Ajv from 'ajv';
import { z } from 'zod';
const root=path.resolve(import.meta.dirname,'../..');
const config=ts.readConfigFile(path.join(root,'apps/web/tsconfig.json'),ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.join(root,'apps/web'));
const program=ts.createProgram(parsed.fileNames,parsed.options), checker=program.getTypeChecker();
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const schemas=JSON.parse(fs.readFileSync(path.join(root,'../botsales-kit/contracts/openapi.json'))).components.schemas;
const customer=program.getSourceFile(path.join(root,'apps/web/src/modules/customers/index.tsx'));
const declaration=customer.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='createCustomerSchema');
const schemaFactory=vm.runInNewContext(ts.transpileModule(declaration.getText(customer)+'\ncreateCustomerSchema;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{z});
const ownerSchema=schemaFactory(Object.fromEntries(['nameRequired','nameMax','phoneMax','emailFormat','notesMax'].map(key=>[key,key])));
const before={observedAt:new Date().toISOString(),result:'REPRODUCED',checks:[4000,4001].map(count=>({field:'CustomerWritePatch.notes',count,valueUtf16Length:count*2,canonical:new Ajv().compile(schemas.CustomerWritePatch.properties.notes)('😀'.repeat(count)),currentOwner:ownerSchema.shape.notes.safeParse('😀'.repeat(count)).success})),edits:[]};
if(!before.checks.some(row=>row.canonical!==row.currentOwner))throw new Error('The current owner no longer reproduces the defect');
const archive=path.join(import.meta.dirname,'unicode-baseline'); fs.mkdirSync(archive,{recursive:true});
for(const source of program.getSourceFiles().filter(file=>file.fileName.replaceAll('\\','/').includes('/apps/web/src/modules/'))) {
 const edits=[];
 const visit=node=>{
  if(ts.isBinaryExpression(node)&&['<','<=','>','>='].includes(node.operatorToken.getText(source))&&ts.isPropertyAccessExpression(node.left)&&node.left.name.text==='length'&&ts.isNumericLiteral(node.right)&&Number(node.right.text)>0&&(checker.getTypeAtLocation(node.left.expression).flags&ts.TypeFlags.StringLike))
   edits.push({start:node.left.getStart(source),end:node.left.end,text:`codePointLength(${node.left.expression.getText(source)})`,kind:'string comparison'});
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)) {
   const attrs=node.attributes.properties;
   const native=attrs.find(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(source)==='inputProps');
   const literal=native?.initializer?.expression;
   const max=literal&&ts.isObjectLiteralExpression(literal)&&literal.properties.find(prop=>ts.isPropertyAssignment(prop)&&prop.name.getText(source)==='maxLength'&&ts.isNumericLiteral(prop.initializer));
   if(max) {
    const onChange=attrs.find(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(source)==='onChange');
    const callback=onChange?.initializer?.expression;
    if(!callback||!ts.isArrowFunction(callback))throw new Error('Review native limit owner manually: '+source.fileName+':'+node.getStart(source));
    let values=0;
    const find=child=>{
     if(ts.isPropertyAccessExpression(child)&&child.name.text==='value'&&ts.isPropertyAccessExpression(child.expression)&&child.expression.name.text==='target') {
      edits.push({start:child.getStart(source),end:child.end,text:`limitCodePoints(${child.getText(source)}, ${Number(max.initializer.text)})`,kind:'native Unicode limit'}); values++;
     }
     ts.forEachChild(child,find);
    };find(callback);
    if(!values)throw new Error('Native limit has no owned value adapter: '+source.fileName);
    if(literal.properties.length!==1)throw new Error('Review mixed native props manually: '+source.fileName);
    edits.push({start:native.getStart(source),end:native.end,text:'',kind:'remove UTF16 native limit'});
   }
  }
  ts.forEachChild(node,visit);
 };visit(source);
 // Source-proven Zod string bounds; numeric-string price constraints remain ASCII.
 const replacements=source.fileName.endsWith('customers/index.tsx')?[['.max(160, copy.nameMax)', '.refine(value => codePointLength(value) <= 160, copy.nameMax)'],['.max(40, copy.phoneMax)', '.refine(value => codePointLength(value) <= 40, copy.phoneMax)'],['.max(4000, copy.notesMax)', '.refine(value => codePointLength(value) <= 4000, copy.notesMax)']]:source.fileName.endsWith('catalog/index.tsx')?[['.max(160)', ".refine(value => codePointLength(value) <= 160, 'Tên sản phẩm tối đa 160 ký tự.')"],['.max(20000)', ".refine(value => codePointLength(value) <= 20000, 'Mô tả tối đa 20.000 ký tự.')"],['.max(80)', ".refine(value => codePointLength(value) <= 80, 'SKU tối đa 80 ký tự.')"]]:source.fileName.endsWith('inventory/index.tsx')?[[".min(5, 'Lý do cần ít nhất 5 ký tự').max(1000, 'Lý do không được quá 1.000 ký tự')", ".refine(value => codePointLength(value) >= 5, 'Lý do cần ít nhất 5 ký tự').refine(value => codePointLength(value) <= 1000, 'Lý do không được quá 1.000 ký tự')"]]:[];
 for(const [old,text] of replacements) { const start=source.text.indexOf(old); if(start<0)throw new Error('Expected owner bound missing: '+old);edits.push({start,end:start+old.length,text,kind:'Zod Unicode limit'}); }
 if(!edits.length)continue;
 const relative=path.relative(root,source.fileName).replaceAll('\\','/'),backup=path.join(archive,relative);fs.mkdirSync(path.dirname(backup),{recursive:true});if(!fs.existsSync(backup))fs.writeFileSync(backup,source.text);
 let text=source.text;
 const sorted=edits.sort((a,b)=>b.start-a.start);for(let i=1;i<sorted.length;i++)if(sorted[i].end>sorted[i-1].start)throw new Error('Overlapping source edits');
 for(const edit of sorted)text=text.slice(0,edit.start)+edit.text+text.slice(edit.end);
 // Keep existing field counters consistent with the preserved code-point limit.
 text=text.replaceAll('${summary.length}/1000','${codePointLength(summary)}/1000').replaceAll('${notes.length}/2.000','${codePointLength(notes)}/2.000');
 const names=[...new Set(edits.flatMap(edit=>[...(edit.text.includes('codePointLength(')?['codePointLength']:[]),...(edit.text.includes('limitCodePoints(')?['limitCodePoints']:[])]))];
 const imported=/import \{([^}]+)\} from ['"](?:@\/shared\/model\/format|\.\.\/\.\.\/shared\/model\/format)['"];/;
 text=imported.test(text)?text.replace(imported,(_,inside)=>`import { ${[...names,...inside.split(',').map(name=>name.trim())].join(', ')} } from '@/shared/model/format';`):`import { ${names.join(', ')} } from '@/shared/model/format';\n`+text;
 before.edits.push({path:relative,beforeSha256:hash(source.text),afterSha256:hash(text),changes:edits.map(({kind,text})=>({kind,text}))});
 fs.writeFileSync(source.fileName,text);
}
fs.writeFileSync(path.join(import.meta.dirname,'F08-unicode-before.json'),JSON.stringify(before,null,2)+'\n');
console.log(JSON.stringify({result:before.result,checks:before.checks,files:before.edits.map(row=>row.path)}));

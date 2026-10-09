import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve('apps/web/src/modules');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);}
test('UX03 every production confirmation identifies its object and uses an explicit business verb',()=>{
 const sites=[];
 for(const file of files(root)){
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=node=>{
   if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(source)==='ConfirmDialog'){
    const attrs=new Map(node.attributes.properties.filter(ts.isJsxAttribute).map(attr=>[attr.name.getText(source),attr.initializer]));
    const at=file+':'+(source.getLineAndCharacterOfPosition(node.pos).line+1);
    assert.ok(attrs.get('confirmLabel'),at+' needs an explicit action');
    assert.ok(attrs.get('description')&&ts.isJsxExpression(attrs.get('description')),at+' needs the readable object identity in its consequence');
    sites.push(at);
   }
   if((ts.isJsxSelfClosingElement(node)||ts.isJsxOpeningElement(node))&&node.tagName.getText(source)==='DataTable'){
    const label=node.attributes.properties.find(attr=>ts.isJsxAttribute(attr)&&attr.name.getText(source)==='label');
    assert.ok(label?.initializer,file+':'+(source.getLineAndCharacterOfPosition(node.pos).line+1)+' requires a business table name');
    assert.notEqual(label.initializer.getText(source),'"Dữ liệu"');
   }
   ts.forEachChild(node,visit);
  };visit(source);
 }
 assert.ok(sites.length>=23,'Known confirmation consumers must remain covered');
 console.log('confirmation consumers:',sites.length);
});

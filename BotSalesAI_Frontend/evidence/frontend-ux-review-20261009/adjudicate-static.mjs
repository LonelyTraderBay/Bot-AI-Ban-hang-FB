import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const dir=import.meta.dirname, root=path.resolve(dir,'../..');
const raw=JSON.parse(fs.readFileSync(path.join(dir,'premium-static-audit.json'),'utf8'));
const rows=raw.findings.map(f=>{
 const file=ts.createSourceFile(f.file,fs.readFileSync(path.join(root,f.file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const matches=[];
 function visit(n){if((ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n))&&n.tagName.getText()==='Button'&&file.getLineAndCharacterOfPosition(n.getStart()).line+1===f.line){matches.push(n.getText());}ts.forEachChild(n,visit);}visit(file);
 const classify=s=>s.includes('onClick=')?'EVENT_HANDLER':s.includes('component={RouterLink}')&&s.includes('to=')?'ROUTER_LINK':s.includes('component="a"')&&s.includes('href=')?'ANCHOR':s.includes('component="label"')?'FILE_INPUT_LABEL':s.includes('{...props}')?'FORWARDED_PROPS':'NEEDS_REVIEW';
 return {...f,jsx:matches,classification:matches.map(classify),status:matches.length&&matches.every(s=>classify(s)!=='NEEDS_REVIEW')?'EXPLAINED_DETECTOR_LIMITATION':'UNRESOLVED',reason:'Check JSX action semantics at each flagged line; RouterLink/anchor/file-input-label/forwarded-props are not literal actionless buttons. Destination and file input behavior require their own checks.'};
});
fs.writeFileSync(path.join(dir,'static-adjudication.json'),JSON.stringify({rawExit:1,rawFindingCount:raw.findings.length,rows,limits:'Raw strict audit remains FAIL. This adjudication explains detector limits; it does not turn the tool result into a PASS or certify all link destinations.'},null,2)+'\n');
console.log(JSON.stringify(rows.map(x=>({file:x.file,line:x.line,status:x.status,classification:x.classification,jsx:x.jsx}))));

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'../..');
const config=ts.readConfigFile(path.join(root,'apps/web/tsconfig.json'),ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.join(root,'apps/web'));
const program=ts.createProgram(parsed.fileNames,parsed.options),checker=program.getTypeChecker(),rows=[];
for(const source of program.getSourceFiles().filter(file=>/\/apps\/web\/src\/(modules|shared)\//.test(file.fileName.replaceAll('\\','/')))) {
 const visit=node=>{
  if(ts.isBinaryExpression(node) && ['<','<=','>','>='].includes(node.operatorToken.getText(source)) && ts.isPropertyAccessExpression(node.left) && node.left.name.text==='length' && ts.isNumericLiteral(node.right)) {
   const type=checker.getTypeAtLocation(node.left.expression);
   if(type.flags & ts.TypeFlags.StringLike) rows.push({path:path.relative(root,source.fileName).replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart()).line+1,expression:node.getText(source),string:node.left.expression.getText(source),limit:Number(node.right.text)});
  }
  ts.forEachChild(node,visit);
 }; visit(source);
}
fs.writeFileSync(path.join(import.meta.dirname,process.argv.includes('--after')?'string-length-audit-after.json':'string-length-audit.json'),JSON.stringify({observedAt:new Date().toISOString(),scope:'TypeScript-confirmed string comparisons; array counts excluded',rows},null,2)+'\n');
console.log(JSON.stringify(rows,null,2));

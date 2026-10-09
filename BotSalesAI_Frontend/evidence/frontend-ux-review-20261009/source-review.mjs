import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {validateUiEvidence} from '../../scripts/validate-ui-evidence.mjs';

const output=import.meta.dirname, root=path.resolve(output,'../..'), repo=path.dirname(root);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const previous=path.join(root,'evidence/frontend-spacing-density-20261009');
const prior=read(path.join(previous,'S19-current-evidence.json'));
const errors=validateUiEvidence(prior,repo);
if(errors.length)throw Error(errors.join('\n'));
const adoption=read(path.join(previous,'adoption-current.json'));
for(const [file,digest]of Object.entries(adoption.sourceFingerprints))if(sha(path.join(repo,file))!==digest)throw Error('Stale route adoption: '+file);
const routes=read(path.join(root,'packages/contracts/src/routes.json')).routes;
const files=[...new Set(adoption.routes.flatMap(r=>r.functions.map(f=>f.file)))];
const sources=new Map(files.map(file=>[file,ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)]));
const location=node=>{const pos=node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());return {line:pos.line+1,column:pos.character+1};};
function outline(file,name){
 const sf=sources.get(file);const fn=sf.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);
 if(!fn)return {file,name,resolution:'Not a top level function declaration; retained in adoption source map'};
 const records=[];
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const props={};for(const p of node.attributes.properties)if(ts.isJsxAttribute(p)&&p.initializer)props[p.name.getText()]=p.initializer.getText();
   const element=ts.isJsxOpeningElement(node)&&ts.isJsxElement(node.parent)?node.parent:node;
   const childText=ts.isJsxElement(element)?element.children.filter(c=>ts.isJsxText(c)).map(c=>c.text.trim()).filter(Boolean).join(' '):'';
   if(['PageHeader','Panel','TextField','MutationButton','Button','RouteLink','ConfirmDialog','EditDialog','DataTable','Alert','Stat','Empty','Typography','SearchField'].includes(node.tagName.getText()))records.push({...location(node),tag:node.tagName.getText(),props,childText});
  }
  if(ts.isCallExpression(node)&&/^(?:useOp|useCommand|useApiQuery|useLookup|useCollection|navigate)$/.test(node.expression.getText()))records.push({...location(node),call:node.getText()});
  ts.forEachChild(node,visit);
 }
 visit(fn);return {file,name,startLine:location(fn).line,endLine:sf.getLineAndCharacterOfPosition(fn.end).line+1,records};
}
const observations=routes.map(meta=>{const route=adoption.routes.find(r=>r.id===meta.id);if(!route)throw Error('Missing route '+meta.id);return {...meta,entry:route.entry,shared:route.shared,local:route.helpers,source:route.functions.map(fn=>outline(fn.file,fn.name)),priorRendered:read(path.join(previous,'after.json')).observations.filter(r=>r.route===meta.id).map(r=>({engine:r.engine,width:r.width,heading:r.heading,screenshot:r.screenshot}))};});
fs.mkdirSync(output,{recursive:true});
const report={scope:'Read-only UX review; no product source or canonical plan edits.',recordedAt:new Date().toISOString(),HEAD:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),priorEvidence:{path:path.relative(repo,path.join(previous,'S19-current-evidence.json')).replaceAll('\\','/'),sha256:sha(path.join(previous,'S19-current-evidence.json')),validatorErrors:errors,sourceIdentity:prior.sourceIdentity},routes:observations,sourceFingerprints:adoption.sourceFingerprints,limits:'Static union of named route/helper functions, not proof that every branch executed. Historical rendered capture is reused only after current source fingerprints are verified; fresh live inspection is recorded separately.'};
fs.writeFileSync(path.join(output,'source-review.json'),JSON.stringify(report,null,2)+'\n');
fs.writeFileSync(path.join(output,'source-outline.md'),observations.map(r=>`## ${r.id} ${r.title}\n\n${r.path}\n\n`+r.source.map(f=>`### ${f.file}:${f.startLine||'?'} ${f.name}\n\n`+(f.records||[]).map(n=>`${n.line} ${n.tag||n.call} ${n.childText||''} ${n.props?Object.entries(n.props).filter(([k])=>['title','subtitle','label','helperText','placeholder','type','variant','disabled','busy','error','name','to','empty','maxRows','minRows'].includes(k)).map(([k,v])=>k+'='+v).join(' '):''}`).join('\n')).join('\n\n')).join('\n\n')+'\n');
console.log(JSON.stringify({routes:observations.length,modules:new Set(routes.map(r=>r.module)).size,sourceFiles:files.length,priorEvidenceFresh:true}));

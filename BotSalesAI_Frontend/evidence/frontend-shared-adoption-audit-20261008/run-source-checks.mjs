import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const output=import.meta.dirname,root=path.resolve(output,'../..'),repo=path.dirname(root);
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const previous=read(path.join(root,'evidence/frontend-width-fixes-20261008/S19-current-evidence.json'));
const before=Object.fromEntries(Object.keys(previous.sourceFingerprints).map(file=>[file,sha(path.join(repo,file))]));
const priorDrift=Object.entries(previous.sourceFingerprints).filter(([file,digest])=>before[file]!==digest).map(([file])=>file);
const runId='source-'+Date.now(),dir=path.join(output,'runs',runId);fs.mkdirSync(dir,{recursive:true});
const runs=[];
for(const [id,args] of [['composition',['scripts/check-ui-composition.mjs','--json']],['layout',['scripts/check-layout.mjs','--json']],['visual',['scripts/check-visual-tokens.mjs','--json']]]){
 const startedAt=new Date().toISOString(),result=spawnSync(process.execPath,args,{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:20e6});
 const log=path.join(dir,id+'.log');fs.writeFileSync(log,(result.stdout||'')+(result.stderr||''));
 let report;try{report=JSON.parse(result.stdout);}catch{}
 const findings=report?.issues??report?.findings;
 const entry={id,startedAt,finishedAt:new Date().toISOString(),executable:process.execPath,args,cwd:root,exitCode:result.status??1,status:report?.status,files:report?.files,findings:findings?.length,exceptions:report?.exceptionsUsed,log:{path:path.relative(repo,log).replaceAll('\\','/'),sha256:sha(log)}};runs.push(entry);
 console.log(JSON.stringify({id,exitCode:entry.exitCode,status:entry.status,files:entry.files,findings:entry.findings}));
 if(entry.exitCode||entry.status!=='PASS'||!Array.isArray(findings)||findings.length)throw Error('Source check failed; raw log retained '+id);
}
const sourceDrift=Object.entries(before).filter(([file,digest])=>sha(path.join(repo,file))!==digest).map(([file])=>file);
const record={recordedAt:new Date().toISOString(),status:priorDrift.length||sourceDrift.length?'FAIL':'PASS',scope:'Actual source audit only. No new unit/E2E/browser/build execution; previous final source identity checked by631 fingerprints.',previousFinalSourceDrift:priorDrift,sourceDrift,sourceFingerprints:before,runs};
fs.writeFileSync(path.join(output,'source-checks-current.json'),JSON.stringify(record,null,2)+'\n');
if(record.status!=='PASS')throw Error('Source changed during read-only audit');

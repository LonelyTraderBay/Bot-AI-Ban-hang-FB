import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const relative=file=>path.relative(repository,file).replaceAll('\\','/');
const records={};
for(const stage of ['e2e','unit']){
 const record=read(path.join(repository,read(path.join(output,stage+'-latest.json')).record));
 if(record.exitCode||record.sourceDrift.length||hash(path.join(repository,record.log.path))!==record.log.sha256)throw new Error('Incomplete '+stage);
 for(const [file,digest] of Object.entries(record.sourceFingerprints))if(hash(path.join(repository,file))!==digest)throw new Error('Stale '+stage+':'+file);
 records[stage]=record;
}
const browser=fs.readFileSync(path.join(repository,records.e2e.log.path),'utf8');
if(!/\b\d+ passed \(/.test(browser)||/\b\d+ failed\b/.test(browser))throw new Error('One complete passing full run required');
for(const marker of ['ROUTE_ROLE_MATRIX_CASES=357 ROLES=7 PRIVATE_ROUTES=51 RESULT=PASS','ROUTE_EMPTY_COMPOSITION=11/11 RESULT=PASS','ROUTE_ERROR_COMPOSITION=51/51 RESULT=PASS'])if(browser.split(marker).length-1!==2)throw new Error('Missing both engines: '+marker);
const files=['docs/route-implementation.json','docs/route-state-role-matrix.json'];
const before=Object.fromEntries(files.map(file=>[file,read(path.join(frontend,file))]));
for(const file of files){const backup=path.join(output,'route-matrices-before-width',file);if(fs.existsSync(backup))throw new Error('Preserved before file already exists; inspect prior outcome');fs.mkdirSync(path.dirname(backup),{recursive:true});fs.copyFileSync(path.join(frontend,file),backup);}
const logPath=stage=>path.relative(frontend,path.join(repository,records[stage].log.path)).replaceAll('\\','/');
const commands=[['tests/vertical-slices/generate-route-implementation.mjs',logPath('e2e')],['tests/states/generate-route-state-roles.mjs','--unit-log',logPath('unit'),'--browser-log',logPath('e2e'),'--role-log',logPath('e2e')]];
const runs=[];
for(const args of commands){const startedAt=new Date().toISOString(),result=spawnSync(process.execPath,args,{cwd:frontend,windowsHide:true,encoding:'utf8',maxBuffer:12e6});runs.push({startedAt,finishedAt:new Date().toISOString(),executable:process.execPath,args,cwd:frontend,exitCode:result.status??1,output:(result.stdout||'')+(result.stderr||'')});if(result.status!==0){fs.writeFileSync(path.join(output,'route-matrices-refresh-current.json'),JSON.stringify({status:'FAIL',runs},null,2)+'\n');throw new Error(runs.at(-1).output);}}
function semantic(value){if(Array.isArray(value))return value.map(semantic);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['logFile','generatedAt','inputs'].includes(key)).map(([key,item])=>[key,semantic(item)]));return value;}
const drift=files.filter(file=>JSON.stringify(semantic(before[file]))!==JSON.stringify(semantic(read(path.join(frontend,file)))));
const report={recordedAt:new Date().toISOString(),status:drift.length?'FAIL':'PASS',scope:'Canonical owners regenerated evidence references from the current actual full E2E and verbose unit logs. Route/feature/state/role semantics must stay byte-equivalent after removing only log paths, generation time and input-log fingerprints.',runs,semanticDrift:drift,sourceFingerprints:Object.fromEntries([import.meta.filename,...commands.map(args=>path.join(frontend,args[0]))].map(file=>[relative(file),hash(file)])),inputs:Object.values(records).map(record=>record.log),outputs:files.map(file=>({path:relative(path.join(frontend,file)),sha256:hash(path.join(frontend,file))}))};
fs.writeFileSync(path.join(output,'route-matrices-refresh-current.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,semanticDrift:drift,runs:runs.length}));
if(drift.length)process.exitCode=1;

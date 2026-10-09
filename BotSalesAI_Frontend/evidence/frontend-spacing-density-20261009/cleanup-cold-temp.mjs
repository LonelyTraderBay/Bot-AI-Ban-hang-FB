import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const out=import.meta.dirname, frontend=path.resolve(out,'../..'), repository=path.dirname(frontend);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifestPath=path.join(out,'clean-artifacts-width-20261009.json'),manifest=read(manifestPath),copy=read(path.join(out,'cold-source-copy-current.json'));
if(manifest.status!=='PASS'||manifest.commandRuns.length!==10||manifest.commandRuns.some(r=>r.exitCode)||copy.status!=='PASS'||copy.drift.length||copy.isolatedWorkspace!==manifest.isolatedWorkspace)throw Error('Actual passing isolated run required');
const artifactChecks=[];
for(const [directory,key]of [['dist','productionRepeat'],['dist-demo','demoRepeat']])for(const artifact of manifest.artifacts[key].files){const actual=hash(path.join(frontend,'apps/web',directory,artifact.path));if(actual!==artifact.sha256)throw Error('Current/cold artifact differs:'+directory+'/'+artifact.path);artifactChecks.push({directory,path:artifact.path,sha256:actual});}
for(const source of copy.copies)if(hash(path.join(repository,source.path))!==source.sha256||source.copiedSha256!==source.sha256)throw Error('Copied source is stale:'+source.path);
const target=path.resolve(manifest.isolatedWorkspace),temporaryRoot=path.resolve(os.tmpdir()),inside=target.toLowerCase().startsWith(temporaryRoot.toLowerCase()+path.sep);
if(!inside||!path.basename(target).startsWith('botsales-width-clean-20261009-')||!fs.existsSync(path.join(target,'.git'))||!fs.existsSync(path.join(target,'BotSalesAI_Frontend/package-lock.json')))throw Error('Unexpected cleanup target');
const archive=path.join(out,'clean-artifacts-before-separate-cleanup.json');if(fs.existsSync(archive))throw Error('Preserve the original cleanup attempt');fs.copyFileSync(manifestPath,archive);
const startedAt=new Date().toISOString();fs.rmSync(target,{recursive:true,force:false});if(fs.existsSync(target))throw Error('Temporary workspace still exists');
const record={status:'PASS',startedAt,finishedAt:new Date().toISOString(),method:'Separate cleanup after the original ten passing cold stages; original run did not include --remove-temp-after-pass.',executable:process.execPath,args:[path.relative(frontend,import.meta.filename).replaceAll('\\','/')],cwd:frontend,target,insideTemporaryRoot:inside,originalManifest:{path:path.relative(repository,archive).replaceAll('\\','/'),sha256:hash(archive)},artifactChecks,copiedInputs:copy.copies.length,removed:true};
const proofPath=path.join(out,'cold-cleanup-current.json');fs.writeFileSync(proofPath,JSON.stringify(record,null,2)+'\n');manifest.tempWorkspaceRemovedAfterPass=true;manifest.cleanup={path:path.relative(repository,proofPath).replaceAll('\\','/'),sha256:hash(proofPath),method:record.method};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:record.status,artifactFiles:artifactChecks.length,copiedInputs:record.copiedInputs,removed:record.removed}));

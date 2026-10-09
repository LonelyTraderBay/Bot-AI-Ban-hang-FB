import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const output=import.meta.dirname,frontend=path.resolve(output,'../..'),repository=path.dirname(frontend);
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel=file=>path.relative(repository,file).replaceAll('\\','/');
const assert=(value,message)=>{if(!value)throw Error(message);};
const records={};
const checkBrowserOnly = process.argv[2] === 'check-browser';
for(const stage of (checkBrowserOnly ? ['e2e','built-demo'] : ['e2e','built-demo','verify'])){
 const pointer=read(path.join(output,stage+'-latest.json')),file=path.join(repository,pointer.record),record=read(file);
 assert(!record.exitCode&&!record.sourceDrift.length&&hash(path.join(repository,record.log.path))===record.log.sha256,'Invalid '+stage);
 for(const [source,digest]of Object.entries(record.sourceFingerprints))assert(hash(path.join(repository,source))===digest,'Stale '+stage+':'+source);
 records[stage]={...record,record:pointer.record,sha256:hash(file)};
}
assert(Date.parse(records['built-demo'].startedAt)>Date.parse(records.e2e.finishedAt),'Browser preservation wrappers must run sequentially');
const beforeFile=path.join(path.dirname(path.join(repository,records.e2e.record)),'preservation-before.json'),before=read(beforeFile);
const mismatches=before.files.filter(item=>!fs.existsSync(path.join(repository,item.path))||hash(path.join(repository,item.path))!==item.sha256).map(item=>item.path);
if (checkBrowserOnly) {
    assert(!mismatches.length,'Historical browser evidence differs: '+mismatches.join(','));
    fs.writeFileSync(path.join(output,'browser-preservation-current.json'),JSON.stringify({status:'PASS',checkedAt:new Date().toISOString(),preservedPaths:before.files.length,mismatches,full:{record:records.e2e.record,sha256:records.e2e.sha256,startedAt:records.e2e.startedAt,finishedAt:records.e2e.finishedAt},built:{record:records['built-demo'].record,sha256:records['built-demo'].sha256,startedAt:records['built-demo'].startedAt,finishedAt:records['built-demo'].finishedAt},before:{path:rel(beforeFile),sha256:hash(beforeFile)},scope:'Byte comparison after the separate browser wrappers close, before any intentional publication to canonical current evidence. The full run snapshot was captured after the final successful verify and S17 publication; produced domain bytes remain isolated until the exact-byte browser check finishes. Earlier failed attempts retain separate immutable records.'},null,2)+'\n');
    console.log(JSON.stringify({preservedPaths:before.files.length,stage:'browser-byte-check',mismatches}));
    process.exit(0);
}
const browserProof=read(path.join(output,'browser-preservation-current.json'));
assert(browserProof.status==='PASS'&&!browserProof.mismatches.length&&browserProof.before.sha256===hash(beforeFile)
    &&browserProof.full.sha256===records.e2e.sha256&&browserProof.built.sha256===records['built-demo'].sha256,'Prior browser byte check does not bind current runs');
const s17=read(path.join(output,'S17-publication-current.json'));
const priorS17=before.files.find(item=>item.path===s17.target);
assert(priorS17&&hash(path.join(repository,s17.target))===s17.currentSha256,'Current S17 bytes do not match publication');
const freshBeforeFull = priorS17.sha256===s17.currentSha256 && Date.parse(s17.publishedAt)<Date.parse(records.verify.startedAt)
    && Date.parse(records.verify.finishedAt)<Date.parse(records.e2e.startedAt) && !mismatches.length;
const publishedAfterBrowser = priorS17.sha256===s17.previousSha256 && Date.parse(s17.publishedAt)>Date.parse(browserProof.checkedAt)
    && Date.parse(records.verify.startedAt)>Date.parse(s17.publishedAt) && mismatches.every(file=>file===s17.target);
assert(freshBeforeFull||publishedAfterBrowser,'S17 publication/verification/browser ordering does not match exact preserved bytes');
const preservation=read(path.join(output,'final-verify-preservation.json')),produced=path.join(repository,preservation.produced.path),target=path.join(frontend,'evidence/domain-tests.json');
assert(preservation.verificationRecord===records.verify.record&&!preservation.exitCode&&!preservation.sourceDrift.length&&hash(produced)===preservation.produced.sha256,'Produced domain proof must bind final successful verify');
const value=read(produced);assert(value.status==='PASS'&&value.checks.length===75&&value.network.status==='PASS'&&value.network.checks.length===13&&[...value.checks,...value.network.checks].every(item=>item.status==='PASS'),'Invalid produced domain result');
const archive=path.join(output,'domain-before-current-publication.json');assert(!fs.existsSync(archive),'Publication already recorded; inspect outcome');fs.copyFileSync(target,archive);fs.copyFileSync(produced,target);
const publication={status:'PASS',publishedAt:new Date().toISOString(),verifyRecord:records.verify.record,original:{path:rel(archive),sha256:hash(archive)},produced:preservation.produced,target:{path:rel(target),sha256:hash(target)},browserWrappersFinishedAt:records['built-demo'].finishedAt,scope:'Publish exact bytes generated by actual successful final verify after both preserving wrappers finish; old evidence archived, no result rewriting.'};
assert(publication.target.sha256===publication.produced.sha256,'Publication differs');
fs.writeFileSync(path.join(output,'domain-publication-current.json'),JSON.stringify(publication,null,2)+'\n');console.log(JSON.stringify({preservedPaths:before.files.length,domain:value.status,simulator:75,network:13}));

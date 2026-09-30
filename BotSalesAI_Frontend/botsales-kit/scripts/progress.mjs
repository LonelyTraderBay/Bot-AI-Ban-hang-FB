#!/usr/bin/env node
/** Local evidence-linked progress ledger, not an autonomous coding agent or a distributed lock. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const FILE=path.join(ROOT,'execution/progress.json'), PLANFILE=path.join(ROOT,'execution/plan.json');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fail=m=>{throw new Error(m);};
const rel=(base,p)=>{if(typeof p!=='string'||!p||path.isAbsolute(p))fail('Expected relative file path');const dest=path.resolve(base,p);if(dest!==base&&!dest.startsWith(base+path.sep))fail('Path escapes approved root: '+p);if(!fs.existsSync(dest)||!fs.statSync(dest).isFile())fail('Missing evidence/source file: '+p);const real=fs.realpathSync(dest), realBase=fs.realpathSync(base);if(!real.startsWith(realBase+path.sep))fail('Symlink escapes approved root');return real;};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plan=read(PLANFILE), state=read(FILE), stateBefore=sha(fs.readFileSync(FILE));
const release=read(path.join(ROOT,'release.json'));
const taskMap=new Map(plan.tasks.map(t=>[t.id,t]));
let sourceRoot=path.resolve(ROOT,state.sourceRootRelative||'..');
function validateStructure(){
 if(state.planSha256!==sha(fs.readFileSync(PLANFILE)))fail('Plan changed. Approved plan migration/rebaseline required; do not silently change denominator.');
 if(state.planId!==plan.planId)fail('Wrong plan ID');
 if(taskMap.size!==plan.tasks.length)fail('Duplicate task ID');
 if(plan.phases.reduce((n,p)=>n+p.weightPercent,0)!==100)fail('Phase weights must sum to 100');
 const seen=new Set(), visiting=new Set();
 function visit(t){if(visiting.has(t.id))fail('Dependency cycle');if(seen.has(t.id))return;visiting.add(t.id);for(const d of t.dependsOn){if(!taskMap.has(d))fail('Unknown dependency '+d);visit(taskMap.get(d));}visiting.delete(t.id);seen.add(t.id);}
 for(const t of plan.tasks){visit(t);const ts=state.tasks[t.id];if(!ts)fail('Missing task in progress '+t.id);if(!['NOT_STARTED','IN_PROGRESS','BLOCKED','DONE'].includes(ts.status))fail('Invalid task status '+t.id);if(new Set(t.implementationSteps.map(s=>s.id)).size!==t.implementationSteps.length)fail('Duplicate step');for(const s of t.implementationSteps){if(!Number.isFinite(s.weight)||s.weight<=0)fail('Invalid step weight');const ss=ts.steps[s.id];if(!ss||!['NOT_STARTED','VERIFIED','STALE'].includes(ss.status))fail('Invalid checkpoint '+t.id+'.'+s.id);if(ss.status==='VERIFIED'&&!ss.evidence)fail('VERIFIED without evidence');}if(Object.keys(ts.steps).some(k=>!t.implementationSteps.some(s=>s.id===k)))fail('Unknown extra step');}
 if(Object.keys(state.tasks).some(k=>!taskMap.has(k)))fail('Unknown progress task');
}
function verifyEvidence(t,s,evidencePath){
 const absolute=rel(ROOT,evidencePath),e=read(absolute);
 if(e.taskId!==t.id||e.stepId!==s.id||e.result!=='PASS')fail('Wrong task/step or non-PASS evidence');
 if(e.kind!==s.requiredEvidenceKind)fail('Evidence kind mismatch: expected '+s.requiredEvidenceKind);
 for(const k of ['executedAt','sourceRevision','expected','observed','command','reviewer'])if(typeof e[k]!=='string'||e[k].trim().length<3)fail('Missing evidence '+k);
 const time=Date.parse(e.executedAt);if(!Number.isFinite(time)||time>Date.now()+300000)fail('Invalid/future evidence time');
 if(!e.environment?.name||!e.environment?.details)fail('Missing actual environment');
 if(!Number.isInteger(e.checksTotal)||e.checksTotal<1||e.failed!==0)fail('No checks or failures present');
 if(!Array.isArray(e.sourceFiles)||!e.sourceFiles.length)fail('Missing actual source hashes');
 const unique=new Set();for(const f of e.sourceFiles){if(unique.has(f.path))fail('Duplicate source path');unique.add(f.path);if(!/^[a-f0-9]{64}$/.test(f.sha256||''))fail('Invalid source hash');if(sha(fs.readFileSync(rel(sourceRoot,f.path)))!==f.sha256)fail('Changed source '+f.path);}
 const actualSnapshot=sha(Buffer.from(e.sourceFiles.map(f=>f.path+':'+f.sha256).sort().join('\n')));
 if(e.sourceSnapshotSha256!==actualSnapshot)fail('Snapshot digest mismatch');
 if(sha(fs.readFileSync(rel(ROOT,e.logFile)))!==e.logSha256)fail('Changed/missing log');
 if(e.kind==='test_run'){
  const map=read(path.join(ROOT,'execution/command-map.json'));const c=map.commands.find(c=>c.id===e.commandId);
  if(!c||c.status!=='VERIFIED_AVAILABLE'||c.command!==e.command)fail('Test command must match a verified registered command');
  if(/^(echo|true|exit\s+0)\b/.test(e.command.trim()))fail('No-op cannot verify application');
 }
 if(['environment_verification','device_or_user_verification'].includes(e.kind)){
  if(e.environment.simulated!==false)fail('Actual environment/device evidence required, not a mock');
  if(!e.authorityRef)fail('Need actual permission/approval reference for environment/device check');
 }
 return {evidence:e,sha256:sha(fs.readFileSync(absolute))};
}
function effective(){
 const result=new Map();
 const evaluate=t=>{
  if(result.has(t.id))return result.get(t.id);
  const ts=state.tasks[t.id], depOK=t.dependsOn.every(d=>evaluate(taskMap.get(d)).done);
  let earned=0, previousOK=true;const steps=t.implementationSteps.map(s=>{const ss=ts.steps[s.id];let status=ss.status,note='';if(status==='VERIFIED'){try{const v=verifyEvidence(t,s,ss.evidence.path);if(v.sha256!==ss.evidence.sha256)fail('Evidence modified');}catch(e){status='STALE';note=e.message;}}if(status==='VERIFIED'&&!depOK){status='STALE';note='Dependency is no longer fully verified';}if(status==='VERIFIED'&&!previousOK){status='STALE';note='Previous checkpoint is not verified';}if(status==='VERIFIED')earned+=s.weight;else previousOK=false;return {...s,status,note};});
  const total=t.implementationSteps.reduce((n,s)=>n+s.weight,0),done=earned===total;
  const status=done?'DONE':steps.some(s=>s.status==='STALE')?'STALE':ts.status==='BLOCKED'?'BLOCKED':earned>0||ts.status==='IN_PROGRESS'?'IN_PROGRESS':'NOT_STARTED';
  const r={...t,status,owner:ts.owner,blockedReason:ts.blockedReason,earned,total,percent:Math.round(earned/total*10000)/100,done,dependencyReady:depOK,steps};result.set(t.id,r);return r;
 };
 plan.tasks.forEach(evaluate);return result;
}
function summary(){const items=[...effective().values()].sort((a,b)=>a.priority-b.priority);const phases=plan.phases.map(p=>{const ts=items.filter(t=>t.phase===p.id),earned=ts.reduce((n,t)=>n+t.earned,0),total=ts.reduce((n,t)=>n+t.total,0);return {...p,earned,total,percent:earned/total*100};});return {planId:plan.planId,version:plan.version,bundleVersion:release.version,paletteVersion:release.versions.palette,designDecisionRef:release.designDecisionRef,generatedAt:new Date().toISOString(),scope:'REAL_PROJECT_IMPLEMENTATION_ONLY',overallPercent:Math.round(phases.reduce((n,p)=>n+p.weightPercent*p.percent/100,0)*100)/100,verifiedSteps:items.reduce((n,t)=>n+t.steps.filter(s=>s.status==='VERIFIED').length,0),totalSteps:items.reduce((n,t)=>n+t.steps.length,0),phases,tasks:items,releaseAuthorized:false,note:'Progress is evidence bookkeeping, not certification. Owner release approval is a separate artifact.'};}
function nextTasks(){return summary().tasks.filter(t=>!t.done&&t.dependencyReady&&t.status!=='BLOCKED').sort((a,b)=>a.priority-b.priority);}
function atomicWrite(p,obj){const temp=p+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(obj,null,2)+'\n',{encoding:'utf8',flag:'wx'});fs.renameSync(temp,p);}
function mutate(fn){const lock=path.join(ROOT,'execution/.progress.lock');let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({pid:process.pid,at:new Date().toISOString()}));if(sha(fs.readFileSync(FILE))!==stateBefore)fail('Concurrent modification: reload');fn();state.revision++;state.history.push({at:new Date().toISOString(),action:process.argv.slice(2).join(' '),revision:state.revision});atomicWrite(FILE,state);sourceRoot=path.resolve(ROOT,state.sourceRootRelative||'..');renderReports();}finally{if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}}
function renderReports(){const r=summary();renderDetailedPlan(r);atomicWrite(path.join(ROOT,'execution/progress-report.json'),r);const lines=['# TIẾN ĐỘ TRIỂN KHAI THỰC TẾ',`\nGói ${release.version} • Graphite Gold đã duyệt • palette ${release.versions.palette}.`,`\nKế hoạch ${r.planId}. **${r.overallPercent}%** được kiểm chứng; ${r.verifiedSteps}/${r.totalSteps} checkpoints.`, '\nKhông cộng điểm cho demo/tài liệu có sẵn. Phần thiếu hoặc source thay đổi giữ STALE. Không tự cho phép release.','\n| Giai đoạn | Trọng số | Đã xác minh |','|---|---:|---:|',...r.phases.map(p=>`| ${p.id} ${p.title} | ${p.weightPercent}% | ${p.percent.toFixed(2)}% |`),'\n| Task | Tên | Phụ thuộc | Trạng thái | Hoàn thành |','|---|---|---|---|---:|',...r.tasks.map(t=>`| ${t.id} | ${t.title} | ${t.dependsOn.join(', ')||'—'} | ${t.status} | ${t.percent}% |`)];fs.writeFileSync(path.join(ROOT,'execution/PROGRESS.md'),lines.join('\n')+'\n');
 const css=fs.readFileSync(path.join(ROOT,'design/tokens.css'),'utf8');
 const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Tiến độ BotSales AI — Graphite Gold ${safe(release.version)}</title><style>${css}*{box-sizing:border-box}body{background:var(--color-canvas);color:var(--color-text-primary);font:15px/1.6 system-ui;margin:0;padding:24px}main{max-width:1160px;margin:auto}.muted{color:var(--color-text-secondary)}h1{font-size:30px}header,details{background:var(--color-surface);border:1px solid var(--color-border-decorative);border-radius:12px;padding:18px;margin:12px 0}.big{font-size:48px;font-weight:700;color:var(--color-accent)}progress{width:100%;accent-color:var(--color-accent);height:16px}summary{cursor:pointer;font-weight:650;display:flex;gap:12px;justify-content:space-between}td,th{padding:10px;text-align:left;border-bottom:1px solid var(--color-border-decorative)}table{border-collapse:collapse;width:100%}.table{overflow:auto}code{word-break:break-word}.step{padding:10px 0;border-bottom:1px solid var(--color-border-decorative)}.tag{font-size:12px;color:var(--color-warning)}a{color:var(--color-accent)}input{background:var(--color-canvas);border:1px solid var(--color-border-control);border-radius:8px;padding:12px;color:inherit;width:100%}@media(max-width:600px){body{padding:12px}summary{display:block}}</style><main><p class="muted">BOTSALES AI • GÓI ${safe(release.version)} • GRAPHITE GOLD ĐÃ DUYỆT • KHÔNG PHẢI % DEMO</p><h1>Tiến độ triển khai thực tế</h1><header><div class="big">${r.overallPercent}%</div><progress max="100" value="${r.overallPercent}"></progress><p>${r.verifiedSteps}/${r.totalSteps} bước có bằng chứng còn hiệu lực • ${r.tasks.filter(t=>t.done).length}/${r.tasks.length} đầu việc hoàn thành</p><p class="muted">Đây là báo cáo sinh từ tracker. AI phải cập nhật bằng chứng rồi chạy <code>node scripts/progress.mjs report</code>. Không chỉnh phần trăm bằng tay; mở lại file sau khi sinh. Task BLOCKED giữ điểm bước trước còn hợp lệ nhưng chưa DONE; STALE mất điểm liên quan. Bản demo đang có không phải ứng dụng production đã hoàn thành.</p></header><label for="q">Tìm mã việc, tính năng hoặc nội dung</label><input id="q" placeholder="Ví dụ: T034, Telegram, kế toán…"><div id="tasks">${r.phases.map(p=>`<section><h2>${p.id} · ${safe(p.title)} <small>${p.percent.toFixed(1)}%</small></h2>${r.tasks.filter(t=>t.phase===p.id).map(t=>`<details data-search="${safe([t.id,t.title,...t.featureIds].join(' ').toLowerCase())}"><summary><span>${t.id} · ${safe(t.title)}</span><span class="tag">${t.status} · ${t.percent}%</span></summary><p class="muted">Phụ thuộc: ${t.dependsOn.join(', ')||'Không'} • Chủ nhiệm: ${safe(t.owner||'Chưa nhận việc')}</p>${t.blockedReason?`<p>${safe(t.blockedReason)}</p>`:''}<p>${t.featureIds.join(' · ')}</p>${t.steps.map(s=>`<div class="step"><strong>${s.id} — ${s.status}</strong><br>${safe(s.action)}${s.note?`<p class="tag">${safe(s.note)}</p>`:''}</div>`).join('')}<p>Vùng sửa: <code>${safe(t.writeScope.join('; '))}</code></p></details>`).join('')}</section>`).join('')}</div></main><script>document.querySelector('#q').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('details').forEach(d=>d.hidden=!d.dataset.search.includes(q));});</script></html>`;fs.writeFileSync(path.join(ROOT,'execution/PROGRESS.html'),html);return r;
}

function taskMarkdown(t){
 return [ `## ${t.id} — ${t.title}`, `**Giai đoạn:** ${t.phase} · **Ưu tiên:** ${t.priority} · **Trạng thái:** ${t.status} · **Đã xác minh:** ${t.percent}%`, `\n**Phụ thuộc phải DONE:** ${t.dependsOn.join(', ')||'Không'}. **Chủ nhiệm:** ${t.owner||'Chưa nhận việc'}.`, `\n**Yêu cầu:** ${t.featureIds.join(', ')}.`, '\n### Đọc trước khi sửa', ...t.readFirst.map(p=>'- `'+p+'`'), '\n### Vùng được sửa / đầu ra bắt buộc', ...t.writeScope.map(p=>'- `'+p+'`'), '\n### Thực hiện tuần tự',...t.steps.map(s=>`\n#### ${t.id}.${s.id} · ${s.weight}/10 điểm · ${s.status}\n\n${s.action}\n\n**Bằng chứng:** ${s.requiredEvidenceKind}. ${s.verification}${s.note?'\n\n**Cần kiểm lại:** '+s.note:''}`), '\n### Kiểm tra nghiệm thu của đầu việc',...t.acceptanceCases.map(c=>'- '+c), '\n### Điều kiện dừng đúng phạm vi',...t.stopConditions.map(c=>'- '+c), `\n**Bàn giao:** \`${t.handoff}\`. ${t.commandPolicy}`, '\nKhông chuyển checkpoint thành VERIFIED khi chưa có bằng chứng đúng bản sửa.\n' ].join('\n');
}
function renderDetailedPlan(r){
 const intro=fs.readFileSync(path.join(ROOT,'execution/PLAN_GUIDE.md'),'utf8');
 const content=[intro,`\n## Tiến độ tại lần sinh này\n\n**${r.overallPercent}% — ${r.verifiedSteps}/${r.totalSteps} bước — ${r.tasks.filter(t=>t.done).length}/${r.tasks.length} việc.** Đây là tiến độ sản phẩm thật, không phải % tài liệu/demo.\n`, '| Giai đoạn | Trọng số | Đã xác minh | Đầu việc |','|---|---:|---:|---|',...r.phases.map(p=>`| ${p.id} ${p.title} | ${p.weightPercent}% | ${p.percent.toFixed(2)}% | ${r.tasks.filter(t=>t.phase===p.id).map(t=>t.id).join('–')} |`),'\n## Mục lục đầu việc\n',...r.tasks.map(t=>`- [${t.id} — ${t.title}](execution/tasks/${t.id}.md) · ${t.status} · ${t.percent}%`),'\n---\n',...r.tasks.map(taskMarkdown)].join('\n');
 fs.writeFileSync(path.join(ROOT,'IMPLEMENTATION_PLAN.md'),content+'\n');
 fs.mkdirSync(path.join(ROOT,'execution/tasks'),{recursive:true});
 for(const t of r.tasks)fs.writeFileSync(path.join(ROOT,'execution/tasks',t.id+'.md'),`# Phiếu triển khai — gói ${release.version}\n\nSinh từ plan.json + progress.json; Graphite Gold đã duyệt tại design/decision.json.\n\nĐường dẫn trong phiếu tính từ thư mục gốc của bộ tài liệu; vùng code tính từ repo đã khảo sát. Không sửa tay file sinh.\n\n`+taskMarkdown(t));
}

function getTask(id){return taskMap.get(id)||fail('Unknown task '+id);}
try{
 validateStructure();const [cmd='status',id,arg,arg2]=process.argv.slice(2);
 if(cmd==='validate'){console.log(JSON.stringify({valid:true,tasks:plan.tasks.length,checkpoints:plan.tasks.reduce((n,t)=>n+t.implementationSteps.length,0),scope:'Structure only; does not run product tests'}));}
 else if(cmd==='status'){const r=summary();console.log(JSON.stringify({overallPercent:r.overallPercent,verifiedSteps:r.verifiedSteps,totalSteps:r.totalSteps,phases:r.phases,next:nextTasks().slice(0,3).map(t=>({id:t.id,title:t.title,nextStep:t.steps.find(s=>s.status!=='VERIFIED')})),blocked:r.tasks.filter(t=>t.status==='BLOCKED').map(t=>({id:t.id,reason:t.blockedReason})),stale:r.tasks.filter(t=>t.status==='STALE').map(t=>t.id)},null,2));}
 else if(cmd==='next'){const t=nextTasks()[0];console.log(JSON.stringify(t||{message:'No ready task. Check blockers, dependencies and release authority; do not bypass.'},null,2));}
 else if(cmd==='report'){const r=renderReports();console.log(`Generated execution/PROGRESS.html and PROGRESS.md — ${r.overallPercent}% verified.`);}
 else if(cmd==='bind'){if(!id||!fs.statSync(path.resolve(id)).isDirectory())fail('bind requires actual repo directory');mutate(()=>{if(Object.values(state.tasks).some(t=>Object.values(t.steps).some(s=>s.status==='VERIFIED')))fail('Cannot change source root after verification without approved rebaseline');state.sourceRootRelative=path.relative(ROOT,path.resolve(id));});console.log('Bound source root; no source files modified.');}
 else if(cmd==='start'){getTask(id);if(!arg?.trim())fail('start TASK OWNER');const eff=effective().get(id);if(!eff.dependencyReady||eff.done||eff.status==='BLOCKED')fail('Task not ready');mutate(()=>{const active=Object.entries(state.tasks).find(([k,t])=>k!==id&&t.status==='IN_PROGRESS'&&!effective().get(k).done);if(active)fail('Sequential mode: finish/block active task '+active[0]);if(state.tasks[id].owner&&state.tasks[id].owner!==arg)fail('Different owner requires explicit handoff');state.tasks[id].owner=arg;state.tasks[id].status='IN_PROGRESS';});console.log('Started '+id);}
 else if(cmd==='block'){getTask(id);if(!arg||arg.length<5)fail('block TASK "specific reason"');mutate(()=>{state.tasks[id].status='BLOCKED';state.tasks[id].blockedReason=arg;});console.log('Blocked '+id+'; independent ready tasks remain selectable.');}
 else if(cmd==='resume'){getTask(id);mutate(()=>{if(state.tasks[id].status!=='BLOCKED')fail('Not blocked');state.tasks[id].status='NOT_STARTED';state.tasks[id].blockedReason=null;});console.log('Blocker cleared; start task explicitly with owner.');}
 else if(cmd==='checkpoint'){const t=getTask(id),s=t.implementationSteps.find(s=>s.id===arg)||fail('Unknown step');if(!arg2)fail('checkpoint TASK STEP relative/evidence.json');const current=effective().get(id);if(state.tasks[id].status!=='IN_PROGRESS'||!state.tasks[id].owner)fail('Claim task first');if(!current.dependencyReady)fail('Dependency not verified');if(current.steps.find(s=>s.status!=='VERIFIED')?.id!==s.id)fail('Complete checkpoints in order; do not bypass');const v=verifyEvidence(t,s,arg2);mutate(()=>{state.tasks[id].steps[s.id]={status:'VERIFIED',evidence:{path:arg2,sha256:v.sha256},verifiedAt:new Date().toISOString()};if(Object.values(state.tasks[id].steps).every(s=>s.status==='VERIFIED'))state.tasks[id].status='DONE';});renderReports();console.log('Evidence recorded '+id+'.'+s.id+'. This validates evidence structure/hashes, not truth of unobserved claims.');}
 else if(cmd==='invalidate'){getTask(id);if(!arg||arg.length<5)fail('invalidate TASK "reason"');mutate(()=>{for(const step of Object.values(state.tasks[id].steps))if(step.status==='VERIFIED')step.status='STALE';state.tasks[id].status='NOT_STARTED';state.tasks[id].blockedReason=arg;});renderReports();console.log('Invalidated; dependent evidence also loses eligibility.');}
 else fail('Usage: node scripts/progress.mjs validate|status|next|report|bind REPO|start TASK OWNER|block TASK "reason"|resume TASK|checkpoint TASK STEP EVIDENCE|invalidate TASK "reason"');
}catch(e){console.error('PROGRESS_ERROR: '+e.message);process.exitCode=1;}

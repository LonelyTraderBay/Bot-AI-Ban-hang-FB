"""Negative/positive tracker checks in isolated copies. Never changes project progress."""
from pathlib import Path
import tempfile,shutil,json,hashlib,subprocess,datetime
R=Path(__file__).resolve().parents[1]; results=[]
sha=lambda b:hashlib.sha256(b).hexdigest()
with tempfile.TemporaryDirectory(prefix='botsales-tracker-test-') as tmp:
 base=Path(tmp);kit=base/'kit';src=base/'source';src.mkdir();(src/'actual.txt').write_text('Fixture only; no product execution')
 for folder in ['scripts','execution','design','templates']:shutil.copytree(R/folder,kit/folder)
 shutil.copy2(R/'release.json',kit/'release.json')
 # These tests cover the legacy full-product CLI in an isolated copy. The real
 # repository defaults to the FE ledger and keeps the full-product ledger read-only.
 for name in ['frontend-plan.json','frontend-progress.json','frontend-progress-report.json']:
  (kit/'execution'/name).unlink(missing_ok=True)
 original=(kit/'execution/progress.json').read_bytes();plan=(kit/'execution/plan.json').read_bytes()
 def cmd(*args,ok=True):
  p=subprocess.run(['node',str(kit/'scripts/progress.mjs'),*args],capture_output=True,text=True,encoding='utf-8')
  if (p.returncode==0)!=ok:raise AssertionError((args,p.stdout,p.stderr))
  return p
 def reset():
  (kit/'execution/progress.json').write_bytes(original);(kit/'execution/plan.json').write_bytes(plan)
  (kit/'execution/.progress.lock').unlink(missing_ok=True)
  cmd('bind',str(src))
 def evidence(step='S01',**overrides):
  s=json.loads(plan)['tasks'][0]['implementationSteps'][int(step[1:])-1]
  files=[{'path':'actual.txt','sha256':sha((src/'actual.txt').read_bytes())}]
  log=kit/'execution/evidence/selftest.log';log.write_text('Synthetic isolated validation fixture, not product test.\n')
  e=dict(taskId='T001',stepId=step,result='PASS',kind=s['requiredEvidenceKind'],executedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceRevision='SELFTEST-SNAPSHOT-ONLY',sourceSnapshotSha256=sha('\n'.join(sorted(f["path"]+':'+f['sha256'] for f in files)).encode()),sourceFiles=files,environment={'name':'Isolated tracker test','details':'Synthetic evidence validation fixture','simulated':True},command='manual fixture review',checksTotal=1,failed=0,expected='Validate synthetic evidence metadata',observed='Fixture metadata recorded',reviewer='selftest-runner',logFile='execution/evidence/selftest.log',logSha256=sha(log.read_bytes()))
  e.update(overrides);p=kit/f'execution/evidence/{step}.json';p.write_text(json.dumps(e));return str(p.relative_to(kit))
 def test(name,f):
  try:reset();f();results.append({'name':name,'status':'PASS'})
  except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)})
 test('Initial next is T001',lambda: (_ for _ in ()).throw(AssertionError()) if json.loads(cmd('next').stdout)['id']!='T001' else None)
 test('Reject unknown task',lambda:cmd('start','T999','agent',ok=False))
 test('Reject incomplete dependencies',lambda:cmd('start','T002','agent',ok=False))
 test('Require actual owner',lambda:cmd('start','T001','',ok=False))
 test('Require claim before checkpoint',lambda:cmd('checkpoint','T001','S01',evidence(),ok=False))
 def ordered():cmd('start','T001','agent');cmd('checkpoint','T001','S02',evidence('S02'),ok=False)
 test('Reject skip step',ordered)
 def guard(**kw):cmd('start','T001','agent');cmd('checkpoint','T001','S01',evidence(**kw),ok=False)
 for name,kw in [('No PASS',{'result':'NOT_RUN'}),('Empty checks',{'checksTotal':0}),('Failed checks',{'failed':1}),('Wrong kind',{'kind':'test_run'}),('Missing source hashes',{'sourceFiles':[]}),('Bad snapshot',{'sourceSnapshotSha256':'0'*64}),('Wrong log hash',{'logSha256':'0'*64}),('Future timestamp',{'executedAt':'2999-01-01T00:00:00Z'}),('Missing command',{'command':''}),('Wrong task',{'taskId':'T003'})]:test(name,lambda kw=kw:guard(**kw))
 def accepted():
  cmd('start','T001','agent');cmd('checkpoint','T001','S01',evidence());s=json.loads(cmd('status').stdout);assert s['verifiedSteps']==1 and 0<s['overallPercent']<1
 test('Valid checkpoint earns precise weighted points',accepted)
 def owner():cmd('start','T001','agent');cmd('start','T001','other',ok=False)
 test('Owner conflict rejected',owner)
 def lock():
  (kit/'execution/.progress.lock').write_text('other writer');cmd('start','T001','agent',ok=False);assert (kit/'execution/.progress.lock').exists()
 test('Existing lock preserved and blocks write',lock)
 def tamper():
  a=json.loads(plan);a['tasks'][0]['title']='Changed denominator plan';(kit/'execution/plan.json').write_text(json.dumps(a));cmd('validate',ok=False)
 test('Plan hash change rejected',tamper)
 def stale():
  cmd('start','T001','agent');cmd('checkpoint','T001','S01',evidence());cmd('checkpoint','T001','S02',evidence('S02'));(src/'actual.txt').write_text('Changed source');s=json.loads(cmd('status').stdout);assert s['verifiedSteps']==0 and 'T001'in s['stale'];(src/'actual.txt').write_text('Fixture only; no product execution')
 test('Changed source invalidates evidence and subsequent steps',stale)
 def complete():
  cmd('start','T001','agent')
  for i in range(1,6):step=f'S{i:02}';cmd('checkpoint','T001',step,evidence(step))
  assert json.loads(cmd('next').stdout)['id']=='T002';cmd('bind',str(src),ok=False)
 test('Completed dependency unlocks next, root rebinding forbidden',complete)
 def block():
  cmd('start','T001','agent');cmd('block','T001','Need authorized repo access');assert json.loads(cmd('next').stdout).get('message');cmd('resume','T001');assert json.loads(cmd('next').stdout)['id']=='T001'
 test('Block/resume updates next without auto-skip',block)
 test('No-op fabricated report does not change percentage',lambda:cmd('report'))

def frontend_source_roots_test(escape=False):
 with tempfile.TemporaryDirectory(prefix='botsales-frontend-tracker-test-') as tmp:
  base=Path(tmp);kit=base/'botsales-kit';source=base/'BotSalesAI_Frontend'
  (kit/'scripts').mkdir(parents=True);(kit/'execution').mkdir();(kit/'contracts').mkdir()
  (source/'apps/web/src').mkdir(parents=True)
  shutil.copy2(R/'scripts/progress.mjs',kit/'scripts/progress.mjs')
  shutil.copy2(R/'release.json',kit/'release.json')
  (kit/'contracts/route-manifest.json').write_text('{"fixture":true}',encoding='utf-8')
  (source/'apps/web/src/main.tsx').write_text('export const fixture = true;\n',encoding='utf-8')
  plan_obj={'planId':'FRONTEND-PATH-TEST','version':'1','scope':'FRONTEND_WITH_SYNTHETIC_MOCK_API','phases':[{'id':'F00','title':'Fixture','weightPercent':100}],'tasks':[{'id':'FE001','priority':1,'phase':'F00','title':'Path fixture','dependsOn':[],'implementationSteps':[{'id':'S01','weight':1,'requiredEvidenceKind':'artifact_review'}]}]}
  plan_bytes=(json.dumps(plan_obj,separators=(',',':'))+'\n').encode();(kit/'execution/frontend-plan.json').write_bytes(plan_bytes)
  state={'version':'1.0','planId':'FRONTEND-PATH-TEST','planSha256':sha(plan_bytes),'scope':'FRONTEND_WITH_SYNTHETIC_MOCK_API','sourceRootRelative':'../BotSalesAI_Frontend','revision':0,'tasks':{'FE001':{'status':'NOT_STARTED','owner':None,'blockedReason':None,'steps':{'S01':{'status':'NOT_STARTED'}}}},'history':[],'migrations':[]}
  (kit/'execution/frontend-progress.json').write_text(json.dumps(state),encoding='utf-8')
  (kit/'execution/frontend-command-map.json').write_text('{"commands":[]}',encoding='utf-8')
  log_rel='execution/evidence/FE001-S01.log';log=kit/log_rel;log.parent.mkdir(parents=True);log.write_text('Isolated source-root resolver test; no product claim.\n',encoding='utf-8')
  sources=[
   {'path':'apps/web/src/main.tsx','sha256':sha((source/'apps/web/src/main.tsx').read_bytes())},
   {'path':'botsales-kit/contracts/route-manifest.json','sha256':sha((kit/'contracts/route-manifest.json').read_bytes())},
  ]
  if escape:sources[1]['path']='botsales-kit/../../outside/route-manifest.json'
  snap=sha('\n'.join(sorted(f["path"]+':'+f['sha256'] for f in sources)).encode())
  evidence={'taskId':'FE001','stepId':'S01','kind':'artifact_review','result':'PASS','verificationScope':'FRONTEND_WITH_SYNTHETIC_MOCK_API','executedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRevision':'SELFTEST-SNAPSHOT-ONLY','expected':'Resolve Frontend and canonical kit source paths within their respective roots.','observed':'Isolated source-root resolver fixture.','command':'manual isolated path fixture','reviewer':'selftest-runner','environment':{'name':'Isolated tracker test','details':'Synthetic source path fixture, not product execution','dataSource':'source-only'},'checksTotal':1,'failed':0,'sourceFiles':sources,'sourceSnapshotSha256':snap,'logFile':log_rel,'logSha256':sha(log.read_bytes())}
  ev=kit/'execution/evidence/FE001-S01.json';ev.write_text(json.dumps(evidence),encoding='utf-8')
  def run(*args,ok=True):
   result=subprocess.run(['node',str(kit/'scripts/progress.mjs'),*args,'--defer-reports'],capture_output=True,text=True,encoding='utf-8')
   if (result.returncode==0)!=ok:raise AssertionError((args,result.stdout,result.stderr))
   return result
  run('start','FE001','selftest')
  if escape:
   p=run('checkpoint','FE001','S01','execution/evidence/FE001-S01.json',ok=False)
   if 'Path escapes approved root' not in p.stderr:raise AssertionError(p.stderr)
  else:
   run('checkpoint','FE001','S01','execution/evidence/FE001-S01.json')
   status=json.loads(run('status').stdout)
   if status['verifiedSteps']!=1:raise AssertionError(status)

def record_frontend_root_test(name,escape):
 try:frontend_source_roots_test(escape);results.append({'name':name,'status':'PASS'})
 except Exception as e:results.append({'name':name,'status':'FAIL','error':str(e)})

record_frontend_root_test('Frontend receipts resolve FE and kit paths in separate approved roots',False)
record_frontend_root_test('Frontend kit-prefixed paths cannot escape the approved kit root',True)
report={'scope':'TRACKER_SELF_TEST_ONLY_ISOLATED_COPIES','results':results,'passed':sum(r['status']=='PASS' for r in results),'total':len(results)}
(R/'evidence/tracker-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
assert report['passed']==report['total']

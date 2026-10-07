"""Check the canonical Graphite Gold documentation release without product claims.
Standard library only. Writes evidence/release-validation.json unless --no-write.
Checks source/outputs/policy/task mechanics; does not authenticate or deploy anything.
"""
from pathlib import Path
import argparse, datetime, hashlib, importlib.util, json, re, subprocess, sys
R=Path(__file__).resolve().parents[1]

def run(root=R, distribution=False):
    checks=[]
    def rec(name,ok,**detail):checks.append({'name':name,'status':'PASS' if ok else 'FAIL',**detail})
    def load(p):return json.loads((root/p).read_text(encoding='utf-8'))
    def text(p):return (root/p).read_text(encoding='utf-8')
    def sha(p):return hashlib.sha256((root/p).read_bytes()).hexdigest()
    release=load('release.json'); decision=load('design/decision.json'); tokens=load('design/tokens.json')
    baseline=load('reference/baseline-v2.1-hashes.json')['files']
    rec('Approved Graphite Gold policy is bound to a direct user request',
        decision['status']=='APPROVED' and decision['id']=='ADR-VIS-021' and decision['approvedBy']=='Jokertrader'
        and decision['approvedAt']=='2026-09-29T15:30:32Z' and decision['approvalSource']['kind']=='DIRECT_USER_MESSAGE')
    rec('Color approval is not product acceptance or live deployment permission',
        decision['liveDeploymentApproved'] is False and decision['productAcceptanceApproved'] is False)
    rec('Approved source digest matches canonical tokens',decision['tokenSourceSha256']==sha('design/tokens.json'))
    rec('Entire token source unchanged from approved 2.1 palette',sha('design/tokens.json')==baseline['design/tokens.json'])
    rec('Only one app palette and no system/theme selection',tokens['theme']=='dark-only' and decision['allowedModes']==['dark'] and not decision['allowThemeSwitch'] and not decision['allowSystemColorSelection'])
    rec('Palette copies are generated from the identical token bytes',sha('prototype/src/tokens.json')==sha('design/tokens.json'))
    rec('CSS copies match exactly',sha('design/tokens.css')==sha('prototype/src/tokens.css'))
    rec('Universal unchanged from source release and attached source record',sha('AI_RULES.md')==baseline['AI_RULES.md']==load('execution/universal-source.json')['sha256'])
    for p in sorted((root/'contracts').glob('*')):
        if p.is_file():
            rel=p.relative_to(root).as_posix();rec('Business contract unchanged: '+rel,sha(rel)==baseline[rel])
    for rel in ['prototype/src/domain.js','prototype/src/domain-v2.js','prototype/src/seed.js','prototype/src/permissions.js','prototype/src/app.css','prototype/test_domain_v2.cjs','prototype/test_browser_v2.py']:
        rec('Domain/behavior source unchanged: '+rel,sha(rel)==baseline[rel])
    normalized=text('prototype/src/app.js').replace('UI REVIEW · V__BOTSALES_RELEASE_VERSION__','UI REVIEW · V2.1')
    rec('App JavaScript differs only by release-label placeholder',hashlib.sha256(normalized.encode()).hexdigest()==baseline['prototype/src/app.js'])
    plan=load('execution/plan.json');state=load('execution/progress.json');adoption=load('execution/design-adoption.json')
    rec('Task plan lock points to the exact updated instructions',state['planSha256']==sha('execution/plan.json')==adoption['planAfterSha256'])
    rec('Task graph/weights fingerprint unchanged',mechanics(plan)==load('reference/plan-mechanics-v2.1.json'))
    rec('All 84 task/420 steps retained',len(plan['tasks'])==84 and sum(len(t['implementationSteps']) for t in plan['tasks'])==420)
    rec('Business plan ID preserved',plan['planId']=='BOTSALES-V2-20260929')
    if distribution:
        rec('Product execution states preserved in this fresh distribution',state['tasks']==load('reference/progress-tasks-v2.1.json'))
        rec('No product progress earned by documentation',all(t['status']=='NOT_STARTED' and all(s['status']=='NOT_STARTED' and s['evidence'] is None for s in t['steps'].values()) for t in state['tasks'].values()))
    else:
        rec('Progress task IDs match plan without requiring a zero reset',set(state['tasks'])=={t['id'] for t in plan['tasks']})
    ids=set(adoption['taskIdsWithVisualRequirements'])
    for t in plan['tasks']:
        card='execution/tasks/'+t['id']+'.md';ct=text(card)
        rec('Current task card '+t['id'],release['version'] in ct and t['title'] in ct)
        if t['id'] in ids:
            rec('Task bound to approved palette '+t['id'],'design/decision.json' in t['readFirst'] and 'design/decision.json' in ct and any('Graphite Gold' in x for x in t['acceptanceCases']))
    guide=text('execution/PLAN_GUIDE.md')
    for tid,phrase in [('T008','cổng phụ thuộc/chuẩn code'),('T009','sinh và kiểm hợp đồng'),('T010','Graphite Gold/theme/component nền'),('T011','shell/routing/state')]:
        rec('Foundation summary matches canonical task '+tid,tid+' '+phrase in guide)
    rec('Theme implementation occurs at T010, not obsolete G1','tại **T010**' in text('design/IMPLEMENTATION_NOTES.md') and 'tại G1' not in text('design/IMPLEMENTATION_NOTES.md'))
    rec('Source guide is not mislabeled as a generated artifact','là phần mở đầu nguồn' in guide)
    docs=sorted((root/'docs').glob('*.md'))
    rec('All 28 main specifications remain present',len(docs)==28)
    for p in docs:
        s=p.read_text(encoding='utf-8')
        rec('Current metadata: '+p.name,s.count('<!-- BEGIN RELEASE META -->')==1 and f'Bộ chuẩn {release["version"]}' in s and 'Graphite Gold: ĐÃ DUYỆT' in s)
    rec('API version intentionally preserved',load('contracts/openapi.json')['info']['version']==release['versions']['api'])
    rec('Palette version intentionally preserved',tokens['version']==release['versions']['palette']==decision['paletteVersion'])
    for p in ['AGENTS.md','START_HERE.md','AI_RULES_PROJECT.md','PROJECT_BUILD_PROMPT_VI.txt','execution/PLAN_GUIDE.md']:
        rec('AI entrypoint references one approved design: '+p,'design/decision.json' in text(p) and 'Graphite Gold' in text(p))
    gc=load('governance/acceptance-scenarios.json'); gids={g['id'] for g in gc['cases']}
    rec('30 unique governance scenarios, still not product test results',len(gc['cases'])==len(gids)==30 and all(x['executionStatus']=='NOT_RUN_PRODUCT_TEST' for x in gc['cases']))
    rec('Quality gate scenario references resolve',all(s in gids for g in load('governance/quality-gates.json')['gates'] for s in g['scenarioIds']))
    rec('Governance kit versions synchronized',all(load(p)['kitVersion']==release['version'] for p in ['governance/project-policy.json','governance/quality-gates.json','governance/acceptance-scenarios.json']))
    rec('Generated demo uses current label with no unreplaced marker','UI REVIEW · V'+release['version'] in text('prototype/index.html') and '__BOTSALES_RELEASE_VERSION__' not in text('prototype/index.html'))
    rec('Progress page uses current label and canonical CSS',release['version'] in text('execution/PROGRESS.html') and text('design/tokens.css') in text('execution/PROGRESS.html'))
    for script,args in [('scripts/generate-theme.py',['--check']),('scripts/sync-release.py',['--check'])]:
        p=subprocess.run([sys.executable,str(root/script),*args],capture_output=True,text=True)
        rec('Freshness '+script,p.returncode==0,output=(p.stdout+p.stderr).strip())
    # Validate exact markdown links that are relative to root entry documents/index.
    for f in ['DOCUMENT_INDEX.md','README.md','START_HERE.md','UPGRADE.md']:
        for link in re.findall(r'\]\(([^\s)]+)\)',text(f)):
            if '://' not in link and not link.startswith('#'):
                target=(root/f).parent/link.split('#')[0]
                rec('Relative link exists '+f+' -> '+link,target.exists())
    retired={'#0B1020','#141C2E','#1C2840','#8BB8FF'}
    for f in ['design/tokens.json','design/tokens.css','prototype/src/tokens.json','prototype/src/tokens.css','prototype/src/app.css','prototype/index.html','execution/PROGRESS.html']:
        rec('Retired navy palette absent from active presentation '+f,not any(x.lower() in text(f).lower() for x in retired))
    return {'scope':'CANONICAL_DOCUMENTATION_SOURCE_OUTPUT_AND_PRESERVATION_ONLY','releaseVersion':release['version'],'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'checks':checks,'distributionCheck':distribution,'limitations':['Does not execute the real application or configure a target repository.','Hash matching verifies bytes, not product correctness or external authority.','Product governance scenarios remain unexecuted; browser evidence is separate.']}

def mechanics(plan):
    return {'planId':plan['planId'],'phases':plan['phases'],'tasks':[{k:t[k] for k in ['id','phase','priority','kind','dependsOn','featureIds','writeScope','deliverables','handoff','commandPolicy','stopConditions']} | {'steps':[{k:s[k] for k in ['id','weight','required','requiredEvidenceKind','verification']} for s in t['implementationSteps']]} for t in plan['tasks']]}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--no-write',action='store_true');ap.add_argument('--distribution',action='store_true',help='Also require the untouched 0% distribution tracker, not for active working repositories.');args=ap.parse_args()
    try:report=run(distribution=args.distribution)
    except Exception as exc:
        print('RELEASE_VALIDATION_ERROR: '+str(exc),file=sys.stderr);raise SystemExit(1)
    if not args.no_write:(R/'evidence/release-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'scope':report['scope'],'total':report['total'],'passed':report['passed'],'failures':[x for x in report['checks'] if x['status']=='FAIL']},ensure_ascii=False,indent=2))
    raise SystemExit(0 if report['total']==report['passed'] else 1)

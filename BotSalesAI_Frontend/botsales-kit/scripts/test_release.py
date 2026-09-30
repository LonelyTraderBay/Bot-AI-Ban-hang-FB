"""Positive and negative release-validator checks on isolated copies, not product tests."""
from pathlib import Path
import tempfile, shutil, json, importlib.util, hashlib
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('release_validator',R/'scripts/validate-release.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
checks=[]
with tempfile.TemporaryDirectory(prefix='botsales-release-test-') as temp:
    root=Path(temp)/'kit'
    shutil.copytree(R,root,ignore=shutil.ignore_patterns('__pycache__'))
    def file_change(name, transform):
        p=root/name;old=p.read_bytes();p.write_bytes(transform(old));return lambda:p.write_bytes(old)
    def json_change(name, mutate):
        def transform(raw):
            value=json.loads(raw);mutate(value);return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
        return file_change(name,transform)
    def case(name,change=None,expected=None,distribution=True):
        undo=None
        try:
            if change:undo=change()
            r=m.run(root,distribution=distribution)
            ok=all(c['status']=='PASS' for c in r['checks']) if expected is None else any(c['name']==expected and c['status']=='FAIL' for c in r['checks'])
            checks.append({'name':name,'status':'PASS' if ok else 'FAIL','expectedFailure':expected,'observedFailures':[c['name'] for c in r['checks'] if c['status']=='FAIL']})
        except Exception as exc:checks.append({'name':name,'status':'FAIL','error':str(exc)})
        finally:
            if undo:undo()
    case('Valid distribution accepted')
    case('Token change without new authority detected',lambda:json_change('design/tokens.json',lambda d:d['colors'].update(accent='#FFFFFF')),'Approved source digest matches canonical tokens')
    case('Generated CSS mutation detected',lambda:file_change('design/tokens.css',lambda b:b+b'\n/* altered */\n'),'CSS copies match exactly')
    case('Unapproved decision detected',lambda:json_change('design/decision.json',lambda d:d.update(status='PROPOSED')),'Approved Graphite Gold policy is bound to a direct user request')
    case('App light palette detected',lambda:json_change('design/tokens.json',lambda d:d.update(theme='light')),'Only one app palette and no system/theme selection')
    case('Task ignores color authority detected',lambda:json_change('execution/plan.json',lambda d:d['tasks'][9]['readFirst'].remove('design/decision.json')),'Task bound to approved palette T010')
    case('Task priority changed detected',lambda:json_change('execution/plan.json',lambda d:d['tasks'][9].update(priority=999)),'Task graph/weights fingerprint unchanged')
    case('Document metadata drift detected',lambda:file_change('docs/03_DESIGN_SYSTEM.md',lambda b:b.replace(b'2.1.1',b'2.1.0')),'Current metadata: 03_DESIGN_SYSTEM.md')
    case('Retired navy canvas detected',lambda:file_change('prototype/src/app.css',lambda b:b+b'\nbody{background:#0B1020}\n'),'Retired navy palette absent from active presentation prototype/src/app.css')
    case('Domain code accidental edit detected',lambda:file_change('prototype/src/domain-v2.js',lambda b:b+b'\n'),'Domain/behavior source unchanged: prototype/src/domain-v2.js')
    case('Old demo label detected',lambda:file_change('prototype/index.html',lambda b:b.replace(b'UI REVIEW \xc2\xb7 V2.1.1',b'UI REVIEW \xc2\xb7 V2.0')),'Generated demo uses current label with no unreplaced marker')
    case('Universal edit detected',lambda:file_change('AI_RULES.md',lambda b:b+b'\n'),'Universal unchanged from source release and attached source record')
    case('Distribution cannot claim fake completion',lambda:json_change('execution/progress.json',lambda d:d['tasks']['T001'].update(status='DONE')),'No product progress earned by documentation')
    case('Working-mode check does not demand tracker reset',lambda:json_change('execution/progress.json',lambda d:d['tasks']['T001'].update(status='IN_PROGRESS',owner='synthetic-test-only')),distribution=False)
    case('All mutations reverted in isolated copy')
report={'scope':'RELEASE_VALIDATOR_SELF_TESTS_IN_ISOLATED_COPY_NOT_PRODUCT_TESTS','total':len(checks),'passed':sum(x['status']=='PASS' for x in checks),'checks':checks}
(R/'evidence/release-tests.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['total']==report['passed'] else 1)

"""Optional audit of simulator evidence using jsonschema, not React/API execution.
Run: python scripts/validate-mock-schemas.py (requires jsonschema).
"""
from pathlib import Path
from datetime import datetime, timezone
import json
from jsonschema import Draft202012Validator, FormatChecker
ROOT = Path(__file__).resolve().parent.parent
catalog = json.loads((ROOT/'packages/contracts/src/schemas.json').read_text(encoding='utf-8'))
schemas = catalog['components']['schemas']
report = json.loads((ROOT/'evidence/domain-tests.json').read_text(encoding='utf-8'))
collections = json.loads((ROOT/'apps/web/src/mocks/collections.json').read_text(encoding='utf-8'))
checks = 0
errors = []
def validate(name, value, origin):
    global checks
    checks += 1
    validator = Draft202012Validator({'$ref': '#/components/schemas/'+name, **catalog}, format_checker=FormatChecker())
    for error in validator.iter_errors(value):
        errors.append({'origin':origin, 'schema':name, 'path':list(error.path),'message':error.message})
for i, item in enumerate(report['transcript']):
    if item.get('requestSchema') and 'request' in item:
        validate(item['requestSchema'], item['request'], f'call {i}: {item["op"]} request')
    if item.get('schema'):
        data = item.get('data')
        envelope = {'data':data,'meta':{'requestId':'schema-check','asOf':'2026-09-29T14:00:00Z'}}
        if item['schema'].endswith('ListResponse'):
            envelope['data']=data[:100]
            envelope['page']={'limit':100,'total':len(data),'nextCursor':None,'hasMore':False}
        validate(item['schema'], envelope, f'call {i}: {item["op"]} response')
for collection, rows in report['db'].items():
    if collection in collections:
        for row in rows:
            validate(collections[collection], row, f'{collection}/{row.get("id","config")}')
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'status':'FAIL' if errors else 'PASS','checks':checks,'errors':errors,'scope':'Captured simulator JSON matches canonical JSON Schema; no HTTP/MSW, React or real backend execution.'}
(ROOT/'evidence/mock-schema-check.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
raise SystemExit(1 if errors else 0)

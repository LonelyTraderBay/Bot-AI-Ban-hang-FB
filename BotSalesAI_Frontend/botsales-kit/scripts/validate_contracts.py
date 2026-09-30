"""JSON Schema/OpenAPI-shape checks; not a full OpenAPI conformance certificate."""
from pathlib import Path
import json,hashlib
import yaml
from jsonschema import Draft202012Validator
R=Path(__file__).resolve().parents[1]
a=json.loads((R/'contracts/openapi.json').read_text());b=yaml.safe_load((R/'contracts/openapi.yaml').read_text());assert a==b,'JSON/YAML differ'
checks=[]
for name,schema in a['components']['schemas'].items():
 Draft202012Validator.check_schema(schema);checks.append(name)
# Required path parameters must exist for every method, including inherited parameters.
import re
for url,methods in a['paths'].items():
 for method,op in methods.items():
  if not isinstance(op,dict) or 'operationId'not in op:continue
  params=[]
  for p in methods.get('parameters',[])+op.get('parameters',[]):
   if '$ref'in p:
    cur=a
    for seg in p['$ref'][2:].split('/'):cur=cur[seg]
    p=cur
   params.append(p)
  for name in re.findall(r'\{([^}]+)\}',url):
   assert any(p.get('in')=='path'and p.get('name')==name and p.get('required') for p in params),(url,method,name)
report={'scope':'SCHEMA_SYNTAX_REFERENCES_AND_PATH_SHAPE_ONLY_NOT_FULL_OAS_VALIDATION','schemaCount':len(checks),'jsonYamlEquivalent':True,'pathParametersValid':True,'status':'PASS','openapiSha256':hashlib.sha256((R/'contracts/openapi.json').read_bytes()).hexdigest()}
(R/'evidence/contract-validation.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))

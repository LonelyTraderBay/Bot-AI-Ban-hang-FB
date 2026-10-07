"""Compare planned artifact labels with disk and documented current counterparts."""
import hashlib, json, pathlib

output = pathlib.Path(__file__).resolve().parent
frontend = output.parents[1]
kit = frontend.parent / 'botsales-kit'
plan = json.loads((kit / 'execution/frontend-plan.json').read_text(encoding='utf-8'))
routes = json.loads((kit / 'contracts/route-manifest.json').read_text(encoding='utf-8'))['routes']
operations = json.loads((frontend / 'packages/contracts/src/operations.json').read_text(encoding='utf-8'))
counterparts = {
    ('FE024', 'tests/security/'): ['tests/security.spec.ts'],
    ('FE025', 'tests/performance/'): ['tests/artifacts/demo-preview.spec.ts'],
    ('FE026', '.github/workflows/'): ['../.github/workflows/frontend.yml'],
    ('FE027', 'tests/uat/'): ['tests/frontend.spec.ts', 'tests/vertical-slices/fe022-flows.spec.ts'],
}
known_routes = {route['id'] for route in routes}
rows = []
missing = []
for task in plan['tasks']:
    unknown_routes = sorted(set(task['routeIds']) - known_routes)
    unknown_operations = sorted(set(task['operationIds']) - set(operations))
    if unknown_routes or unknown_operations:
        missing.append({'task': task['id'], 'unknownRoutes': unknown_routes, 'unknownOperations': unknown_operations})
    for path in task['deliverables']:
        original = frontend / path
        targets = [path] if original.exists() else counterparts.get((task['id'], path), [])
        absent = [target for target in targets if not (frontend / target).exists()]
        if not targets or absent:
            missing.append({'task': task['id'], 'planned': path, 'absentCounterparts': absent})
        rows.append({'task': task['id'], 'planned': path,
                     'disposition': 'EXISTING_PLANNED_ARTIFACT' if original.exists() else 'DOCUMENTED_CURRENT_COUNTERPART',
                     'current': [{'path': target, 'kind': 'directory' if (frontend / target).is_dir() else 'file',
                                  'sha256': hashlib.sha256((frontend / target).read_bytes()).hexdigest() if (frontend / target).is_file() else None} for target in targets],
                     'reason': 'Actual disk existence only; not task acceptance or branch coverage.' if original.exists() else 'Original proposed folder label reconciled in FRONTEND_PLAN_GUIDE; current implementation uses these existing owners. Does not alter task writeScope or earn checkpoints.'})
report = {'scope': 'FRONTEND_PLAN_ARTIFACT_AND_ID_RECONCILIATION_ONLY_NOT_IMPLEMENTATION_PERCENT',
          'tasks': len(plan['tasks']), 'plannedArtifactDeclarations': len(rows),
          'existingDeclarations': sum(row['disposition'] == 'EXISTING_PLANNED_ARTIFACT' for row in rows),
          'documentedCounterparts': sum(row['disposition'] == 'DOCUMENTED_CURRENT_COUNTERPART' for row in rows),
          'canonicalRoutes': len(routes), 'canonicalOperations': len(operations),
          'uniqueTaskRouteIds': len({route for task in plan['tasks'] for route in task['routeIds']}),
          'uniqueTaskOperationIds': len({operation for task in plan['tasks'] for operation in task['operationIds']}),
          'missing': missing, 'artifacts': rows}
(output / 'frontend-plan-artifacts-current.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: value for key, value in report.items() if key != 'artifacts'}, indent=2))
raise SystemExit(1 if missing else 0)

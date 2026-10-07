"""Discover literal file references, separate from Markdown-link validation."""
import hashlib, json, pathlib, re

output = pathlib.Path(__file__).resolve().parent
repository = output.parents[2]
audit = json.loads((output.parent / 'frontend-ui-document-audit-20261007/audit-current.json').read_text(encoding='utf-8'))
rows = []
seen = set()
for document in audit['documents']:
    if document['category'] != 'active-document' and document['path'] != 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md':
        continue
    file = repository / document['path']
    if file.suffix.lower() not in ('.md', '.txt'):
        continue
    text = file.read_text(encoding='utf-8')
    text = re.sub(r'^\s*(```|~~~)[\s\S]*?^\s*\1[^\n]*$', '', text, flags=re.M)
    for value in re.findall(r'(?<!`)`([^`\n]+)`(?!`)', text):
        if '/' not in value or not re.fullmatch(r'[.A-Za-z0-9_/-]+\.(?:md|json|mjs|js|ts|tsx|py|html|css|yml|yaml|txt)', value):
            continue
        key = document['path'], value
        if key in seen:
            continue
        seen.add(key)
        bases = [file.parent, repository, repository / 'BotSalesAI_Frontend', repository / 'botsales-kit']
        if document['path'].startswith('BotSalesAI_Frontend/'):
            bases += [repository / 'BotSalesAI_Frontend' / base for base in ['apps/web/src', 'apps/web/src/modules', 'evidence/frontend-ui-improvements']]
        matches = sorted({(base / value).resolve().relative_to(repository).as_posix() for base in bases if (base / value).resolve().is_relative_to(repository) and (base / value).is_file()})
        rows.append({'document': key[0], 'reference': value, 'resolvedCandidates': matches,
                     'disposition': 'EXISTING_LITERAL_REFERENCE' if matches else 'REVIEW_REQUIRED'})
        if value == '.ts/.tsx':
            rows[-1].update(disposition='FILE_EXTENSION_ALTERNATIVES', reason='TypeScript filename extension notation, not a literal file.')
        elif not matches and document['path'].endswith('/FRONTEND_UI_IMPROVEMENT_PLAN.md') and value in ['apps/web/tests/layout-components.test.tsx', 'tests/layout-spacing.spec.ts']:
            context = [line for line in text.splitlines() if value in line]
            assert all('dự kiến' in line for line in context)
            rows[-1].update(disposition='HISTORICAL_PROPOSED_FILE', reason='Explicitly proposed test paths in the original implementation plan; not advertised as implemented tests.', context=context)
report = {'scope': 'Discovery of exact inline literal file paths in active documents; matches use declared workspace/document bases. A match does not prove code behavior. Planned globs/commands/templates are excluded.',
          'references': rows, 'total': len(rows), 'unresolved': [row for row in rows if row['disposition'] == 'REVIEW_REQUIRED']}
(output / 'literal-paths-current.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'total': len(rows), 'unresolved': report['unresolved']}, indent=2, ensure_ascii=False))
raise SystemExit(1 if report['unresolved'] else 0)

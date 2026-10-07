"""Capture kit checks and preserve prior release-test output as historical bytes."""
import datetime, hashlib, json, pathlib, shutil, subprocess, sys

output = pathlib.Path(__file__).resolve().parent
repository = output.parents[2]
kit = repository / 'botsales-kit'
node = shutil.which('node')
assert node
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
inputs = [kit / file for file in [
    'scripts/validate-release.py', 'scripts/generate-theme.py', 'scripts/sync-release.py',
    'scripts/progress.mjs', 'scripts/test_release.py', 'scripts/test_release_sync.py',
    'design/tokens.json', 'design/decision.json', 'reference/tokens-v2.1-approved.json',
    'execution/frontend-token-extension-record.json', 'execution/plan.json',
    'execution/progress.json', 'execution/frontend-plan.json', 'execution/frontend-progress.json',
    'AI_RULES.md', 'prototype/build.py', 'prototype/index.html', 'execution/FRONTEND_PLAN_GUIDE.md',
]] + [repository / 'BotSalesAI_Frontend/AI_RULES.md']
before = {path.relative_to(repository).as_posix(): sha(path) for path in inputs}
checks = [
    ('release', [sys.executable, '-X', 'utf8', 'scripts/validate-release.py', '--no-write']),
    ('token-extension-tests', [sys.executable, '-X', 'utf8', 'scripts/test_release_sync.py', '-v']),
    ('release-self-tests', [sys.executable, '-X', 'utf8', 'scripts/test_release.py']),
    ('release-generator', [sys.executable, '-X', 'utf8', 'scripts/sync-release.py', '--check']),
    ('theme-generator', [sys.executable, '-X', 'utf8', 'scripts/generate-theme.py', '--check']),
    ('prototype-generator', [sys.executable, '-X', 'utf8', 'prototype/build.py', '--check']),
    ('fe-structure', [node, 'scripts/progress.mjs', 'validate']),
    ('fe-status', [node, 'scripts/progress.mjs', 'status']),
]
historical = kit / 'evidence/release-tests.json'
original = historical.read_bytes()
records = []
try:
    for name, args in checks:
        start = datetime.datetime.now(datetime.timezone.utc).isoformat()
        result = subprocess.run(args, cwd=kit, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        log = output / ('kit-' + name + '.log')
        log.write_bytes(result.stdout)
        record = {'name': name, 'args': args, 'cwd': str(kit), 'startedAt': start,
                  'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  'exitCode': result.returncode,
                  'log': {'path': log.relative_to(repository).as_posix(), 'sha256': sha(log)}}
        if name == 'release-self-tests':
            artifact = output / 'kit-release-self-tests.json'
            artifact.write_bytes(historical.read_bytes())
            record['artifact'] = {'path': artifact.relative_to(repository).as_posix(), 'sha256': sha(artifact)}
            historical.write_bytes(original)
        records.append(record)
        print(json.dumps({'name': name, 'exitCode': result.returncode}, ensure_ascii=False), flush=True)
finally:
    historical.write_bytes(original)
drift = [name for name, digest in before.items() if sha(repository / name) != digest]
report = {'checks': records, 'sourceFingerprints': before, 'sourceDrift': drift,
          'historicalReleaseTestsPreserved': historical.read_bytes() == original,
          'scope': 'KIT_DOCUMENTATION_GENERATOR_AND_VALIDATOR_CHECKS; NOT_APPLICATION_OR_BACKEND_PROOF'}
(output / 'kit-checks-record.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
raise SystemExit(1 if drift or any(record['exitCode'] for record in records) else 0)

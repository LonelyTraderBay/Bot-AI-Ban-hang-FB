"""Run canonical tracker self-tests without replacing the historical output."""
import datetime, hashlib, json, pathlib, subprocess, sys
output = pathlib.Path(__file__).resolve().parent
repository = output.parents[2]
kit = repository / 'botsales-kit'
sha = lambda file: hashlib.sha256(file.read_bytes()).hexdigest()
inputs = [kit / name for name in ['scripts/progress.mjs','scripts/test_progress.py','execution/frontend-plan.json','execution/frontend-command-map.json']]
before = {file.relative_to(repository).as_posix(): sha(file) for file in inputs}
historical = kit / 'evidence/tracker-tests.json'
original = historical.read_bytes()
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
args = [sys.executable,'-X','utf8','scripts/test_progress.py']
try:
    result = subprocess.run(args,cwd=kit,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    artifact = historical.read_bytes()
finally:
    historical.write_bytes(original)
log = output / 'progress-tests.log'
log.write_bytes(result.stdout)
(output / 'progress-tests.json').write_bytes(artifact)
drift = [name for name, digest in before.items() if sha(repository / name) != digest]
record = {'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'args':args,'cwd':str(kit),'exitCode':result.returncode,'sourceFingerprints':before,'sourceDrift':drift,'originalPreserved':historical.read_bytes()==original,'log':{'path':log.relative_to(repository).as_posix(),'sha256':sha(log)}}
(output / 'progress-tests-record.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'exitCode':result.returncode,'sourceDrift':drift,'originalPreserved':record['originalPreserved']}))
raise SystemExit(result.returncode or bool(drift))

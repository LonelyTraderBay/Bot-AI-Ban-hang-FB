import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const output = import.meta.dirname, root = path.resolve(output, '../..'), repo = path.dirname(root);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = file => path.relative(repo, file).replaceAll('\\', '/');
const adoption = read(path.join(output, 'adoption-current.json'));
const gates = read(path.join(output, 'source-checks-current.json'));
const prior = read(path.join(root, 'evidence/frontend-width-fixes-20261008/S19-current-evidence.json'));
const drift = input => Object.entries(input).filter(([file, digest]) => !fs.existsSync(path.join(repo, file)) || sha(path.join(repo, file)) !== digest).map(([file]) => file);
const adoptionDrift = drift(adoption.sourceFingerprints), previousDrift = drift(prior.sourceFingerprints);
if (adoptionDrift.length || previousDrift.length) throw Error('Source drift: ' + JSON.stringify({adoptionDrift, previousDrift}));
const headings = [...fs.readFileSync(path.join(output, 'SCREEN_MATRIX.md'), 'utf8').matchAll(/^## (R\d{2}) — /gm)].map(match => match[1]);
if (headings.length !== 54 || new Set(headings).size !== 54 || adoption.routes.some(r => !headings.includes(r.id))) throw Error('Screen report coverage mismatch');
const links = [];
for (const filename of ['REPORT.md', 'SCREEN_MATRIX.md']) {
  const markdown = fs.readFileSync(path.join(output, filename), 'utf8');
  for (const match of markdown.matchAll(/\]\(([A-Za-z]:\/[^)]+)\)/g)) {
    const target = match[1].replace(/:\d+$/, '');
    if (!fs.existsSync(target)) throw Error('Missing file link: ' + target);
    links.push(target);
  }
}
for (const run of gates.runs) {
  const log = path.join(repo, run.log.path);
  if (sha(log) !== run.log.sha256 || run.exitCode || run.status !== 'PASS' || run.findings !== 0) throw Error('Scanner proof mismatch: ' + run.id);
}
const artifacts = ['audit-shared.mjs', 'run-source-checks.mjs', 'render-report.mjs', 'finalize-audit.mjs', 'adoption-current.json', 'source-checks-current.json', 'REPORT.md', 'SCREEN_MATRIX.md'].map(file => path.join(output, file)).concat(gates.runs.map(run => path.join(repo, run.log.path)));
const record = {
  recordedAt: new Date().toISOString(), status: 'AUDIT_COMPLETE', scope: 'Source Shared UI adoption audit; no product edits or new runtime acceptance',
  HEAD: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding: 'utf8'}).trim(),
  routeCount: adoption.routes.length, routeSections: headings.length, fileLinksChecked: links.length,
  sourceScriptFiles: adoption.summary.sourceScriptFiles, sharedApis: adoption.summary.publicApis,
  routesWithShared: adoption.summary.routesWithShared, topLevelLocalReactComponents: adoption.summary.localFeatureComponents,
  topLevelLocalRenderHelpers: adoption.summary.localFeatureRenderHelpers,
  adoptionInputFingerprintsChecked: Object.keys(adoption.sourceFingerprints).length,
  previousFinalFingerprintsChecked: Object.keys(prior.sourceFingerprints).length,
  adoptionDrift, previousDrift,
  actualSourceChecks: gates.runs.map(({id, exitCode, status, files, findings, exceptions}) => ({id, exitCode, status, files, findings, exceptions})),
  artifacts: artifacts.map(file => ({path: rel(file), sha256: sha(file)})),
  limits: ['No new unit/E2E/browser/build run in this audit.', 'Conditional JSX inventory is a union, not a branch-by-branch DOM proof.', 'Current browser tab/server was not inspected in this audit.', 'No canonical tracker or user acceptance status changed.'],
};
fs.writeFileSync(path.join(output, 'audit-final.json'), JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify({...record, artifacts: record.artifacts.map(a => a.path)}));

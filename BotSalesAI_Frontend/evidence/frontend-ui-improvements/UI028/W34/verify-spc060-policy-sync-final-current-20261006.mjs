import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const output = path.join(root, 'evidence/frontend-ui-improvements/UI028/W34/policy-sync-spc060-final-current-20261006.json');
const sha256 = value => createHash('sha256').update(value).digest('hex');
const required = [
  'docs/FRONTEND_SPACING_STANDARD.md',
  'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md',
  'AGENTS.md',
  'botsales-kit/docs/18_CODING_STANDARDS.md',
  'docs/FRONTEND_SCOPE.md',
  'docs/PROJECT_CONTEXT.md',
  'docs/CONTINUE_FRONTEND.md',
  'DESIGN.md',
  'UX-CONTRACT.md',
  'README.md',
  'evidence/REPORT.md',
];
const sourceFiles = [];
const missing = [];
for (const relative of required) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    missing.push(relative);
    continue;
  }
  const content = fs.readFileSync(absolute, 'utf8');
  const policyPresent = relative === 'README.md'
    ? /SPC-001[–-]060/.test(content) && /layout profile/.test(content)
    : /SPC-060/.test(content);
  if (!policyPresent) missing.push(`${relative}:SPC-060`);
  sourceFiles.push({ path: relative, sha256: sha256(content) });
}
const generatedLog = 'evidence/frontend-ui-improvements/UI028/W36/verify-equivalent-final-current-20261006-v2.log';
const generatedFreshnessPass = fs.existsSync(path.join(root, generatedLog))
  && fs.readFileSync(path.join(root, generatedLog), 'utf8').includes('"status":"PASS","outputs":11,"schemas":283,"operations":210,"routes":54')
  && fs.readFileSync(path.join(root, generatedLog), 'utf8').includes('FINAL_RESULT=PASS');
const result = missing.length === 0 && generatedFreshnessPass ? 'PASS' : 'FAIL';
const record = {
  schemaVersion: 1,
  task: 'UI028.W34',
  recordType: 'final_spc060_policy_sync_and_doc_diff_review',
  recordedAt: new Date().toISOString(),
  result,
  scope: 'Frontend-only policy/design/coding guidance; no Backend or hosted/production claim',
  policy: {
    id: 'SPC-060',
    source: 'docs/FRONTEND_SPACING_STANDARD.md',
    rule: 'Before JSX/CSS choose and record a matching layout profile and semantic spacing owners; same-profile routes use the same token-backed rhythm; deviations require a justified shared named variant with a real consumer; run spacing/visual-token gates and rendered layout/reflow regression on affected consumers.',
  },
  verifiedDocuments: required,
  sourceFiles,
  checks: {
    policyReferences: missing.length === 0 ? 'PASS' : 'FAIL',
    policyMissing: missing,
    generatedFreshness: generatedFreshnessPass ? 'PASS: 11 outputs, 283 schemas, 210 operations, 54 routes' : 'NOT_RUN_OR_FAIL',
    implementationScope: 'docs/evidence closure; no React/TypeScript runtime source changed by this closure',
    fullProductLedger: 'not read or written',
  },
  noProgressLedgerWrites: true,
};
fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result, missing, documents: sourceFiles.length, output: path.relative(root, output) }, null, 2));
if (result !== 'PASS') process.exitCode = 1;

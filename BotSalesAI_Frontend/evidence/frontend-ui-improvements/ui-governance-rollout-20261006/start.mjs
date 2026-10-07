// Freeze implementation intake before the first source edit; never overwrite it.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const directory = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const target = path.join(directory, 'S03-before.json');
if (fs.existsSync(target)) throw new Error('Immutable baseline already exists; do not overwrite');
const original = JSON.parse(fs.readFileSync('evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.json', 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = original.files.map(file => ({ ...file, sha256: hash(file.path), baselineSha256: file.sha256,
  changedSinceSpecification: hash(file.path) !== file.sha256 }));
const protectedPaths = ['botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json',
  'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-progress.json', 'AI_RULES.md', 'botsales-kit/AI_RULES.md'];
const checks = ['check-layout', 'check-visual-tokens', 'check-ui-composition'].map(name => {
  const command = [process.execPath, `scripts/${name}.mjs`, '--json'];
  const run = spawnSync(command[0], command.slice(1), { encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(path.join(directory, `${name}-before.log`), `${run.stdout ?? ''}${run.stderr ?? ''}`);
  let report; try { report = JSON.parse(run.stdout); } catch { report = null; }
  return { command, exitCode: run.status, error: run.error?.message, files: report?.files,
    findings: report?.findings?.length ?? report?.issues?.length, status: report?.status };
});
const baseline = { checkedAt: new Date().toISOString(), mode: 'IMPLEMENTATION_AUTHORIZED_BY_CURRENT_USER',
  scope: 'Full existing plan S03–S20; Frontend synthetic mock only; no shortened objective.', cwd: process.cwd(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  gitStatus: execFileSync('git', ['status', '--porcelain=v1'], { encoding: 'utf8', maxBuffer: 16e6 }),
  indexFingerprint: createHash('sha256').update(execFileSync('git', ['ls-files', '-s', '-z'], { maxBuffer: 16e6 })).digest('hex'),
  files, protectedFiles: protectedPaths.map(file => ({ file, sha256: hash(file) })), checks,
  compiler: { actual: ts.version, pinned: JSON.parse(fs.readFileSync('package.json', 'utf8')).devDependencies.typescript,
    localPath: fs.realpathSync('node_modules/typescript'), globalFallback: 'NOT_EXECUTED; remove ambiguous fallback with meaningful tests at S03' },
  uiIntent: 'Apply uniform canonical owners/finite APIs/gates to every inventoried frontend file and affected route/state.',
  baselinePolicy: 'Source/checker baseline for tooling S03–S10. Capture loaded rendered BEFORE for each actual UI batch at S15/S11/S12, not a generic screenshot now.',
  acceptance: { S03: 'Refresh classification/hash/import closure; pinned compiler finite path; no mutation of ledgers/originals/index.',
    S04: 'Empty/missing/parse/new/import/source/style boundaries detected; source coverage reconciles inventory, generated/library handled separately.' } };
fs.writeFileSync(target, JSON.stringify(baseline, null, 2) + '\n');
process.stdout.write(JSON.stringify({baseline: target, files: files.length, compiler: baseline.compiler, checks}) + '\n');

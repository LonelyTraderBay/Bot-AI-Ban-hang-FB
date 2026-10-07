import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const logPath = path.join(root, 'evidence/frontend-ui-improvements/UI028/W36/verify-equivalent-final-current-20261006-v2.log');
const node = process.execPath;
const gates = [
  ['generate:check', root, ['scripts/generate.mjs', '--check']],
  ['source checker', root, ['scripts/check-source.mjs']],
  ['source checker fixtures', root, ['--test', 'tests/source-checker.test.mjs']],
  ['module boundaries', root, ['scripts/check-boundaries.mjs']],
  ['eslint', root, ['node_modules/eslint/bin/eslint.js', 'apps/web/src', '--max-warnings', '0']],
  ['TypeScript', root, ['node_modules/typescript/bin/tsc', '-p', 'apps/web/tsconfig.json', '--noEmit']],
  ['domain and MSW mock contracts', root, ['scripts/test-domain.mjs']],
  ['Vitest', root, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'apps/web/vitest.config.ts']],
  ['production Vite build', path.join(root, 'apps/web'), [path.join(root, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'production']],
  ['layout checker fixtures', root, ['--test', 'tests/layout-checker.test.mjs']],
  ['strict layout gate', root, ['scripts/check-layout.mjs']],
  ['visual-token checker fixtures', root, ['--test', 'tests/visual-token-checker.test.mjs']],
  ['visual-token gate', root, ['scripts/check-visual-tokens.mjs']],
];
const lines = [`Final ordered Frontend verify equivalents`, `startedAt=${new Date().toISOString()}`, `node=${node}`, `cwd=${root}`];
const results = [];
for (const [name, cwd, args] of gates) {
  const command = `${node} ${args.join(' ')}`;
  const result = spawnSync(node, args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  const exitCode = result.status ?? 1;
  lines.push('', `>>> ${name}`, `cwd=${cwd}`, `command=${command}`, `exitCode=${exitCode}`);
  if (result.error) lines.push(`spawnError=${result.error.message}`);
  if (result.stdout) lines.push('--- stdout ---', result.stdout.trimEnd());
  if (result.stderr) lines.push('--- stderr ---', result.stderr.trimEnd());
  results.push({ name, exitCode, ...(result.error ? { error: result.error.message } : {}) });
  lines.push(`<<< ${name} ${exitCode === 0 ? 'PASS' : 'FAIL'}`);
  if (exitCode !== 0) break;
}
const passed = results.length === gates.length && results.every(result => result.exitCode === 0);
lines.push('', `FINAL_RESULT=${passed ? 'PASS' : 'FAIL'}`, `completedAt=${new Date().toISOString()}`);
fs.writeFileSync(logPath, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ result: passed ? 'PASS' : 'FAIL', gatesPassed: results.filter(item => item.exitCode === 0).length, gateCount: gates.length, results, log: path.relative(root, logPath) }, null, 2));
if (!passed) process.exitCode = 1;

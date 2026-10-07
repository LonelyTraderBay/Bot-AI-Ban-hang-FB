import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const cold = process.argv[2] === 'cold';
const audit = path.join(root, 'evidence/frontend-architecture-audit-20261002');
const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-architecture-20261002-'));
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = [];
for (const relative of tracked) {
  const source = path.resolve(root, relative);
  const target = path.resolve(copy, relative);
  if (!source.startsWith(root + path.sep) || !target.startsWith(copy + path.sep)) throw new Error('Path escapes snapshot');
  if (!fs.existsSync(source)) continue;
  if (!fs.statSync(source).isFile()) continue;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const bytes = fs.readFileSync(source);
  fs.writeFileSync(target, bytes);
  files.push({ path: relative.replaceAll('\\', '/'), bytes: bytes.length, sha256: digest(bytes) });
}
const junctions = [];
for (const relative of cold ? [] : ['node_modules', 'apps/web/node_modules']) {
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) continue;
  const target = path.join(copy, relative);
  fs.symlinkSync(source, target, 'junction');
  junctions.push({ source, target });
}
const relevant = files.filter(f => /^(apps\/web\/(src\/|tests\/|public\/|[^/]+\.(json|ts)$)|packages\/|scripts\/|tests\/|botsales-kit\/(contracts|design)\/|package(-lock)?\.json$|playwright\.config\.ts$|eslint\.config\.mjs$)/.test(f.path));
const report = {
  createdAt: new Date().toISOString(), scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  root, copy, node: process.version,
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  copiedFiles: files.length, copiedBytes: files.reduce((n, f) => n + f.bytes, 0),
  note: cold ? 'Current tracked file bytes copied to a separate workspace without node_modules; cold npm ci is to be performed here.' : 'Current tracked file bytes copied to an isolated workspace; installed dependencies reused by junction. This is not a new cold install. Tests may write only snapshot evidence/build outputs.',
  junctions, relevantFiles: relevant,
  sourceFingerprint: digest(Buffer.from(relevant.map(f => `${f.path}\0${f.sha256}`).join('\n'))),
};
fs.writeFileSync(path.join(audit, cold ? 'snapshot-cold.json' : 'snapshot.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ copy, copiedFiles: report.copiedFiles, copiedBytes: report.copiedBytes, relevantFiles: relevant.length, sourceFingerprint: report.sourceFingerprint }));

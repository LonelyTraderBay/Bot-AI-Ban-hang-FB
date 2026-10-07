import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const dir = path.join(root, 'botsales-kit/execution/frontend-evidence/FE002');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const commandMap = readJson('botsales-kit/execution/frontend-command-map.json');
const registered = commandMap.commands.find(item => item.id === 'clean-install');
if (!registered || registered.status !== 'VERIFIED_AVAILABLE') throw new Error('Registered clean-install command is unavailable.');

const temp = path.join(os.tmpdir(), `botsales-fe002-clean-install-post-security-update-${crypto.randomUUID()}`);
fs.mkdirSync(path.join(temp, 'apps/web'), { recursive: true });
for (const file of ['package.json', 'package-lock.json', '.npmrc', '.node-version', 'apps/web/package.json']) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error(`Required clean-install input is missing: ${file}`);
  fs.copyFileSync(source, path.join(temp, file));
}

const rootManifest = readJson('package.json');
const appManifest = readJson('apps/web/package.json');
const lock = readJson('package-lock.json');
const rootLock = lock.packages?.[''];
const appLock = lock.packages?.['apps/web'];
const exact = (left, right) => JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
const manifestMatch = ['dependencies', 'devDependencies', 'optionalDependencies']
  .every(section => exact(rootManifest[section], rootLock?.[section]));
const appManifestMatch = ['dependencies', 'devDependencies', 'optionalDependencies']
  .every(section => exact(appManifest[section], appLock?.[section]));
if (!manifestMatch || !appManifestMatch) throw new Error('Clean-install manifests do not match the committed lock metadata.');

const copiedLock = path.join(temp, 'package-lock.json');
const tempLockBefore = hash(fs.readFileSync(copiedLock));
const match = registered.command.match(/^(.+?\.exe) "([^"]+)" (.+)$/);
if (!match) throw new Error('Registered clean-install command is not in the expected Node/npm-cli form.');
const nodeExe = match[1];
const npmCli = match[2];
const args = ['--script-shell=powershell.exe', 'ci'];
const env = {
  ...process.env,
  PATH: ['C:\\Windows\\System32', 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0', 'C:\\Users\\Joker-PC\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\native\\powershell', path.dirname(nodeExe), process.env.PATH].filter(Boolean).join(';'),
};
const run = (runArgs, cwd) => spawnSync(nodeExe, runArgs, { cwd, env, encoding: 'utf8', windowsHide: true });
const install = run([npmCli, ...args], temp);
const installOutput = `${install.stdout ?? ''}${install.stderr ?? ''}`;
if (install.error) throw install.error;
if (install.status !== 0) throw new Error(`Clean npm ci failed (${install.status}): ${installOutput}`);

const npmLs = run([npmCli, 'ls', '--depth=0'], temp);
const npmLsOutput = `${npmLs.stdout ?? ''}${npmLs.stderr ?? ''}`;
if (npmLs.status !== 0 || !npmLsOutput.includes('typescript-eslint@8.71.0') || !npmLsOutput.includes('@mui/material@7.3.1'))
  throw new Error(`Clean npm dependency tree is not resolved as expected: ${npmLsOutput}`);

const runtimeProbe = run(['-e', "Promise.all([import('esbuild'), import('msw/browser')]).then(() => process.stdout.write('ESBUILD_IMPORT=PASS MSW_BROWSER_IMPORT=PASS\\n')).catch(error => { console.error(error); process.exitCode = 1; })"], temp);
const runtimeOutput = `${runtimeProbe.stdout ?? ''}${runtimeProbe.stderr ?? ''}`;
if (runtimeProbe.status !== 0 || !runtimeOutput.includes('ESBUILD_IMPORT=PASS') || !runtimeOutput.includes('MSW_BROWSER_IMPORT=PASS'))
  throw new Error(`Clean optional frontend imports failed: ${runtimeOutput}`);

const tempLockAfter = hash(fs.readFileSync(copiedLock));
const lines = [
  `command=${registered.command}`,
  `cleanWorkspace=${temp}`,
  `manifestMatch=${manifestMatch}`,
  `appManifestMatch=${appManifestMatch}`,
  `tempLockBefore=${tempLockBefore}`,
  `tempLockAfter=${tempLockAfter}`,
  'exitCode=0',
  '--- npm ci output ---', installOutput.trimEnd(),
  '--- npm ls --depth=0 ---', npmLsOutput.trimEnd(),
  '--- clean runtime probes ---', runtimeOutput.trimEnd(),
  `ESBUILD_BINARY=${fs.existsSync(path.join(temp, 'node_modules/.bin/esbuild.cmd')) ? 'PRESENT' : 'MISSING'}`,
];
fs.writeFileSync(path.join(dir, 'S05-clean-install-post-fix-current-20261006.log'), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ status: 'PASS', workspace: temp, lockSha256: tempLockAfter, installed: installOutput.match(/added \\d+ packages, and audited \\d+ packages/)?.[0] ?? 'npm ci succeeded', auditZero: installOutput.includes('found 0 vulnerabilities'), runtimeProbe: runtimeOutput.trim() }, null, 2));


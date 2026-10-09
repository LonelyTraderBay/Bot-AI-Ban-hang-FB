import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
const frontend = path.resolve(import.meta.dirname, '../..');
const runId = 'width-inherited-current-20261008';
const groups = [
  ['components', ['evidence/frontend-component-fixes-20261008/capture-component-browser-zoom.mjs', 'evidence/frontend-component-fixes-20261008/capture-component-text-zoom.mjs']],
  ['comparison', ['evidence/frontend-corrections-20261008/capture-comparison-browser-zoom.mjs', 'evidence/frontend-corrections-20261008/capture-comparison-text-zoom.mjs']],
  ['w30', ['evidence/frontend-ui-improvements/UI028/W30/capture-actual-browser-zoom-200-current-20261006.mjs', 'evidence/frontend-ui-improvements/UI028/W30/capture-native-text-only-200-current-20261006.mjs']],
  ['toolbar', ['evidence/frontend-toolbar-20261008/capture-toolbar-browser-zoom.mjs', 'evidence/frontend-toolbar-20261008/capture-toolbar-text-zoom.mjs']],
];
const env = {...process.env, BOTSALES_EVIDENCE_RUN_ID: runId, PATH: [path.dirname(process.execPath), path.join(frontend, 'node_modules/.bin'), 'C:/Windows/System32', 'C:/Windows', 'C:/Program Files/Git/cmd'].join(path.delimiter)};
const runs = [];
for (const [group, scripts] of groups) {
  const results = await Promise.all(scripts.map((script, index) => new Promise(resolve => {
    const logFile = path.join(import.meta.dirname, `native-inherited-${group}-${index}.log`);
    if (fs.existsSync(logFile)) throw new Error('Do not overwrite native attempts: ' + logFile);
    const log = fs.createWriteStream(logFile), startedAt = new Date().toISOString();
    const child = spawn(process.execPath, [script], {cwd: frontend, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']});
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => log.write(chunk));
    child.on('close', async code => {
      await new Promise(done => log.end(done));
      resolve({group, script, startedAt, finishedAt: new Date().toISOString(), exitCode: code ?? 1, log: {path: path.relative(path.dirname(frontend), logFile).replaceAll('\\','/'), sha256: crypto.createHash('sha256').update(fs.readFileSync(logFile)).digest('hex')}});
    });
  })));
  runs.push(...results);
  fs.writeFileSync(path.join(import.meta.dirname, 'native-inherited-executions.json'), JSON.stringify({runId, runs}, null, 2)+'\n');
  console.log(JSON.stringify(results.map(result => ({group: result.group, script: result.script, exitCode: result.exitCode}))));
  if (results.some(result => result.exitCode)) {process.exitCode = 1; break;}
}

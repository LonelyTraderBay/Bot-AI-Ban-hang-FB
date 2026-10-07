import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedViteCacheDir } from '../../../scripts/vite-cache.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outputPath = path.join(here, 'S18-targeted-ui012-regressions-20261003.log');
const tempParent = path.resolve(os.tmpdir());
const tempRoot = await mkdtemp(path.join(tempParent, 'botsales-ui012-s18-'));
const port = 5173;
const vitePath = path.join(root, 'node_modules/vite/bin/vite.js');
const playwrightPath = path.join(root, 'node_modules/@playwright/test/cli.js');
const runId = `ui012-s18-${randomUUID()}`;
const cacheDir = isolatedViteCacheDir(root, 'ui012-targeted-regression', runId);
const outputChunks = [];
let vite;
let playwright;
let result;

async function assertPortIsFree() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}

async function waitForServer(processRef, deadlineMs = 90000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < deadlineMs) {
    if (processRef.exitCode !== null || processRef.signalCode !== null) throw new Error('The isolated Vite server exited before ready.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Wait for Vite on the loopback interface. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('The isolated Vite server did not become ready in time.');
}

async function stop(processRef) {
  if (!processRef || processRef.exitCode !== null || processRef.signalCode !== null) return;
  const exited = new Promise(resolve => processRef.once('exit', resolve));
  processRef.kill();
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 7000))]);
}

try {
  await assertPortIsFree();
  const env = { ...process.env, BOTSALES_VITE_CACHE_DIR: cacheDir, BOTSALES_VITE_CACHE_RUN_ID: runId };
  vite = spawn(process.execPath, [vitePath, '--mode', 'demo', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: path.join(root, 'apps/web'), env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  vite.stdout.on('data', chunk => outputChunks.push(chunk.toString()));
  vite.stderr.on('data', chunk => outputChunks.push(chunk.toString()));
  await waitForServer(vite);

  playwright = spawn(process.execPath, [playwrightPath, 'test', 'tests/ui012-keyboard.spec.ts', '--reporter=line'], {
    cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  playwright.stdout.on('data', chunk => outputChunks.push(chunk.toString()));
  playwright.stderr.on('data', chunk => outputChunks.push(chunk.toString()));
  const exitCode = await new Promise((resolve, reject) => {
    playwright.once('error', reject);
    playwright.once('exit', code => resolve(code ?? 1));
  });
  result = { status: exitCode === 0 ? 'PASS' : 'FAIL', exitCode };
} catch (error) {
  result = { status: 'FAILED_TO_RUN', exitCode: 1, error: error instanceof Error ? error.stack ?? error.message : String(error) };
} finally {
  await stop(playwright);
  await stop(vite);
  const resolvedTemp = path.resolve(tempRoot);
  if (path.dirname(resolvedTemp) !== tempParent || !path.basename(resolvedTemp).startsWith('botsales-ui012-s18-')) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemp}`);
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  const header = [
    'UI012 targeted keyboard and 320 CSS-pixel text-flow regressions - 2026-10-03',
    'Scope: current React frontend + synthetic MSW; isolated local Chromium run.',
    `Status: ${result.status}; exit=${result.exitCode}.`,
    'Vite was started directly through the installed Node runtime to bypass only the unavailable npm child-shell launcher.',
    'No FE/product progress ledger or pre-existing evidence artifact was modified by this runner.',
    '',
  ].join('\n');
  await writeFile(outputPath, `${header}${result.error ? `${result.error}\n\n` : ''}${outputChunks.join('')}`, 'utf8');
}

console.log(JSON.stringify({ ...result, output: path.basename(outputPath) }, null, 2));
if (result.exitCode !== 0) process.exitCode = 1;

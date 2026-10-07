import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedViteCacheDir } from '../../../scripts/vite-cache.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outputPath = path.join(here, 'S16-current-full-e2e-20261003.log');
const tempParent = path.resolve(os.tmpdir());
const tempRoot = await mkdtemp(path.join(tempParent, 'botsales-ui012-s16-'));
const backupRoot = path.join(tempRoot, 'preserved-user-artifacts');
const port = 5173;
const vitePath = path.join(root, 'node_modules/vite/bin/vite.js');
const playwrightPath = path.join(root, 'node_modules/@playwright/test/cli.js');
const runId = `ui012-s16-${randomUUID()}`;
const cacheDir = isolatedViteCacheDir(root, 'ui012-current-full-e2e', runId);
const preservedPaths = [
  'botsales-kit/execution/frontend-evidence/FE025/demo-preview-metrics.json',
  'botsales-kit/execution/frontend-evidence/FE025/large-dataset-metrics.json',
  'botsales-kit/execution/frontend-evidence/FE026/demo-preview-overview.png',
  'evidence/frontend-ui-improvements/UI005/S02-create-selected-last-category.png',
  'evidence/frontend-ui-improvements/UI005/S03-edit-selected-outside-first-page.png',
  'evidence/frontend-ui-improvements/UI005/S03-edit-mobile.png',
  'evidence/frontend-ui-improvements/UI005/S04-edit-lookup-403-preserves-product.png',
  'evidence/frontend-ui-improvements/UI005/S03-request-trace.json',
  'evidence/frontend-ui-improvements/UI005/S03-acceptance.json',
  'evidence/frontend-ui-improvements/UI004/S02-final-list-25.png',
  'evidence/frontend-ui-improvements/UI004/S03-final-list-105.png',
  'evidence/frontend-ui-improvements/UI008/S04-R29-empty-after.png',
  'evidence/frontend-ui-improvements/UI008/S04-R30-empty-after.png',
];

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex').toUpperCase();
const outputChunks = [];
let vite;
let playwright;
let result;
const snapshots = [];

async function assertPortIsFree() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(port, '127.0.0.1', resolve);
  });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}

async function waitForServer(processRef, deadlineMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    if (processRef.exitCode !== null || processRef.signalCode !== null) throw new Error('The isolated demo Vite server exited before ready.');
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Wait for Vite to bind its local port. */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('The isolated demo Vite server did not become ready in time.');
}

async function stop(processRef) {
  if (!processRef || processRef.exitCode !== null || processRef.signalCode !== null) return;
  const exited = new Promise(resolve => processRef.once('exit', resolve));
  processRef.kill();
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 7000))]);
}

try {
  await assertPortIsFree();
  await mkdir(backupRoot, { recursive: true });
  for (const relativePath of preservedPaths) {
    const absolutePath = path.join(root, relativePath);
    try {
      const bytes = await readFile(absolutePath);
      const backupPath = path.join(backupRoot, relativePath);
      await mkdir(path.dirname(backupPath), { recursive: true });
      await copyFile(absolutePath, backupPath);
      snapshots.push({ relativePath, existed: true, sha256: sha256(bytes) });
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      snapshots.push({ relativePath, existed: false, sha256: null });
    }
  }

  const env = { ...process.env, BOTSALES_VITE_CACHE_DIR: cacheDir, BOTSALES_VITE_CACHE_RUN_ID: runId };
  vite = spawn(process.execPath, [vitePath, '--mode', 'demo', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: path.join(root, 'apps/web'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  vite.stdout.on('data', chunk => outputChunks.push(chunk.toString()));
  vite.stderr.on('data', chunk => outputChunks.push(chunk.toString()));
  await waitForServer(vite);

  playwright = spawn(process.execPath, [playwrightPath, 'test', '--reporter=line'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  playwright.stdout.on('data', chunk => outputChunks.push(chunk.toString()));
  playwright.stderr.on('data', chunk => outputChunks.push(chunk.toString()));
  const exitCode = await new Promise((resolve, reject) => {
    playwright.once('error', reject);
    playwright.once('exit', code => resolve(code ?? 1));
  });
  result = { status: exitCode === 0 ? 'PASS' : 'FAIL', exitCode, snapshots };
} catch (error) {
  result = { status: 'FAILED_TO_RUN', exitCode: 1, error: error instanceof Error ? error.stack ?? error.message : String(error), snapshots };
} finally {
  await stop(playwright);
  await stop(vite);
  for (const snapshot of snapshots.filter(item => item.existed)) {
    const source = path.join(backupRoot, snapshot.relativePath);
    const destination = path.join(root, snapshot.relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    const restoredHash = sha256(await readFile(destination));
    if (restoredHash !== snapshot.sha256) throw new Error(`Could not restore prior bytes exactly: ${snapshot.relativePath}`);
  }
  const resolvedTemp = path.resolve(tempRoot);
  if (path.dirname(resolvedTemp) !== tempParent || !path.basename(resolvedTemp).startsWith('botsales-ui012-s16-')) {
    throw new Error(`Refusing to remove unexpected temporary path: ${resolvedTemp}`);
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  const header = [
    'UI012 current full rebuilt-demo E2E - 2026-10-03',
    'Scope: current React frontend + synthetic MSW, local Chromium only.',
    `Status: ${result.status}; exit=${result.exitCode}.`,
    `Pre-existing artifact files snapshotted: ${snapshots.filter(item => item.existed).length}/${snapshots.length}; restored and SHA-256 verified byte-identically.`,
    'No FE/product progress ledger was modified.',
    '',
  ].join('\n');
  await writeFile(outputPath, `${header}${result.error ? `${result.error}\n\n` : ''}${outputChunks.join('')}`, 'utf8');
}

console.log(JSON.stringify({ status: result.status, exitCode: result.exitCode, preservedFilesRestored: snapshots.filter(item => item.existed).length, output: path.basename(outputPath) }, null, 2));
if (result.exitCode !== 0) process.exitCode = 1;

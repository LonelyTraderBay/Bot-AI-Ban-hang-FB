import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const outputPath = path.join(here, 'S15-built-artifacts-20261003.json');
const markers = ['setupWorker(', 'DEMO-NOT-A-REAL-PAIRING', 'Joker Studio', 'shop-second', 'service worker mô phỏng'];

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

async function inspect(label, relativeRoot, production = false) {
  const directory = path.join(root, relativeRoot);
  const files = await filesUnder(directory);
  const entries = [];
  const foundMarkers = new Set();
  for (const absolute of files) {
    const bytes = await readFile(absolute);
    const relative = path.relative(directory, absolute).replaceAll('\\', '/');
    entries.push({ path: relative, sha256: createHash('sha256').update(bytes).digest('hex').toUpperCase() });
    if (production && relative.endsWith('.js')) {
      const source = bytes.toString('utf8');
      for (const marker of markers) if (source.includes(marker)) foundMarkers.add(marker);
    }
  }
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const manifest = createHash('sha256').update(JSON.stringify(entries)).digest('hex').toUpperCase();
  return {
    label,
    directory: relativeRoot,
    fileCount: files.length,
    manifestSha256: manifest,
    mockWorkerFilePresent: files.some(file => path.basename(file) === 'mockServiceWorker.js'),
    productionMockMarkers: production ? [...foundMarkers] : undefined,
    status: production && (files.some(file => path.basename(file) === 'mockServiceWorker.js') || foundMarkers.size > 0) ? 'FAIL' : 'PASS',
  };
}

const artifacts = [
  await inspect('production', 'apps/web/dist', true),
  await inspect('demo', 'apps/web/dist-demo'),
];
const result = {
  recordedAt: '2026-10-03',
  scope: 'Current Vite production/demo artifacts from the post-Reports-fix source; local build only.',
  artifacts,
  productionMockIsolation: artifacts[0].status,
  status: artifacts.every(artifact => artifact.status === 'PASS') ? 'PASS' : 'FAIL',
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
if (result.status !== 'PASS') process.exitCode = 1;

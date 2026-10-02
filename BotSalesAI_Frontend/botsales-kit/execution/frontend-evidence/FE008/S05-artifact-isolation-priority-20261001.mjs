import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const production = path.join(repo, 'apps/web/dist');
const demo = path.join(repo, 'apps/web/dist-demo');
const checks = [];
const assert = (condition, label, details = '') => {
  checks.push({ label, result: condition ? 'PASS' : 'FAIL', ...(details ? { details } : {}) });
  if (!condition) throw new Error(`${label}${details ? `: ${details}` : ''}`);
};
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(file) : [file];
});

const productionFiles = walk(production);
const demoFiles = walk(demo);
const productionJs = productionFiles.filter(file => file.endsWith('.js'));
const demoJs = demoFiles.filter(file => file.endsWith('.js'));
const productionText = productionJs.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const demoText = demoJs.map(file => fs.readFileSync(file, 'utf8')).join('\n');
const productionWorkerOccurrences = productionText.match(/mockServiceWorker\.js/g)?.length ?? 0;
const demoBrowserAssets = demoJs.filter(file => path.basename(file).startsWith('browser-'));

assert(fs.existsSync(path.join(production, 'index.html')), 'production index exists');
assert(fs.existsSync(path.join(demo, 'index.html')), 'demo index exists');
assert(!fs.existsSync(path.join(production, 'mockServiceWorker.js')), 'production mock worker file absent');
assert(!productionFiles.some(file => path.basename(file).startsWith('browser-')), 'production bundle excludes MSW browser runtime');
assert(productionWorkerOccurrences === 1, 'production worker reference only supports unregister cleanup', `occurrences=${productionWorkerOccurrences}`);
assert(fs.existsSync(path.join(demo, 'mockServiceWorker.js')), 'demo mock worker emitted');
assert(demoBrowserAssets.length > 0, 'demo includes MSW browser runtime', `assets=${demoBrowserAssets.map(file => path.basename(file)).join(',')}`);
assert(demoText.includes('Dữ liệu mô phỏng'), 'demo bundle labels synthetic data');
assert(!productionText.includes('Dữ liệu mô phỏng'), 'production bundle does not enable synthetic demo banner');

console.log(JSON.stringify({ status: 'PASS', checks, productionJsAssets: productionJs.length, demoJsAssets: demoJs.length }, null, 2));

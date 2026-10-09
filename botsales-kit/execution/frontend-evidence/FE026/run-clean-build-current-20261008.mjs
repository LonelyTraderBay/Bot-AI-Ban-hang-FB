import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const frontendSource = path.join(repo, 'BotSalesAI_Frontend');
const kitSource = path.join(repo, 'botsales-kit');
const evidenceDir = path.join(kitSource, 'execution/frontend-evidence/FE026');
const frontendLock = path.join(frontendSource, 'package-lock.json');
const workflowSource = path.join(repo, '.github/workflows/frontend.yml');
const prefix = 'botsales-fe026-clean-current-20261008-';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
const tempFrontend = path.join(tempRoot, 'BotSalesAI_Frontend');
const tempKit = path.join(tempRoot, 'botsales-kit');
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const runs = [];
const sourceLockSha256 = sha256(fs.readFileSync(frontendLock));
const rootWorkflowSha256 = sha256(fs.readFileSync(workflowSource));
const workflowSnapshot = path.join(evidenceDir, 'frontend-workflow-config-current-20261008-attempt03.yml');
fs.writeFileSync(workflowSnapshot, fs.readFileSync(workflowSource), 'utf8');
let failure = null;
let artifactManifest = null;
let cleaned = false;

function excluded(source, root, excludedNames, excludeKitEvidence = false) {
    const relative = path.relative(root, source).split(path.sep).filter(Boolean);
    if (relative.some(segment => excludedNames.has(segment))) return true;
    if (relative.length && (relative.at(-1) === '.env' || (relative.at(-1).startsWith('.env.') && relative.at(-1) !== '.env.example'))) return true;
    if (excludeKitEvidence && relative.slice(0, 2).join('/') === 'execution/frontend-evidence') return true;
    try {
        if (fs.lstatSync(source).isSymbolicLink()) return true;
    } catch {
        return true;
    }
    return false;
}

const frontendExclusions = new Set(['.git', 'node_modules', 'dist', 'dist-demo', 'coverage', 'test-results', 'playwright-report', '.vite', '.cache']);
const kitExclusions = new Set(['.git', 'node_modules']);

function currentLockCopyMatches() {
    const copyPath = path.join(tempFrontend, 'package-lock.json');
    return fs.existsSync(copyPath) && sha256(fs.readFileSync(copyPath)) === sourceLockSha256;
}

function childEnvironment() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^(VITE_|API_PROXY_TARGET$|BOTSALES_(VITE_CACHE|DESIGN_EVIDENCE|EVIDENCE)|PLAYWRIGHT_|CI$)/i.test(key)) delete env[key];
    }
    const nodeDirectory = path.dirname(process.execPath);
    const pathEntries = [
        path.join(tempFrontend, 'node_modules/.bin'),
        path.join(tempFrontend, 'apps/web/node_modules/.bin'),
        nodeDirectory,
        'C:\\Windows\\System32',
        'C:\\Windows',
        'C:\\Windows\\System32\\Wbem',
        'C:\\Program Files\\Git\\cmd',
    ];
    for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
    env.PATH = pathEntries.join(path.delimiter);
    return env;
}

const env = childEnvironment();

function run(name, args, { node = false } = {}) {
    const executable = node ? process.execPath : process.execPath;
    const argv = node ? args : [npmCli, '--script-shell=cmd.exe', ...args];
    const command = `node ${argv.map(value => `"${value}"`).join(' ')}`;
    const result = spawnSync(executable, argv, {
        cwd: tempFrontend,
        encoding: 'utf8',
        env,
        maxBuffer: 96 * 1024 * 1024,
        windowsHide: true,
    });
    const entry = {
        name,
        command,
        cwd: tempFrontend,
        exitCode: result.status ?? 1,
        output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\nspawnError=${result.error.message}` : ''}`,
    };
    runs.push(entry);
    return entry;
}

function artifactTree(directory) {
    if (!fs.existsSync(directory)) throw new Error(`Missing build output: ${path.relative(tempRoot, directory)}`);
    const files = [];
    const visit = current => {
        for (const item of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
            const absolute = path.join(current, item.name);
            if (item.isDirectory()) visit(absolute);
            else {
                const bytes = fs.readFileSync(absolute);
                files.push({ path: path.relative(directory, absolute).replaceAll('\\', '/'), bytes: bytes.length, sha256: sha256(bytes) });
            }
        }
    };
    visit(directory);
    if (!files.length) throw new Error(`Empty build output: ${path.relative(tempRoot, directory)}`);
    const treeSha256 = sha256(Buffer.from(files.map(file => `${file.path}:${file.bytes}:${file.sha256}`).join('\n')));
    return {
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
        treeSha256,
        workerIncluded: files.some(file => path.basename(file.path) === 'mockServiceWorker.js'),
        files,
    };
}

function readArtifactText(directory, extension) {
    const chunks = [];
    const visit = current => {
        for (const item of fs.readdirSync(current, { withFileTypes: true })) {
            const absolute = path.join(current, item.name);
            if (item.isDirectory()) visit(absolute);
            else if (item.name.endsWith(extension)) chunks.push(fs.readFileSync(absolute, 'utf8'));
        }
    };
    visit(directory);
    return chunks.join('\n');
}

const productionUnavailableSmoke = `
import { chromium, expect } from '@playwright/test';
import { preview } from 'vite';
import path from 'node:path';
let server;
let browser;
try {
  const webRoot = path.resolve('apps/web');
  server = await preview({ configFile: path.join(webRoot, 'vite.config.ts'), root: webRoot, mode: 'production', logLevel: 'error', build: { outDir: 'dist' }, preview: { host: '127.0.0.1', port: 0, strictPort: false } });
  const address = server.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('production preview has no local address');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const apiRequests = [];
  const workerRequests = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/v2/session') apiRequests.push(url.pathname);
    if (url.pathname.endsWith('/mockServiceWorker.js')) workerRequests.push(url.pathname);
  });
  await page.route('**/api/v2/session', route => route.abort('failed'));
  await page.goto('http://127.0.0.1:' + address.port + '/s/shop-demo/overview');
  await expect(page.getByRole('alert').filter({ hasText: 'Không thể kết nối API phiên đăng nhập' })).toBeVisible();
  await expect(page.getByText('Dữ liệu mô phỏng', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/không tự chuyển sang dữ liệu mô phỏng/)).toBeVisible();
  if (apiRequests.length !== 1 || workerRequests.length !== 0) throw new Error('production request/mock-worker boundary mismatch');
  console.log('[production-unavailable-smoke] ' + JSON.stringify({ scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API', artifact: 'apps/web/dist', route: '/s/shop-demo/overview', apiUnavailable: true, explicitErrorVisible: true, automaticMockFallback: false, sessionRequests: apiRequests.length, mockWorkerRequests: workerRequests.length }));
} finally {
  await browser?.close();
  await server?.close();
}
`;

try {
    if (!fs.existsSync(npmCli)) throw new Error(`npm CLI unavailable at ${npmCli}`);
    fs.cpSync(frontendSource, tempFrontend, {
        recursive: true,
        filter: source => !excluded(source, frontendSource, frontendExclusions),
    });
    fs.cpSync(kitSource, tempKit, {
        recursive: true,
        filter: source => !excluded(source, kitSource, kitExclusions, true),
    });
    const workflowTarget = path.join(tempRoot, '.github/workflows/frontend.yml');
    fs.mkdirSync(path.dirname(workflowTarget), { recursive: true });
    fs.copyFileSync(workflowSource, workflowTarget);
    if (sha256(fs.readFileSync(workflowTarget)) !== rootWorkflowSha256) throw new Error('Isolated root workflow snapshot differs from the current repository workflow.');
    if (!currentLockCopyMatches()) throw new Error('Isolated Frontend lockfile hash differs from current source.');
    if (fs.existsSync(path.join(tempFrontend, '.env.local'))) throw new Error('Isolated copy unexpectedly contains .env.local.');

    const gitInit = spawnSync('git', ['init', '--quiet'], { cwd: tempRoot, encoding: 'utf8', env, windowsHide: true });
    const gitEntry = {
        name: 'initialize-isolated-git-root',
        command: 'git init --quiet',
        cwd: tempRoot,
        exitCode: gitInit.status ?? 1,
        output: `${gitInit.stdout ?? ''}${gitInit.stderr ?? ''}${gitInit.error ? `\nspawnError=${gitInit.error.message}` : ''}`,
    };
    runs.push(gitEntry);
    if (gitEntry.exitCode !== 0) throw new Error(`initialize-isolated-git-root exited ${gitEntry.exitCode}`);

    const stages = [
        ['clean-install', ['ci']],
        ['npm-audit-low', ['audit', '--audit-level=low']],
        ['setup', ['run', 'setup']],
        ['verify', ['run', 'verify']],
        ['contract-tests', null],
        ['build-demo', ['run', 'build:demo']],
        ['repeat-production-build', ['run', 'build']],
        ['repeat-demo-build', ['run', 'build:demo']],
    ];
    for (const [name, args] of stages) {
        let entry;
        if (name === 'contract-tests') {
            const direct = spawnSync(process.execPath, ['--test', 'tests/contracts/generator.test.mjs'], {
                cwd: tempFrontend, encoding: 'utf8', env, maxBuffer: 16 * 1024 * 1024, windowsHide: true,
            });
            const directEntry = {
                name,
                command: `node --test tests/contracts/generator.test.mjs`,
                cwd: tempFrontend,
                exitCode: direct.status ?? 1,
                output: `${direct.stdout ?? ''}${direct.stderr ?? ''}${direct.error ? `\nspawnError=${direct.error.message}` : ''}`,
            };
            runs.push(directEntry);
            entry = directEntry;
        } else entry = run(name, args);
        if (entry.exitCode !== 0) throw new Error(`${name} exited ${entry.exitCode}`);
        if (name === 'verify') artifactManifest = { productionAfterVerify: artifactTree(path.join(tempFrontend, 'apps/web/dist')) };
        if (name === 'build-demo') artifactManifest.demoFirstBuild = artifactTree(path.join(tempFrontend, 'apps/web/dist-demo'));
        if (name === 'repeat-production-build') artifactManifest.productionRepeat = artifactTree(path.join(tempFrontend, 'apps/web/dist'));
        if (name === 'repeat-demo-build') artifactManifest.demoRepeat = artifactTree(path.join(tempFrontend, 'apps/web/dist-demo'));
    }

    if (artifactManifest.productionAfterVerify.treeSha256 !== artifactManifest.productionRepeat.treeSha256) throw new Error('Production artifact tree changed on repeat build.');
    if (artifactManifest.demoFirstBuild.treeSha256 !== artifactManifest.demoRepeat.treeSha256) throw new Error('Demo artifact tree changed on repeat build.');
    if (artifactManifest.productionRepeat.workerIncluded || !artifactManifest.demoRepeat.workerIncluded) throw new Error('Production/demo MSW worker isolation invariant failed.');
    const productionJs = readArtifactText(path.join(tempFrontend, 'apps/web/dist'), '.js');
    const demoJs = readArtifactText(path.join(tempFrontend, 'apps/web/dist-demo'), '.js');
    const forbiddenProductionMarkers = ['setupWorker(', 'DEMO-NOT-A-REAL-PAIRING', 'Joker Studio', 'shop-second'];
    const expectedDemoMarkers = ['Joker Studio', 'shop-second'];
    artifactManifest.productionMarkerMatches = forbiddenProductionMarkers.filter(marker => productionJs.includes(marker));
    artifactManifest.demoFixtureMarkers = expectedDemoMarkers.filter(marker => demoJs.includes(marker));
    if (artifactManifest.productionMarkerMatches.length) throw new Error(`Production JS contains mock/fixture markers: ${artifactManifest.productionMarkerMatches.join(', ')}`);
    if (artifactManifest.demoFixtureMarkers.length !== expectedDemoMarkers.length) throw new Error('Demo JS is missing an expected synthetic fixture marker.');

    const smokeFile = path.join(tempFrontend, 'production-unavailable-smoke-current-20261008.mjs');
    fs.writeFileSync(smokeFile, productionUnavailableSmoke, { encoding: 'utf8', flag: 'wx' });
    const smoke = run('production-unavailable-smoke', [smokeFile], { node: true });
    if (smoke.exitCode !== 0 || !smoke.output.includes('"automaticMockFallback":false')) throw new Error('Production unavailable-runtime browser smoke did not pass.');
} catch (error) {
    failure = error;
}

const allRunsPass = runs.length === 10 && runs.every(run => run.exitCode === 0);
const status = !failure && allRunsPass ? 'PASS' : 'FAIL';
const lockCopySha256 = fs.existsSync(path.join(tempFrontend, 'package-lock.json')) ? sha256(fs.readFileSync(path.join(tempFrontend, 'package-lock.json'))) : null;
const manifest = {
    status,
    scope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
    executedAt: new Date().toISOString(),
    runtime: { node: process.version, npm: '11.17.0 (packageManager pin)', operatingSystem: `${process.platform} ${os.release()}` },
    isolatedWorkspace: tempRoot,
    rootWorkflowSha256,
    rootWorkflowCopiedToExpectedRelativePath: true,
    isolatedGitMetadata: 'git init --quiet at the temporary multi-project root only so the evidence validator resolves Frontend and Kit paths; no source repository .git directory, history, branch, or user changes were copied.',
    sourceLockSha256,
    copiedLockSha256: lockCopySha256,
    userEnvLocalCopied: false,
    setupBehavior: 'npm run setup can create a fresh .env.local from .env.example when the isolated target is absent; it never copies the source workspace .env.local.',
    commandRuns: runs.map(({ name, command, cwd, exitCode }) => ({ name, command, cwd, exitCode })),
    artifacts: artifactManifest,
    tempWorkspaceRemovedAfterPass: false,
    failure: failure?.message ?? null,
};

const logFile = path.join(evidenceDir, 'clean-build-current-20261008-attempt03.log');
const manifestFile = path.join(evidenceDir, 'clean-artifacts-current-20261008-attempt03.json');
const log = [
    'FE026 isolated clean install and reproducible production/demo artifact run',
    `executedAt=${manifest.executedAt}`,
    `status=${status}`,
    `isolatedWorkspace=${tempRoot}`,
    `sourceLockSha256=${sourceLockSha256}`,
    `copiedLockSha256=${lockCopySha256}`,
    `userEnvLocalCopied=${manifest.userEnvLocalCopied}`,
    `rootWorkflowSha256=${rootWorkflowSha256}`,
    `rootWorkflowCopiedToExpectedRelativePath=${manifest.rootWorkflowCopiedToExpectedRelativePath}`,
    `isolatedGitMetadata=${manifest.isolatedGitMetadata}`,
    `setupBehavior=${manifest.setupBehavior}`,
    ...runs.flatMap(run => [`\n## ${run.name}`, `command=${run.command}`, `cwd=${run.cwd}`, `exitCode=${run.exitCode}`, run.output.trimEnd()]),
    `\nartifactManifest=${JSON.stringify(artifactManifest)}`,
    `failure=${failure?.stack ?? 'none'}`,
    'scope=FRONTEND_WITH_SYNTHETIC_MOCK_API; no live Backend/provider, hosted CI run, deployment, staging, or production-hosting claim.',
].join('\n') + '\n';
fs.writeFileSync(logFile, log, 'utf8');
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

if (status === 'PASS' && process.argv.includes('--remove-temp-after-pass')) {
    const resolvedRoot = path.resolve(tempRoot);
    const resolvedTemp = path.resolve(os.tmpdir());
    const insideTemp = process.platform === 'win32'
        ? resolvedRoot.toLowerCase().startsWith(`${resolvedTemp.toLowerCase()}${path.sep}`)
        : resolvedRoot.startsWith(`${resolvedTemp}${path.sep}`);
    if (!insideTemp || path.basename(resolvedRoot) !== path.basename(tempRoot) || !path.basename(resolvedRoot).startsWith(prefix)) {
        throw new Error(`Refusing to remove unexpected temporary target: ${resolvedRoot}`);
    }
    fs.rmSync(resolvedRoot, { recursive: true, force: false });
    cleaned = true;
    manifest.tempWorkspaceRemovedAfterPass = true;
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
    status,
    runs: manifest.commandRuns,
    productionTreeSha256: artifactManifest?.productionRepeat?.treeSha256 ?? null,
    demoTreeSha256: artifactManifest?.demoRepeat?.treeSha256 ?? null,
    productionWorker: artifactManifest?.productionRepeat?.workerIncluded ?? null,
    demoWorker: artifactManifest?.demoRepeat?.workerIncluded ?? null,
    tempWorkspaceRemovedAfterPass: cleaned,
    logFile: path.relative(repo, logFile).replaceAll('\\', '/'),
    manifestFile: path.relative(repo, manifestFile).replaceAll('\\', '/'),
    failure: failure?.message ?? null,
}, null, 2));

if (status !== 'PASS' || (process.argv.includes('--remove-temp-after-pass') && !cleaned)) process.exitCode = 1;

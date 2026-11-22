import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { readObjectStorageConfig } from '../../apps/api/dist/modules/files/index.js';
import { readAuthConfig, usesLocalOidcFixture } from '../../apps/api/dist/modules/workspace/index.js';
import { postgresTargets, redisTarget } from '../../scripts/staging-data-config.mjs';
import { assertFixtureDatabase } from '../integration/workspace/session-fixture.mjs';

const backend = fileURLToPath(new URL('../../', import.meta.url));
const manifestName = 'release-manifest.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sha256 = /^[a-f0-9]{64}$/;
const groups = [
    ['catalog', '--catalog'],
    ['workspace', '--workspace'], ['oidc'], ['imports', '--imports'], ['inventory', '--inventory'],
    ['inventory-documents', '--inventory-documents'], ['orders', '--orders'], ['fulfillment', '--fulfillment'],
    ['promotions', '--promotions'], ['finance', '--finance'], ['reconciliation', '--reconciliation'],
    ['procurement', '--procurement'], ['procurement-manual', '--procurement-manual'], ['inbox', '--inbox'], ['ai', '--ai'],
    ['operations', '--operations'], ['privacy', '--privacy'],
    ['meta-messenger', '--meta-reply', '--fulfillment', '--performance'], ['openai-model', '--openai-model-check'],
    ['web-push', '--web-push'], ['telegram', '--telegram'],
];

function fixtureEnv(environment) {
    const env = Object.fromEntries(Object.entries(environment).filter(([key]) =>
        !/^(META_MESSENGER_|BOTSALES_AI_OPENAI_|BOTSALES_AI_EVALUATION_APPROVAL_|BOTSALES_STAGING_AI_|WEB_PUSH_|TELEGRAM_|FILE_OBJECT_STORE_)/i.test(key) &&
        !/(_FIXTURE_ADAPTER$|^PRIVACY_FIXTURE_ACTIONS$|^P0_STEP_UP_PASSWORD$)/i.test(key)));
    if (environment.OBJECT_STORE_FIXTURE_ADAPTER === '1') {
        const store = readObjectStorageConfig(environment);
        assert.ok(store && new URL(store.endpoint).hostname === '127.0.0.1' && store.bucket === 'botsales-file-fixture',
            'Use the dedicated loopback bucket for packaged object storage tests');
        Object.assign(env, { OBJECT_STORE_FIXTURE_ADAPTER: '1' },
            Object.fromEntries(Object.entries(environment).filter(([key]) => key.startsWith('FILE_OBJECT_STORE_'))));
    }
    assertFixtureDatabase(postgresTargets(env, true).runtime);
    redisTarget(env, true);
    const auth = readAuthConfig(env);
    assert.ok(auth && usesLocalOidcFixture(auth), 'Use the local OIDC fixture for this regression');
    assert.ok(env.BOTSALES_P0_CADDY_EXE && env.P0_FIREFOX_TRUST_PROFILE, 'Provide Caddy and the trusted Firefox fixture profile');
    return env;
}

function execute(executable, args, env) {
    const start = performance.now();
    const run = spawnSync(executable, args, { cwd: backend, env, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    return { code: run.status ?? 1, elapsedMs: Math.round(performance.now() - start), stdout: run.stdout ?? '', stderr: run.stderr ?? '' };
}

function verifyInstalled(root, manifestHash, env) {
    const check = execute(process.execPath, ['scripts/package-release.mjs', '--verify', root, '--installed'], env);
    assert.equal(check.code, 0, 'Installed release failed file verification');
    const manifest = JSON.parse(check.stdout);
    assert.equal(manifest.manifestSha256, manifestHash, 'Installed files belong to a different manifest');
    return manifest;
}

function sources(directory) {
    return readdirSync(join(backend, directory), { withFileTypes: true }).flatMap(entry => {
        const name = directory + '/' + entry.name;
        if (entry.isDirectory()) return sources(name);
        return entry.isFile() && /\.(mjs|js)$/.test(entry.name) ? [name] : [];
    });
}

function fixtureHashes() {
    const files = [...sources('tests/integration'), ...sources('infra/p0/oidc'), ...sources('apps/api/dist'),
        'tests/release/packaged-regression.mjs', 'apps/api/prisma/p0-fixture.mjs', 'scripts/package-release.mjs',
        'scripts/check-release-runtime.mjs', 'scripts/probe-target.mjs', 'scripts/staging-data-config.mjs', 'scripts/check-matrix.mjs',
        '../BotSalesAI_Frontend/package-lock.json', '../botsales-kit/contracts/openapi.json'];
    return Object.fromEntries(files.sort().map(file => [file, hash(readFileSync(join(backend, file)))]));
}

function record(directory, name, result) {
    const log = name + '.txt';
    const bytes = result.stdout + result.stderr;
    writeFileSync(join(directory, log), bytes, { flag: 'wx' });
    return { log, logSha256: hash(bytes), exitCode: result.code, elapsedMs: result.elapsedMs };
}

function observation(stdout, manifestHash) {
    for (const line of stdout.split(/\r?\n/)) {
        if (!line.startsWith('{')) continue;
        const result = JSON.parse(line);
        if (result.status === 'LOCAL_RUNTIME_VERIFIED' && result.manifestSha256 === manifestHash) return result;
    }
    return null;
}

try {
    const [archive, extracted, archiveHash, manifestHash, output, ...extra] = process.argv.slice(2);
    assert.ok(archive?.endsWith('.tgz') && extracted && sha256.test(archiveHash ?? '') && sha256.test(manifestHash ?? '') && output && !extra.length,
        'Usage: packaged-regression <archive.tgz> <installed-release> <archive-sha256> <manifest-sha256> <new-report-directory>');
    assert.equal(hash(readFileSync(archive)), archiveHash, 'Release archive checksum differs');
    const root = realpathSync(extracted);
    const packed = spawnSync('tar', ['-xOf', resolve(archive), './' + manifestName], { cwd: backend, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    assert.ok(packed.status === 0 && hash(packed.stdout) === manifestHash, 'Archive contains a different release manifest');
    const directory = join(realpathSync(dirname(resolve(output))), basename(resolve(output)));
    const outside = relative(root, directory);
    assert.ok(outside === '..' || /^(?:\.\.[\\/])/.test(outside) || isAbsolute(outside), 'Keep test output outside the installed release');
    const env = fixtureEnv(process.env);
    const installed = verifyInstalled(root, manifestHash, env);
    const manifest = JSON.parse(readFileSync(join(root, manifestName), 'utf8'));
    const fixtureSourceSha256 = fixtureHashes();
    const caddySha256 = hash(readFileSync(env.BOTSALES_P0_CADDY_EXE));
    mkdirSync(directory);
    const matrix = execute(process.execPath, ['scripts/check-matrix.mjs'], env);
    const matrixResult = record(directory, 'matrix', matrix);
    const matrixPassed = matrix.code === 0 && JSON.parse(matrix.stdout).status === 'PASS';
    const results = [];
    let operationsFixture;
    for (const [name, ...flags] of groups) {
        if (name === 'operations') {
            operationsFixture = record(directory, 'operations-fixture', execute(process.execPath,
                ['--test', 'tests/integration/operations/operations.test.mjs'], env));
        }
        const run = execute(process.execPath, ['tests/integration/auth/browser-smoke.mjs', '--release', root, manifestHash, ...flags], env);
        const log = record(directory, name, run);
        const runtime = run.code === 0 ? observation(run.stdout, manifestHash) : null;
        const passed = Boolean(runtime && runtime.sourceBase === installed.sourceBase && (name !== 'operations' || operationsFixture.exitCode === 0));
        results.push({ name, passed, ...log, runtime });
        console.log(JSON.stringify({ group: name, status: passed ? 'PASS' : 'FAIL', elapsedMs: log.elapsedMs }));
    }
    verifyInstalled(root, manifestHash, env);
    const provenance = hash(readFileSync(archive)) === archiveHash && hash(readFileSync(env.BOTSALES_P0_CADDY_EXE)) === caddySha256 &&
        JSON.stringify(fixtureHashes()) === JSON.stringify(fixtureSourceSha256);
    const groupsPassed = results.filter(result => result.passed).length;
    const passed = matrixPassed && provenance && groupsPassed === groups.length;
    const report = { status: passed ? 'LOCAL_REGRESSION_PASSED' : 'LOCAL_REGRESSION_FAILED', scope: 'LOCAL_PACKAGED_FIXTURE',
        recordedAt: new Date().toISOString(), sourceBase: installed.sourceBase, dirtyWorktree: installed.dirtyWorktree,
        archiveSha256: archiveHash, manifestSha256: manifestHash, packagedFiles: installed.files, migrations: manifest.migrations,
        groupsPassed, groupsTotal: groups.length, matrix: { passed: matrixPassed, ...matrixResult }, operationsFixture, provenance,
        groups: results, fixtureSourceSha256, fixture: { caddySha256, platform: process.platform, arch: process.arch, node: process.versions.node,
            objectStore: env.OBJECT_STORE_FIXTURE_ADAPTER === '1', uploadScanner: Boolean(env.FILE_SCAN_PORT || env.FILE_SCAN_SOCKET) } };
    writeFileSync(join(directory, 'packaged-regression.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ status: report.status, manifestSha256: manifestHash, groupsPassed, groupsTotal: groups.length }));
    if (!passed) process.exitCode = 2;
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}

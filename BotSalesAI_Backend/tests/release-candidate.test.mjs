import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test } from 'node:test';

const sourceBase = '1'.repeat(40);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileSha = path => sha(readFileSync(path));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value) + '\n');
const lockPath = 'BotSalesAI_Backend/package-lock.json';

function fixture(t, dirtyWorktree = false) {
    const directory = mkdtempSync(join(tmpdir(), 'botsales-candidate-test-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const content = join(directory, 'content');
    mkdirSync(join(content, 'BotSalesAI_Backend'), { recursive: true });
    mkdirSync(join(content, 'web'));
    const lock = { name: 'botsales-test-candidate', version: '0.0.0', packages: {
        '': { engines: { npm: '11.17.0' } },
        'node_modules/test-dependency': { version: '1.0.0' },
        'node_modules/test-optional': { version: '1.0.0', devOptional: true },
        'node_modules/test-dev': { version: '1.0.0', dev: true },
    } };
    writeJson(join(content, lockPath), lock);
    writeFileSync(join(content, 'web/index.html'), '<title>BotSales fixture</title>');
    const manifest = { format: 1, sourceBase, dirtyWorktree, nodeVersion: process.versions.node,
        files: { [lockPath]: fileSha(join(content, lockPath)), 'web/index.html': fileSha(join(content, 'web/index.html')) } };
    writeJson(join(content, 'release-manifest.json'), manifest);
    const archive = join(directory, 'candidate.tgz');
    execFileSync('tar', ['-czf', archive, '-C', content, '.']);
    const archiveHash = fileSha(archive);
    const manifestHash = fileSha(join(content, 'release-manifest.json'));
    writeFileSync(archive + '.sha256', archiveHash + '  ' + basename(archive) + '\n');
    const audit = { auditReportVersion: 2, metadata: { vulnerabilities: { high: 0, critical: 0 }, dependencies: { total: 3 } } };
    writeJson(archive + '.audit.json', audit);
    writeJson(archive + '.sbom.cdx.json', { bomFormat: 'CycloneDX', metadata: {
        component: { purl: 'pkg:npm/' + lock.name + '@' + lock.version }, tools: [{ vendor: 'npm', name: 'cli', version: '11.17.0' }],
    }, components: ['test-dependency', 'test-optional', 'test-dev'].map(name => ({ purl: 'pkg:npm/' + name + '@1.0.0' })) });
    const dependencyFile = archive + '.dependencies.json';
    const dependencies = { format: 1, sourceBase, dirtyWorktree,
        sha256: { archive: archiveHash, manifest: manifestHash, lockfile: manifest.files[lockPath],
            sbom: fileSha(archive + '.sbom.cdx.json'), audit: fileSha(archive + '.audit.json') },
        platform: { node: process.versions.node, npm: '11.17.0' }, sbomComponents: 3,
        installed: [{ location: 'node_modules/test-dependency', name: 'test-dependency', version: '1.0.0' }],
    };
    writeJson(dependencyFile, dependencies);
    const runtime = { status: 'LOCAL_CANDIDATE_SMOKE_PASSED', sourceBase, manifestSha256: manifestHash, workerManifestSha256: manifestHash,
        healthRoutes: 2, webFiles: 1, deepLink: '/workspaces',
        exportJob: { accepted: 202, status: 'succeeded', authorizedDownload: 200, otherShopDownload: 404 } };
    const runtimeFile = archive + '.runtime.json';
    writeJson(runtimeFile, runtime);
    const verify = (options = []) => spawnSync(process.execPath, ['scripts/release-dependency-evidence.mjs',
        '--verify-candidate', archive, sourceBase, archiveHash, ...options], { encoding: 'utf8', windowsHide: true });
    return { archive, archiveHash, audit, dependencyFile, dependencies, manifestHash, runtime, runtimeFile, verify };
}

test('release candidate verification checks the archive, smoke results, and dependency receipts together', t => {
    const sample = fixture(t);
    const good = sample.verify();
    assert.equal(good.status, 0, good.stderr);
    const receipt = JSON.parse(good.stdout);
    assert.equal(receipt.status, 'CANDIDATE_EVIDENCE_VERIFIED');
    assert.equal(receipt.sha256.archive, sample.archiveHash);
    assert.equal(receipt.sha256.manifest, sample.manifestHash);
    assert.equal(receipt.sha256.runtime, fileSha(sample.runtimeFile));

    writeJson(sample.runtimeFile, { ...sample.runtime, workerManifestSha256: '0'.repeat(64) });
    const stale = sample.verify();
    assert.equal(stale.status, 1);
    assert.match(stale.stderr, /Runtime evidence differs/);
    writeJson(sample.runtimeFile, sample.runtime);
    writeJson(sample.archive + '.audit.json', { ...sample.audit, alternativeReport: true });
    const exchanged = sample.verify();
    assert.equal(exchanged.status, 1);
    assert.match(exchanged.stderr, /Dependency evidence differs/);
});

test('runtime dependency evidence requires the locked production inventory and permits optional packages', t => {
    const { dependencyFile, dependencies, verify } = fixture(t);
    const [required] = dependencies.installed;
    const optional = { location: 'node_modules/test-optional', name: 'test-optional', version: '1.0.0', devOptionalInLockfile: true };
    const dev = { location: 'node_modules/test-dev', name: 'test-dev', version: '1.0.0' };
    writeJson(dependencyFile, { ...dependencies, installed: [required, optional] });
    const valid = verify();
    assert.equal(valid.status, 0, valid.stderr);

    for (const [installed, message] of [
        [[required, dev], /development-only dependency/],
        [[optional], /missing a required dependency/],
        [[required, required], /differs from the archived lockfile or SBOM/],
        [[{ ...required, version: '2.0.0' }], /differs from the archived lockfile or SBOM/],
        [[required, { ...optional, devOptionalInLockfile: false }], /differs from the archived lockfile or SBOM/],
    ]) {
        writeJson(dependencyFile, { ...dependencies, installed });
        const rejected = verify();
        assert.equal(rejected.status, 1);
        assert.match(rejected.stderr, message);
    }
});

test('a dirty archive requires explicit fixture scope and receives a local receipt', t => {
    const { verify } = fixture(t, true);
    const rejected = verify();
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /trusted clean source/);
    const local = verify(['--fixture']);
    assert.equal(local.status, 0, local.stderr);
    assert.equal(JSON.parse(local.stdout).status, 'LOCAL_CANDIDATE_EVIDENCE_VERIFIED');
});

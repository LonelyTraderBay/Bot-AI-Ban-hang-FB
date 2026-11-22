import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const bytes = file => readFileSync(file);
const json = file => JSON.parse(bytes(file));
const hash = value => createHash('sha256').update(value).digest('hex');
const sha256 = file => hash(bytes(file));
const workspace = 'BotSalesAI_Backend';
const lockPath = workspace + '/package-lock.json';
const gitSha = /^[a-f0-9]{40}$/;
const sha = /^[a-f0-9]{64}$/;

function requireCondition(ok, message) {
    if (!ok) throw new Error(message);
}

function verifiedArchiveHash(archive) {
    const [expected, archiveName, ...extra] = bytes(archive + '.sha256').toString('utf8').trim().split(/\s+/);
    const observed = sha256(archive);
    requireCondition(!extra.length && expected === observed && archiveName === basename(archive), 'Release archive checksum mismatch');
    return observed;
}

function archiveMember(archive, path) {
    const result = spawnSync('tar', ['-xOf', archive, './' + path]);
    requireCondition(result.status === 0 && result.stdout.length, 'Release archive is missing ' + path);
    return result.stdout;
}

function auditFindings(audit, lock) {
    const findings = audit.metadata?.vulnerabilities;
    requireCondition(audit.auditReportVersion === 2 && !audit.error &&
        audit.metadata?.dependencies?.total === Object.keys(lock.packages).length - 1 &&
        findings?.high === 0 && findings.critical === 0, 'Incomplete dependency audit or high/critical findings');
    return findings;
}

function sbomToolVersion(bom, lock) {
    requireCondition(bom.bomFormat === 'CycloneDX' && Array.isArray(bom.components) &&
        bom.metadata?.component?.purl === 'pkg:npm/' + lock.name + '@' + lock.version, 'Invalid release CycloneDX SBOM');
    return bom.metadata.tools?.find(tool => tool.vendor === 'npm' && tool.name === 'cli')?.version;
}

const sbomPackages = bom => new Set(bom.components.map(component => decodeURIComponent(component.purl).replace(/^pkg:npm\//, '')));
const dependencyPath = location => typeof location === 'string' && location.includes('node_modules/');
const lockedName = (location, locked) => locked.name ?? location.split('node_modules/').at(-1);

function verifyRuntimePackages(installed, lock, covered) {
    requireCondition(Array.isArray(installed) && installed.length > 0, 'Runtime dependency inventory is empty or invalid');
    const locations = new Set();
    for (const { location, name, version, devOptionalInLockfile } of installed) {
        const locked = dependencyPath(location) && Object.hasOwn(lock.packages, location) && lock.packages[location];
        requireCondition(locked && !locked.link && !locations.has(location) && typeof version === 'string' &&
            locked.version === version && name === lockedName(location, locked) && covered.has(name + '@' + version) &&
            Boolean(devOptionalInLockfile) === Boolean(locked.devOptional), 'Runtime dependency differs from the archived lockfile or SBOM');
        requireCondition(!locked.dev, 'Runtime inventory contains a development-only dependency');
        locations.add(location);
    }
    const complete = Object.entries(lock.packages).every(([location, locked]) =>
        !dependencyPath(location) || locked.link || locked.dev || locked.optional || locked.devOptional || locations.has(location));
    requireCondition(complete, 'Runtime inventory is missing a required dependency from the archived lockfile');
}

function runtimeInventory(tree, lock, installedLock, covered) {
    requireCondition(Array.isArray(tree), 'Invalid installed package inventory');
    const locations = new Set();
    const installed = [];
    for (const { location, name, version, license, extraneous } of tree) {
        const locked = lock.packages[location];
        requireCondition(typeof location === 'string' && typeof version === 'string' && !locations.has(location) &&
            !extraneous && locked?.version === version,
            'Installed package is unexpected or differs from the archived lockfile');
        locations.add(location);
        if (!location) continue;
        if (!dependencyPath(location)) {
            requireCondition(name === lockedName(location, locked) && covered.has(name + '@' + version),
                'Installed workspace name or version is absent from the release SBOM');
            continue;
        }
        installed.push({ location, name, version, license: typeof license === 'string' && license.trim() ? license : null,
            ...(locked.devOptional ? { devOptionalInLockfile: true } : {}) });
    }
    requireCondition(locations.has('') && Object.keys(lock.packages)
        .filter(location => location.startsWith('apps/') && !dependencyPath(location))
        .every(location => locations.has(location)), 'Installed runtime workspaces are missing');
    const installedPaths = Object.entries(installedLock.packages)
        .filter(([location, row]) => dependencyPath(location) && !row.link);
    requireCondition(installedPaths.length === installed.length && installedPaths
        .every(([location, row]) => locations.has(location) && lock.packages[location]?.version === row.version),
        'Package inventory differs from the npm runtime installation');
    verifyRuntimePackages(installed, lock, covered);
    return installed.sort((a, b) => a.location < b.location ? -1 : a.location > b.location ? 1 : 0);
}

function recordDependencies([archive, extracted, treeFile, extra]) {
    requireCondition(archive?.endsWith('.tgz') && extracted && treeFile && !extra,
        'Usage: release-dependency-evidence <archive.tgz> <verified-extraction> <installed-tree.json>');
    const archiveHash = verifiedArchiveHash(archive);
    const manifestFile = join(extracted, 'release-manifest.json');
    const manifest = json(manifestFile);
    const manifestHash = sha256(manifestFile);
    requireCondition(hash(archiveMember(archive, 'release-manifest.json')) === manifestHash,
        'Extracted release manifest differs from the archive');
    requireCondition(manifest.format === 1 && gitSha.test(manifest.sourceBase ?? '') && typeof manifest.dirtyWorktree === 'boolean',
        'Invalid release manifest');
    const lockFile = join(extracted, lockPath);
    const lockHash = sha256(lockFile);
    requireCondition(lockHash === manifest.files[lockPath], 'Installed lockfile differs from the release manifest');
    const lock = json(lockFile);
    const sbomFile = archive + '.sbom.cdx.json';
    const auditFile = archive + '.audit.json';
    const bom = json(sbomFile), audit = json(auditFile);
    const npmVersion = sbomToolVersion(bom, lock);
    requireCondition(manifest.nodeVersion === process.versions.node && npmVersion && npmVersion === lock.packages[''].engines.npm,
        'Release evidence requires the pinned Node and npm versions');
    const findings = auditFindings(audit, lock);
    const installedLock = json(join(extracted, workspace, 'node_modules', '.package-lock.json'));
    const installed = runtimeInventory(json(treeFile), lock, installedLock, sbomPackages(bom));
    const licenseDeclarations = Object.create(null);
    for (const { license } of installed) {
        if (license) licenseDeclarations[license] = (licenseDeclarations[license] ?? 0) + 1;
    }
    const review = installed.filter(row => !row.license).map(({ location, name, version }) => {
        const directory = join(extracted, workspace, location);
        const file = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'].find(name => existsSync(join(directory, name)));
        return { location, name, version, ...(file ? { licenseFile: { file, sha256: sha256(join(directory, file)) } } : {}) };
    });
    const evidence = {
        format: 1, scope: 'backend npm lockfile and installed runtime', sourceBase: manifest.sourceBase, dirtyWorktree: manifest.dirtyWorktree,
        recordedAt: new Date().toISOString(),
        platform: { os: process.platform, arch: process.arch, node: process.versions.node, npm: npmVersion },
        sha256: { archive: archiveHash, manifest: manifestHash, lockfile: lockHash, sbom: sha256(sbomFile), audit: sha256(auditFile) },
        sbomComponents: bom.components.length, audit: findings, installed,
        licenseDeclarations, missingLicenseDeclarations: review,
    };
    writeFileSync(archive + '.dependencies.json', JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({
        status: 'BACKEND_DEPENDENCIES_VERIFIED', sourceBase: manifest.sourceBase, archiveSha256: archiveHash,
        sbomComponents: evidence.sbomComponents, runtimePackages: installed.length, missingLicenseDeclarations: review.length,
    }));
}

function verifyCandidate([archive, sourceBase, trustedArchiveHash, mode, ...extra]) {
    const fixture = mode === '--fixture';
    requireCondition(archive?.endsWith('.tgz') && gitSha.test(sourceBase ?? '') && sha.test(trustedArchiveHash ?? '') &&
        (mode === undefined || fixture) && !extra.length,
        'Usage: release-dependency-evidence --verify-candidate <archive.tgz> <trusted-source-sha> <trusted-archive-sha256> [--fixture]');
    const archiveHash = verifiedArchiveHash(archive);
    requireCondition(archiveHash === trustedArchiveHash, 'Release archive differs from the trusted digest');
    const manifestBytes = archiveMember(archive, 'release-manifest.json');
    const manifestHash = hash(manifestBytes);
    const manifest = JSON.parse(manifestBytes);
    requireCondition(manifest.format === 1 && manifest.sourceBase === sourceBase && typeof manifest.dirtyWorktree === 'boolean' &&
        (fixture || !manifest.dirtyWorktree), 'Release manifest differs from the trusted clean source');
    const lockBytes = archiveMember(archive, lockPath);
    const lockHash = hash(lockBytes);
    requireCondition(manifest.files?.[lockPath] === lockHash, 'Archived lockfile differs from the release manifest');

    const sidecars = { audit: '.audit.json', sbom: '.sbom.cdx.json', dependencies: '.dependencies.json', runtime: '.runtime.json' };
    const reports = Object.fromEntries(Object.entries(sidecars).map(([key, suffix]) => [key, bytes(archive + suffix)]));
    const digests = Object.fromEntries(Object.entries(reports).map(([key, value]) => [key, hash(value)]));
    const lock = JSON.parse(lockBytes);
    auditFindings(JSON.parse(reports.audit), lock);
    const sbom = JSON.parse(reports.sbom);
    const npmVersion = sbomToolVersion(sbom, lock);
    const dependencies = JSON.parse(reports.dependencies);
    requireCondition(dependencies.format === 1 && dependencies.sourceBase === sourceBase && dependencies.dirtyWorktree === manifest.dirtyWorktree &&
        dependencies.sha256?.archive === archiveHash && dependencies.sha256?.manifest === manifestHash &&
        dependencies.sha256?.lockfile === lockHash && dependencies.sha256?.audit === digests.audit && dependencies.sha256?.sbom === digests.sbom &&
        npmVersion && npmVersion === lock.packages[''].engines.npm && dependencies.platform?.npm === npmVersion &&
        dependencies.platform?.node === manifest.nodeVersion && dependencies.sbomComponents === sbom.components.length,
        'Dependency evidence differs from the release files');
    verifyRuntimePackages(dependencies.installed, lock, sbomPackages(sbom));
    const runtime = JSON.parse(reports.runtime);
    const webFiles = Object.keys(manifest.files).filter(path => path.startsWith('web/')).length;
    requireCondition(runtime.status === 'LOCAL_CANDIDATE_SMOKE_PASSED' && runtime.sourceBase === sourceBase &&
        runtime.manifestSha256 === manifestHash && runtime.workerManifestSha256 === manifestHash &&
        runtime.healthRoutes === 2 && runtime.webFiles === webFiles && webFiles > 0 && runtime.deepLink === '/workspaces' &&
        runtime.exportJob?.accepted === 202 && runtime.exportJob.status === 'succeeded' &&
        runtime.exportJob.authorizedDownload === 200 && runtime.exportJob.otherShopDownload === 404,
        'Runtime evidence differs from the release manifest or failed its smoke checks');
    console.log(JSON.stringify({ format: 1, status: fixture ? 'LOCAL_CANDIDATE_EVIDENCE_VERIFIED' : 'CANDIDATE_EVIDENCE_VERIFIED',
        sourceBase, dirtyWorktree: manifest.dirtyWorktree, sha256: { archive: archiveHash, manifest: manifestHash, lockfile: lockHash, ...digests } }));
}

try {
    const args = process.argv.slice(2);
    if (args[0] === '--verify-candidate') verifyCandidate(args.slice(1));
    else recordDependencies(args);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}

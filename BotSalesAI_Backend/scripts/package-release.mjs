import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { backendArtifacts } from './artifact-paths.mjs';

const repository = fileURLToPath(new URL('../..', import.meta.url));
const workspace = 'BotSalesAI_Backend';
const out = join(backendArtifacts(join(repository, workspace)), 'releases');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const relativePath = (from, to) => relative(from, to).split(sep).join('/');
const installedDirectories = new Set(['node_modules', 'apps/api/node_modules', 'apps/worker/node_modules'].map(path => workspace + '/' + path));

function command(executable, args, cwd = repository) {
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8', windowsHide: true });
    if (result.error || result.status !== 0) throw new Error(executable + ' did not complete successfully');
    return result.stdout.trim();
}

function filesAt(root, directory = root, installed = false) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name);
        const name = relativePath(root, path);
        if (entry.isDirectory()) return installed && installedDirectories.has(name) ? [] : filesAt(root, path, installed);
        if (!entry.isFile()) throw new Error('Unsupported file type in release');
        return [name];
    }).sort();
}

const include = new Map([
    ...[
        'package.json', 'package-lock.json', '.node-version', 'prisma.config.ts', 'apps/api/package.json',
        'apps/api/prisma/schema.prisma', 'apps/api/prisma/migrations',
        'apps/worker/package.json', 'apps/worker/src',
        'infra/backup/privacy-recovery.mjs', 'infra/backup/verify-restore.sql', 'infra/backup/integrity-counts.sql',
        'infra/backup/external-effect-fingerprints.sql', 'infra/backup/check-restore-evidence.mjs',
        'infra/edge/Caddyfile',
        'scripts/check-release-runtime.mjs', 'scripts/check-operations.mjs', 'scripts/check-oidc-provider.mjs',
        'scripts/probe-target.mjs', 'scripts/staging-data-config.mjs', 'scripts/check-staging-data.mjs', 'scripts/evaluate-staging-ai.mjs',
        'scripts/check-object-storage.mjs',
        'scripts/record-reviewed-evidence.mjs', 'scripts/record-procurement-evidence.mjs', 'scripts/record-shipment-evidence.mjs',
        'scripts/record-advertising-estimate-evidence.mjs',
    ].map(file => [workspace + '/' + file, workspace + '/' + file]),
    ...['openapi.json', 'operation-index.json', 'permission-catalog.json'].map(file => ['botsales-kit/contracts/' + file, 'botsales-kit/contracts/' + file]),
    ['botsales-kit/fixtures/statement-formats.json', 'botsales-kit/fixtures/statement-formats.json'],
    ['BotSalesAI_Frontend/apps/web/dist', 'web'],
]);

function verify(root, installed = false) {
    if (installed && !existsSync(join(root, workspace, 'node_modules', '.package-lock.json'))) {
        throw new Error('Install the packaged runtime dependencies before checking the installed release');
    }
    const manifestFile = join(root, 'release-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    const expected = Object.keys(manifest.files).sort();
    const actual = filesAt(root, root, installed).filter(file => file !== 'release-manifest.json');
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error('Release file set differs from manifest');
    for (const file of actual) if (sha(join(root, file)) !== manifest.files[file]) throw new Error('Release file hash mismatch: ' + file);
    return { status: 'VERIFIED_ARCHIVE_CONTENTS', sourceBase: manifest.sourceBase, dirtyWorktree: manifest.dirtyWorktree,
        files: actual.length, manifestSha256: sha(manifestFile) };
}

function build() {
    const nodeVersion = readFileSync(join(repository, workspace, '.node-version'), 'utf8').trim();
    if (process.versions.node !== nodeVersion) throw new Error('Release requires Node ' + nodeVersion);
    const sourceBase = command('git', ['rev-parse', 'HEAD']);
    const dirtyWorktree = Boolean(command('git', ['status', '--porcelain', '--untracked-files=normal']));
    mkdirSync(out, { recursive: true });
    const root = mkdtempSync(join(out, sourceBase.slice(0, 8) + '-'));
    const backend = join(repository, workspace);
    // Emit into the new release directory so removed source files cannot survive in the archive.
    command(process.execPath, [
        join(backend, 'node_modules', 'typescript', 'bin', 'tsc'),
        '-p', join(backend, 'apps', 'api', 'tsconfig.json'),
        '--outDir', join(root, workspace, 'apps', 'api', 'dist'),
    ]);
    for (const [source, target] of include) {
        const path = join(root, target);
        mkdirSync(dirname(path), { recursive: true });
        cpSync(join(repository, source), path, { recursive: true, errorOnExist: true, force: false });
    }
    const files = Object.fromEntries(filesAt(root).map(file => [file, sha(join(root, file))]));
    const migrations = Object.keys(files).filter(file => file.endsWith('/migration.sql')).length;
    const manifest = { format: 1, sourceBase, dirtyWorktree, nodeVersion, migrations, files };
    writeFileSync(join(root, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    const report = verify(root);
    const archive = root + '.tgz';
    command('tar', ['-czf', basename(archive), '-C', basename(root), '.'], out);
    const sha256 = sha(archive);
    writeFileSync(archive + '.sha256', sha256 + '  ' + archive.split(sep).at(-1) + '\n', { flag: 'wx' });
    return { ...report, status: 'PACKAGED', archive, sha256, migrations };
}

try {
    const [mode, target, flag, extra] = process.argv.slice(2);
    if (mode && (mode !== '--verify' || !target || (flag && flag !== '--installed') || extra)) {
        throw new Error('Use --verify <release directory> [--installed]');
    }
    console.log(JSON.stringify(mode ? verify(resolve(target), flag === '--installed') : build(), null, 2));
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}

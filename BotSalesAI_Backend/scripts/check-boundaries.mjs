import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const backend = 'BotSalesAI_Backend/';
const apiModules = /^apps\/api\/src\/modules\/([^/]+)\/(.+)$/;
const frontendPackages = new Set(['@botsales/web', '@botsales/contracts', '@botsales/tokens']);
const sourcePattern = /\.(?:[cm]?[jt]s|[jt]sx)$/;

export function importViolations(repository, file, source) {
    const imports = ts.preProcessFile(source, true, true).importedFiles.map(item => item.fileName);
    const issues = [];
    const from = file.slice(backend.length);
    for (const name of imports) {
        const local = name.startsWith('.') || isAbsolute(name);
        const target = local ? relative(repository, resolve(repository, file, '..', name)).replaceAll('\\', '/') : name;
        if (target.startsWith('BotSalesAI_Frontend/') || target === 'BotSalesAI_Frontend'
            || [...frontendPackages].some(pkg => name === pkg || name.startsWith(pkg + '/'))) {
            issues.push(file + ': frontend import ' + name);
            continue;
        }
        if (!local) continue;
        if (!target.startsWith(backend)) {
            issues.push(file + ': import outside backend workspace ' + name);
            continue;
        }
        const incoming = apiModules.exec(target.slice(backend.length));
        const outgoing = apiModules.exec(from);
        if (incoming && outgoing?.[1] !== incoming[1] && !/^index(?:\.[jt]s)?$/.test(incoming[2])) {
            issues.push(file + ': cross-module private import ' + name);
        }
    }
    return issues;
}

function outsideNestSource(file, source) {
    const dependencies = ts.preProcessFile(source, true, true).importedFiles;
    return dependencies.some(item => /^@nestjs\/(?:common|core)(?:\/|$)/.test(item.fileName))
        && /Controller|NestFactory/.test(source) ? file + ': Nest API source outside backend workspace' : null;
}

export function checkBoundaries(repository) {
    const workspace = resolve(repository, backend);
    const read = file => readFileSync(resolve(workspace, file), 'utf8');
    const rootPackage = JSON.parse(read('package.json'));
    const apiPackage = JSON.parse(read('apps/api/package.json'));
    const lock = JSON.parse(read('package-lock.json'));
    const lockRoot = lock.packages?.[''];
    const version = read('.node-version').trim();
    const issues = [];
    if (!rootPackage.private || JSON.stringify(rootPackage.workspaces) !== '["apps/*"]'
        || rootPackage.engines.node !== version || rootPackage.packageManager !== 'npm@' + rootPackage.engines.npm) {
        issues.push('Backend manifest must define the private workspace and pinned Node/npm toolchain');
    }
    const npmConfig = read('.npmrc').split(/\r?\n/);
    for (const setting of ['engine-strict=true', 'strict-peer-deps=true', 'save-exact=true']) {
        if (!npmConfig.includes(setting)) issues.push('Backend .npmrc missing ' + setting);
    }
    if (lockRoot?.name !== rootPackage.name || lock.packages?.['apps/api']?.name !== apiPackage.name
        || JSON.stringify(lockRoot.workspaces) !== JSON.stringify(rootPackage.workspaces)
        || lock.packages?.['node_modules/' + apiPackage.name]?.resolved !== 'apps/api') {
        issues.push('Backend root lockfile must own the apps/api workspace');
    }
    if (existsSync(resolve(workspace, 'apps/api/package-lock.json'))) issues.push('apps/api must use the backend root lockfile');

    const listing = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        { cwd: repository, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    for (const file of new Set(listing.split('\0').filter(Boolean))) {
        if (/^(apps\/(?:api|worker)\/|backend\/|blackend\/)/i.test(file)) {
            issues.push(file + ': backend files must be inside BotSalesAI_Backend');
            continue;
        }
        if (!sourcePattern.test(file) || !existsSync(resolve(repository, file))) continue;
        if (file.startsWith(backend)) issues.push(...importViolations(repository, file, readFileSync(resolve(repository, file), 'utf8')));
        else if (!/(?:^|\/)(?:evidence|archive|frontend-evidence)\//.test(file)) {
            const source = readFileSync(resolve(repository, file), 'utf8');
            if (!source.includes('@nestjs/')) continue;
            const misplaced = outsideNestSource(file, source);
            if (misplaced) issues.push(misplaced);
        }
    }
    return issues;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const workspace = fileURLToPath(new URL('..', import.meta.url));
    if (resolve(process.cwd()) !== resolve(workspace)) throw new Error('Run backend lint from BotSalesAI_Backend');
    const issues = checkBoundaries(resolve(workspace, '..'));
    console.log(JSON.stringify({ status: issues.length ? 'FAIL' : 'PASS', issues }, null, 2));
    if (issues.length) process.exitCode = 1;
}

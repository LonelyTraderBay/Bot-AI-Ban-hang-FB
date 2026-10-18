import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const generatedDirectories = new Set([
    'node_modules', '__pycache__', '.venv', 'dist', 'dist-demo',
    'coverage', 'playwright-report', 'test-results', '.repo-scratch',
]);

export function parseIndex(output) {
    return output.split('\0').filter(Boolean).map(record => {
        const match = /^([0-7]{6}) ([a-f\d]{40,64}) ([0-3])\t([\s\S]+)$/.exec(record);
        if (!match) throw new Error('Cannot parse a Git index entry.');
        return { mode: match[1], oid: match[2], stage: Number(match[3]), path: match[4] };
    });
}

export function inspectEntries(entries) {
    const violations = [];
    const paths = new Set(entries.map(entry => entry.path));
    const add = (file, rule, detail) => violations.push({ path: file, rule, detail });
    for (const entry of entries) {
        const file = entry.path;
        const parts = file.split('/');
        const name = parts.at(-1);
        if (entry.stage !== 0) add(file, 'unmerged-index', 'Resolve the merge before committing.');
        if (file.startsWith('/') || /^[A-Za-z]:/.test(file) || file.includes('\\') || parts.includes('..'))
            add(file, 'nonportable-path', 'Use a repository-relative path with forward slashes.');
        if (parts.some(part => generatedDirectories.has(part)) || /\.py[co]$/i.test(name))
            add(file, 'generated-payload', 'Keep dependencies, caches and disposable run output outside tracked source.');
        if ((name === '.env' || name.startsWith('.env.')) && !/^\.env(?:\..+)?\.example$/.test(name))
            add(file, 'environment-values', 'Commit an .env example, and keep environment values outside Git.');
        if (/^BotSalesAI_Frontend\/\d+$/.test(file))
            add(file, 'shell-output', 'Place command output in a named run directory.');

        const frontendManifest = 'BotSalesAI_Frontend/package.json';
        if (file.endsWith(frontendManifest)) {
            const prefix = file.slice(0, -frontendManifest.length);
            if (prefix && paths.has(`${prefix}botsales-kit/contracts/openapi.json`))
                add(file, 'nested-workspace', 'Run full installation/reproduction copies in a temporary directory outside the repository.');
        }
    }
    return violations.sort((a, b) => a.path.localeCompare(b.path) || a.rule.localeCompare(b.rule));
}

export function checkRepository(root, { requireClean = false } = {}) {
    const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const entries = parseIndex(git(['ls-files', '--stage', '-z']));
    const violations = inspectEntries(entries);
    if (requireClean && git(['status', '--porcelain=v1', '-z', '--untracked-files=all']).length)
        violations.push({ path: '.', rule: 'dirty-worktree', detail: 'Staged, modified or untracked files remain.' });
    return { status: violations.length ? 'FAIL' : 'PASS', trackedPaths: new Set(entries.map(entry => entry.path)).size, violations };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        if (args.some(arg => arg !== '--require-clean')) throw new Error('Supported option: --require-clean');
        const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
        const result = checkRepository(root, { requireClean: args.includes('--require-clean') });
        console.log(JSON.stringify(result, null, 2));
        if (result.status !== 'PASS') process.exitCode = 1;
    } catch (error) {
        console.error(`Repository hygiene check failed: ${error.message}`);
        process.exitCode = 1;
    }
}

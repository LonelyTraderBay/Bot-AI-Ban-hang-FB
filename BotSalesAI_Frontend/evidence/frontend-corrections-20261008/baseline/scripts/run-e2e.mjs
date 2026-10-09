import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const npmCli = process.env.npm_execpath;
const playwrightCli = path.join(projectRoot, 'node_modules', '@playwright', 'test', 'cli.js');

if (!npmCli || !existsSync(npmCli)) {
    console.error('test:e2e must run through npm so npm_execpath identifies the locked npm CLI.');
    process.exit(1);
}
if (!existsSync(playwrightCli)) {
    console.error(`Playwright CLI is missing at ${playwrightCli}; install the locked dependencies first.`);
    process.exit(1);
}

const nodeDirectory = path.dirname(process.execPath);
const existingPath = process.env.PATH ?? process.env.Path ?? '';
// Keep nested cmd.exe lookups reliable when a desktop host injects a very long PATH.
const maxPathLength = process.platform === 'win32' ? 6_000 : 32_000;
const pathEntries = [];
const seenPaths = new Set();
for (const entry of [
    nodeDirectory,
    path.join(projectRoot, 'node_modules', '.bin'),
    path.join(projectRoot, 'apps', 'web', 'node_modules', '.bin'),
    ...existingPath.split(path.delimiter),
]) {
    if (!entry || entry.length > 2_000) continue;
    let key;
    try {
        key = path.resolve(entry);
    } catch {
        continue;
    }
    if (process.platform === 'win32') key = key.toLowerCase();
    if (seenPaths.has(key)) continue;
    const nextLength = pathEntries.reduce((length, item) => length + item.length, 0)
        + entry.length + (pathEntries.length ? path.delimiter.length : 0);
    if (nextLength > maxPathLength) continue;
    seenPaths.add(key);
    pathEntries.push(entry);
}
const env = {
    ...process.env,
    PATH: pathEntries.join(path.delimiter),
};

const stages = [
    ['run', 'setup'],
    ['run', 'build'],
    ['run', 'build:demo'],
];

for (const args of stages) {
    console.log(`\n> npm ${args.join(' ')}`);
    const result = spawnSync(process.execPath, [npmCli, ...args], {
        cwd: projectRoot,
        env,
        stdio: 'inherit',
        windowsHide: true,
    });

    if (result.error) {
        console.error(`Could not start npm ${args.join(' ')}: ${result.error.message}`);
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

const playwrightArgs = [playwrightCli, 'test', ...process.argv.slice(2)];
console.log(`\n> node ${path.relative(projectRoot, playwrightCli)} ${playwrightArgs.slice(1).join(' ')}`);
const playwrightResult = spawnSync(process.execPath, playwrightArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
    windowsHide: true,
});
if (playwrightResult.error) {
    console.error(`Could not start Playwright: ${playwrightResult.error.message}`);
    process.exit(1);
}
if (playwrightResult.status !== 0) process.exit(playwrightResult.status ?? 1);

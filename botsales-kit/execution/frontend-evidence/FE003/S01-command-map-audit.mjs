import fs from 'node:fs';

const root = process.cwd();
const rootPackage = JSON.parse(fs.readFileSync(`${root}/package.json`, 'utf8'));
const appPackage = JSON.parse(fs.readFileSync(`${root}/apps/web/package.json`, 'utf8'));
const registry = JSON.parse(fs.readFileSync(`${root}/botsales-kit/execution/frontend-command-map.json`, 'utf8'));
const builtins = new Set(['install', 'ci', 'test']);
const commands = registry.commands.map(entry => {
    const match = entry.command.match(/\bnpm(?:\.cmd)?\s+(?:[^&]*?\s)?(?:run\s+)?([a-z][a-z0-9:_-]*)\b/i);
    const script = match?.[1] && !['--script-shell', 'set'].includes(match[1]) ? match[1] : null;
    const available = !script || builtins.has(script) || Object.hasOwn(rootPackage.scripts || {}, script) || Object.hasOwn(appPackage.scripts || {}, script);
    return { id: entry.id, cwd: entry.cwd, status: entry.status, script, available };
});
const issues = commands.filter(command => command.status === 'VERIFIED_AVAILABLE' && !command.available);
const report = {
    rootScripts: Object.keys(rootPackage.scripts || {}).length,
    appScripts: Object.keys(appPackage.scripts || {}).length,
    registryEntries: commands.length,
    verified: commands.filter(command => command.status === 'VERIFIED_AVAILABLE').length,
    declaredNotRun: commands.filter(command => command.status === 'DECLARED_NOT_RUN').length,
    failedBaseline: commands.filter(command => command.status === 'FAILED_BASELINE').length,
    unmappedVerifiedCommands: issues,
    commands,
    status: issues.length ? 'FAIL' : 'PASS',
};
console.log(JSON.stringify(report, null, 2));
if (issues.length)
    process.exitCode = 1;

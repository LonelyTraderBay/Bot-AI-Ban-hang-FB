import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadContractBundle, renderGenerated, findGeneratedDrift } from '../../../../BotSalesAI_Frontend/scripts/generate.mjs';

const script = fileURLToPath(import.meta.url);
const out = path.dirname(script);
const repo = path.resolve(out, '../../../..');
const kit = path.join(repo, 'botsales-kit');
const fe = path.join(repo, 'BotSalesAI_Frontend');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commands = Object.fromEntries(commandMap.commands.map(item => [item.id, item]));
const generateCommand = commands.generate;
const contractTests = commands['contract-tests'];
if (![generateCommand, contractTests].every(item => item?.status === 'VERIFIED_AVAILABLE' && item.cwd === 'BotSalesAI_Frontend')) throw new Error('Required registered generator command/test is unavailable');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = file => path.relative(fe, file).startsWith('..')
  ? `botsales-kit/${path.relative(kit, file).replaceAll('\\', '/')}`
  : path.relative(fe, file).replaceAll('\\', '/');
const systemRoot = process.env.SystemRoot || 'C:\\Windows';
const env = { ...process.env, PATH: [
  'C:\\Program Files\\nodejs', path.join(systemRoot, 'System32'),
  path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0'), systemRoot,
].join(';') };
const run = (command, shell, args) => spawnSync(shell, args, { cwd: fe, env, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

const canonicalInputs = [
  path.join(kit, 'contracts/openapi.json'), path.join(kit, 'contracts/openapi.yaml'),
  path.join(kit, 'contracts/operation-index.json'), path.join(kit, 'contracts/route-manifest.json'),
  path.join(kit, 'contracts/permission-catalog.json'), path.join(kit, 'contracts/events.schema.json'),
  path.join(kit, 'design/tokens.json'),
];
const bundleBefore = Object.fromEntries(canonicalInputs.map(file => [file, sha(fs.readFileSync(file))]));
const repoHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const results = [];
results.push({
  id: 'generate', command: generateCommand.command,
  ...(() => { const result = run(generateCommand.command, 'cmd.exe', ['/d', '/c', generateCommand.command]); return { exit: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message }; })(),
});
results.push({
  id: 'contract-tests', command: contractTests.command,
  ...(() => { const ps = path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'); const result = run(contractTests.command, ps, ['-NoProfile', '-NonInteractive', '-Command', contractTests.command]); return { exit: result.status, stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message }; })(),
});
for (const item of results) if (item.error || item.exit !== 0) throw new Error(`${item.id} failed: exit=${item.exit}; ${item.error || item.stderr || item.stdout}`);

const bundle = loadContractBundle(fe);
const outputs = renderGenerated(bundle);
const drift = findGeneratedDrift(outputs, fe);
if (drift.length) throw new Error(`Current generated artifacts drift: ${drift.join(', ')}`);
const generatedOutputs = Object.entries(outputs).map(([relativePath, expected]) => ({
  path: relativePath,
  bytes: Buffer.byteLength(expected, 'utf8'),
  sha256: sha(fs.readFileSync(path.join(fe, relativePath))),
}));
const canonicalInputsAfter = Object.fromEntries(canonicalInputs.map(file => [file, sha(fs.readFileSync(file))]));
if (JSON.stringify(bundleBefore) !== JSON.stringify(canonicalInputsAfter)) throw new Error('Canonical inputs changed during read-only generator verification');

const testOutput = results[1].stdout + results[1].stderr;
const testPasses = [...testOutput.matchAll(/(?:# pass |ℹ pass )(\d+)/g)].map(match => Number(match[1])).at(-1) ?? 0;
const testFailures = [...testOutput.matchAll(/(?:# fail |ℹ fail )(\d+)/g)].map(match => Number(match[1])).at(-1) ?? -1;
if (testPasses < 1 || testFailures !== 0) throw new Error(`Generator contract test summary unavailable or failing: pass=${testPasses}, fail=${testFailures}`);
const sourceReportOfGenerated = outputs['packages/contracts/src/generated.ts'];
if (!sourceReportOfGenerated) throw new Error('Generated TypeScript DTO artifact was not part of the current generator output');

const outputPath = path.join(out, 'S02-generator-output-inventory-current-20261007.json');
const commandLogPath = path.join(out, 'S02-generator-commands-current-20261007.log');
const finalLogPath = path.join(out, 'S02-generator-freshness-current-20261007.log');
const receiptPath = path.join(out, 'S02-generator-freshness-current-20261007.receipt.json');
const inventory = {
  status: 'PASS', checkedAt: new Date().toISOString(), generatorCommand: generateCommand.command,
  contractTestCommand: contractTests.command, outputs: generatedOutputs, drift: [],
  canonicalInputHashes: Object.fromEntries(Object.entries(bundleBefore).map(([file, digest]) => [relative(file), digest])),
  contractCounts: { paths: Object.keys(bundle.api.paths).length, operations: Object.keys(bundle.api.paths).reduce((n, route) => n + Object.keys(bundle.api.paths[route]).filter(method => ['get', 'post', 'put', 'patch', 'delete'].includes(method)).length, 0), schemas: Object.keys(bundle.api.components.schemas).length, routes: bundle.routes.routes.length },
  generatorContractTests: { pass: testPasses, fail: testFailures },
};
fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
fs.writeFileSync(commandLogPath, [
  `HEAD=${repoHead} plus current working tree`, `CWD=${fe}`,
  ...results.flatMap(item => [`\n=== ${item.id} exit=${item.exit} ===`, `Command: ${item.command}`, item.stdout, item.stderr ? `[stderr]\n${item.stderr}` : '']),
].join('\n') + '\n', 'utf8');

const sourcePaths = [
  path.join(fe, 'scripts/generate.mjs'), path.join(fe, 'tests/contracts/generator.test.mjs'),
  path.join(fe, 'package.json'), path.join(fe, 'package-lock.json'),
  path.join(kit, 'execution/frontend-command-map.json'), path.join(kit, 'execution/frontend-plan.json'),
  path.join(kit, 'docs/06_API_AND_REALTIME.md'), path.join(kit, 'docs/18_CODING_STANDARDS.md'),
  ...canonicalInputs, ...generatedOutputs.map(item => path.join(fe, item.path)),
  outputPath, commandLogPath, script,
].filter((file, index, all) => fs.existsSync(file) && all.indexOf(file) === index);
const sourceFiles = sourcePaths.map(file => ({ path: relative(file), sha256: sha(fs.readFileSync(file)) })).sort((a, b) => a.path.localeCompare(b.path));
const sourceSnapshotSha256 = sha(Buffer.from(sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const checks = [
  `registered generate:check exits 0 and confirms ${generatedOutputs.length} fresh generated outputs`,
  `generator contract suite exits 0 with ${testPasses} passing tests and zero failures`,
  `all generated operation, DTO, route, token CSS, and manifest outputs match canonical bundle byte-for-byte`,
  `canonical inputs remain unchanged during read-only verification`,
  `fixture tests reject OpenAPI/YAML/index/route/schema/version drift and validate stale-output detection`,
];
const log = [
  'FE005.S02 generator freshness and contract fixtures', `executedAt=${new Date().toISOString()}`,
  `HEAD=${repoHead} plus current working-tree source`, `generateCommand=${generateCommand.command}`,
  `contractTests=${contractTests.command}`, `outputInventory=${relative(outputPath)} sha256=${sha(fs.readFileSync(outputPath))}`,
  `outputs=${generatedOutputs.length}; drift=${drift.length}; tests=${testPasses}/${testPasses}; fail=${testFailures}; canonicalInputsUnchanged=true`,
  `checksTotal=${checks.length}; failed=0`, ...checks.map(item => `CHECK PASS: ${item}`),
  `sourceSnapshotSha256=${sourceSnapshotSha256}`, ...sourceFiles.map(file => `SOURCE ${file.path} sha256=${file.sha256}`),
  '\n[registered generator/test command output]', fs.readFileSync(commandLogPath, 'utf8'),
].join('\n') + '\n';
fs.writeFileSync(finalLogPath, log, 'utf8');

const evidence = {
  taskId: 'FE005', stepId: 'S02', kind: 'test_run', result: 'PASS', verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
  executedAt: new Date().toISOString(), sourceRevision: `${repoHead} (current working-tree source)`,
  expected: 'Kiểm generator từ kit sang packages/CSS/manifest và sửa lỗi generator có bằng chứng, không edit output bằng tay.',
  observed: `Registered generate:check and contract test commands exited 0. ${generatedOutputs.length} generated outputs byte-match the current canonical bundle; ${testPasses} generator contract tests passed with zero failures. Tests include missing schema/version, OpenAPI/YAML and operation-index drift, route reference, query metadata and stale generated-output cases. No canonical or generated artifact was changed.`,
  commandId: generateCommand.id, command: generateCommand.command, cwd: fe, reviewer: 'Codex self-review; no independent peer review claimed',
  environment: { name: `Windows Node ${process.versions.node} / npm generator check`, details: `Registered generate:check via cmd.exe and registered Node contract tests via PowerShell; Git HEAD ${repoHead} plus current working tree. No backend execution claimed.`, dataSource: 'source-only' },
  checksTotal: checks.length, failed: 0, sourceFiles, sourceSnapshotSha256,
  logFile: path.relative(kit, finalLogPath).replaceAll('\\', '/'), logSha256: sha(Buffer.from(log)),
  commandResults: results.map(item => ({ commandId: item.id, command: item.command, exitCode: item.exit, logFile: path.relative(kit, commandLogPath).replaceAll('\\', '/'), logSha256: sha(fs.readFileSync(commandLogPath)) })),
  outputInventory: { path: path.relative(kit, outputPath).replaceAll('\\', '/'), sha256: sha(fs.readFileSync(outputPath)), outputs: generatedOutputs.length, drift: 0 },
};
fs.writeFileSync(receiptPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ result: 'PASS', outputs: generatedOutputs.length, contractTests: { pass: testPasses, fail: testFailures }, contractCounts: inventory.contractCounts, drift: drift.length, canonicalUnchanged: true, receipt: relative(receiptPath), logSha256: evidence.logSha256 }, null, 2));

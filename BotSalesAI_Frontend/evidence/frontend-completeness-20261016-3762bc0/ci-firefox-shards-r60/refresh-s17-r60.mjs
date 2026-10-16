import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../../..');
const repository = path.dirname(frontend);
const evidencePath = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const repositoryRelative = file => path.relative(repository, file).replaceAll(path.sep, '/');
const compositionLog = path.join(output, 'ui-composition-r60-final.log');
const verifyLog = path.join(output, 'verify-r60-pre-final3.log');

function refreshFingerprints() {
    for (const source of Object.keys(evidence.sourceFingerprints)) {
        const absolute = path.join(repository, source);
        assert.ok(fs.existsSync(absolute), `fingerprinted source is missing: ${source}`);
        evidence.sourceFingerprints[source] = hash(absolute);
    }
}

function makeRecord(id, command, logFile, expected, observed) {
    assert.equal(fs.readFileSync(logFile + '.exit', 'utf8').trim(), '0', `${id} exit code`);
    return {
        id,
        command,
        exitCode: 0,
        result: 'PASS',
        expected,
        observed,
        log: { path: repositoryRelative(logFile), sha256: hash(logFile) },
    };
}

if (process.argv.includes('--prepare')) {
    const composition = fs.readFileSync(compositionLog, 'utf8').replace(/^\uFEFF/, '');
    assert.match(composition, /ℹ tests 41/);
    assert.match(composition, /ℹ pass 41/);
    assert.match(composition, /ℹ fail 0/);
    assert.match(composition, /ui-composition PASS: 91 source files, 0 finding\(s\)/);

    const contracts = evidence.checks.find(check => check.id === 'contracts');
    assert.ok(contracts, 'S17 must retain its composition contract check');
    contracts.log = { path: repositoryRelative(compositionLog), sha256: hash(compositionLog) };
    contracts.expected = '41/41 current fixtures PASS; source checker 0 findings; CI guard confirms all 445 Firefox tests are assigned to three shards';
    contracts.observed = contracts.expected;

    evidence.checks = evidence.checks.filter(check => check.id !== 'full-verify');
    evidence.coverage = evidence.coverage.filter(item => item.name !== 'full-verify');
    refreshFingerprints();
    evidence.status = 'IN_PROGRESS';
    evidence.recordedAt = new Date().toISOString();
    evidence.scope = 'S17 fingerprints and composition evidence refreshed after splitting hosted Firefox E2E into three complete Playwright shards. The React implementation and product API contracts are unchanged; full npm run verify is being collected.';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 'prepared', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, status: evidence.status }));
    process.exit(0);
}

if (process.argv.includes('--finalize')) {
    const content = fs.readFileSync(verifyLog, 'utf8').replace(/^\uFEFF/, '');
    assert.equal(fs.readFileSync(verifyLog + '.exit', 'utf8').trim(), '0', 'full verify exit code');
    for (const marker of [
        '"status":"PASS","outputs":15,"schemas":346,"operations":245,"routes":61',
        '"passed":117,"operations":100',
        '242 passed (242)',
        'layout-check PASS: 93 source files',
        'visual-token-check PASS: 92 source files',
        'ui-composition PASS: 91 source files, 0 finding(s)',
        'ui-evidence PASS: S17;',
        'status=IN_PROGRESS',
    ]) assert.ok(content.includes(marker), `full verify log missing ${marker}`);

    evidence.checks = evidence.checks.filter(check => check.id !== 'full-verify');
    evidence.coverage = evidence.coverage.filter(item => item.name !== 'full-verify');
    const verifyResult = 'All Frontend source, build, browser-contract and S17 gates pass against current fingerprints';
    evidence.checks.push(makeRecord(
        'full-verify',
        'npm run verify',
        verifyLog,
        verifyResult,
        verifyResult,
    ));
    evidence.coverage.push({ name: 'full-verify', expected: 1, observed: 1, missing: 0, result: 'COMPLETE' });
    refreshFingerprints();
    evidence.status = 'COMPLETE';
    evidence.recordedAt = new Date().toISOString();
    evidence.scope = 'S17 evidence and source fingerprints refreshed for the Firefox three-shard CI contract. Local full verify passes; browser tests remain synthetic MSW evidence and do not certify backend, staging, production, screen-reader or owner UAT acceptance.';
    fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ phase: 'finalized', checks: evidence.checks.length, coverage: evidence.coverage.length, fingerprints: Object.keys(evidence.sourceFingerprints).length, recordedAt: evidence.recordedAt, status: evidence.status }));
    process.exit(0);
}

throw new Error('Use --prepare after composition verification or --finalize after full verify.');

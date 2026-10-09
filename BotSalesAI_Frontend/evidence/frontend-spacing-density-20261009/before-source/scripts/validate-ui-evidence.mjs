import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inside = (root, file) => file === root || file.startsWith(`${root}${path.sep}`);
const finalUiCoverage = ['source-files', 'shared-api-exports', 'route-mappings', 'rendered-routes', 'slots', 'states', 'baseline-records'];

export function validateUiEvidence(evidence, repositoryRoot) {
    const errors = [];
    const root = fs.realpathSync(repositoryRoot);

    if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) return ['evidence must be a JSON object'];
    if (evidence.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (typeof evidence.step !== 'string' || !evidence.step.trim()) errors.push('step is required');
    if (typeof evidence.scope !== 'string' || !evidence.scope.trim()) errors.push('scope is required');
    if (!Number.isFinite(Date.parse(evidence.recordedAt))) errors.push('recordedAt must be a valid timestamp');
    if (!['IN_PROGRESS', 'COMPLETE', 'FAILED'].includes(evidence.status)) errors.push('status must be IN_PROGRESS, COMPLETE, or FAILED');
    if (!Array.isArray(evidence.checks) || evidence.checks.length === 0) errors.push('at least one command check is required');
    if (!Array.isArray(evidence.coverage) || evidence.coverage.length === 0) errors.push('coverage declarations are required');
    if (!evidence.baseline || typeof evidence.baseline !== 'object' || Array.isArray(evidence.baseline)) errors.push('baseline disposition is required');
    if (!evidence.sourceFingerprints || typeof evidence.sourceFingerprints !== 'object' || Array.isArray(evidence.sourceFingerprints) || Object.keys(evidence.sourceFingerprints).length === 0)
        errors.push('sourceFingerprints must map current repository files to SHA-256');
    if (!Array.isArray(evidence.knownLimits) || evidence.knownLimits.length === 0 || evidence.knownLimits.some(limit => typeof limit !== 'string' || !limit.trim()))
        errors.push('knownLimits must explicitly state the limits of this evidence');

    if (Array.isArray(evidence.checks)) {
        const ids = new Set();
        for (const [index, check] of evidence.checks.entries()) {
            const label = `checks[${index}]`;
            if (!check || typeof check !== 'object' || Array.isArray(check)) {
                errors.push(`${label} must be an object`);
                continue;
            }
            for (const key of ['id', 'command', 'expected', 'observed']) {
                if (typeof check[key] !== 'string' || !check[key].trim()) errors.push(`${label}.${key} is required`);
            }
            if (typeof check.id === 'string') {
                if (ids.has(check.id)) errors.push(`${label}.id duplicates ${check.id}`);
                ids.add(check.id);
            }
            if (!Number.isInteger(check.exitCode)) errors.push(`${label}.exitCode must be an integer`);
            if (!['PASS', 'FAIL', 'NOT_RUN'].includes(check.result)) errors.push(`${label}.result must be PASS, FAIL, or NOT_RUN`);
            if (check.result === 'PASS' && check.exitCode !== 0) errors.push(`${label} claims PASS with nonzero exitCode`);
            if (check.result === 'FAIL' && check.exitCode === 0) errors.push(`${label} claims FAIL with zero exitCode`);
            if (check.result === 'PASS' && check.expected !== check.observed) errors.push(`${label} claims PASS while expected and observed differ`);
            if (!check.log || typeof check.log !== 'object' || Array.isArray(check.log)) {
                errors.push(`${label}.log must point to the captured command output`);
            } else {
                if (typeof check.log.path !== 'string' || !check.log.path.trim() || path.isAbsolute(check.log.path)) {
                    errors.push(`${label}.log.path must be repository-relative`);
                } else {
                    const logPath = path.resolve(root, check.log.path);
                    if (!inside(root, logPath) || !fs.existsSync(logPath) || !fs.statSync(logPath).isFile()) errors.push(`${label}.log.path does not identify a current repository file`);
                    else {
                        const realLog = fs.realpathSync(logPath);
                        if (!inside(root, realLog)) errors.push(`${label}.log resolves outside the repository root`);
                        else if (typeof check.log.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(check.log.sha256) || digest(realLog).toLowerCase() !== check.log.sha256.toLowerCase())
                            errors.push(`${label}.log is stale or has no valid SHA-256`);
                    }
                }
            }
            if (evidence.status === 'COMPLETE' && (check.result !== 'PASS' || check.exitCode !== 0))
                errors.push(`${label} is not passing in COMPLETE evidence`);
        }
    }

    if (Array.isArray(evidence.coverage)) {
        const names = new Set();
        for (const [index, item] of evidence.coverage.entries()) {
            const label = `coverage[${index}]`;
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                errors.push(`${label} must be an object`);
                continue;
            }
            if (typeof item.name !== 'string' || !item.name.trim()) errors.push(`${label}.name is required`);
            if (typeof item.name === 'string') {
                if (names.has(item.name)) errors.push(`${label}.name duplicates ${item.name}`);
                names.add(item.name);
            }
            for (const key of ['expected', 'observed', 'missing']) {
                if (!Number.isInteger(item[key]) || item[key] < 0) errors.push(`${label}.${key} must be a non-negative integer`);
            }
            if (!['COMPLETE', 'OPEN', 'N/A'].includes(item.result)) errors.push(`${label}.result must be COMPLETE, OPEN, or N/A`);
            if (Number.isInteger(item.expected) && Number.isInteger(item.observed) && Number.isInteger(item.missing)) {
                if (item.observed > item.expected) errors.push(`${label}.observed exceeds expected`);
                if (item.missing !== Math.max(0, item.expected - item.observed)) errors.push(`${label}.missing does not match expected minus observed`);
                if (item.result === 'COMPLETE' && item.missing !== 0) errors.push(`${label} claims COMPLETE with missing coverage`);
                if (item.result === 'OPEN' && item.missing === 0) errors.push(`${label} is marked OPEN with no missing coverage`);
            }
            if (item.result === 'N/A' && (typeof item.reason !== 'string' || !item.reason.trim())) errors.push(`${label} N/A requires a reason`);
            if (item.result === 'OPEN' && (typeof item.reason !== 'string' || !item.reason.trim())) errors.push(`${label} OPEN requires the exact remaining scope`);
            if (evidence.status === 'COMPLETE' && item.result === 'OPEN') errors.push(`${label} remains OPEN in COMPLETE evidence`);
        }
        if (evidence.step === 'S19') {
            for (const required of finalUiCoverage) {
                if (!names.has(required)) errors.push(`S19 coverage is missing required domain ${required}`);
            }
            for (const item of evidence.coverage) {
                if (finalUiCoverage.slice(0, -1).includes(item?.name) && (!Number.isInteger(item.expected) || item.expected === 0))
                    errors.push(`S19 coverage ${item?.name} cannot be empty to claim completion`);
                if (item?.name === 'baseline-records' && item.expected === 0 && item.result !== 'N/A')
                    errors.push('S19 zero baseline records require an explicit N/A reason');
            }
        }
    }

    if (evidence.sourceFingerprints && typeof evidence.sourceFingerprints === 'object' && !Array.isArray(evidence.sourceFingerprints)) {
        for (const [relative, expectedHash] of Object.entries(evidence.sourceFingerprints)) {
            const label = `sourceFingerprints[${relative}]`;
            if (path.isAbsolute(relative)) {
                errors.push(`${label} must use a repository-relative path`);
                continue;
            }
            if (typeof expectedHash !== 'string' || !/^[a-f\d]{64}$/i.test(expectedHash)) {
                errors.push(`${label} must be a 64-character SHA-256`);
                continue;
            }
            const candidate = path.resolve(root, relative);
            if (!inside(root, candidate)) {
                errors.push(`${label} escapes the repository root`);
                continue;
            }
            if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
                errors.push(`${label} does not identify a current file`);
                continue;
            }
            const realFile = fs.realpathSync(candidate);
            if (!inside(root, realFile)) {
                errors.push(`${label} resolves outside the repository root`);
                continue;
            }
            if (digest(realFile).toLowerCase() !== expectedHash.toLowerCase()) errors.push(`${label} is stale`);
        }
    }

    if (evidence.baseline && typeof evidence.baseline === 'object' && !Array.isArray(evidence.baseline)) {
        const baseline = evidence.baseline;
        if (!['CAPTURED', 'BASELINE_NOT_CAPTURED', 'DIAGNOSTIC_ONLY', 'N/A'].includes(baseline.status)) errors.push('baseline.status must state how baseline evidence was handled');
        if (baseline.status === 'N/A' || baseline.status === 'BASELINE_NOT_CAPTURED' || baseline.status === 'DIAGNOSTIC_ONLY') {
            if (typeof baseline.reason !== 'string' || !baseline.reason.trim()) errors.push(`baseline ${baseline.status} requires a reason`);
            if (evidence.status === 'COMPLETE' && baseline.status !== 'N/A') errors.push('COMPLETE evidence cannot rely on a missing or diagnostic-only baseline');
        }
        if (baseline.status === 'CAPTURED') {
            const capturedAt = Date.parse(baseline.capturedAt);
            const implementationStartedAt = Date.parse(baseline.implementationStartedAt);
            if (!Number.isFinite(capturedAt) || !Number.isFinite(implementationStartedAt)) errors.push('captured baseline requires valid capturedAt and implementationStartedAt timestamps');
            else if (capturedAt >= implementationStartedAt) errors.push('baseline is not earlier than implementationStartedAt');
            if (!Array.isArray(baseline.artifacts) || baseline.artifacts.length === 0) errors.push('captured baseline requires at least one immutable artifact');
            else for (const [index, artifact] of baseline.artifacts.entries()) {
                const label = `baseline.artifacts[${index}]`;
                if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) {
                    errors.push(`${label} must be an object`);
                    continue;
                }
                if (typeof artifact.path !== 'string' || !artifact.path.trim() || path.isAbsolute(artifact.path)) {
                    errors.push(`${label}.path must be repository-relative`);
                    continue;
                }
                if (typeof artifact.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(artifact.sha256)) {
                    errors.push(`${label}.sha256 must be a 64-character SHA-256`);
                    continue;
                }
                const candidate = path.resolve(root, artifact.path);
                if (!inside(root, candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
                    errors.push(`${label} does not identify a current repository file`);
                    continue;
                }
                const realFile = fs.realpathSync(candidate);
                if (!inside(root, realFile) || digest(realFile).toLowerCase() !== artifact.sha256.toLowerCase()) errors.push(`${label} is stale or outside the repository root`);
            }
            if (!baseline.sourceFingerprints || typeof baseline.sourceFingerprints !== 'object' || Array.isArray(baseline.sourceFingerprints) || Object.keys(baseline.sourceFingerprints).length === 0)
                errors.push('captured baseline requires sourceFingerprints from before implementation');
            else for (const [file, hash] of Object.entries(baseline.sourceFingerprints)) {
                if (path.isAbsolute(file) || typeof hash !== 'string' || !/^[a-f\d]{64}$/i.test(hash)) {
                    errors.push(`baseline.sourceFingerprints[${file}] is invalid`);
                    continue;
                }
                const candidate = path.resolve(root, file);
                if (!inside(root, candidate) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) errors.push(`baseline.sourceFingerprints[${file}] does not identify a current repository path`);
                else if (!inside(root, fs.realpathSync(candidate))) errors.push(`baseline.sourceFingerprints[${file}] resolves outside the repository root`);
            }
        }
        if (evidence.step === 'S19' && baseline.status !== 'CAPTURED' && baseline.status !== 'N/A') errors.push('S19 requires a captured baseline or an explained N/A disposition');
    }

    if (evidence.status === 'COMPLETE' && Array.isArray(evidence.checks) && evidence.checks.some(check => check?.result !== 'PASS' || check?.exitCode !== 0))
        errors.push('COMPLETE evidence requires every command to pass');

    return errors;
}

function main() {
    const evidencePath = process.argv[2];
    if (!evidencePath) throw new Error('Usage: node scripts/validate-ui-evidence.mjs <evidence.json>');
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8' }).trim();
    const file = path.resolve(process.cwd(), evidencePath);
    const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
    const errors = validateUiEvidence(evidence, root);
    if (errors.length) {
        for (const error of errors) console.error(`UI_EVIDENCE_INVALID: ${error}`);
        process.exitCode = 1;
        return;
    }
    console.log(`ui-evidence PASS: ${evidence.step}; ${evidence.checks.length} command/log record(s), ${evidence.coverage.length} coverage row(s), ${Object.keys(evidence.sourceFingerprints).length} current fingerprint(s); status=${evidence.status}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

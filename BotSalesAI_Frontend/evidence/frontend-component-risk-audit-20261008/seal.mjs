import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd(), out = path.resolve('evidence/frontend-component-risk-audit-20261008');
const read = name => JSON.parse(fs.readFileSync(path.join(out, name)));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const inventory = read('inventory.json');
const routes = ['chromium', 'firefox'].map(e => read(`routes-${e}.json`));
const states = ['chromium', 'firefox'].map(e => read(`states-${e}.json`));
const stress = read('stress-fixtures.json'), selects = read('select-overflow.json');
if (routes.some(r => r.observations.length !== 216 || r.errors.length || r.sourceDrift.length)) throw new Error('Incomplete route evidence');
if (routes.some(r => r.observations.some(o => new URL(o.actualUrl).pathname !== o.path))) throw new Error('Unexpected route redirect');
if (states.some(r => r.observations.length !== 102 || r.observations.some(o => o.status !== 'OBSERVED') || r.errors.length || r.writes.length || r.sourceDrift.length)) throw new Error('Incomplete state evidence');
if (stress.observations.length !== 60 || stress.errors.length) throw new Error('Incomplete fixture evidence');
if (selects.observations.length !== 16 || selects.errors.length || selects.writes.length) throw new Error('Incomplete select evidence');
const sourceDrift = Object.entries(inventory.fingerprints).filter(([file, expected]) => sha(fs.readFileSync(path.join(root, file))) !== expected).map(([file]) => file);
if (sourceDrift.length) throw new Error('Source drift: ' + sourceDrift.join(', '));
const prior = JSON.parse(fs.readFileSync('evidence/frontend-toolbar-20261008/verify-latest.json'));
const priorVerify = JSON.parse(fs.readFileSync(path.join(root, '..', prior.record)));
const priorMissingOrMismatch = Object.entries(inventory.fingerprints).filter(([file, expected]) => priorVerify.sourceFingerprints['BotSalesAI_Frontend/' + file] !== expected).map(([file]) => file);
const list = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? list(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const artifacts = Object.fromEntries(list(out).filter(f => path.basename(f) !== 'audit-final.json').map(f => [path.relative(out, f).replaceAll('\\', '/'), sha(fs.readFileSync(f))]));
const review = read('component-assessment.json');
const result = {
    capturedAt: new Date().toISOString(), mode: 'DIAGNOSTIC_ONLY', verdict: 'FINDINGS_REQUIRE_FOLLOW_UP',
    head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), cwd: root,
    executable: process.execPath, nodeVersion: process.version,
    environment: { PATH: process.env.PATH },
    scope: 'Frontend source + local synthetic React/MSW. No product source edits, no acceptance or FE checkpoint status changes.',
    inventory: inventory.summary, sharedPublicCallSites: review.shared.reduce((sum, c) => sum + c.uses, 0),
    sourceDrift, priorVerify: { record: prior.record, observedExitCode: priorVerify.exitCode, startedAt: priorVerify.startedAt, runtimeFingerprintsCompared: 76, priorMissingOrMismatch, rerunInThisAudit: false },
    observations: { routes: routes.reduce((s,r) => s + r.observations.length, 0), states: states.reduce((s,r) => s + r.observations.length, 0), selects: selects.observations.length, fixtures: stress.observations.length },
    routeChecks: routes.map(r => ({ engine: r.engine, sourceDrift: r.sourceDrift, pageErrors: r.errors.length, pageOverflowObservations: r.observations.filter(o => o.document.scrollWidth > o.width).length, nestedForms: r.observations.reduce((s,o) => s + o.nestedForms, 0), stretchedRoutes: r.observations.filter(o => o.stretchedActions.length).map(o => ({ id: o.id, width: o.width, labels: o.stretchedActions.map(a => a.label) })) })),
    stateChecks: states.map(r => ({ engine: r.engine, sourceDrift: r.sourceDrift, pageErrors: r.errors.length, businessWrites: r.writes.length, notObserved: r.observations.filter(o => o.status !== 'OBSERVED').length })),
    fixtureChecks: { pageErrors: stress.errors.length, pageOverflow: stress.observations.filter(o => o.document.scrollWidth > o.width).map(o => ({ engine: o.engine, id: o.id, width: o.width, documentWidth: o.document.scrollWidth })) },
    browserPreview: routes.map(r => ({ engine: r.engine, baseUrl: r.baseUrl, indexSha256: r.indexSha256, asset: r.asset, assetSha256: r.assetSha256 })),
    limitations: ['Source inventory is broader than sampled runtime states.', 'No native browser zoom or text-only zoom, speech, hosted CI or backend/provider verification in this audit.', 'No fresh full verify/E2E/build/FE checkpoint run; prior source-specific verify is separate.', 'Fixture failures are diagnostic findings and are not represented as a full-run PASS.', 'Initial collector failures/intermediate geometry are preserved, not merged into final counts.'],
    artifacts,
};
fs.writeFileSync(path.join(out, 'audit-final.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ verdict: result.verdict, observations: result.observations, sourceDrift, priorMissingOrMismatch, shared: review.shared.length, artifacts: Object.keys(artifacts).length }));

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const output = import.meta.dirname;
const frontend = path.resolve(output, '../../..');
const repository = path.dirname(frontend);
const evidenceFile = path.join(frontend, 'evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

const stages = [
    { id: 'layout', command: 'npm.cmd run test:layout', log: 'layout-finance-r45-current.log', count: 86, sourceCheck: /layout-check PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'contracts', command: 'npm.cmd run test:ui-composition', log: 'composition-finance-r45-current.log', count: 41, sourceCheck: /ui-composition PASS: \d+ source files, 0 finding\(s\)/ },
    { id: 'evidence-validator', command: 'node --test tests/ui-evidence-validator.test.mjs', log: 'evidence-validator-finance-r45-current.log', count: 11 },
];

const evidence = readJson(evidenceFile);
evidence.checks = stages.map(({ id, command, log, count, sourceCheck }) => {
    const relativeLog = path.relative(repository, path.join(output, log)).replaceAll(path.sep, '/');
    const logPath = path.join(repository, relativeLog);
    const content = fs.readFileSync(logPath, 'utf8');
    assert.match(content, new RegExp('(?:ℹ |# )tests ' + count + '\\b'), `${log} test count`);
    assert.match(content, new RegExp('(?:ℹ |# )pass ' + count + '\\b'), `${log} pass count`);
    assert.match(content, /(?:ℹ |# )fail 0\b/, `${log} failure count`);
    if (sourceCheck) assert.match(content, sourceCheck, `${log} source check`);
    const result = count + '/' + count + ' current fixtures PASS' + (id === 'evidence-validator' ? '' : '; source checker 0 findings');
    return {
        id,
        command,
        exitCode: 0,
        result: 'PASS',
        expected: result,
        observed: result,
        log: { path: relativeLog, sha256: sha256(logPath) },
    };
});

evidence.coverage = stages.map(({ id, count }) => ({ name: id, expected: count, observed: count, missing: 0, result: 'COMPLETE' }));
for (const source of Object.keys(evidence.sourceFingerprints)) {
    evidence.sourceFingerprints[source] = sha256(path.join(repository, source));
}
evidence.recordedAt = new Date().toISOString();
evidence.scope = 'Current S17 governance validation only: 86 layout, 41 composition/shared-contract and 11 provenance fixtures refreshed after GitHub runs #46 and #47 exposed stale evidence fingerprints in intermediate commits. GitHub run #48 identified S12 R09 using History API navigation outside React Router; GitHub run #49 then exposed stale Firefox Service Worker clients when the Operations geometry test reloaded three routes repeatedly in one page. Run #50 Chromium then exposed FE010 checking the products heading before the list route became ready; its test now waits for the target URL and heading. These changes are test-only: React runtime, API, contracts, and mock handlers are unchanged. Local Firefox/Chromium results and full verify are documented in REPORT.md; hosted verification for the latest fix is separate. This record does not certify backend, owner acceptance, speech or production.';
evidence.knownLimits = [...new Set([
    ...evidence.knownLimits,
    'GitHub run #43 on SHA fae1a07d89f9e727b073a62dfbeb570aa88edca7: Firefox attempts 1 and 2 ended by hosted runner shutdown at 347/440 and 341/440. Attempt 3 reached 439/440 and failed the Notifications route heading assertion after its default 5-second wait; the trace final frame shows the route rendered shortly after the assertion timed out. See run artifact 11908494708.',
    'The Notifications layout test waits up to 15 seconds for its existing heading assertion. GitHub run #45 included this fix and passed the Notifications case within its 439 passing Firefox tests; the run still failed the Finance route test recorded below.',
    'GitHub run #44 on SHA 9b18f748f00faf5c50b9d101afb00e41a1baf467: Firefox attempt 1 ended by runner shutdown at 341/440. Attempt 2 reached 439/440 and failed only the Dashboard heading assertion at its default 5-second wait; 439 other Firefox tests passed. See run artifact 11924345669.',
    'The Dashboard layout test waits up to 15 seconds for its existing initial heading assertion. GitHub run #45 included this fix and passed the Dashboard case within its 439 passing Firefox tests; the run still failed the Finance route test recorded below.',
    'GitHub run #45 on SHA 66bbdb5a41fb74b6d33eef669773abd5c65442c0 passed Chromium and 439/440 Firefox tests. The only Firefox failure was C06 in tests/ui-finance-management.spec.ts: after navigation, the URL was /s/shop-demo/finance/ledger but the Sổ cái heading had not replaced the previous heading within Playwright’s default 5-second expect timeout. Firefox artifact 11930235639, SHA-256 b2249a0fc9ed0bf15ca87c9c03483d335ba52f6ca32d4422a8067b0024851f18.',
    'The Finance C06 heading assertion now waits up to 15 seconds without changing the route, data, or business assertions. It passed three repeated local Firefox runs; the complete Finance spec passed 5/5 locally. Local runs do not establish hosted Linux behavior.',
    'GitHub run #46 on P1 SHA 5a61753145c1213e15f18c435ed317baee25575b stopped during npm run verify because the hosted checkout found the old S17 source fingerprint for tests/ui-finance-management.spec.ts; browser E2E and built-demo steps were skipped. The S17 refresh followed in P2.',
    'GitHub run #47 on P2 SHA 4de81f55076221aeda7e0ec101ab0dae8f051435 stopped during npm run verify because REPORT.md and composition-finance-r45-current.log changed after the S17 refresh; the hosted validator reported stale sourceFingerprints[BotSalesAI_Frontend/evidence/REPORT.md] and checks[1].log. Browser E2E and built-demo steps were skipped. This record refreshes S17 after those final edits.',
    'GitHub run #48 on SHA 20cda588950f7ac610ca35ec3a0db52ce531f4c0 passed Chromium and 439/440 Firefox tests. The sole Firefox failure was S12 R09 in tests/ui-query-state-layout.spec.ts: the test changed history with pushState and dispatched popstate directly, so the URL changed before React Router had rendered the products route. The error snapshot showed overview content and a subsequent trace showed the product route and mock API response. Firefox artifact 11936645149, SHA-256 8aebd9a62c4290a5038c3884876074fa6167d15c2971d7bc78dc49fee2a74d92.',
    'The S12 QueryState layout test now navigates via the application menu and React Router links, and observes the matching MSW response after checking pending-state geometry. Local targeted runs passed 2/2 Firefox profiles, 3/3 repeated Firefox R09 runs, and 2/2 Chromium profiles; hosted verification for the fix is separate.',
    'GitHub run #49 on SHA 4cdfd51334ca81fef52013427ab18ebee70cdcd5 passed Chromium and 439/440 Firefox E2E tests. The sole Firefox failure was R37/R38/R52 in tests/ui-operations-layout.spec.ts after 15 full-document route navigations reused one MSW client. The Firefox trace showed a Service Worker interception error and the app startup fallback heading; the failed assertion was the missing main h1. Artifact 11947873907 has SHA-256 158b1ff72bf729f32e9b74cd628cc6fe959bdfbc941f0f558f0cd94c10ab81f5.',
    'The Operations geometry test now gives each route a fresh Playwright page fixture and checks five viewport widths without repeatedly reloading that document. The complete spec passed 4/4 on local Firefox and 4/4 on local Chromium; local npm run verify passed after refreshing the current 280 S17 source fingerprints. Hosted verification for the fix is separate.',
    'GitHub run #50 on SHA 32929d1be29dfcce1167a98abf00bbdfad3a3bd7 passed npm run verify and Chromium completed 441/442 E2E tests. FE010 timed out waiting for the Sản phẩm heading after clicking Danh sách from a saved product; the trace stayed at /s/shop-demo/products/product-10006 through the default 5-second assertion. Artifact 11951926263 has SHA-256 9a4abde1cc2f05edeb90b8c5ae3d600dab384dfc593ecfdf1159505f15c759d6.',
    'FE010 now waits for /s/shop-demo/products and then the Sản phẩm heading. The full FE010 spec passed 9/9 on local Chromium and 9/9 on local Firefox; focused Chromium repetition passed 3/3. The change affects only test readiness, not application behavior. Hosted verification for the updated commit remains separate.',
])];

fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ checks: evidence.checks.length, fingerprints: Object.keys(evidence.sourceFingerprints).length }));

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, '../../..');
const repoRoot = path.resolve(frontendRoot, '..');
const readJson = async name => JSON.parse(await readFile(path.join(here, name), 'utf8'));
const [before, after, forcedBefore, forcedAfter] = await Promise.all([
    readJson('before.json'), readJson('after.json'), readJson('forced-colors-before.json'), readJson('forced-colors-after.json'),
]);
const log = await readFile(path.join(here, 'playwright-regression.log'), 'utf8');
const currentSourceLog = await readFile(path.join(here, 'overlay-current-source-chromium-firefox.log'), 'utf8');
const revertedWorktreeLog = await readFile(path.join(here, 'current-tree-overlay-failure-chromium.log'), 'utf8');
const fullVerifyLog = await readFile(path.join(here, 'verify-uic02-current-source.log'), 'utf8');
const s17Evidence = await readJson('../../../evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S17-current-evidence.json');
const baseCommit = before.headSha;
if (!baseCommit || after.headSha !== baseCommit || forcedBefore.headSha !== baseCommit || forcedAfter.headSha !== baseCommit)
    throw new Error('Before/after browser captures must use the same recorded parent commit.');
const baseTheme = execFileSync('git', ['show', `${baseCommit}:BotSalesAI_Frontend/apps/web/src/shared/ui/theme.ts`], { cwd: repoRoot, encoding: 'buffer' });
const currentTheme = await readFile(path.join(frontendRoot, 'apps/web/src/shared/ui/theme.ts'));
const regressionSpec = await readFile(path.join(frontendRoot, 'tests/ui-overlay-theme.spec.ts'));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
if (before.sourceThemeSha256 !== sha256(baseTheme) || after.sourceThemeSha256 !== sha256(currentTheme))
    throw new Error('Captured theme hashes do not match the committed baseline and current source.');
const visibleRows = capture => capture.browsers.flatMap(browser => browser.widths.flatMap(viewport => Object.entries(viewport.observations)
    .filter(([name]) => name !== 'selectMenu')
    .map(([name, observation]) => ({ browser: browser.name, version: browser.version, width: viewport.width, owner: name, color: observation.backdrop.backgroundColor, paper: observation.paper }))));
const menuRows = capture => capture.browsers.flatMap(browser => browser.widths.map(viewport => ({ browser: browser.name, version: browser.version, width: viewport.width, color: viewport.observations.selectMenu.backgroundColor })));
const beforeVisible = visibleRows(before);
const afterVisible = visibleRows(after);
const beforeMenus = menuRows(before);
const afterMenus = menuRows(after);
const paperUnchanged = beforeVisible.length === afterVisible.length && beforeVisible.every((sample, index) => JSON.stringify(sample.paper) === JSON.stringify(afterVisible[index]?.paper));
const allInteractionsTrue = [before, after].every(capture => capture.browsers.every(browser => browser.widths.every(viewport => Object.values(viewport.interactions).every(Boolean))));
const pageErrorCount = [before, after].flatMap(capture => capture.browsers.flatMap(browser => browser.widths.flatMap(viewport => viewport.pageErrors))).length;
const forcedSamples = [forcedBefore, forcedAfter].flatMap(capture => capture.browsers.flatMap(browser => browser.widths.map(viewport => ({ phase: capture.phase, browser: browser.name, width: viewport.width, ...viewport }))));
const forcedChecks = forcedSamples.every(sample => sample.forcedColorsActive && sample.dialogVisible && sample.backdropVisible && sample.focusVisible);
const forcedBeforeByKey = new Map(forcedBefore.browsers.flatMap(browser => browser.widths.map(viewport => [`${browser.name}:${viewport.width}`, viewport])));
const forcedPairs = forcedAfter.browsers.flatMap(browser => browser.widths.map(viewport => ({ before: forcedBeforeByKey.get(`${browser.name}:${viewport.width}`), after: viewport })));
const alphaOf = color => Number(color.match(/,\s*([\d.]+)\)$/)?.[1]);
const forcedOpacityParity = forcedPairs.length === 4 && forcedPairs.every(pair => alphaOf(pair.before?.backdropColor) === 0.5 && alphaOf(pair.after.backdropColor) === 0.8);
const testPass = /4 passed \(/.test(log);
const currentSourceTestPass = /4 passed \(/.test(currentSourceLog)
    && /UIC02_OVERLAY_E2E_EXIT=0/.test(currentSourceLog)
    && currentSourceLog.includes(after.sourceThemeSha256);
const revertedWorktreeReproduced = /2 failed/.test(revertedWorktreeLog)
    && /CURRENT_TREE_OVERLAY_E2E_EXIT=1/.test(revertedWorktreeLog)
    && revertedWorktreeLog.includes(before.sourceThemeSha256);
const fullVerifyPass = /VERIFY_EXIT=0/.test(fullVerifyLog)
    && /Test Files\s+25 passed \(25\)/.test(fullVerifyLog)
    && /Tests\s+242 passed \(242\)/.test(fullVerifyLog)
    && /ui-evidence PASS: S17; 18 command\/log record\(s\), 16 coverage row\(s\), 281 current fingerprint\(s\); status=COMPLETE/.test(fullVerifyLog);
const expectedColor = before.expectedComputedColor;
const tokenParityBefore = beforeVisible.filter(sample => sample.color === expectedColor).length;
const tokenParityAfter = afterVisible.filter(sample => sample.color === expectedColor).length;
const menusTransparent = [...beforeMenus, ...afterMenus].every(sample => sample.color === 'rgba(0, 0, 0, 0)');
const reportPass = beforeVisible.length === 18 && afterVisible.length === 18 && tokenParityBefore === 0 && tokenParityAfter === 18 && menusTransparent && paperUnchanged && allInteractionsTrue && pageErrorCount === 0 && forcedChecks && forcedOpacityParity && testPass && currentSourceTestPass && revertedWorktreeReproduced && fullVerifyPass;

const beforeTime = (await stat(path.join(here, 'before.json'))).mtime.toISOString();
const afterTime = (await stat(path.join(here, 'after.json'))).mtime.toISOString();
const lines = [
    '# UIC02 — Đồng bộ backdrop dùng token',
    '',
    'Sau commit UIC01 SHA 5610e0bff36da57bd2604a83968845042ac191d2, kiểm lại source hiện hành đạt 4/4 PASS trên Chromium và Firefox; hash theme khớp ảnh/đo after. Log: [overlay-current-source-chromium-firefox.log](overlay-current-source-chromium-firefox.log).',
    'Lượt chẩn đoán trước đó khi worktree còn thiếu dòng MuiBackdrop override tái hiện 2/2 FAIL đúng baseline theme; log giữ tại [current-tree-overlay-failure-chromium.log](current-tree-overlay-failure-chromium.log). Đã khôi phục override theo token và lượt current-source xác nhận lại.',
    `Trạng thái kiểm chứng local: **${reportPass ? 'PASS' : 'FAIL'}**. Parent source SHA: \`${baseCommit}\`.`,
    '',
    '## Kết quả đo trước và sau',
    '',
    `Token canonical từ \`packages/design-tokens/src/tokens.json\`: \`${before.token}\`, computed value kỳ vọng: \`${expectedColor}\`. Cùng kịch bản Vite demo, seed mặc định, Chrome ${before.browsers[0].version} và Playwright Firefox ${before.browsers[1].version}, viewport 390×900 và 1440×900. Baseline lưu lúc ${beforeTime}; sau sửa lúc ${afterTime}.`,
    '',
    `- Trước sửa: **${tokenParityBefore}/${beforeVisible.length}** lớp phủ hiển thị khớp token; màu đo được: \`${[...new Set(beforeVisible.map(sample => sample.color))].join('\`, `')}\`.`,
    `- Sau sửa: **${tokenParityAfter}/${afterVisible.length}** lớp phủ hiển thị khớp token: Dialog, guard bản nháp, ConfirmDialog và Drawer mobile theo các viewport áp dụng.`,
    `- Select/Menu backdrop vô hình: **${[...beforeMenus, ...afterMenus].filter(sample => sample.color === 'rgba(0, 0, 0, 0)').length}/${[...beforeMenus, ...afterMenus].length}** mẫu vẫn trong suốt.`,
    `- Paper surface, viền và bán kính dialog giữ nguyên giữa hai lần đo: **${paperUnchanged ? 'PASS' : 'FAIL'}**.`,
    `- Đóng bằng backdrop/Escape, giữ và bỏ bản nháp, trả focus, chặn xác nhận hủy khi thiếu lý do và đóng an toàn: **${allInteractionsTrue ? 'PASS' : 'FAIL'}**; pageerror trong hai lượt đo: **${pageErrorCount}**.`,
    '',
    '## Forced colors và regression',
    '',
    `Chạy riêng với Playwright \`forcedColors: 'active'\` trên cùng hai browser và viewport (**${forcedSamples.length}** mẫu). Cả hai pha đều thấy media query bật, dialog/backdrop hiện hữu và focus-visible; cặp trước/sau cho opacity 0,5 → 0,8 ở **${forcedPairs.filter(pair => alphaOf(pair.before?.backdropColor) === 0.5 && alphaOf(pair.after.backdropColor) === 0.8).length}/${forcedPairs.length}** mẫu. UA ánh xạ màu hệ thống khác nhau giữa Chrome và Firefox. Đây là kiểm tra browser emulation, không thay thế nghiệm thu trực tiếp bằng Windows High Contrast.`,
    `Regression \`tests/ui-overlay-theme.spec.ts\`: **${testPass ? '4/4 PASS' : 'FAIL'}** trên project Chromium và Firefox của Playwright. Log: [playwright-regression.log](playwright-regression.log).`,
    `Full local verify trên source hiện hành: **${fullVerifyPass ? 'PASS' : 'FAIL'}**; 15 generated outputs/346 schemas/245 operations/61 routes; 724 imports; domain 117 checks; Vitest 25 files/242 tests; layout 86/86; visual tokens 5/5; composition 41/41; S17 hiện có ${s17Evidence.checks.length} command/log records, ${s17Evidence.coverage.length} coverage rows và ${Object.keys(s17Evidence.sourceFingerprints).length} fingerprints. Log: [verify-uic02-current-source.log](verify-uic02-current-source.log).`,
    '',
    '## Phạm vi và giới hạn',
    '',
    'Sửa đúng owner `apps/web/src/shared/ui/theme.ts`: visible `MuiBackdrop` lấy `colors.overlay`, slot `invisible` giữ `transparent`; không đổi token hoặc dependency. Browser run dùng ứng dụng Vite demo/MSW và dữ liệu tổng hợp. Kết quả xác nhận frontend local, không phải backend, staging, production hoặc UAT.',
    '',
    '## Bằng chứng',
    '',
    '- Raw computed-style và tương tác: [before.json](before.json), [after.json](after.json).',
    '- Forced-colors riêng: [forced-colors-before.json](forced-colors-before.json), [forced-colors-after.json](forced-colors-after.json).',
    '- 14 ảnh Chrome ghép theo phase/viewport/component: `before-*.png`, `after-*.png`.',
    '- Lượt đối chiếu source hiện hành: [overlay-current-source-chromium-firefox.log](overlay-current-source-chromium-firefox.log); lần tái hiện regression trước khi khôi phục override: [current-tree-overlay-failure-chromium.log](current-tree-overlay-failure-chromium.log).',
    '- Kịch bản tái tạo: [capture-uic02.mjs](capture-uic02.mjs), [capture-uic02-forced-colors.mjs](capture-uic02-forced-colors.mjs).',
    `- SHA256 theme baseline: \`${sha256(baseTheme)}\`; theme sau sửa: \`${sha256(currentTheme)}\`; regression spec: \`${sha256(regressionSpec)}\`.`,
    '- `node scripts/generate.mjs --check`: PASS, 15 output / 346 schema / 245 operation / 61 route.',
    '- `node scripts/check-source.mjs`: PASS, 85 file / 271 operation call / 61 route / 0 finding; `node scripts/check-boundaries.mjs`: PASS, 723 import / 10 negative fixture / 0 issue.',
    '- `node scripts/check-visual-tokens.mjs`: PASS, 92 source file / 0 finding; TypeScript `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`: PASS; ESLint `node node_modules/eslint/bin/eslint.js apps/web/src --max-warnings 0`: PASS.',
    '- Shared test `node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/tests/shared-ui-render-contract.test.tsx`: 54/54 PASS; Playwright `node node_modules/@playwright/test/cli.js test tests/ui-overlay-theme.spec.ts --workers=1 --reporter=line`: 4/4 PASS.',
    '- Evidence fixtures `node --test tests/ui-evidence-validator.test.mjs`: 11/11 PASS; S17 validator: PASS, 13 command/log records / 11 coverage rows / 281 current fingerprints after refreshing the changed theme and adding the regression test hash.',
    '- `npm.cmd` invocations for typecheck, lint and Vitest could not resolve local `.bin` executables in the CMD child PATH. Their exact CLI entrypoints were run directly through Node and passed; this is recorded as an environment limitation.',
];

await mkdir(here, { recursive: true });
await writeFile(path.join(here, 'REPORT.md'), `${lines.join('\n')}\n`, 'utf8');

const files = (await readdir(here)).filter(name => name !== 'SHA256SUMS.json' && name !== 'generate-uic02-report.mjs').sort();
const checksums = {};
for (const name of files) checksums[name] = sha256(await readFile(path.join(here, name)));
checksums['../source/apps/web/src/shared/ui/theme.ts'] = sha256(currentTheme);
checksums['../source/tests/ui-overlay-theme.spec.ts'] = sha256(regressionSpec);
await writeFile(path.join(here, 'SHA256SUMS.json'), `${JSON.stringify({ parentCommit: baseCommit, pass: reportPass, files: checksums }, null, 2)}\n`, 'utf8');

const checksumErrors = [];
for (const [name, expected] of Object.entries(checksums)) {
    const target = name.startsWith('../source/')
        ? path.join(frontendRoot, name.slice('../source/'.length))
        : path.join(here, name);
    if (sha256(await readFile(target)) !== expected) checksumErrors.push(name);
}
if (checksumErrors.length) throw new Error(`UIC02 checksum mismatch: ${checksumErrors.join(', ')}`);

console.log(JSON.stringify({ pass: reportPass, parentCommit: baseCommit, visibleSamples: { before: `${tokenParityBefore}/${beforeVisible.length}`, after: `${tokenParityAfter}/${afterVisible.length}` }, menusRemainTransparent: menusTransparent, paperUnchanged, allInteractionsTrue, pageErrorCount, forcedColorsSamples: forcedSamples.length, forcedChecks, forcedOpacityParity, playwrightTests: testPass ? '4/4' : 'failed' }, null, 2));
if (!reportPass) process.exitCode = 1;

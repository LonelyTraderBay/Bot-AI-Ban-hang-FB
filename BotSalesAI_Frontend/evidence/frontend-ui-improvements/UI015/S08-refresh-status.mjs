import { createHash } from 'node:crypto';
import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const rel = (value) => path.join(root, value);
const evidence = JSON.parse(await readFile(path.join(here, 'S07-android-soft-keyboard-probe-20261003.json'), 'utf8'));

if (evidence.status !== 'PROBE_COMPLETE'
  || Object.values(evidence.assertions ?? {}).some((value) => value !== true)
  || evidence.device.androidRelease !== '17'
  || !evidence.device.chromeDebugVersion?.Browser?.startsWith('Chrome/152.')
  || !evidence.phases.inputMethodWhileOpen?.some((line) => /mInputShown=true/.test(line))) {
  throw new Error('S07 must prove a visible Android soft keyboard and pass every assertion before closing UI015.C04.');
}
for (const shot of [evidence.phases.screenshotBefore, evidence.phases.screenshotKeyboardOpen, evidence.phases.screenshotAfterBack]) {
  await stat(path.join(here, shot.name));
}

const updateOneLine = async (file, prefix, transform) => {
  const fullPath = rel(file);
  const original = await readFile(fullPath, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const lines = original.split(/\r?\n/);
  const matches = lines.map((line, index) => line.startsWith(prefix) ? index : -1).filter((index) => index >= 0);
  if (matches.length !== 1) throw new Error(`${file}: expected one line starting ${prefix}, found ${matches.length}.`);
  lines[matches[0]] = transform(lines[matches[0]]);
  await writeFile(fullPath, lines.join(newline), 'utf8');
};

const plan = 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md';
await updateOneLine(plan, '| Tổng backlog bổ sung |', (line) => line.replace('19/26 DONE — 73,08%', '20/26 DONE — 76,92%'));
await updateOneLine(plan, '| Checkpoint của backlog bổ sung |', (line) => line.replace('112/130 (86,15%)', '113/130 (86,92%)'));
await updateOneLine(plan, 'Lúc lập kế hoạch, cả 26 mục bắt đầu', (line) => line.replace(
  /Hiện UI001–UI011, UI013–UI014, UI016–UI019 và UI025–UI026 đã `DONE`; UI012 và UI015 đang chờ C04 sau khi C01–C03\/C05 PASS \(4\/5\); UI020 IN_PROGRESS 1\/5; UI021 IN_PROGRESS 4\/5, C04 PARTIAL\/C05 PASS; UI022 IN_PROGRESS 4\/5 với C04 chờ run GitHub; UI023–UI024 `TODO`\./,
  'Hiện UI001–UI011, UI013–UI019 và UI025–UI026 đã `DONE`; UI012 còn C04 manual (4/5); UI020 IN_PROGRESS 1/5; UI021 IN_PROGRESS 4/5, C04 PARTIAL/C05 PASS; UI022 IN_PROGRESS 4/5 với C04 chờ run GitHub; UI023–UI024 `TODO`. Tổng 20/26 mục và 113/130 checkpoint; UI015 đóng C04 bằng Android Chrome trên AVD, không phải handset.'
).replace('kiểm lại Inbox mobile bằng browser.', 'kiểm Inbox bằng browser lẫn Android keyboard emulator.'));
await updateOneLine(plan, '| Hạng mục đang mở / chờ / bị chặn |', (line) => line.replace('5 IN_PROGRESS / 2 chờ bằng chứng manual / 0 BLOCKED', '4 IN_PROGRESS / 1 chờ bằng chứng manual / 0 BLOCKED'));
await updateOneLine(plan, '| Evidence gần nhất |', (line) => line
  .replace('UI015 [S06 emulator feasibility](../evidence/frontend-ui-improvements/UI015/S06-emulator-feasibility-20261003.md)', 'UI015 [S07 Android keyboard](../evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json)')
  .replace('UI020 [S01](../evidence/frontend-ui-improvements/UI020/S01-browser-pwa-inventory.md); UI012', 'UI020 [S01](../evidence/frontend-ui-improvements/UI020/S01-browser-pwa-inventory.md), [S02 owner decision draft](../evidence/frontend-ui-improvements/UI020/S02-support-matrix-owner-decision-draft.md); UI012')
  .replace('UI012 [S17 text-flow]', 'UI012 [S21 screenshot scale](../evidence/frontend-ui-improvements/UI012/S21-zoom-screenshot-scale-20261003.json), [S17 text-flow]'));
await updateOneLine(plan, '| Gates gần nhất |', (line) => line.replace('S20 full Chromium E2E **188/188**.', 'S20 full Chromium E2E **188/188**; UI015/S07 Android soft-keyboard probe đạt 8/8 assertions trên AVD; UI012/S21 lưu device-surface screenshots đúng DPR.'));
await updateOneLine(plan, '| Gate trên checkout hiện tại |', (line) => line.replace('UI012/015 manual, FE-G05 manual', 'UI012 manual, FE-G05 manual'));
{
  const fullPath = rel(plan);
  const original = await readFile(fullPath, 'utf8');
  if (!original.includes('### 11.42. UI015 Android soft keyboard and zoom screenshot scale correction')) {
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    const appendix = [
      '',
      '### 11.42. UI015 Android soft keyboard and zoom screenshot scale correction — 03/10/2026',
      '',
      '- **UI015.C04 trực tiếp trên Android:** [S07 probe](../evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json) mở route Inbox bằng Chrome 152 trên AVD Pixel 10 Pro XL, Android 17/API 37, display 1344×2992 ở 480 dpi. `dumpsys input_method` xác nhận keyboard hiện; viewport ban đầu 448×864 CSS px giảm còn 448×552,3. Composer ở y=412–452 và nút Gửi y=480,5–524,5 vẫn nằm trong viewport; document giữ width 448/448. Android Back ẩn keyboard, giữ draft và URL route. Tám assertion PASS, không page error; không gửi reply và không dùng backend. Đây là emulator, không phải handset vật lý.',
      '- **Đóng UI015:** C01–C03/C05 đã PASS; S07 hoàn tất observation C04, nên UI015 DONE 5/5. Tổng backlog bổ sung tăng 19→20/26, checkpoint 112→113/130. S19 direct frontend gates và S20 local Chromium E2E 188/188 là evidence hiện hành. FE-G05 không đóng theo UI015: screen-reader speech/transcript và review thủ công toàn diện vẫn thiếu; readiness giữ 7/9.',
      '- **S21 sửa sai lệch cách nhìn ảnh zoom:** tại actual Chrome tab zoom 400%, viewport 320 CSS px và DPR 4. Ảnh Playwright `css`/`device` đều có raster width 320 px; ảnh CDP device surface rộng 1280 px, đúng tỷ lệ thiết bị. Dùng [R31 device-surface image](../evidence/frontend-ui-improvements/UI012/S21-R31-400-cdp-device-surface-20261003.png) và [R26 device-surface image](../evidence/frontend-ui-improvements/UI012/S21-R26-400-cdp-device-surface-20261003.png) cho visual review. S21 xác nhận R31 title/text nằm trong 320 CSS px và R26 policy alert đã xuống dòng; DOM probe S17 vẫn là phép đo định lượng 17 route/325 text-flow elements/0 unresolved clip.',
      '- **Giới hạn:** các ảnh S21 là local React demo + synthetic MSW trên Chromium, không phải UAT. Không thay đổi source, API contract, generated files, FE/product progress ledgers; không có CI/backend/staging/production claim.',
      '',
    ].join(newline);
    await writeFile(fullPath, original + appendix, 'utf8');
  }
}

const contextPath = 'docs/PROJECT_CONTEXT.md';
{
  const fullPath = rel(contextPath);
  const original = await readFile(fullPath, 'utf8');
  const header = /^# Hồ sơ dự án frontend(?:\r?\n)/;
  if (!header.test(original)) throw new Error('Project context header not found.');
  const note = '\n## Cập nhật UI015/UI012 — 03/10/2026\n\nUI015.C04 đã được kiểm trên Chrome 152 chạy Android 17/API 37 AVD Pixel 10 Pro XL: bàn phím mềm thật của emulator mở, composer và nút Gửi còn trong visual viewport, draft/route được giữ sau Android Back; 8/8 assertions đạt, không có page error. UI015 hoàn tất 5/5. Đây không phải phép thử handset vật lý. UI012/S21 xác nhận ảnh Playwright 320 px là CSS raster trong khi CDP device-surface ở DPR 4 rộng 1280 px; dùng ảnh CDP để review trực quan R31/R26. Readiness vẫn 7/9 vì FE-G05 screen-reader/manual review và FE-G09 owner UAT còn mở. Backlog UI bổ sung hiện là 20/26 mục và 113/130 checkpoint; FE/product ledgers không đổi.\n';
  if (!original.includes('## Cập nhật UI015/UI012 — 03/10/2026')) {
    await writeFile(fullPath, original.replace(header, (match) => match + note), 'utf8');
  }
}
await updateOneLine(contextPath, 'UI015.C04 đã được kiểm', (line) => {
  const clean = line.replace(/(?: UI020\.C02 vẫn 1\/5; \[S02 draft\]\([^)]*\) chờ owner điền và phê duyệt\.)+/g, '');
  return `${clean} UI020.C02 vẫn 1/5; [S02 draft](../evidence/frontend-ui-improvements/UI020/S02-support-matrix-owner-decision-draft.md) chờ owner điền và phê duyệt.`;
});

const gapsPath = rel('docs/KNOWN_GAPS.md');
{
  let text = await readFile(gapsPath, 'utf8');
  const oldGap = 'UI015.C04 cần đo native soft keyboard trên thiết bị/browser mobile thật.';
  if (text.includes(oldGap)) text = text.replace(oldGap, 'UI015.C04 đã PASS trên Chrome Android 152 trong AVD Android 17/API 37; physical handset chưa được thử và không được suy rộng.');
  else if (!text.includes('UI015.C04 PASS trên Chrome Android 152 trong AVD Android 17/API 37')) throw new Error('Expected current UI015 status statement not found.');
  text = text.replace('Plan v5.7 là 13/16 mandatory, 6/10 optional, 19/26 và 112/130.', 'Plan v5.9 là 13/16 mandatory, 7/10 optional, 20/26 và 113/130.');
  text = text.replace('Plan v5.9 là 13/16 mandatory, 7/10 optional, 20/26 và 113/130.', 'Plan v5.10 là 13/16 mandatory, 7/10 optional, 20/26 và 113/130.');
  await writeFile(gapsPath, text, 'utf8');
}

await updateOneLine('evidence/REPORT.md', '| FE-G04 — route/state/role |', (line) => line
  .replace('UI012/S16](../evidence/frontend-ui-improvements/UI012/S16-current-full-e2e-20261003.log): 187/187 sau sửa Reports', 'UI012/S20](../evidence/frontend-ui-improvements/UI012/S20-current-full-e2e-20261003.log): 188/188 sau sửa Reports và R26 text wrap')
  .replace('S16 khôi phục 13 artifact', 'S20 khôi phục 13 artifact'));
await updateOneLine('evidence/REPORT.md', '| FE-G05 — UI/UX/a11y |', (line) => line
  .replace('UI015 mobile disclosure keyboard/viewport 1/1;', 'UI015 mobile disclosure 1/1 và Android Chrome soft keyboard trên AVD 8/8 assertions ([UI015/S07](../evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json); emulator, không phải handset);')
  .replace('UI015 mobile disclosure 1/1 và Android Chrome soft keyboard trên AVD 8/8 assertions (S07; emulator, không phải handset);', 'UI015 mobile disclosure 1/1 và Android Chrome soft keyboard trên AVD 8/8 assertions ([UI015/S07](../evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json); emulator, không phải handset);')
  .replace('Screen-reader speech/transcript và manual review toàn bộ error/hover/pressed/icon còn mở; UI015 native soft keyboard trên mobile cũng còn mở.', 'Screen-reader speech/transcript và manual review toàn bộ error/hover/pressed/icon còn mở; UI015.C04 đã đạt trên Android emulator, chưa có handset test.'));
await updateOneLine('evidence/REPORT.md', '| FE-G09 — UAT/bàn giao |', (line) => line.replace('UI012/S16](../evidence/frontend-ui-improvements/UI012/S16-current-full-e2e-20261003.log)', 'UI012/S20](../evidence/frontend-ui-improvements/UI012/S20-current-full-e2e-20261003.log)').replace('187/187 Chromium after the Reports fix', '188/188 Chromium after the Reports and R26 text-wrap fixes'));

const ui015AcceptancePath = path.join(here, 'S06-acceptance.json');
const acceptance = JSON.parse(await readFile(ui015AcceptancePath, 'utf8'));
acceptance.status = 'DONE';
acceptance.checkpoints.C04 = 'PASS: S07 used Chrome 152 on the Pixel 10 Pro XL Android 17/API 37 AVD; the system soft keyboard opened, visualViewport height fell from 864.3 to 552.3 CSS px, composer/send stayed visible, document width stayed 448/448, and Android Back hid the keyboard while preserving the draft and conversation route. This is emulator evidence, not a physical-handset test.';
acceptance.checkpoints.C05 = 'PASS: S07 device/browser probe, screenshots, S19 current direct frontend gates, S20 full rebuilt-demo E2E, plan/context/gaps/report and refreshed SHA-256 fingerprints recorded. FE/product ledgers remain unchanged.';
acceptance.revision.workingTree = 'UI015 acceptance now includes a current Android Chrome emulator soft-keyboard observation and S20/S19 verification. It remains scoped to this evidence bundle; unrelated pre-existing dirty work is not attributed to UI015.';
acceptance.verification.nativeSoftKeyboard = 'PASS: Chrome 152 on Android 17/API 37 Pixel 10 Pro XL AVD; display 1344x2992 at 480 dpi, portrait browser viewport 448x864 CSS px, DPR 3. Gboard/system IME was confirmed by dumpsys (mInputShown=true); visualViewport height reduced to 552.3 px. Focused composer remained visible at y=412..452, send button at y=480.5..524.5; no horizontal overflow. Android Back hid the IME, retained draft and route. 8/8 assertions true, 0 page errors. No reply submitted; emulator is not a physical handset.';
acceptance.verification.currentFullE2E = 'PASS 188/188 on current React source in UI012/S20; includes post-R26 regression, all route-role 357/357, empty 11/11, route-error 51/51, axe and production-artifact isolation. This is local Chromium + synthetic MSW, not GitHub CI or owner UAT.';
acceptance.gates.FE_G05 = 'Automated browser checks and Android emulator soft-keyboard behavior pass within their measured scope. FE-G05 remains partial because screen-reader speech/transcript and full human visual review of error/hover/pressed/icon states are still open.';
acceptance.gates.readiness = '7/9 evidence gates; UI015.C04 is closed by emulator evidence. FE-G05 manual review and FE-G09 owner UAT remain open; not Production-Ready/Enterprise-Grade certification.';
acceptance.backlog = { mandatoryDone: '13/16', optionalDone: '7/10', totalDone: '20/26', checkpoints: '113/130', next: 'Review/fill UI020/S02 owner support-matrix decision draft; UI020.C02 remains pending approval. UI012 manual accessibility and FE-G09 owner UAT remain separate open gates.' };
for (const file of [
  'S07-android-soft-keyboard-probe-20261003.mjs',
  'S07-android-soft-keyboard-probe-20261003.json',
  'S07-android-soft-keyboard-probe-20261003.log',
  'S07-android-inbox-before-keyboard-20261003.png',
  'S07-android-inbox-keyboard-open-20261003.png',
  'S07-android-inbox-after-back-20261003.png',
  'S08-refresh-status.mjs',
  '../UI020/S02-support-matrix-owner-decision-draft.md',
]) if (!acceptance.evidence.includes(file)) acceptance.evidence.push(file);
acceptance.fingerprintRefreshNote = 'S07 closes UI015.C04 with direct Android Chrome emulator soft-keyboard, composer/send visibility, no-overflow and Back/draft evidence. The emulator limitation is explicit; physical handset and complete FE-G05 manual accessibility remain unverified. Backlog is 20/26 and 113/130; FE readiness remains 7/9.';

const extraFingerprints = [
  'evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.mjs',
  'evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.json',
  'evidence/frontend-ui-improvements/UI015/S07-android-soft-keyboard-probe-20261003.log',
  'evidence/frontend-ui-improvements/UI015/S07-android-inbox-before-keyboard-20261003.png',
  'evidence/frontend-ui-improvements/UI015/S07-android-inbox-keyboard-open-20261003.png',
  'evidence/frontend-ui-improvements/UI015/S07-android-inbox-after-back-20261003.png',
  'evidence/frontend-ui-improvements/UI015/S08-refresh-status.mjs',
  'evidence/frontend-ui-improvements/UI020/S02-support-matrix-owner-decision-draft.md',
];
for (const file of extraFingerprints) {
  const bytes = await readFile(rel(file));
  acceptance.fingerprints[file] = createHash('sha256').update(bytes).digest('hex').toUpperCase();
}
for (const file of Object.keys(acceptance.fingerprints)) {
  if (['docs/FRONTEND_UI_IMPROVEMENT_PLAN.md', 'docs/PROJECT_CONTEXT.md', 'docs/KNOWN_GAPS.md', 'evidence/REPORT.md', 'evidence/frontend-ui-improvements/UI012/S08-acceptance-20261003.json'].includes(file)) {
    const bytes = await readFile(rel(file));
    acceptance.fingerprints[file] = createHash('sha256').update(bytes).digest('hex').toUpperCase();
  }
}
await writeFile(ui015AcceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`, 'utf8');

const planText = await readFile(rel(plan), 'utf8');
if (!planText.includes('UI015 | P2 | TU | Mobile Inbox/bảng và thu gọn demo controls | UI002, UI010 | DONE | 5/5')) throw new Error('UI015 plan row was not updated.');
console.log(JSON.stringify({ planVersion: '5.12', ui015: acceptance.status, checkpoints: acceptance.checkpoints, backlog: acceptance.backlog, readiness: acceptance.gates.readiness }, null, 2));

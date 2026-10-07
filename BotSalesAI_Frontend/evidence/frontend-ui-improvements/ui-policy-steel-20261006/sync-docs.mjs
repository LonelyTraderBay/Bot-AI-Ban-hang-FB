import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const edit = (file, change) => {
    const target = path.join(root, file);
    const before = fs.readFileSync(target, 'utf8');
    const after = change(before);
    if (before !== after) fs.writeFileSync(target, after);
};
const paragraph = (text, prefix, replacement) => {
    const start = text.indexOf(prefix);
    if (start < 0) throw new Error(`Missing expected paragraph: ${prefix}`);
    const end = text.indexOf('\n\n', start);
    // Existing files use both CRLF and LF; locate the earliest paragraph boundary.
    const endCr = text.indexOf('\r\n\r\n', start);
    const stops = [end, endCr].filter(value => value >= 0);
    const stop = stops.length ? Math.min(...stops) : text.length;
    return text.slice(0, start) + replacement + text.slice(stop);
};
edit('docs/FRONTEND_SPACING_STANDARD.md', text => {
    const replacements = [
        ['**SPC-029 —', '**SPC-029 — Static gate kiểm đơn vị và nguồn khai báo.** `scripts/check-layout.mjs` hiện là checker AST/style; collector inventory không thay checker. Gate phải đọc sx/System props, responsive/conditional leaves, helper references, CSS/theme overrides; phân biệt factor/px/geometry/library, reject spacing literal tại consumer kể cả đúng scale và mọi nguồn override không resolve. Unknown/parse failure làm strict gate thất bại; ngoại lệ chỉ đúng scope. Fixtures kiểm số lẻ, literal đúng token nhưng rải rác, helper px bị nhân đôi, raw CSS, exception sai và nguồn thiếu. Current source PASS chỉ theo coverage hiện có; audit §13.5 ghi các bypass cần gia cố, không suy đầy đủ từ zero findings.'],
        ['**SPC-030 —', '**SPC-030 — Browser gate kiểm computed geometry và workflow.** Bảng dưới là acceptance lâu dài cho mọi thay đổi UI theo impact. Kết quả W/UI028 trước đây là snapshot trong plan/evidence; lượt docs-only hiện hành không chạy lại toàn bộ các gate này. Mỗi task ghi kết quả thực và source hash; không dùng NOT_RUN lịch sử hoặc PASS lịch sử làm trạng thái hiện hành.'],
        ['**SPC-038 —', '**SPC-038 — Test theo tác động, bảo vệ hành vi thật.** UI mới kiểm các states áp dụng: loading/empty/error/forbidden/stale/submitting/validation/conflict/unknown, long Vietnamese label/ID, focus và hành động. Mọi route chịu ảnh hưởng của shared change phải có route smoke/render verdict ở small/large viewport theo SPC-057/071; kiểm state/variant/zoom/journey sâu theo impact có lý do và coverage khai báo. Một representative route không thay các affected routes còn thiếu. Form/dialog/panes giữ text/scroll/draft cases. Tests bắt double inset, override, reflow hoặc mất behavior, không chỉ đếm preset/snapshot. Docs/copy-only không đổi layout chọn checks theo diff và ghi lý do; unrun không là PASS.'],
        ['**SPC-039 —', '**SPC-039 — Gate phải chạy thật trước khi đóng UI.** Mọi task tạo/sửa layout chạy strict layout/visual-token/composition gates trong npm run verify, generator freshness và render/behavior regression theo impact. Violation/UNKNOWN/parse failure hoặc gate skip không là PASS. Trạng thái migration debt Wxx thuộc lịch sử; task hiện tại không được dùng journal cũ để đóng khi global strict gate FAIL. Không hạ threshold/suppress/đổi checker để diff xanh. Hosted CI chưa chạy không là PASS và không là bước chờ giữa chừng; clean-local equivalent theo Frontend scope vẫn áp dụng.'],
        ['**SPC-043 —', '**SPC-043 — Typography và màu cũng dùng một nguồn giao diện.** UI kế thừa typography, palette, radius, elevation, focus và density từ canonical tokens/generated/theme. Không route-local font/color/shadow/radius để cân màn; không thu nhỏ chữ/line-height/target để nhét nội dung. Vai trò mới cần rationale/profile/consumer impact và test tại owner chuẩn; không đổi canonical để hợp thức hóa màn riêng. Spacing checker và visual-token checker là hai gates hiện có, chạy trong verify; visual gate chưa bao phủ đầy đủ các đường source theo audit §13.5. Source review + render hierarchy/contrast/accessibility vẫn cần theo impact, không chỉ cùng số px.'],
        ['**SPC-049 —', '**SPC-049 — Cổng bắt đầu/đóng task UI phải fail closed.** Trước source edit đầu tiên, ghi UX intent/design contract, route/profile/reference hoặc semantic baseline, owner map/states/viewports/invariants và baseline có hash theo SPC-041/044/048. Trước đóng, có strict checker reports/lệnh/exit thật, zero unauthorized findings, rendered/behavior coverage theo impact, current hashes, UI/ARCH verdict và giới hạn. Missing/UNKNOWN/NOT_RUN không được nhận PASS. Nếu baseline thực bị mất/sai, áp dụng SPC-070: tiếp tục implementation/current render với evidence hạn chế nhưng paired regression NOT_VERIFIED; không đóng paired acceptance hoặc dựng lại before. Review thủ công không là automated PASS. Không tạo approval/ledger trung gian; docs-only không đổi UI ghi checks theo impact và không fake render/build verdict.'],
    ];
    for (const [prefix, replacement] of replacements) text = paragraph(text, prefix, replacement);
    text = text.replace('**Tình trạng enforcement hiện hành sau W32:**', '**HISTORICAL_SNAPSHOT — enforcement tại W32:**');
    text = text.replace('khi Panel flush mới chọn composition inset nếu cần.', 'Panel không title và flush có thể chọn composition inset khi workflow cần; Panel có title phải giữ header→first-body gap16 theo SPC-014/068, không cộng top inset lần hai.');
    text = text.replace('Local declaration/shadow/copy và cast không đổi nguồn gốc.', 'Local declaration/shadow/copy và cast không đổi nguồn gốc. Cấm consumer sửa canonical owner qua assignment, alias mutation, Object.assign hoặc API ghi khác; public owner data phải readonly và writes bị gate từ chối.');
    return text;
});

edit('docs/FRONTEND_SCOPE.md', text => {
    text = text.replaceAll('SPC-001–063', 'SPC-001–075');
    text = paragraph(text, 'Backlog UI và tracker FE chuẩn đều đã hoàn tất', '**HISTORICAL_SNAPSHOT:** số 04/10 ở đoạn trước chỉ mô tả thời điểm đó. Các lượt source/shared UI/policy sau đó có evidence riêng và có thể làm FE dependency stale; không suy backlog/FE hiện tại hoàn tất từ snapshot. Lượt hiện hành là audit/quy định v15.0 §16, còn các bước hardening chưa triển khai. Đọc canonical tracker để lấy status/next; không dùng UI plan để cộng điểm FE. Người dùng nghiệm thu cuối, AI không ghi acceptance thay.');
    text = text.replace('FE-G05 còn Narrator/human conformance `NOT_RUN`, FE-G09 chờ quyết định cuối nên rubric hiện **7/9 gate đạt**.', 'Rubric snapshot 04/10 ghi 7/9; FE-G05 speech/human và FE-G09 owner acceptance chưa được lượt audit này xác minh. Đọc evidence/source freshness trước mọi claim hiện hành.');
    return text + '\n\n**Quy định thực thi hiện hành:** [SPC-064–075](FRONTEND_SPACING_STANDARD.md#steel-policy) và [§16 kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Rule có hiệu lực không đồng nghĩa các gate hardening đã triển khai; findings/bằng chứng ở [audit](../evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md).\n';
});

edit('docs/PROJECT_CONTEXT.md', () => `# Hồ sơ dự án Frontend — 06/10/2026

Phạm vi hiện hành: React/TypeScript Frontend trong apps/web, API synthetic MSW chỉ demo/test. AI tự triển khai/kiểm thử/tái xác minh/bàn giao trong scope; người dùng nghiệm thu cuối. [FRONTEND_SCOPE](FRONTEND_SCOPE.md) là nguồn phạm vi. Không Backend/provider/persistence/staging/deploy proof; không tự commit/push hoặc ghi owner acceptance.

## Hiện trạng có thể xác minh

Lượt hiện hành v15.0 là **audit + quy định + kế hoạch**, không runtime migration. [§16 kế hoạch](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) có inventory đầy đủ27 shared exports, findings ưu tiên,20 bước có dependency/acceptance/status. S01 audit/S02 specification hoàn tất; S03 READY, S04–S20 TODO. [SPC-001–075](FRONTEND_SPACING_STANDARD.md) có hiệu lực; [§13.5](FRONTEND_SPACING_STANDARD.md#steel-policy) phân biệt mandatory policy với khả năng gate hiện tại. Gate hardening chưa triển khai; không gọi tuân thủ100% hay Enterprise certification.

[Audit current](../evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md):68TS/TSX,28TSX,16modules;27shared exports;176composition uses/21files. Ba strict scans0findings,24/24existing fixtures vàgenerator exit0. Adversarial probes chứng minh bypass; browser diagnostic nhỏ xác nhận ba Finance first-body boundaries32/40px thay16. Imports boundary hiện đo được clearance label15/control24px tại806/1440; chỉ kết luận state đã kiểm. Source/runtime/contract/tokens/ledgers không sửa trong lượt lập quy định. Không chạy lại build/full E2E/native200/speech/hosted CI ở lượt này.

Lượt triển khai trước ở [§15](FRONTEND_UI_IMPROVEMENT_PLAN.md#15-audit-và-triển-khai-shared-composition-toàn-dự-án--06102026) và [report](../evidence/frontend-ui-improvements/shared-composition-20261006/REPORT.md):six owners đã triển khai, current renders216/216;114pairs comparable/102baseline partial. Full E2E485/486 FAIL, targeted artifact retest6/6 riêng; không cộng thànhfullsuitePASS. Các Wxx/UI027/FE04-10 trong kế hoạch và REPORT là HISTORICAL_SNAPSHOT theo hash, không chứng minh current freshness.

## Nguồn chuẩn và tiến độ

- Hành vi: botsales-kit/contracts/openapi.json, contracts/route-manifest.json, permission/event contracts và UX-CONTRACT. Atomic values: design/tokens.json →generator; không sửa generated bằng tay.
- Runtime owner: theme.ts/layout.ts/visual.ts/components.tsx/composition.tsx. [Shared catalog](../apps/web/src/shared/ui/README.md) giải thích API; không normative scale/ledger thứ hai. Một MUI/theme, QueryClient, Router; module không import module khác; shared không import app/modules/mocks.
- Quy định UI duy nhất: FRONTEND_SPACING_STANDARD; AGENTS/DESIGN/UX/coding standards route tới nó. AI_RULES Universal3.1 root/kit giữ nguyên.
- FE task/ledger: execution/frontend-plan.json/frontend-progress.json. Đọc node botsales-kit/scripts/progress.mjs status sau thay đổi source/policy; snapshot trước policy audit ghi0/140effective,28stale,blocked=[]/nextFE001.S01. Đây là evidence freshness, không0%code. Không ghi tăng từ audit/docs.
- Full-product execution/plan.json/progress.json/tasks/T*.md chỉ đọc. FE-G01..09 cần evidence còn hiệu lực; không dùng số fixture/component/rule làm điểm readiness.

## Tiếp tục

[CONTINUE_FRONTEND](CONTINUE_FRONTEND.md), [plan §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) và [REPORT](../evidence/REPORT.md) là đường vào hiện hành. Bắt đầu S03 contract/baseline rồi scope/resolver hardening; không tiếp FE003.S05/W33 từ journal cũ. Bằng chứng thiếu ghi đúng NOT_RUN/UNKNOWN, tự xử lý prerequisite Frontend và tiếp phần độc lập. Native text200/browserzoom200/reflow là phép thử riêng; browser route smoke phải có readiness/expected observations, không zero-groups PASS. Hosted CI/owner/speech chưa xác minh không tự nhận PASS, không tạo dependency chờ Backend/owner giữa chừng.
`);

edit('docs/CONTINUE_FRONTEND.md', () => `# Tiếp tục Frontend — 06/10/2026

## Công việc hiện hành

Nguồn việc là [FRONTEND_UI_IMPROVEMENT_PLAN v15.0 §16](FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan), quy định [SPC-001–075](FRONTEND_SPACING_STANDARD.md), [catalog shared UI](../apps/web/src/shared/ui/README.md). Audit/quy định đã lập; source/checker/browser hardening **chưa triển khai**. S01/S02 xong phần audit/spec, S03 READY; các bước sau TODO theo dependency. Không nhận quy định viết xong là enforcement100%.

1. Đọc AGENTS/original AI_RULES/scope/context/contract chuẩn; kiểm Git diff/dirty work và [audit hiện hành](../evidence/frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md). Không reset/stage/cleanup thay đổi của người dùng.
2. Làm S03: UX/layout contract, owner/variant/geometry map, impact routes/states, freeze hashes và loaded baseline trước source edit. Dùng task/evidence hiện có, không ledger mới.
3. Gia cố S04–S10: scope fail-closed, canonical symbol resolution, readonly/write checks, toàn style entry, visual provenance/shorthand/vars, indirect ownership và finite values. Chuyển probe sai thành permanent negative fixtures; controls/valid forms phải giữ PASS.
4. S11–S13 sửa đúng consumer owner: ba Finance header/body32/40→16px; QueryState loading geometry; intrinsic icon-label role; lifecycle/readability/regression có căn cứ. Không dựng engine hoặc đổi nghiệp vụ.
5. S14–S18 policy/browser/evidence validators và verify/workflow wiring; S19–S20 kiểm source cuối/affected routes, regression/handoff. Người dùng chỉ nghiệm thu cuối; không intermediate approval/Backend/hosted gate.

## Trạng thái và bằng chứng

Audit current:27 shared exports/112 semantic roles,176composition occurrences,68TS/TSX. Ba strict gates0finding và24/24existing fixtures đạt nhưng adversarial probes vẫn vượt gate; không claim universal enforcement. Browser diagnostic nhỏ kiểm finance vàimports; không thayfullE2E/native200/speech review.

§15/report shared-composition là source-runtime snapshot trước lượt docs-only:216current renders;114comparable/102partial baseline;full485/486FAIL +retest6/6 riêng. W36/FE28 snapshots cũ và FE003.S05/W33 journal không là task next hiện hành. Lịch sử giữ trong plan và evidence/REPORT; không ghi đè baseline hoặc dùng after làm before.

Đọc node botsales-kit/scripts/progress.mjs status để lấy FE effective status/next. Lượt audit trước policy ghi0/140verified,28stale,blocked=[],nextFE001.S01; không đồng nghĩa implementation0%. Không ghi tay FE ledger/full-product tracker hoặc owner acceptance. UI §16 có dependency kỹ thuật, không BLOCKED vì chờ external.

## Điều kiện bàn giao

Theo SPC064–075: source root/import/style scope đủ, no unknown/unauthorized finding, generated fresh, finite API/role owner không fork, every affected route có render verdict và state/branch theo impact. Khi cần, tách reflow320CSSpx/native text200/browserzoom200/focus-hit-testing; log command/exit/currenthash/expected-observed. Thiếu baseline giữpairedNOT_VERIFIED vàhandoff limits; thiếucheck không nhậnPASS. UI/ARCH verdict riêng; FE-G01..09/owner acceptance không tăng từ policy/component count.

Phạm vi duy nhất React Frontend với synthetic MSW. Không server/liveprovider/persistence/staging/deploy; giữcontracts/tokens canonical vàAI_RULES nguyên bản. Git root ởfoldercha; workflow thật ../.github/workflows/frontend.yml. Cấu hìnhworkflow không làhostedrunPASS; local equivalent đượcscopecho phép. Không commit/push/merge/deploy nếu chưa đượcgiao riêng.
`);

for (const file of ['AGENTS.md', 'README.md', 'DESIGN.md', 'UX-CONTRACT.md', 'botsales-kit/docs/18_CODING_STANDARDS.md', 'apps/web/src/shared/ui/README.md']) {
    edit(file, text => {
        text = text.replaceAll('SPC-001–063', 'SPC-001–075').replaceAll('SPC-033–063', 'SPC-033–075');
        if (file === 'README.md') text = text.replace('v13.1.', 'v15.0.');
        if (file === 'apps/web/src/shared/ui/README.md') text = text.replace('Dùng body inset của composition khi Panel đang flush và workflow thực tế cần nó.', 'Panel không title/flush có thể dùng composition inset nếu cần. Với Panel có title, phải giữ header→first-body gap16: không cộng child top inset lần hai theo SPC-014/068.');
        const prefix = file === 'botsales-kit/docs/18_CODING_STANDARDS.md' ? '../../' : file === 'apps/web/src/shared/ui/README.md' ? '../../../../../' : '';
        return text + `\n\n**Quy định bắt buộc hiện hành:** [SPC-064–075](${prefix}docs/FRONTEND_SPACING_STANDARD.md#steel-policy), [audit/kế hoạch v15.0 §16](${prefix}docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Mọi AI/tác giả áp dụng cùng chuẩn; không tự miễn gate hoặc generic style override. Current source PASS chưa khóa mọi bypass; hardening steps còn trong kế hoạch. Quy định/catalog/checker/evidence có trạng thái riêng, không tự claim Enterprise100%.\n`;
    });
}

edit('botsales-kit/docs/18_CODING_STANDARDS.md', text => text + '\n\nCODE-037 — Tuân SPC-064–075 cho mọi UI: canonical symbol/value provenance, readonly owner, toàn source/style scope fail-closed, finite API, một render boundary owner, readiness/consumer evidence và strict checks không bị làm yếu. Dùng giải pháp nhỏ, sửa đúng owner theo Karpathy; không speculative framework, generic override hoặc task/ledger mới. Policy có hiệu lực không đồng nghĩa hardening đã triển khai.\n');
edit('evidence/REPORT.md', text => {
    const firstBreak = text.indexOf('\n');
    return text.slice(0, firstBreak + 1) + '\n## Current addendum — UI policy audit and plan, 06/10/2026\n\nLượt hiện hành chỉ audit/tài liệu: [REPORT](frontend-ui-improvements/ui-policy-steel-20261006/REPORT.md), [§16 plan](../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan), [SPC-064–075](../docs/FRONTEND_SPACING_STANDARD.md#steel-policy). Đã đo27 shared exports/176composition uses, chạy3 strict source gates0findings,24/24fixtures vàgenerator; adversarial probes chứng minh bypass. Browser diagnostic nhỏ xác nhận ba Finance header/body32/40px thay16; imports boundary không tái hiện overlap ởstate đã đo. Gate hardening/runtime fixes ởS03–S20 chưa triển khai; không fullE2E/build/native200/hosted/ownerPASS mới. React source/tokens/contracts/ledgers giữ nguyên; các addendum dưới là historical source snapshots, không current certification.\n' + text.slice(firstBreak + 1).replace('## Current addendum — Shared UI composition', '## Historical addendum — Shared UI composition');
});
console.log('Policy/context routing synchronized; original rules, runtime, generated and ledgers not edited.');

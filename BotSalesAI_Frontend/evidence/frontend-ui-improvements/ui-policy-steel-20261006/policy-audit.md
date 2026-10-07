# Audit trước sửa — thẩm quyền và enforcement quy định UI

**Ngày:** 06/10/2026. **Phạm vi:** React/TypeScript Frontend trong `BotSalesAI_Frontend`, tài liệu và tooling có liên quan. Audit chỉ đọc nguồn; đầu ra duy nhất của agent là báo cáo này. Không sửa canonical docs, runtime, tracker, generated output hoặc cấu hình GitHub.

**Quan trọng về provenance:** các line references dưới đây là vị trí nguồn được đọc **trước lượt root sửa tài liệu steel policy**. Chúng là bằng chứng audit lịch sử, không khẳng định câu đó hoặc line đó còn tồn tại trong tài liệu sau sửa. Khi đóng từng finding, root phải đối chiếu source cuối và lưu verdict mới riêng; không sửa báo cáo này để giả rằng finding chưa từng tồn tại. Audit không chạy lại build/E2E, không xác minh hosted CI hoặc branch protection.

## 1. Kết luận và cách hiểu “100% bắt buộc”

Dự án có nền tảng token/theme/shared owners, quy định SPC-001–063 và ba source gates thực thi. Các khoảng trống cần giải quyết là: trạng thái hiện hành lẫn lịch sử; điều kiện baseline/coverage chưa diễn đạt nhất quán; semantic owner table chưa hoàn chỉnh; policy sync/evidence closure chưa là permanent guard; native checks còn dựa vào runner theo lượt evidence.

Mục tiêu 100% là **mọi thay đổi UI trong scope đều phải tuân các quy định áp dụng và đi qua gate tương ứng; phần thiếu bằng chứng không được nhận PASS**. Nó không có nghĩa markdown kiểm soát mọi AI, source scan chứng minh thị giác/hành vi toàn app, hoặc Frontend đạt Enterprise-Grade 100%. `AI_RULES.md:15` nêu rõ tài liệu hướng dẫn hành vi, không tự thực thi/khóa file/chứng nhận chất lượng; Production Claim Gate nằm tại `:254–264`.

## 2. Enforcement đã có trước lượt sửa

| Nguồn trước sửa | Điều đã quan sát | Giới hạn |
|---|---|---|
| `AGENTS.md:11–19` | Loader yêu cầu SPC, design contract/baseline, consumer impact, catalog và browser checks | Loader không là bằng chứng AI đã thực hiện đủ |
| `docs/FRONTEND_SPACING_STANDARD.md:455–459` | Sáu composition owners, API đóng, một gap/inset owner và ownership checker | Source check không chứng minh mọi dynamic nesting/cascade |
| `package.json:24–27,32` | Layout/visual-token/composition fixtures và strict scans chạy trong `verify` | Browser/E2E là command riêng |
| `tests/ui-composition-layout.spec.ts:19–55` | Manifest routes, 390/1440px, readiness `main h1` + hết Circular/LinearProgress; gap, direct-child margins, main inset, overflow | Default route state; không suy mọi export/branch đã render |
| `../.github/workflows/frontend.yml:5–10,22,38–40` | Workflow ở Git root folder cha; paths/cwd đúng; gọi verify và E2E | Chỉ kiểm source config, không hosted-run/branch-protection proof |
| `scripts/layout-exceptions.json:5–14` | Một skip-link exception cụ thể, owner và review trigger | Không cho phép blanket exception |

Git root được quan sát là `C:/Users/Joker-PC/Documents/Projects/Bot-AI-Ban-hang-FB`; app cwd là folder con `BotSalesAI_Frontend`. Workflow không nằm trong `.github` của app con. Root/kit `AI_RULES.md` có cùng SHA-256 trong lượt đọc; không đề nghị sửa Universal để thêm quy định riêng UI.

## 3. Finding register trước sửa

### POL-01 — Current context còn chỉ task/metric đã thuộc snapshot cũ — P0

- `docs/PROJECT_CONTEXT.md:9,20` nhận “Trạng thái UI hiện hành” 27/28, UI028 mở và W33–W36 chưa đóng; `:36` chỉ append pointer tới shared-composition.
- `docs/CONTINUE_FRONTEND.md:5,9,25,35` vẫn yêu cầu tiếp FE003.S05/W33–W36; report `evidence/REPORT.md:11–13` lại ghi W36 đã hoàn tất ở snapshot sau đó.
- `docs/FRONTEND_SCOPE.md:43` là snapshot 04/10 có ngày, nhưng `:45` nhận backlog đều hoàn tất mà không gắn revision/source freshness sau các lượt thay đổi mới.
- **Rủi ro:** AI nhận lại việc lịch sử hoặc kết luận freshness từ số checkpoint cũ.
- **Xử lý:** một current summary ở đầu trỏ handoff/report/hash thực; chuyển số cũ sang khu vực `HISTORICAL_SNAPSHOT` có ngày/revision. Không xóa lịch sử, không cập nhật ledger bằng tay, không tái sử dụng số cũ như source-current.

### POL-02 — Normative standard còn prose triển khai/debt/enforcement cũ — P0

- `SPC-029`, line266: “khi ... triển khai”, collector chưa phải checker.
- `SPC-039`, line336: strict toàn scope đang FAIL vì migration debt.
- `SPC-043`, line344: visual roles còn cần review với wording chưa có checker bao phủ.
- Line445: “enforcement hiện hành sau W32”, W33 M08 mở; summary current line5 ghi kết quả mới.
- **Rủi ro:** reader hiểu debt exception của migration vẫn đang có hiệu lực, hoặc hiểu visual-token checker chưa có.
- **Xử lý:** phần normative chỉ mô tả invariant/lệnh/trách nhiệm; journal W-ID giữ trong lịch sử/plan. Không cho phép viện dẫn debt đã đóng để né strict gate cho UI mới.

### POL-03 — Baseline thiếu và verdict đóng việc chưa thống nhất — P0

- `SPC-044/045`, lines346–348: giữ artifact lỗi, ghi baseline thiếu/diagnostic, tiếp tục bằng source inspection và kiểm sau sửa có giới hạn.
- `SPC-049`, line356: thiếu baseline hợp lệ thì task chưa đóng.
- `FRONTEND_UI_IMPROVEMENT_PLAN.md:23`: lịch sử W08 DONE dù empty baseline thiếu.
- **Rủi ro:** AI gọi limited evidence là paired regression PASS, hoặc dừng mọi việc chỉ vì baseline đã bỏ lỡ.
- **Xử lý:** tách `IMPLEMENTATION_COMPLETE`, `CURRENT_RENDER_VERIFIED`, `PAIRED_REGRESSION_NOT_VERIFIED`, `DELIVERED_WITH_EVIDENCE_LIMITS`. Task mới bắt baseline hợp lệ trước source edit. Baseline lỡ/lỗi phải giữ nguyên, không backfill từ source sau; technical work tiếp tục nhưng phần proof thiếu không được nâng verdict. Chọn closure wording thống nhất trong canonical standard.

### POL-04 — Representative coverage dễ bị suy rộng thành mọi consumer — P0

- `SPC-038`, line334: representative consumers/affected routes.
- `SPC-057`, line372: mọi route consumer chịu ảnh hưởng, route chưa chạy là NOT_RUN.
- `tests/ui-composition-layout.spec.ts:19–55`: default route state; report shared-composition line48 thừa nhận import closure không chứng minh mọi export/branch.
- **Rủi ro:** một route smoke hoặc một branch được hiểu là regression đầy đủ của shared owner.
- **Xử lý:** mọi affected route phải có route-level verdict; state/viewport/journey sâu được chọn theo impact và có lý do. Direct/transitive consumers, route mapping và branch/state liên quan phải truy vết; route mẫu không thay route coverage.

### POL-05 — Semantic table thiếu hàng rõ cho hai role bắt buộc — P1

- Standard `SPC-061:455` dùng `form.inlineGap` và `surface.contentGap`.
- Runtime `layout.ts:10–11,76,80` có type/implementation thật: inline8px/content12px.
- Bảng semantic standard lines83–133 thiếu hàng rõ cho hai role này.
- **Xử lý:** thêm owner/token/unit/responsive/composition consumer; những role không trong bảng chính phải có pointer tới register có hiệu lực. Audit type/implementation/public exports/consumer/semantic documentation theo SPC-053; không tạo role dự phòng.

### POL-06 — Policy sync chỉ là task script, kiểm nội dung quá yếu — P1

- `evidence/frontend-ui-improvements/shared-composition-20261006/check-delivery.mjs:9–14` dùng contains `SPC-061` để kiểm pointer policy.
- Lines15–24 kiểm file đích một nhóm task links, bỏ anchor; không nối vào `verify`.
- Không kiểm rule IDs/ranges, contradiction wording, catalog/type/owner alignment hoặc evidence DoR/DoD.
- **Xử lý:** permanent validator nhỏ, deterministic cho unique rule IDs, pointer/anchor hợp lệ, role/type/consumer references và canonical routing. Không tự nhận kiểm semantic UX hoặc mọi wording conflict từ string presence. Không tạo policy framework/config renderer.

### POL-07 — Thiếu permanent evidence closure validator — P1

- Ba source checkers chủ yếu kiểm source; verify `package.json:32` không kiểm design/evidence readiness hoặc completeness của task UI.
- **Xử lý:** validate artifact task hiện có theo shape tối thiểu: scope/task, changed files/hash, UX/design contract, role/profile/owner, baseline provenance/readiness, impact routes/state, command/exit/expected/observed, N/A reason, UI/ARCH verdict và limits.
- Validator chỉ xác minh cấu trúc/hash/declared coverage. Người thực hiện vẫn phải đối chiếu log/test với acceptance thực. Không tạo ledger UI thứ hai hoặc evidence file cho từng control.

### POL-08 — Native checks cần runner/report contract ổn định — P1

- `SPC-051:360`, checklist407–408 bắt reflow/text resize/browser zoom thật/focus-hit-test riêng.
- Lượt shared-composition có evidence, nhưng runner nằm trong folder evidence theo ngày.
- **Xử lý:** tái dùng runner có capability/method/status rõ trong tooling/tests hiện có; cases chọn theo affected profile/state. Không thay native zoom bằng CSS stress/viewport resize. Docs/copy-only không ảnh hưởng visual có thể N/A với lý do đúng impact.

### POL-09 — Thay checker/exception cần proof chống giảm guard — P1

- `SPC-050:358` đã yêu cầu guard thay thế tương đương.
- Skip-link exception `scripts/layout-exceptions.json:5–14` có scope/reviewTrigger thật.
- **Xử lý:** closure cho guard change gồm positive/negative/UNKNOWN/parse-error fixtures, xác nhận vi phạm bị từ chối, giữ FAIL gốc và final-source run. Cấm nới threshold, suppression, bỏ assertion, whole-file allowlist hoặc chuyển finding category để xanh.

### POL-10 — Không nhầm gate specification với repository enforcement — P1

- `botsales-kit/governance/quality-gates.json:3` là `GATE_SPECIFICATION_NOT_REPOSITORY_ENFORCEMENT`; line18 `SPECIFIED_NOT_CONFIGURED_IN_TARGET_REPO`.
- `18_CODING_STANDARDS.md:228` trỏ quality-gates nhưng không nêu ngay tại câu đó sự khác biệt với commands thực.
- **Xử lý:** ma trận rule → owner → command/fixture → evidence method → closure verdict. File specification chỉ là nguồn tiêu chí, không proof command hoặc CI đã chạy.

## 4. Hierarchy một nguồn theo từng vai trò

1. Quyền và scope: chỉ thị người dùng/môi trường; root AGENTS và FRONTEND_SCOPE cụ thể hóa phạm vi Frontend đã giao.
2. Universal AI_RULES giữ nguyên, không chèn policy riêng dự án.
3. Hành vi/dữ liệu/quyền: OpenAPI, route manifest, permission catalog, UX contract.
4. Atomic values: design/tokens.json → generator/output sinh.
5. Runtime mapping và UI owners: theme/layout/visual/shared components.
6. **Normative UI policy duy nhất:** FRONTEND_SPACING_STANDARD.md.
7. Shared README giải thích API; AGENTS/coding standards/DESIGN/UX chỉ pointers/tóm tắt ngắn, không chép bộ quy định cạnh tranh.
8. UI improvement plan chứa dependencies/tasks/status; REPORT chứa results theo hash.
9. Catalog/register/CI spec không tự là evidence conformance hoặc production certification.

Giữ layout profiles khác nhau khi workflow/density khác, cùng vai trò dùng cùng owner. Không ép inbox/table/form/auth cùng một hình học, không gom domain state/query/schema/permissions vào layout.

## 5. Kế hoạch ordered enforcement đề nghị

Trạng thái sau là **đề nghị tại thời điểm audit trước sửa**, không claim root đã triển khai những bước đó.

| Bước | Priority | Kết quả reviewable/acceptance | Dependency | Trạng thái trước sửa |
|---|---|---|---|---|
| A | P0 | Finding register, source/policy/evidence baseline immutable; giữ dirty work | — | AUDIT_COMPLETE |
| B | P0 | Current/historical routing rõ; baseline và coverage verdict thống nhất | A | TODO |
| C | P0 | Một hierarchy và rule-to-enforcement/DoR/DoD matrix trong canonical standard | B | TODO |
| D | P1 | Semantic owner/catalog/type/public consumer register khớp, no speculative roles | C | TODO |
| E | P1 | Permanent policy/evidence validators nhỏ; meaningful negative fixtures | C,D | TODO |
| F | P1 | Hardening source gaps do source audit xác minh, sửa nhỏ tại canonical owner | D,E | TODO |
| G | P1 | Stable affected-route/state/reflow/native200/focus reports, method và limits | D,F | TODO |
| H | P1 | generate:check, verify và targeted browser; full E2E khi impact yêu cầu | E–G | TODO |
| I | P1 | Final hashes/diff/consumer verdict + technical handoff để người dùng nghiệm thu | H | TODO |

Không tạo BLOCKED để chờ Backend/owner/hosted CI/manual device. Lỗi kỹ thuật thực không bị giấu: NOT_RUN/UNKNOWN/FAIL giữ đúng, AI tự khắc phục trong scope và tiếp tục phần độc lập. Không tăng FE/full-product ledger từ số rules hoặc docs. Hosted run, screen-reader/human conformance, branch protection và owner acceptance chưa được quan sát không được ghi PASS.

## 6. Karpathy: giới hạn độ phức tạp và phạm vi thay đổi

Đã đọc skill được người dùng gọi: `C:/Users/Joker-PC/.codex/plugins/cache/openai-curated-remote/andrej-karpathy-skills/1.0.0/skills/karpathy-guidelines/SKILL.md`.

- Lines14–22: nêu giả định, nhiều cách hiểu và tradeoff; không chọn âm thầm.
- Lines24–34: minimum code, không speculative feature/config/abstraction cho single-use.
- Lines36–50: surgical changes, không format/refactor phần bên cạnh, chỉ gỡ orphans do thay đổi tạo ra.
- Lines52–68: goal cụ thể có phép kiểm, loop đến verified.

Áp dụng cho kế hoạch: giữ sáu finite semantic APIs; invariant dùng chung có consumer thật; validator nhỏ nối vào commands hiện có. Không bọc mọi MUI primitive, không universal form/table engine, policy engine, microfrontend, theme thứ hai hoặc thêm dependency vì nhãn Enterprise. Lặp cục bộ có thể được giữ khi ý nghĩa/hành vi khác; centralize invariant quan trọng để tránh nhiều nguồn độc lập. Mỗi changed line phải truy về yêu cầu user này.

## 7. Evidence snapshot đã đọc, không phải test chạy bởi audit agent

Theo báo cáo shared-composition và `handoff.json` đã đọc trước sửa:

- Source68 TS/TSX,16modules,176 composition uses trên21 consumer files; sáu owners.
- Verify-handoff exit0;96 unit/component tests; layout/visual/composition source findings0.
- Current216 render observations và permanent browser guard2/2.
- Paired114 comparable;102 desktop baseline không đủ do collector cũ đợi sidebar heading trong lúc main tải. Baseline giữ nguyên, không backfill.
- First full E2E485/486 exit1 do Windows UNKNOWN khi ghi metrics; artifact retest6/6 giữ assertions/runtime/spec. Không gọi first suite PASS hoặc cộng test lặp để tăng coverage.
- Native zoom200%5/5 và Firefox text-only200%5/5 có focus/hit-testing/source hashes ở lượt đó.

Các kết quả này thuộc source snapshot của lượt shared-composition trước steel-policy edits; phải đối chiếu hash nếu dùng sau sửa. Audit này không tái chạy hoặc nâng readiness từ chúng. FE-G01..09 và Production Claim Gate vẫn quyết định nhãn Enterprise/Production; số component/rules/LOC không là phần trăm chất lượng.

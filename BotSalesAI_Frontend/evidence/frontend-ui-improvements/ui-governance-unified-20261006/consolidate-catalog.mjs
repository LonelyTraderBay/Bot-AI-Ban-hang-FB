// One-off documentation edit. CURRENT API remains owned by TypeScript source.
import fs from 'node:fs';
const report = fs.readFileSync('evidence/frontend-ui-improvements/ui-governance-unified-20261006/shared-contract-review.md', 'utf8').replace(/\r\n/g, '\n');
const a = report.indexOf('## 3. CURRENT'), b = report.indexOf('## 5. Không bỏ sót', a);
if (a < 0 || b < a) throw new Error('Reviewed contract tables missing');
const contracts = report.slice(a, b).replace('## 3. CURRENT và PROPOSED contract đủ 21 components', '## 2. CURRENT/TARGET — 21 components').replace('## 4. CURRENT và PROPOSED contract đủ sáu compositions', '## 3. CURRENT/TARGET — sáu compositions').replaceAll('PROPOSED', 'TARGET');
const content = `# Shared UI — CURRENT API, TARGET contract và ownership

**Catalog v2.0 · 06/10/2026 · Frontend-only.** Quy định duy nhất: [standard v1.25 SPC-001–075](../../../../../docs/FRONTEND_SPACING_STANDARD.md); thực hiện [workflow §0](../../../../../docs/FRONTEND_SPACING_STANDARD.md#unified-workflow). Thứ tự công việc: [plan v16.0 §16](../../../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Catalog là API/owner reference, không scale/checklist/ledger thứ hai.

**CURRENT** là source/types đang tồn tại tại snapshot này; source thật có hiệu lực khi thay đổi. **TARGET** là compatibility/acceptance phải thực thi theo S03–S20, chưa sửa runtime trong lượt docs này. **CURRENT_GUARD_WITH_LIMITS:** ba source gates hiện có và negative fixtures chỉ bảo vệ các paths đã được kiểm; audit đã tái hiện bypass. Không gọi props/slots/values đã khóa100% từ TypeScript hoặc source0 findings. Những bảng dưới ghi đủ27 exports; hai notice chỉ có test consumers cần quyết định lifecycle, không tạo consumer giả.

## 1. Chọn owner và phân loại public API

Canonical tokens → generated output → theme/layout/visual → shared owner → module consumer. Atomic values chỉ ở tokens; theme giữ primitive defaults; layout/visual giữ semantic roles; component giữ inset/gap nội bộ; module giữ schema/columns/actions/payload/workflow. API/model hooks giữ query/cache/abort/permission/command state. Không thêm provider, library hoặc universal form/table/slot engine.

| Nhóm public input | Contract dùng chung | Verification cần giữ |
|---|---|---|
| Domain data/content | Text/value/rows/ReactNode callbacks được phép; không biến mọi dữ liệu thành enum | Escaping, locale/precision/unknown, semantics và observable result |
| Visual/flow/geometry | Existing named variants, finite keys/values/responsive provenance; không generic sx/style/className hoặc gap/p/m | Negative injection +positive cast/union/geometry; reflow, branch cases |
| Slots | children/actions/action/icon/value/extra/column.render là React composition; owner và content có trách nhiệm riêng | Source tạo node +nested styles +portal/state được kiểm, không miễn descendant |
| Metadata/native behavior | Explicit supported IDs/ARIA/data/ref/submit/events; extend đúng owner chỉ khi consumer cần | Name/ref/submit/RHF/draft/accessibility forwarding, no invalid role emulation |
| MUI/RHF nested input | InputProps/inputProps/slotProps/Controller/register/field có thể giữ data/events/ref/validation/adornment thật | Phân biệt behavior spread và visual override; unknown style provenance không PASS |

**Một boundary chỉ một owner.** Shell giữ page edges; parent composition giữ inter-child gap; Panel/dialog giữ surface inset; con giữ internal rhythm. Titled Panel đo từ header content cuối đang visible đến first body theo SPC-014; nested child không cộng top inset. Distinct bordered surfaces có inset riêng hợp lệ. Fragment/query/wrapper có thể cho nhiều DOM siblings: cần owner relation thật, không chỉ React child count.

**Whitespaces:** CSS gap là minimum trong flow/grid; space-between/wrap/align/intrinsic height có thể tăng edge distance. Contract ghi relation/axis/distribution/content readiness, không ép mọi khoảng nhìn thấy bằng gap. Intrinsic field label/helper theo theme, không page-level margin/spacer. Số cụ thể theo standard/token owner, không thêm scale ở feature.

Button/TextField/Select/Typography/Alert MUI tiếp tục qua một theme. Chỉ extract khi cùng invariant/owner/API và consumer thật; local geometry/behavior đúng nghĩa không tự là debt. Geometry hiện của sáu compositions: width/minWidth/maxWidth/height/minHeight/flex/gridColumn; responsive xs/sm/md/lg/xl; columns chỉ SectionGrid. sm/md và lg/xl hiện alias cùng breakpoint trong theme: kiểm actual values, không giả chúng là năm mức khác nhau.

${contracts}
## 4. Owner UI ngoài catalog và quyết định shared/local

| Vùng/owner hiện có | Treatment/target contract | Step |
|---|---|---|
| main/index/bootstrap +app Shell/routes/feedback/CommandRecovery | Giữ single providers, first paint/native error UI, nav/banner/demo disclosure/footer; profile/state và CSS/import closure đầy đủ | S04–09/S15–19 |
| Workspace AuthCard | Feature-local auth surface có invariant riêng; KEEP_VERIFY hoặc migrate có rationale, không tự export shared AuthCard | S11–12/S19 |
| Inbox conversation-components | Composer/message/context cùng module; giữ DTO/permission/message/scroll/draft; không generic chat engine | S11–12/S19 |
| Reports custom SVG/chart | Coordinates/table/chart width thuộc geometry; typography/foreground/padding thuộc canonical visual owner; custom render source trong scope | S08/S11–12/S16/S19 |
| Dashboard hero/role cards/links | Named hero profile, intrinsic icon-label owner; extract local repeated chrome khi có lợi ích thật, không speculative shared CTA | S08/S11–12/S19 |
| Shared API/model hooks | Giữ URL allowlist/cache/abort/scope/command recovery/unknown handling; layout không chuyển state/request về composition | S12/S19 |
| Generated contracts/tokens/CSS/icon/manifest | Sửa canonical input/generator nếu có requirement; generate:check; không sửa output tay | S04/S08/S18–19 |
| Public worker/sample/assets/PWA | First-party worker/CSV thật có owner riêng; generated MSW worker qua pinned CLI, không UI token rewrite vendor | S04/S18–19 |
| Config/scripts/tests/parent workflow | Phát hiện source mới/imported CSS/slots; permanent positive/negative/UNKNOWN fixtures; workflow coverage đúng | S04–10/S14–19 |

Inventory từng file: [inventory.json](../../../../../evidence/frontend-ui-improvements/ui-governance-unified-20261006/inventory.json). Review nguồn và giới hạn: [shared-contract-review](../../../../../evidence/frontend-ui-improvements/ui-governance-unified-20261006/shared-contract-review.md). Active file không cần edit vẫn phải có KEEP_VERIFY rationale và checks; không blanket exempt canonical/shared hoặc force edit mọi primitive.

## 5. Mở rộng, migration và bảo trì

Áp dụng workflow duy nhất đã link ở đầu file. Với API thêm/đổi: nhu cầu thật → minimal named contract tại owner → đồng bộ type/implementation/catalog/role mapping/checker fixtures và consumer impact trong cùng batch. Nếu default đổi, inventory mọi consumer và migration rõ; không silently đổi semantics, forward arbitrary props hoặc giữ alias cũ vô hạn. Không rename/split file chỉ theo số dòng. Khi remove export: kiểm production/test/import/route closure trước, cập nhật tất cả references và acceptance; hai notice được giữ chỉ khi có lý do state thật/test evidence, không consumer nhân tạo.

Source checks +type không thay browser/form/dialog/navigation regression. SOURCE_GUARD, UI, ARCH và delivery verdict tách riêng; limitations ở [REPORT](../../../../../evidence/frontend-ui-improvements/ui-governance-unified-20261006/REPORT.md). Không ghi FE/owner/hosted/speech PASS từ việc sửa catalog.
`;
fs.writeFileSync('apps/web/src/shared/ui/README.md', content, 'utf8');
process.stdout.write('Catalog CURRENT/TARGET 27 exports updated; runtime unchanged.\n');

# Đồng bộ tài liệu UI và đối chiếu source/runtime — 07/10/2026

**Trạng thái:** COMPLETE_LOCAL_DOCUMENT_SYNC_AND_AUTOMATED_REVALIDATION; READY_FOR_ACCEPTANCE trong phạm vi local được nêu dưới đây. Kết quả dựa trên source, command exits, log hashes và browser measurements hiện tại. Không dùng snapshot S19 cũ để xác nhận checkout mới.

## Nguồn duy nhất và những điểm đã sửa

- Quy định: [standard v1.28](../../docs/FRONTEND_SPACING_STANDARD.md#unified-workflow), SPC-001–075. Status: [UI plan §16.6](../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#ui-rollout-status). API CURRENT/TARGET: [shared catalog](../../apps/web/src/shared/ui/README.md). Các entrypoint chỉ trỏ tới owner; version journal/audits/handoff theo ngày giữ nhãn historical.
- Kit navigation/generator dùng FE001–FE028/140 checkpoint cho Frontend. T001–T084/420 bước là full-product reference read-only. Hướng dẫn FE là source template; generator rebase links khi nhúng vào kit-root plan. Không chỉnh FE/full-product plan hoặc ledger để tăng điểm.
- UI028 task table khớp C01–C05 và W01–W36 technical handoff đã ghi: UI backlog **28/28 task, 140/140 recorded checkpoints**. Đây là số ghi nhận kỹ thuật, không phải tỷ lệ code đúng hoặc owner acceptance.
- Catalog đối chiếu 27 TypeScript function declarations, prop contracts, production JSX consumers và lifecycle rationale. Sửa line references/counts, stable crosswalk anchor và cách hiểu CURRENT/TARGET; regression kiểm chúng từ compiler symbols. Giữ hai conditional notices có 0 consumer theo lý do lifecycle, không tạo consumer giả.
- [147 planned artifact declarations](frontend-plan-artifacts-current.json): 143 tồn tại đúng path, 4 proposed folder labels có counterpart thực tế đã ghi trong guide. Không thay task writeScope hoặc nhận checkpoint từ việc file tồn tại. 54 route IDs và 189 operation IDs riêng của task đều nằm trong canonical catalogs.
- [Inventory hiện hành](inventory-current.json) đọc kit cạnh Frontend; [harness hiện hành](inventory-current.mjs) dùng layout thật. Script inventory cũ còn giả định nested kit được giữ theo snapshot, không dùng làm current owner. Không tạo `BotSalesAI_Frontend/botsales-kit/`.
- Theme/prototype generators dùng UTF-8 và byte-exact output trên Windows; palette, dark-only và mọi approved token leaf giữ nguyên. Baseline gốc nguyên byte được lưu tại kit reference; extension record ghi 24 leaf non-palette đã tồn tại, source hash và exact added paths. Validator chặn sửa/xóa approved leaves, đổi/thêm màu, stale/undeclared/duplicate extensions. Không đổi atomic token values, quyết định palette hoặc prototype domain JS.

## Đối chiếu code thực tế

| Nội dung tài liệu | Kiểm thực tế | Kết luận được phép |
|---|---|---|
| Frontend React với API mock tổng hợp | Bootstrap/transport/MSW source; fresh production/demo builds và artifact isolation browser cases | Local/synthetic Frontend; Backend placeholder chưa có source/runtime |
| 54 routes, 16 modules | Canonical manifest, router/component bindings, runtime import closure, browser smoke và DOM geometry | 54/54 mapping; ready route measurements ở 390px/1440px trên hai engine |
| 21 components + 6 compositions | Resolved TypeScript symbols/props/JSX consumers; 38 named direct-render cases trong unit suite | 27 public React API contracts; `Column<T>` là supporting type, không phải component thứ 28 |
| Spacing role/owner và finite APIs | Source/layout/visual/composition positive/negative fixtures; actual browser gap/margin/inset/ancestry/route cases | Named source/runtime assertions đã chạy; không suy mọi dynamic branch đã render |
| Route/state/role coverage | Owner generators chạy từ verbose unit log và full E2E log mới | 432 cells: 163 route-specific, 204 shared-tested, 65 reasoned N/A; 357 route-role cases là trục riêng |
| Progress | Canonical FE CLI so với generated view; UI task table so với recorded technical handoff | FE **0/140 effective, 28 STALE**, không phải code implementation 0%; suite chung không nhận FE checkpoints |

[Source API inventory](shared-api-source.json), [route-state matrix](../../docs/route-state-role-matrix.json), [route implementation](../../docs/route-implementation.json), [generator record](route-generator-record.json). Matrix trước sync được giữ riêng; dữ liệu mới được sinh bằng owner, không sửa JSON bằng tay.

Inventory ghi **381 current paths**: 261 trong workspace +120 external inputs/workflow, 0 pending disposition, 0 unknown file, 0 unresolved runtime import, 0 missing/extra router page. Source có 73 files/68 TS–TSX; runtime entry/import closure 83 paths; 11 frontend generated outputs. Năm non-literal imports trong test/tooling có disposition riêng, không bị gọi là runtime imports đã resolve. Inventory là discovery/disposition, không phải phần trăm UI conformance.

## Kết quả chạy mới

| Phép kiểm | Kết quả | Bằng chứng |
|---|---|---|
| Root verify: generator/source/boundaries/lint/type/domain/unit/build/layout/visual/composition/evidence | exit 0; runtime/verification drift 0 | [record](verify-record.json), [log](verify.log) |
| Full Chromium/Firefox E2E, fresh production/demo builds | **504/504 PASS**, exit 0; suite route checks use the Vite demo dev server on port 5173; source drift 0 | [record](e2e-record.json), [log](e2e.log) |
| Dedicated production-demo artifact (`dist-demo`, Vite preview port 4174) | **6/6 PASS**; Chromium and Firefox each load the built artifact and render all 54 routes at 390px and 1440px; 0 route issues/page errors; artifact SHA-256 `f1744f827c01157e4137cbdab359801ce1d8f72c96ecfb953d860e8a74ed506c` | [record](built-demo-record.json), [log](built-demo.log), [mobile route observations](../../evidence/frontend-ui-improvements/UI028/W32/built-demo-routes-chromium-390-current-20261007.json), [desktop route observations](../../evidence/frontend-ui-improvements/UI028/W32/built-demo-routes-firefox-1440-current-20261007.json) |
| Application unit + direct-render contracts | **136/136**, 12 files; 38 named render cases phủ 27 APIs | [verbose record](unit-record.json), [log](unit.log) |
| Domain/network + source/boundaries | 88/88; 68 TS–TSX, 220 operation calls, 54 routes; 504 imports/10 boundary fixtures | Root verify log |
| Layout/visual/composition gates | 82/82 fixtures, 76 files/0 findings/1 declared exception; 5/5 visual fixtures, 75/0; 38/38 composition/API fixtures, 74/0 | Root verify + [layout record](layout-record.json), [contract record](contracts-record.json) |
| Evidence validator | 11/11 fixtures; S17 manifest validator PASS | [fixture record](evidence-validator-record.json), root verify log |
| Finance corrected oracle | 6/6 Chromium/Firefox; outer header gap remains 16±0.5px | [record](finance-record.json), [log](finance.log) |
| Kit release/generator/validator checks | 272/272; extension/navigation regression 9/9; isolated release self-tests 16/16; three generator checks + FE structure/status PASS | [kit record](kit-checks-record.json) |
| Documentation consistency | 95 active/generated/template/live-evidence documents, 75 unique ordered SPC IDs; local path/anchor problems 0, FE display matches CLI | [measured count/hash record](documents-current.json) |
| Exact inline file paths | 220 references, 0 unresolved; historical proposed filenames giữ nhãn dự kiến | [record](literal-paths-current.json) |

W28 full-suite route checks đo 54 routes ở 390px và 1440px trên demo dev server; dedicated production-demo run đo lại toàn bộ 54 routes ở cả hai width trên Chromium/Firefox và artifact SHA ở trên. Reflow W29 kiểm representative profiles ở 9 widths; W30 kiểm năm DOM text/spacing-stress scenarios mỗi engine. Không gọi đây là mọi route ở mọi width hoặc native zoom proof.

## Lỗi tìm thấy, sửa và retest

1. **Finance test oracle đã cũ:** initial trace đo cả 9 header boundaries đúng 16px; assertion cũ kỳ vọng FormFields padding 0px trong khi mock Alert đã là first child, có MUI padding nội bộ 6px. Sửa test xác nhận đúng first-child kind/padding; giữ outer gap/body top/inline-bottom assertions nghiêm. Không sửa React để làm test xanh. [Observed geometry](finance-initial-observations.json), [initial interrupted run](e2e-initial-interrupted-record.json), [initial log](e2e-initial-interrupted.log); run bị dừng sau reproduction, không tính PASS. Sau đó targeted 6/6 và full 504/504 PASS.
2. **Verify harness thiếu Git trong PATH:** các code gates PASS nhưng evidence CLI dừng `spawnSync git ENOENT`. Harness resolve binary Git thật trên host, đưa directory vào PATH và record môi trường. [Initial FAIL](verify-initial-path-failure-record.json), [log](verify-initial-path-failure.log); rerun verify exit 0.
3. **Release/self-test và output drift:** isolated fixture thiếu adjacent Frontend docs; bổ sung actual required inputs và missing-document negative case. Token integrity phân biệt approved baseline với existing additive extensions; prototype byte count/SHA và generated navigation được kiểm theo owner. Initial failures giữ riêng; current 272/9/16 checks PASS.
4. **Generated trailing spaces:** sửa hai dòng tại sync-release owner rồi regenerate; [diff check](git-diff-check-record.json) exit 0, initial result giữ riêng.

## Verdict, retention và giới hạn

- **UI: PASS_LOCAL_AUTOMATED_SCOPED.** Named browser/unit/source/layout assertions đạt trên runtime hiện tại; coverage/state dispositions có nguồn. Không ghi 100% UI correctness từ số rule/API/route hoặc fixture.
- **ARCH: PRESERVED_AND_VERIFIED_LOCAL.** Không đổi React runtime trong lượt docs/tooling này; 80 runtime file hashes được chụp đầu lượt vẫn khớp. Giữ bốn module/checker/test spacing changes có sẵn; root source/boundary/build và import closure được kiểm thật. Không thêm dependency/framework hoặc thay business/query/permission flow.
- Hồ sơ S17 được refresh từ actual captured checks, giữ pre-sync snapshot. [S19 manifest mới](S19-current-evidence.json) bind current inventory, doc/source fingerprints và actual command logs; manifest cũ giữ lịch sử. Source/head/arguments/exit/log hashes ở từng `*-record.json`; HEAD không thay working-tree hashes.
- Chưa có file dư đủ bằng chứng để xóa an toàn. Universal copies cần cho từng component; audit/log/reference cũ còn path consumers và provenance. Giữ chúng theo historical/read-only role. IDE tab nested kit không có file thực; nguồn plan đúng ở sibling kit.
- Native Chromium zoom/Firefox text-only methods **NOT_RERUN_THIS_DOCUMENT_SYNC**; kết quả trước đây giữ ngày/source scope riêng. DOM 200% stress không xác nhận native zoom, screen-reader speech hoặc human review toàn bộ states/slots/branches.
- Không hosted CI/branch protection, owner acceptance, Backend/provider/persistence/staging/production proof. Không tăng FE/full-product ledger từ general suites; stale FE evidence cần revalidate đúng task/dependency. Không commit/push/delete/move source files trong lượt này.

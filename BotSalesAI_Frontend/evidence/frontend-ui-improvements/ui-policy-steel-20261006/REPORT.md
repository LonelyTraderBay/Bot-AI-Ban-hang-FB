# Audit shared UI và quy định bắt buộc — 06/10/2026

**Kết quả: AUDIT_COMPLETE / POLICY_SPECIFIED / HARDENING_PLANNED.** SPC-001–075 có hiệu lực về quy định. Các bước gia cố source/checker/runtime/browser/evidence S03–S20 chưa triển khai; không nhận 100% conformance hoặc Enterprise certification từ việc viết tài liệu. Lượt này chỉ sửa tài liệu và tạo evidence audit.

## Phạm vi và nguồn tái lập

Rà toàn bộ shared/ui, consumer React, tokens/theme/layout/visual, API/ownership, fixtures, source scanners, browser guard, package và workflow tại Git root. Đối chiếu original AI_RULES, scope/context, kiến trúc/API/coding standards, spacing standard, catalog và plan. Ba nhánh audit độc lập gồm shared/visual-runtime, enforcement đối kháng và document authority. Áp dụng Karpathy Guidelines: nêu giả định, giải pháp nhỏ, thay đổi đúng vùng, tiêu chí kiểm chứng cụ thể.

- [audit.mjs](audit.mjs) / [audit.json](audit.json): inventory, strict scans, fixtures, generator, FE status và hashes.
- [shared-audit.md](shared-audit.md): đủ 27 components, API/invariant, 112 semantic roles và 11 shared findings.
- [policy-audit.md](policy-audit.md): authority, trạng thái cũ và mâu thuẫn trước sửa. Line references được giữ theo thời điểm audit.
- [enforcement/FINDINGS.md](enforcement/FINDINGS.md), [probe.mjs](enforcement/probe.mjs), [probe-results.json](enforcement/probe-results.json): source, controls, typecheck và expected/observed của từng mẫu.
- [browser probe](shared-panel-browser-probe.mjs) / [diagnostic](shared-panel-browser-diagnostic.json): đo hình học thực trên demo local.
- [delivery checker](check-delivery.mjs) / [delivery-check.json](delivery-check.json): kiểm tài liệu và hash của lượt này, chưa phải permanent policy/evidence gate.

Các script audit/probe là collector trong evidence, không app gate hoặc ledger. Sync-docs là migration tài liệu một lần; không dùng nó để cộng trạng thái. Không inject fixture sai vào app.

## Kết quả đo hiện hành

| Phép đo | Kết quả | Giới hạn |
|---|---|---|
| Source | 68 TS/TSX, 28 TSX, 16 module folders; 2 CSS | Layout/visual scan 69 files; generated tokens.css kiểm bằng generator |
| Shared UI | 27 exports =21 components +6 compositions; 1.108 JSX uses | Có use nội bộ shared; không phải DOM/render count |
| Sáu compositions | 176 occurrences /21 files | Form72, field28, content28, action25, sections9, grid14 |
| Semantic map | 112 roles /25 groups, tất cả có reference | Gồm geometry/shape; không phải 112 loại spacing |
| Lifecycle | 25 exports có source JSX consumer; 2 chỉ có test consumer | PartialDataNotice/CapabilityUnavailable không phải untested |
| Layout/visual/composition | Cả ba PASS/exit0, 0 findings; layout dùng 1 scoped exception | Khả năng phát hiện còn hở theo probes |
| Existing fixtures | 24/24 PASS, 0 skip | Layout10 +visual5 +composition9 |
| Generator | 11 outputs, 283 schemas, 210 operations, 54 routes; exit0 | Generated inputs/outputs không sửa |
| FE status trước policy | 0/140 effective, 28 STALE, blocked=[], next FE001.S01 | Phản ánh freshness, không phải 0% implementation |

Lệnh/exit thật nằm trong các log *-current.log. Không chạy lại build/full E2E/native200/speech/hosted CI trong lượt audit này. Runtime/contracts/tokens/original rules và ledgers giữ nguyên; catalog README là tài liệu được cập nhật có chủ đích.

`npm.cmd run generate:check` với command shell mặc định thất bại exit1 vì child process không tìm được node; thêm Node directory vào process PATH vẫn thất bại, kết quả được giữ trong hai log. Chạy cùng npm script với `--script-shell=powershell.exe` đạt exit0, xem [generate-npm-powershell.log](generate-npm-powershell.log). Override chỉ áp dụng lệnh này, không đổi machine PATH/execution policy hoặc package scripts. Direct Node generator checks đạt riêng; không gọi các lượt thất bại là PASS.

## Lỗ hổng enforcement đã tái hiện

Bộ bổ sung có **30 cases: 4 negative controls, 25 bypass probes và 1 false positive**. Cả 4 controls bị đúng gate liên quan chặn. **22 mẫu TSX lọt cả ba source gates và typecheck với app compiler options; một mẫu CSS lọt cả hai gate áp dụng.** Hai mẫu còn lại chỉ vượt visual gate và bị layout gate chặn. Không gọi đây là full npm verify trên fixture, không quy đổi thành phần trăm tuân thủ app.

Nguyên nhân gồm: tin tên colors/theme/tokens hoặc hậu tố file; alias/shadow/barrel mất identity; layoutSx bị mutation; bỏ sót native spread/GlobalStyles/style tag/createElement; shorthand/computed key/arithmetic/named color/CSS variable không được xác minh đầy đủ; ownership chỉ hiểu direct parent/literal. F01 chứng minh geometry hợp lệ với as const bị từ chối, nên hardening phải có cả positive fixtures.

Cả ba gates còn trả strict PASS ở scaffold có **0 source files**. Đây là lỗ hổng inventory độc lập với 30 cases. `--report` exit0/statusFAIL là diagnostic có chủ đích; verify hiện dùng strict, không tự coi diagnostic là release PASS. Finding chi tiết có source line, code và expected/observed trong report/JSON; bypass không chứng minh app hiện có mọi lỗi tương ứng.

## Phép đo UI thực tế

Chromium trên demo local đang chạy, widths 390/806/1440. Collector đợi main h1, query hết loading, đúng Finance header và fonts.ready. Hash trước/sau giống nhau; 0 page errors, 0 API writes. Có **9 route–viewport observations: 6 Finance và 3 Imports**, gồm 9 Finance panel measurements cho ba first-body cases ở ba widths.

- `Kỳ báo cáo`, `Chi tiết kết quả kinh doanh`, `Hỏi đáp có nguồn`: mép từ header child cuối đang hiển thị tới body child đầu là **32px tại390, 40px tại806/1440**, thay vì16 theo SPC-014. Header pb16 cộng body pt16/24. Đây là CONFIRMED_SPC014_MISMATCH trên ba cases đã đo; không kết luận toàn91 Panel uses sai.
- Imports tại806/1440: banner bottom tới floating label đang hiển thị15px; tới control border24px. Mobile390 collapsed tới toggle24px. Expanded disclosure có toggle/caption ở giữa nên khoảng tới controls không phải gap giữa hai nhóm kề nhau. Không tái hiện overlap trong states đã đo.
- Hidden-label raw probe ban đầu được giữ với nhãn INVALID_MEASUREMENT_HIDDEN_NODE và phép đo sửa có visibility guard. Không dùng rect của node ẩn hoặc riêng computed gap để nhận conformance.

Diagnostic này không thay full suite/Firefox/native200/focus coverage. QueryState geometry và ErrorNotice cleanup còn là source finding hoặc NEEDS_REGRESSION; không tự claim CLS/accessibility/runtime failure khi chưa tái hiện.

## Tài liệu đã cập nhật và việc còn lại

[Chuẩn v1.24 §13.5](../../../docs/FRONTEND_SPACING_STANDARD.md#steel-policy) bổ sung SPC-064–075: binding/value provenance, readonly owner, style/scope fail-closed, finite API, render ownership, profile consistency, readiness/consumer coverage, gate integrity, Karpathy simplicity và evidence closure. Bổ sung hai role thiếu trong bảng semantic; giải quyết journal/current wording, baseline, representative coverage và titled Panel ownership.

[Kế hoạch v15.0 §16](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan) có đủ inventory27 exports, findings A01–A18, 20 bước với dependency/acceptance/status, DoR/DoD và matrix negative/positive/browser/behavior. S01 audit/S02 specification đã xong; S03 READY, S04–S20 TODO. AGENTS, README, DESIGN, UX, coding standards, catalog, scope/context/continue trỏ một nguồn quy định.

Không tạo BLOCKED để chờ Backend/owner/hosted CI. Prerequisite kỹ thuật và phần kiểm chứng thiếu vẫn mở. “100% bắt buộc” là nghĩa vụ của mọi thay đổi trong scope; chưa phải checker coverage100%. Original AI_RULES/generated/full-product và FE ledgers không sửa. Runtime snapshot trước ở report riêng:216 current renders,114 comparable/102 partial baseline, full485/486 FAIL và artifact retest6/6 riêng. Không cộng thành full PASS hoặc ghi owner acceptance.

## Tham chiếu chính thức

- [TypeScript JSX](https://www.typescriptlang.org/docs/handbook/jsx.html): một số unknown hyphenated attributes không tạo type error; closed types cần gate bổ sung.
- [MUI sx](https://mui.com/system/getting-started/the-sx-prop/): sx array có precedence, nên consumer override có thể thay owner.
- [W3C reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): 320 CSS px reflow khác native200 method; không tự là full WCAG PASS.
- [GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches): required checks/bypass configuration cần xác minh riêng. Hosted run/protection chưa được audit local này xác minh, không là prerequisite Frontend.

FE-G01..09 không tăng điểm từ tài liệu/probe. Người dùng review quy định và kế hoạch; triển khai/kiểm chứng source hardening theo §16 trước khi đóng các bước còn lại.

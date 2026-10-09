"""Update only the live status owner; retain dated implementation journals."""
import pathlib

frontend = pathlib.Path(__file__).resolve().parents[2]
path = frontend / 'docs/FRONTEND_UI_IMPROVEMENT_PLAN.md'
text = path.read_text(encoding='utf-8')
start = text.index('### 16.6.')
end = text.index('\n### ', start + 5)
section = text[start:end]
proof = '[kiểm thực tế hiện hành](../evidence/frontend-ui-document-sync-20261007/REPORT.md)'
statuses = {
    'S06': 'DONE_GUARD_CAPABILITY_SCOPED — canonical values readonly và consumer-write guards đã implement; current source/gate revalidation theo ' + proof + '. Không dùng counts của closeout cũ làm current acceptance.',
    'S07': 'DONE_STYLE_PRODUCER_COVERAGE — style entry discovery/binding đã implement; giữ [closeout lịch sử](../evidence/frontend-ui-improvements/ui-governance-rollout-20261006/S07-final.md). Current source/build và negative regressions theo ' + proof + '.',
    'S08': 'DONE_VALUE_UNIT_PROVENANCE — finite value/unit/source provenance đã implement; [closeout lịch sử](../evidence/frontend-ui-improvements/ui-governance-rollout-20261006/S08-final.md) giữ ngày/scope riêng. Current checks theo ' + proof + '.',
    'S09': 'DONE_OWNERSHIP_SCOPED — checker xử lý finite wrappers/fragments/conditional roots, shared gap owners và ActionGroup; các sửa spacing ở Approvals, Devices, P&L và Shipments được giữ. Current composition/route measurements theo ' + proof + '; không suy mọi dynamic branch đã render.',
    'S10': 'COMPLETE_LOCAL_CONTRACT — 21 components + 6 compositions có source/types/catalog và named direct-render cases; `Column<T>` là supporting type. Catalog line references và JSX counts có regression đối chiếu TypeScript symbols. Hai conditional notices giữ lifecycle rationale, không tạo consumer giả. Current checks/limits theo ' + proof + '.',
    'S11': 'DONE_OWNER_FIX_SCOPED — existing shared Panel owns header/body boundary; giữ [paired before/after lịch sử](../evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S11-shared-panel-after-fix-20261007.json). Lượt này không đổi React layout. Test Finance được sửa oracle theo first Alert thật, giữ header gap 16±0.5px, body top 0px và responsive inline/bottom 16/24px; revalidation theo ' + proof + '.',
    'S12': 'DONE_CONSUMER_PROFILES_SCOPED — QueryState section/inline profiles và Pager malformed-cursor handling đã implement; giữ [migration/dispositions lịch sử](../evidence/frontend-ui-improvements/ui-governance-rollout-20261007/S12-query-state-profile-migration-20261007.json). Current consumer symbols, source gates và browser route/state verification theo ' + proof + '.',
    'S13': 'N/A_OPTIONAL_CLEANUP — không có runtime defect mới được tái hiện trong scope đồng bộ tài liệu. Lifecycle disposition của hai notice giữ tại S10/S14; không xóa chỉ vì 0 consumer. Defect mới phải mở mandatory remediation theo bằng chứng.',
    'S14': 'COMPLETE_CATALOG_LIFECYCLE_SCOPED — 27 exported React APIs có mapped contract/consumer hoặc lifecycle rationale. Giữ conditional `PartialDataNotice`/`CapabilityUnavailable`; catalog CURRENT không còn ghi mọi API là chưa implement. Current API/catalog regression và limits theo ' + proof + '.',
    'S15': 'DONE_READINESS_AND_ANCESTRY_SCOPED — actual route readiness và positive ancestry collectors đã implement. Các captures/log closeout trước đây giữ source/date scope riêng; current full-route DOM/ready/empty/role revalidation theo ' + proof + ', không nhận hash cũ là current.',
    'S16': 'COMPLETE_METHODS_SCOPED — phép đo native mới: Chromium browser zoom 200% 5/5 và Firefox text-only 200% 5/5; W30 browser stress 10/10 trên source hiện hành. [Bổ sung W30 ngày 07/10](../evidence/frontend-ui-improvements/UI028/W30/native-zoom-followup-current-20261007.md) lưu JSON, ảnh và giới hạn. Không suy ra screen-reader speech hoặc human review toàn bộ states.',
    'S17': 'COMPLETE_LOCAL_MANIFEST_SCOPED — current manifest được refresh từ command/log/exit/source fingerprints; 11 validator, 38 contract và 82 layout fixtures PASS. ' + proof + '. Validator đo provenance/coverage đã khai báo, không tự xác nhận screenshot hay acceptance.',
    'S18': 'COMPLETE_LOCAL_WIRING_SCOPED — root `verify` và full Chromium/Firefox E2E được chạy local trên checkout hiện hành, gồm strict gates và failure propagation. ' + proof + '. Hosted CI/branch protection NOT_RUN; không mở rộng local PASS thành hosted PASS.',
}
lines = section.splitlines(keepends=True)
seen = set()
for i, line in enumerate(lines):
    for step, status in statuses.items():
        if line.startswith('| ' + step + ' |'):
            cells = line.rstrip('\n').split(' | ', 4)
            assert len(cells) == 5
            lines[i] = ' | '.join(cells[:4]) + ' | ' + status + ' |\n'
            seen.add(step)
assert seen == set(statuses)
text = text[:start] + ''.join(lines) + text[end:]
marker = 'Phiên bản 8.0 bổ sung UI028'
assert marker in text
if '## Lịch sử phiên bản và closeout' not in text:
    text = text.replace(marker, '## Lịch sử phiên bản và closeout\n\nCác đoạn phiên bản bên dưới ghi **HISTORICAL_SNAPSHOT** theo thời điểm triển khai. Trạng thái hiện hành chỉ ở §16.6; không dùng TODO/next/counts trong journal để điều hành checkout mới.\n\n' + marker, 1)
path.write_text(text, encoding='utf-8')
print('Updated live status owner and marked version journal as historical.')

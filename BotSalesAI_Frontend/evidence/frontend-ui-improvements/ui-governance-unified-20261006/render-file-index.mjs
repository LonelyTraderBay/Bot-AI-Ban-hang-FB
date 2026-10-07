// Human-readable view of this task's file inventory, not a new tracker.
import fs from 'node:fs';
import path from 'node:path';
const directory = 'evidence/frontend-ui-improvements/ui-governance-unified-20261006';
const inventory = JSON.parse(fs.readFileSync(`${directory}/inventory.json`, 'utf8'));
const grouped = new Map();
for (const file of inventory.files) {
  const list = grouped.get(file.category) ?? [];
  list.push(file); grouped.set(file.category, list);
}
let content = `# Danh sách từng file trong phạm vi rollout UI\n\n` +
  `**Snapshot:** ${inventory.checkedAt} · **${inventory.files.length} entries:** ${inventory.summary.workspaceRelevantFiles} workspace +${inventory.summary.externalRelevantFiles} active parent workflow.\n\n` +
  `Bản đọc sinh từ [inventory.json](inventory.json); tái lập bằng [render-file-index.mjs](render-file-index.mjs) sau khi refresh inventory. Đây là navigation, không tracker/verdict mới. Owner/edit policy/required checks/full SHA-256 ở JSON. Mỗi file giữ NOT_RUN_THIS_DOCS_TURN cho implementation assessment; KEEP_VERIFY không tự PASS. Route count là conservative static impact, không browser coverage.\n\n` +
  `Quy trình: [standard §0](../../../docs/FRONTEND_SPACING_STANDARD.md#unified-workflow); thứ tự: [plan §16](../../../docs/FRONTEND_UI_IMPROVEMENT_PLAN.md#steel-plan). Quyền edit/treatment phân biệt generated/reference/vendor/runtime. File deleted xử lý riêng, không khôi phục dirty deletion. Excluded families có count/reason tại [coverage-review](coverage-review.md) và JSON.\n`;
for (const [category, files] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
  content += `\n## ${category} — ${files.length} files\n\n| File | Planned treatment | Steps | Routes có impact tĩnh |\n|---|---|---|---:|\n`;
  for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
    const target = path.relative(directory, file.path).replaceAll('\\', '/');
    content += `| [${file.path}](${target}) | ${file.plannedTreatment} | ${file.rolloutSteps.join(', ')} | ${file.routeImpact.length} |\n`;
  }
}
content += `\n## Retired paths từ Git baseline\n\n`;
for (const file of inventory.deletedTrackedPaths) content += `- ${file}: RETIRED_VALIDATE; path không còn tồn tại là trạng thái dự kiến, xem retiredTreatment trong JSON.\n`;
fs.writeFileSync(`${directory}/FILE_INDEX.md`, content, 'utf8');
process.stdout.write(JSON.stringify({entries: inventory.files.length, groups: grouped.size, output: `${directory}/FILE_INDEX.md`}) + '\n');

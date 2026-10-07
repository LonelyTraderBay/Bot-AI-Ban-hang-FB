# Bằng chứng frontend với mock API

Mỗi FE có S01–S05.json và handoff.md tại execution/frontend-evidence/FE001/...; đường dẫn sourceFiles/cwd theo root BotSalesAI_Frontend, log/evidence paths theo kit. Dùng template evidence của kit nếu phù hợp và bổ sung verificationScope/environment.dataSource bên dưới. Placeholder không phải PASS; không nộp mẫu này làm checkpoint.

```json
{
  "taskId": "FE001",
  "stepId": "S01",
  "kind": "artifact_review",
  "result": "NOT_RUN",
  "verificationScope": "FRONTEND_WITH_SYNTHETIC_MOCK_API",
  "executedAt": "<actual ISO timestamp>",
  "sourceRevision": "<actual revision plus diff or snapshot>",
  "expected": "<criteria of this step>",
  "observed": "<actual observations>",
  "command": "<exact command or review method>",
  "cwd": "<actual frontend directory>",
  "reviewer": "<actual agent/person; no invented independent review>",
  "environment": {
    "name": "<actual OS/runtime/browser>",
    "details": "<actual versions/config/fixture scenario>",
    "dataSource": "source-only"
  },
  "checksTotal": 0,
  "failed": 0,
  "logFile": "execution/frontend-evidence/FE001/S01.log",
  "logSha256": "<sha256 of actual log bytes>",
  "sourceFiles": [{"path": "<source/test/fixture/config file relative to frontend root>", "sha256": "<actual file sha256>"}],
  "sourceSnapshotSha256": "<sha256 of sorted path:sha256 strings joined with newline>"
}
```

Test evidence dùng kind=test_run, commandId trỏ frontend-command-map.json đã VERIFIED_AVAILABLE cho exact command; environment.dataSource=synthetic-msw khi app/mock data được kiểm. Các kiểm tĩnh dùng source-only. result=PASS/checksTotal>0/failed=0 chỉ khi thực sự đạt. Snapshot phải chứa source/tests/fixtures/config/contracts/dependencies ảnh hưởng, không chỉ một README.

Log cần exit code/expected/observed/test IDs và phạm vi. Metadata/hash hợp lệ không tự chứng minh acceptance đầy đủ; review test và behavior đúng artifact. Evidence frontend không được nộp vào ledger T toàn sản phẩm hoặc nhận server/provider thật đã hoạt động.

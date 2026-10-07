# FE015 — Route, operation và state map

Phạm vi: routes R20–R22 và R48–R50 trong React/TypeScript cùng API HTTP tổng hợp qua MSW demo. Nghiệp vụ là kế toán quản trị; không khẳng định tuân thủ luật/kế toán quốc gia, không thực hiện thanh toán thật và không kết nối ngân hàng/đơn vị vận chuyển.

| Route | Đọc theo manifest | Ghi theo manifest | Chủ sở hữu UI |
|---|---|---|---|
| R20 `/s/:shopId/finance` | `getCashflow` · `finance.read` | — | `apps/web/src/modules/finance/index.tsx` / `CashflowPage` |
| R21 `/s/:shopId/finance/entries` | `listFinanceEntries`, `getFinanceEntry`, `getCommand` · `finance.read` | `createFinanceEntry`, `updateFinanceEntry`, `postFinanceEntry`, `reverseFinanceEntry` · `finance.post` | cùng module / `EntriesPage`; detail nạp bản mới trước thao tác |
| R22 `/s/:shopId/finance/profit-loss` | `getProfitLoss` · `finance.read` | — | cùng module / `ProfitLossPage` |
| R48 `/s/:shopId/finance/journals` | `listJournals`, `getJournal` · `finance.read` | `createJournal`, `postJournal`, `reverseJournal` · `finance.post` | cùng module / `JournalsPage` |
| R49 `/s/:shopId/finance/reconciliation` | `listReconciliationCases`, `listBankTransactions`, `listCODSettlements` · `finance.read` | `importBankStatement`, `importCODStatement`, `matchSettlement`, `matchCODSettlement` · `finance.reconcile` | cùng module / `ReconciliationPage`; file transfer dùng `uploadFile` |
| R50 `/s/:shopId/finance/debts-periods` | `listDebtItems`, `listAccountingPeriods` · `finance.read` | `closeAccountingPeriod`, `reopenAccountingPeriod` · `finance.close` | cùng module / `DebtsPage` |

## Phát hiện và quyết định triển khai

- Contract yêu cầu `from`, `to`, `timezone` cho cả cashflow và P&L. Ban đầu hai query dùng bộ lọc danh sách chung, nên thiếu ba tham số báo cáo; đã thêm chọn khoảng ngày theo timezone shop và mock lọc đúng `[from,to)`. Số liệu report vẫn do operation mock tổng hợp, không cộng trang hiện tại.
- Journal cho nhập ID tài khoản vì contract không có account-catalog operation. Giữ input tự do có hướng dẫn rõ đây là ID được fixture/backend cung cấp; không tự tạo chart-of-accounts. UI kiểm chuỗi decimal chính xác, tối thiểu hai dòng, mỗi dòng chỉ Nợ hoặc Có, tổng cân bằng và kỳ mở trước khi gửi; mock vẫn kiểm lại các bất biến.
- FinanceEntry đã ghi bất biến ở UI và mock; create/update/post/reverse đều đi qua contract operation/capability tương ứng. Posted amount hiển thị như chứng từ, không phát lệnh chuyển tiền. API/mocks phải giữ decimal string và version.
- Import CSV demo chỉ nhận `botsales-csv-v1`, có kết quả theo dòng và idempotency theo external ID/order; import không tự biến thành đối soát. COD hiển thị gross, phí và bank net riêng. Partial/unmatched phải còn nhìn thấy để xử lý.
- `useCommand` ngăn gửi lại khi response chưa rõ và lưu intent cần reconcile; component không được đóng/mất form hoặc báo thành công khi command unknown. Backend concurrency/idempotency vẫn chưa được chứng minh bởi mock.
- Kỳ đóng/mở lại vẫn do `finance.close` và API mock kiểm version/prerequisite/approval đúng resource. Không suy quyền từ tên vai trò trong UI.
- Không có account catalog hoặc national-compliance API trong canonical contract. Số liệu fixture chỉ nghiệm thu luồng tổng hợp và hiển thị nguồn/cảnh báo, không đại diện sổ sách pháp định hay ngân hàng thực.

## Bằng chứng dự kiến

`tests/fe015-source-map.test.mjs` kiểm route/operation/permission/DTO/owner; `tests/fe015.spec.ts` kiểm báo cáo kỳ, journal cân bằng/khóa kỳ, nhập và đối soát bank/COD, permission, partial result và unknown command trên React demo + MSW tổng hợp. Unit/domain/schema/build/boundary/full-browser checks được ghi riêng trong `S04` evidence.

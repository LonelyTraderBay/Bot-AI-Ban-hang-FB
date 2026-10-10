# VS01: chờ dialog chấp nhận nhập liệu sau nhận việc

Source owner: duy nhất VS01 trong `tests/vertical-slices/fe022-flows.spec.ts`. Snapshot gốc nguyên byte khớp HEAD54 `bcdf5414015fe045482278f3f115b53e9e7c4262`; baseline và contract có trước source edit. VS02 readiness và mọi flow FE022 khác giữ nguyên.

Hosted Chromium run38050319695/job114207967205: 406 PASS/1 VS01 FAIL; audit/full verify/upload PASS, built-demo SKIPPED. Claim200, nhưng scan fill2543237.342–2543338.173ms không nhập được SKU; quantity fill2543338.770–2543367.498ms. Nút pick disabled đến hết timeout180000ms, không có request pick. Last frame scan trống, quantity1. Artifact11670631729 kiểm SHA256 `b7f55aee67d750f0c775d47a4c03904f9855b56105b9a885eebf6b11557839c4`; trace/error-context/timeline/frames/screenshot giữ dữ liệu thực. Body API trong trace thiếu nội dung nên không suy diễn payload hosted.

Nguyên nhân có bằng chứng: test coi claim HTTP200 là dialog đã sẵn sàng nhập. Claim.execute còn chờ invalidate/refetch; EditDialog giữ DialogContent inert và progressbar lưu khi pending. PrepDialog không reset scan. FE013 đã chờ dialog hết busy và kiểm actual value sau claim; test đó chỉ đọc. Probe giữ đúng một GET listPrepJobs thêm3000ms mỗi fixture tái hiện bản gốc scan/quantity rỗng, pick disabled, không gửi pick. Candidate chờ hết busy/inert rồi PASS toàn bộ VS01, gửi đúng expectedVersion2/orderLineIdol-1001/scannedSkuAO-002/pickedQuantity1/issueReasonnull.

CLI gốc: 3 PASS/1 Chromium FAIL, exit1, cùng vị trí; raw local trace/error-context giữ nguyên trước source edit. Lần collector probe đầu bị unhandled rejection của response waiter gần đồng deadline với click, exit1, lưu riêng. Collector sau bắt rejection ngay nhưng trả nguyên promise cho callback; không đổi assertion hay kết quả. Observer15000ms và delay3000ms chỉ thuộc harness, Source180000ms/expect5000ms giữ nguyên.

Bản sửa chỉ thêm chờ progressbar `Đang lưu` biến mất và vùng inert hết khóa, kiểm giá trị SKU/số lượng và pick enabled trước click. Giữ nguyên product/order/reservation/prep references, HTTP status, stock unchanged/reserved+1/available-1, exact pick body và UI1/1; không force click, retry/sleep source hay đổi app/mock/API/config/dependency/ngưỡng.

Final VS01+VS02: 12/12 PASS, repeat3 mỗi engine. Composition41, layout86, validator11 PASS. Full verify exit0 gồm 238 unit test, build và S17 COMPLETE/275 current fingerprints; discovery407 test/69 file mỗi engine. Source/read-only/generated/proof hash lưu trong local-validation.json.

Firefox của run54 vẫn IN_PROGRESS tại snapshot job trong nhóm này, đã quan sát một lỗi initial customer-address table thuộc nhóm riêng; chưa ghi tổng kết Firefox hoặc workflow completed. Source mới `PENDING_AT_COMMIT` cho hosted sau push. Không ghi Backend/production, owner acceptance, native zoom hay screen-reader PASS.

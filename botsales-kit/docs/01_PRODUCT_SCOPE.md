# 01 — Phạm vi sản phẩm và 64 chức năng

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Kết quả mong muốn
Chủ shop làm marketing; hệ thống tiếp nhận và tư vấn khách, chốt đơn hợp lệ, chuyển việc tới người chuẩn bị, theo dõi giao/COD, đối soát, báo cáo lời/lỗ và chuẩn bị đơn nhập. Người thật thực hiện lấy/kiểm/đóng/giao hàng và quyết định ngoài quyền đã giao.

## Nhóm chức năng đã duyệt
64 bổ sung sau đây mở rộng các module core của v1.1, không bỏ catalog/import/inbox/customers/reports/audit/privacy/jobs. Trạng thái mọi tính năng live là CHƯA TRIỂN KHAI trong bộ tài liệu. Xem docs/04 và contracts để nối UI/API.

### A — Thông báo điện thoại

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| A01 | Đăng ký thiết bị nhận thông báo | Hiển thị khả năng thiết bị, hướng dẫn cài PWA, xin quyền sau thao tác người dùng; gửi kiểm tra; thu hồi subscription. | Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt. |
| A02 | Báo đơn đủ điều kiện chuẩn bị | order.confirmed + reservation bền vững + payment/COD policy cho phép mới tạo task và notification intent. | Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc. |
| A03 | Mở đơn an toàn từ thông báo | Deep-link đến shop/order sau session bootstrap; nội dung lockscreen tối thiểu; không có PII trong URL. | Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành. |
| A04 | Xác nhận nhận chuẩn bị | Nút Tôi nhận đơn thực hiện compare-and-set task.version/assignee trong transaction; người nhận và thời gian rõ. | Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc. |
| A05 | Nhắc hạn và dự phòng | Lịch nhắc dựa lịch trực/múi giờ, policy có version; định danh intent và số lần tối đa; fallback Telegram đã liên kết. | Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ. |
| A06 | Loại thông báo và lịch trực | Ưu tiên đơn mới, trễ, hết hàng, lệch tiền, lỗi; giờ yên lặng; chủ shop duyệt ngoại lệ khẩn. | Không tự bỏ qua giờ yên lặng; bộ nhớ cấu hình mẫu không thành chính sách live. |
| A07 | Theo dõi gửi/mở/nhận việc | Tách accepted_by_provider, failed, unknown, opened_if_observed, acknowledged; không suy diễn giao thành công. | Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả. |
| A08 | Chống trùng và bảo vệ thông báo | Dedupe theo shop/event/recipient/channel, payload tối thiểu, callback token ngắn hạn, rate/budget cap. | Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định. |

### B — AI Admin bán hàng

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| B01 | Kịch bản tư vấn theo ngành hàng | Flow hỏi nhu cầu, thông tin bắt buộc, persona và điều không được nói; bản nháp/live tách biệt. | Thiếu chính sách giao/đổi trả thì bot hỏi hoặc handoff, không bịa. |
| B02 | Giá/tồn từ dữ liệu nghiệp vụ | Tools đọc catalog/quote/available trong scope; RAG chỉ kiến thức mô tả đã duyệt. | Tồn/giá thay sau retrieval được kiểm lại tại confirm; không dùng vector cache làm giá giao dịch. |
| B03 | Thu thập và xác nhận đặt hàng | Customer, địa chỉ, SKU, qty, quoteVersion, phương thức nhận/thanh toán; lưu bằng chứng khách xác nhận bản tóm tắt. | Thiếu số liên hệ/địa chỉ theo policy hoặc quote hết hạn không chốt; sửa hàng/giá cần xác nhận mới. |
| B04 | Tự chốt đơn có điều kiện | Đơn đủ điều kiện sau customer confirmation được policy engine cho phép; ngoại lệ tạo approval. | Prompt nói đã đồng ý không thay bằng chứng xác nhận; không tự tăng hạn mức. |
| B05 | Bán kèm theo chương trình | Chỉ combo và promotion phiên bản đang hiệu lực, tối thiểu lợi nhuận theo rule được duyệt. | Hết hạn, sai SKU, vượt giảm giá hoặc hết tồn không áp dụng ưu đãi. |
| B06 | Chăm sóc sau mua | Tra shipment/order theo khách xác thực; tiếp nhận yêu cầu đổi/trả và tạo case. | Không gửi đơn khách khác; không hứa hoàn tiền hoặc xác nhận hoàn tiền thật. |
| B07 | Bot/người thật tiếp quản | Lease hội thoại + generation fencing; takeover chặn các job AI chưa gửi và hiển thị người xử lý. | Takeover xảy ra khi LLM đang chạy: draft cũ không được send; release bot có audit. |
| B08 | Bình luận/ảnh/tin thoại | Capability-gated, signed media fetch, scan/type/size limit, transcript review; Meta policy server quyết định. | Ảnh chuyển tiền không xác nhận payment; comment không tự cấp phép private message; không hỗ trợ thì UI nêu rõ. |

### C — Chuẩn bị và giao hàng

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| C01 | Bảng chuẩn bị hàng | Task board queued/claimed/picking/packed/handed_over với assignee, dueAt, thời gian trễ. | Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận. |
| C02 | Phiếu lấy hàng theo SKU | Checklist line, phiên bản, quantity; barcode tùy chọn và sửa lượng có reason. | Quét sai SKU/nhập vượt lượng chặn pack; snapshot không dùng ảnh hiện tại sai phiên bản. |
| C03 | Kiểm đóng gói | Thiếu/hỏng/sai biến thể tạo issue; chỉ đóng gói đủ dòng và điều kiện bắt buộc. | Có issue chưa giải quyết thì không ready; ảnh chứng cứ không công khai PII. |
| C04 | Phí và vùng giao hàng | Shipping address, serviceability, quote/actual fee, shipper, package size nếu yêu cầu. | Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao. |
| C05 | Vận đơn và bàn giao | Adapter carrier hoặc nhập mã thủ công; idempotent label; người thật xác nhận bàn giao. | Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai. |
| C06 | Trạng thái giao độc lập | Shipment separate from order/payment; transit/delivered/failed/returning/returned với evidence event. | Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng. |
| C07 | Đổi/trả từng phần | Return line/quantity, kiểm tình trạng, refund obligation, người duyệt, reversal. | Returned item chưa kiểm không available; không hoàn quá paid/qty; partial return không làm hoàn toàn đơn. |
| C08 | Sửa/hủy theo giai đoạn | Draft edit; confirmed release/requote; sau handover là return process; notify task changes. | Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần. |

### D — Kho và mua hàng

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| D01 | Tồn theo trạng thái và SKU | Sellable, reserved, in_transit_to_customer, quarantined, inbound_confirmed; warehouse scoped. | Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger. |
| D02 | Nhà cung cấp hàng hóa | Supplier/SKU price/MOQ/packSize/leadTime/currency/paymentTerms; approved status. | Supplier khác shop hoặc chưa duyệt không auto-purchase; lịch sử đổi giá được giữ. |
| D03 | Quy tắc nhập lại | Reorder point/target/safety stock/rounding/approved suppliers/max commitments; versioned. | Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ. |
| D04 | Nguy cơ hết hàng | Baseline min-max; optional forecast từ lịch sử có coverage/seasonality warnings. | Chưa đủ lịch sử hiển thị static rule; không dự báo confidence giả. |
| D05 | Vòng đời đơn mua | draft/pending_approval/approved/sending/unknown/sent/confirmed/part_received/received/cancelled. | Timeout send giữ unknown; không gửi đơn mới trước reconcile. |
| D06 | Tự gửi đơn mua có giới hạn | Mặc định draft_for_approval; automatic chỉ khi allowlist giá/số lượng/budget + approval authority còn hợp lệ. | Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua. |
| D07 | Ngăn đặt trùng và vượt vốn | Kế hoạch tính confirmed inbound + open proposals separately; reserve budget cùng transaction tạo PO. | Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap. |
| D08 | Nhận và đối chiếu hàng | GoodsReceipt line qty accepted/rejected; over-delivery policy; link PO/invoice; AP. | Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable. |

### E — Kế toán quản trị

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| E01 | Chứng từ và sổ kép | Journal header/lines, debit/credit exact Decimal, source uniqueness, posted immutable. | Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason. |
| E02 | Giá vốn và lợi nhuận | Moving weighted average baseline có policyVersion; cost snapshot tại dispatch; recognize revenue theo approved transfer rule. | Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post. |
| E03 | Chi phí và phân bổ | Quảng cáo/AI/carrier/packaging/fees; actual/estimated separate; không double expense. | Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual. |
| E04 | Đối soát ngân hàng | Import deterministic mapping, dedupe externalTxnId/account; match suggestions need review. | Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post. |
| E05 | Đối soát COD | Delivered COD receivable; carrier collection/fees/remittance; pending mismatch queue. | Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing. |
| E06 | Công nợ | AP/AR, deposits, dueAt, aging buckets, dispute holds; base currency locked per shop. | Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ. |
| E07 | Khóa kỳ và điều chỉnh | Period close prerequisite unresolved count, role + approval, reopen/reversal audit. | Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn. |
| E08 | Báo cáo và hỏi đáp có nguồn | Server read models; drill-down journal ids; explain only from filtered report input. | LLM không được viết ledger; tổng từ pagination UI không làm P&L; missing data shown. |

### F — Trưởng nhóm điều hành

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| F01 | Bốn vai trò AI | Role capabilities, tools, scopes, budget, version, human accountable owner; one orchestration substrate. | Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer. |
| F02 | Bảng công việc chung | One WorkItem per business intent; assignee/dependencies/due/status/evidence. | Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task. |
| F03 | Giám sát ngoại lệ | Rules detect unanswered cases/unclaimed orders/late shipments/low stock/unmatched money. | Rule version, cooldown, dedupe; no endless self-created tasks. |
| F04 | Hàng chờ duyệt | Approval binds shop/action/resourceVersion/policyVersion/intentHash/expiry; reason required reject. | Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons. |
| F05 | Ủy quyền | Versioned rule amounts/actions/scopes; current effective authority checked before execution. | Supervisor không tự nâng scope, không approval của mình thành người thật. |
| F06 | Bản tin chủ shop | Scheduled durable job per shop timezone; summarize pending/blocked/completed with links. | Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng. |
| F07 | Trạng thái hệ thống | Provider/channel/worker heartbeat/lag/budget/failed/unknown; degraded runbook link. | No green healthy when last check too old; unknown distinct down. |
| F08 | Đánh giá chất lượng | Ground-truth eval datasets, failed cases, response time, cost, human corrections. | Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible. |

### G — Dữ liệu và marketing

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| G01 | Onboarding vận hành | Country/currency/timezone/hours/shipping/approvers/provider grants/config readiness. | Không tự suy quốc gia kinh doanh từ location; config missing blocks only dependent live actions. |
| G02 | Nội dung sản phẩm | Features,size,use,warranty,alternatives,forbidden promises,images, source owner. | Publish yêu cầu dữ liệu tối thiểu; price/stock vẫn live tools. |
| G03 | Chính sách phiên bản | Validity, approvals, conflicts, expiry for promotions/FAQ/shipping/returns. | Outdated knowledge excluded from retrieval; new version does not silently rewrite past promises. |
| G04 | Hồ sơ khách liên kết | Page-scoped customer identity, contact verification, case/order/conversation linkage. | Không tự merge cùng tên/số bị che; scope mismatch denied. |
| G05 | Consent và ngừng liên hệ | Service vs marketing permission, opt-out, retention/deletion scope and legal hold review. | Opt-out suppresses marketing jobs queued before change; backups restore reapplies tombstones. |
| G06 | Vòng cải thiện có duyệt | Feedback redaction→revision→evaluation→publish; separate customer memory. | Prompt injection in document not instructions; no all-chat training by default. |
| G07 | Thông tin marketing cho chủ shop | Frequently asked, lost-sale reasons, demand vs stock and content ideas, evidence links. | Report missing attribution separately; no auto publish ads/content. |
| G08 | Hiệu quả chiến dịch | Spend import with source IDs, promo results, known/estimated attribution split. | Không tự tăng ad spend; không ghi estimate thành actual finance expense. |

### H — An toàn vận hành

| ID | Chức năng | Yêu cầu cụ thể | Tiêu chí trọng yếu |
|---|---|---|---|
| H01 | Worker phía máy chủ | Durable outbox + command log + queue consumers; health/progress in UI. | Close browser and restart worker preserves due work; queue loss rebuild from DB. |
| H02 | Kill switch | Shop/role/conversation generations; check immediately before side effect; cancel pending. | Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly. |
| H03 | Chi phí và failover | Token/channel budgets and procurement budgets separate; approved fallback providers only. | No silent PII transfer to unapproved model; exhausted budget moves to safe handoff. |
| H04 | Chống trùng và phục hồi | Command idempotency/body hash, transaction/outbox, retries bounded, unknown reconciliation. | Crash after external accept before local save not blindly retried; poison jobs isolated. |
| H05 | Quyền xuyên mọi entrypoint | API/workers/SSE/export/search/media/callback tenant+object+field checks. | UI-hidden control cannot bypass backend; Telegram id mapping rechecked. |
| H06 | Audit | Actor kind/user/agent, policy/config/knowledge versions, resource snapshot and result; secret redaction. | Changed data must not rewrite audit reason; no secrets in logs/exports/error URLs. |
| H07 | Phòng thử | Mock adapters and staging isolation; fault injection and evaluated prompt changes. | Demo pass not live proof; no real customer/keys/money in synthetic tests. |
| H08 | Khôi phục và readiness | Restore rehearsal, stale check expiry, deploy gates, last verified environment/revision. | Backup exists not restore proof; missing mandatory criterion cannot greenlight launch. |

## Chủ ý chưa mở rộng
Không xây native iOS/Android, payroll, quản lý nhiều pháp nhân/thuế đa quốc gia, agent tranh luận vô hạn, tự chuyển tiền hoặc tự tăng ngân sách quảng cáo. Đa kho có ranh giới dữ liệu ngay từ đầu nhưng demo dùng một kho/shop; lô/hạn dùng/serial chỉ thêm khi ngành hàng yêu cầu và có ADR. Không tự sinh module trống cho các tính năng hoãn.

## Tiêu chí hoàn tất sản phẩm
Một route đẹp không đủ. Luồng đã nối API thật, dữ liệu bền vững, permission/stock/money invariant pass, người dùng hiểu thông báo và có phục hồi ngoài hệ thống mới đủ cho phần đó. Giai đoạn staging/điện thoại/pháp lý/production có gate riêng; không dùng tỷ lệ checklist để vượt gate.

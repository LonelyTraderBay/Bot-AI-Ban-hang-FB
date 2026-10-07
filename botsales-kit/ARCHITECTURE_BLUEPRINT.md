# BotSales AI — Bộ đặc tả tổng hợp 2.1.1



<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->



**Bản đọc tổng hợp được sinh.** Nguồn triển khai là từng file docs/ và contracts/ trong cùng kit. Không sửa bản này thay nguồn.

Kế hoạch 84 task/420 bước nằm ở IMPLEMENTATION_PLAN.md; nguồn màu duy nhất ở design/tokens.json; đọc DOCUMENT_INDEX.md để tìm đúng file.



---

<!-- SOURCE: docs/00_PROVENANCE_AND_DECISIONS.md -->

# 00 — Nguồn, phê duyệt và hiệu lực

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Đầu vào có thật
Bản Kit 1.1, demo HTML 1.1.1 và AI_RULES.md Universal 3.1 được đọc từ file đính kèm. Yêu cầu 09:04:22Z mở rộng từ bot Facebook thành bốn vai trò vận hành và thông báo điện thoại. Yêu cầu 09:24:12Z duyệt nhóm A–H, cho chọn phương án bền vững, cập nhật tài liệu, tạo demo và kế hoạch từng bước có theo dõi tiến độ. Múi giờ giao diện ví dụ Asia/Vientiane; không suy quốc gia hoạt động hay tiền tệ thật của shop từ vị trí người dùng.

## Quyết định 2.0
| ID | Quyết định có hiệu lực | Căn cứ/giới hạn |
|---|---|---|
| ADR2-01 | Dark-only, giữ MUI/React/TS frontend baseline; không light/system/theme switch | Người dùng đã chốt từ v1.1 |
| ADR2-02 | Modular monolith API + worker, PostgreSQL/Prisma, pgvector khi làm RAG, Redis/BullMQ; không microservices/K8s mặc định | Quyền chọn kỹ thuật trong yêu cầu mới; worker cần cho 24/7, retry/nhắc và outbox |
| ADR2-03 | Bốn vai trò AI, chung nền điều phối, tách quyền/công cụ/dữ liệu | Không ép dùng bốn LLM hoặc bốn dịch vụ riêng |
| ADR2-04 | Web Push/PWA chính + Telegram dự phòng; SMS/voice hoãn | Kênh thiết kế được chọn; thiết bị/cấp quyền/secret chưa cung cấp |
| ADR2-05 | Khách xác nhận + policy + kiểm giá/tồn mới tự chốt đơn | LLM không tự tạo bằng chứng đồng ý |
| ADR2-06 | Mua hàng mặc định draft_for_approval; auto_send opt-in giới hạn | Chưa có ngân sách/nhà cung cấp/thẩm quyền thật, nên live auto_send bị chặn |
| ADR2-07 | Ledger kép và kế toán quản trị; sổ pháp định/thuế cần xác định quốc gia/chuyên môn | Không tuyên bố tuân thủ chỉ vì đã có UI |
| ADR2-08 | V2 phân biệt xuất kho/giao thành công/tiền về; trả từng phần | Breaking semantics được đưa vào /api/v2, không diễn giải lại v1 âm thầm |
| ADR2-09 | Tracker 84 task/420 checkpoint, progress bằng evidence còn hiệu lực | Không tính phần tài liệu/demo vào % sản phẩm thực |
| ADR2-10 | Single writer nguồn chung; source JSON → generated files | Không phải distributed lock giữa các bản copy/branch |

## Nguồn chuẩn và ưu tiên
Tuân thứ tự quyền thực của môi trường và người dùng. Trong phạm vi nội dung dự án: decisions đã duyệt → đặc tả nghiệp vụ + contracts hiện hành → code/test hiện trạng (có thể lỗi) → prototype minh họa. Nếu code khác spec, ghi reconciliation tại task; không tự cho prototype quyền thay schema. Plan JSON là nguồn task/dependency/trọng số. Progress JSON là nguồn trạng thái; generated HTML/Markdown không sửa tay. Universal là bất biến, không sửa để chứa stack/dữ liệu shop.

Bản v1.1 chỉ ở reference/BASELINE_v1.1_READ_ONLY.zip. Không giải nén chồng rồi cho AI đọc cả hai kế hoạch như cùng hiệu lực. Không có bằng chứng đã kiểm repo ứng dụng hay live Meta/AI/Vercel/điện thoại trong bản kế hoạch mới. Kiểm tài liệu/demo được lưu riêng ở evidence/.

## Phạm vi quyền
Hiện tại được làm tài liệu, demo, công cụ theo dõi. Prompt đi kèm cho phép AI trong repo thực hiện code/test local đúng kế hoạch khi chủ repo giao nhiệm vụ implement. Không tự cấp credentials, tạo tài nguyên tính phí, gửi đơn mua/tin khách thật, chuyển tiền hoặc deploy production. Những gate đó phải có grant/approval cụ thể. Không hỏi lại 64 tính năng đã được duyệt; chỉ xử lý input thật còn thiếu ở execution/owner-inputs.json khi tới bước phụ thuộc.

## Lịch sử 2.1 — yêu cầu thay đổi thị giác

Yêu cầu trực tiếp 2026-09-29T14:59:51Z: phối lại màu tinh tế, sáng rõ, tham khảo Binance/Bybit và các nền tảng tài chính. Release này thực hiện Graphite Gold trên demo, token và tài liệu thiết kế; giữ API/nghiệp vụ/Universal và kế hoạch tiến độ 2.0. Không triển khai hosting, không thay quyền tự động hóa hoặc trạng thái task.

ADR-VIS-021: một palette dark-only Graphite Gold. Tham khảo nguồn công khai chính thức (docs/16); các mã HEX cụ thể do BotSales chọn, không chứng thực đây là palette chính thức của sàn. Tại lần giao 2.1, đây là bản xem lại. Trạng thái hiện hành sau yêu cầu 15:30:32Z nằm trong quyết định tiếp nhận bên dưới; không dùng trạng thái lịch sử để mở lại việc chọn màu.

## Quyết định màu hiện hành — đã duyệt trong gói 2.1.1

Ngày 29/09/2026 lúc 15:30:32Z, Jokertrader yêu cầu cập nhật bộ tài liệu chuẩn theo quyết định màu mới và đồng bộ toàn bộ. Tiếp nhận **ADR-VIS-021 — APPROVED**, Graphite Gold dark-only trong `design/decision.json`. Giữ nguyên toàn bộ token của gói 2.1, không thiết kế thêm palette.

Nguồn HEX duy nhất là `design/tokens.json`; trạng thái và phạm vi duyệt là `design/decision.json`; phiên bản đóng gói tại `release.json`. Phiên bản gói 2.1.1 không làm đổi API 2.0.0, phạm vi A–H, 84 task/420 bước, điểm/phụ thuộc hoặc Universal 3.1. Hướng dẫn task được cập nhật để bắt buộc dùng quyết định màu đã duyệt. Đây không phải phê duyệt UAT cuối hoặc quyền đưa sản phẩm live.

Bản này sửa đoạn tóm tắt T008–T011 bị lệch tên việc so với `execution/plan.json`: T008 là cổng chuẩn code; T009 là hợp đồng; T010 là theme/component; T011 là shell/routing. Không đổi task gốc để chạy theo mô tả sai.

Khi áp dụng vào repo đã chạy, giữ tracker/evidence/nguồn code riêng của repo đó; xem `UPGRADE.md`. Gói phát hành không chứng minh mọi bản copy hoặc phiên AI bên ngoài đã được đồng bộ.


---

<!-- SOURCE: docs/01_PRODUCT_SCOPE.md -->

# 01 — Phạm vi sản phẩm và 64 chức năng

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
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


---

<!-- SOURCE: docs/02_ARCHITECTURE.md -->

# 02 — Kiến trúc được chọn và cấu trúc code

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## 1. Một lựa chọn nền tảng để AI không tự phân nhánh
| Phần | Lựa chọn greenfield | Quy tắc |
|---|---|---|
| Runtime | Node.js 24 LTS line; exact supported patch at T003 | Trang Node hiện liệt kê 24 LTS; kiểm lại khi cài, không coi phiên bản đang có trong máy là đã phù hợp [N03] |
| Frontend | React + TypeScript strict + Vite + React Router | Một app quản trị, không yêu cầu SEO; không Next.js chỉ để được gọi enterprise |
| UI | MUI Core, design token dark-only | Không Tailwind/AntD/shadcn song song; touch/focus/contrast trong common components |
| State/forms | TanStack Query + React local + React Hook Form/Zod | Server state không sao chép sang Redux; query scope user/shop/permissionVersion |
| Backend | NestJS modular monolith, default HTTP adapter theo lock | Controller mỏng, domain/use-case tách IO; module export public interface [N01] |
| Database | PostgreSQL + Prisma; SQL migration/repository đặc thù có kiểm soát | Transaction-aware context; không dùng ORM để giả định không cần concurrency tests [N04,N05] |
| Worker | BullMQ/Redis + DB transactional outbox/command ledger | At-least-once delivery, idempotency và reconcile; Redis không là nguồn ledger tiền [N06,N07] |
| RAG | pgvector trong PostgreSQL ở T039 | Không thêm vector cloud DB thứ hai khi chưa có bottleneck; embedding/provider capability kiểm thực |
| File | S3-compatible object storage port | Cụ thể tài khoản/region do deployment gate chọn; signed URLs, scan, no public PII |
| Auth | OIDC adapter bằng thư viện bảo trì + backend session | Test IdP fake only; production chọn tài khoản IdP thực ở T068, không tự viết hệ mật khẩu |
| Contracts | OpenAPI 3.1 JSON canonical, generated YAML/DTO | /api/v2; single-writer contract changes |
| Quality | ESLint/boundaries, Vitest/Testing Library/MSW/Playwright/axe, local+DB integration | Chốt exact versions cùng lockfile, không thêm framework test cạnh tranh |
| Reports | Recharts khi tới báo cáo, kèm data table | Không tự thêm chart engine thứ hai |
| Notifications | Web Push standards/VAPID server + Telegram adapter | Không FCM bắt buộc; kênh có identity mapping và policy [N08,N09] |

Repo cũ: giữ framework/data/infra hiện có cho tới khi migration được duyệt. T003 lưu mapping tương đương và impacts; không dùng quyết định greenfield để phá brownfield. Không chuyển sang MySQL/Kafka hoặc stack dự án trading từ trí nhớ.

## 2. Cấu trúc triển khai
```text
apps/web/src/
  app/                 # router, providers, cross-module UI compositions
  modules/             # workspace,dashboard,inbox,customers,catalog,inventory,
                       # orders,finance,knowledge,bot,integrations,reports,
                       # operations,notifications,fulfillment,procurement
  shared/              # domain-free UI, http, formatting, scopes, telemetry
  mocks/               # DEV/TEST-only HTTP fixtures
apps/api/src/
  main.ts              # HTTP bootstrap only
  application.ts       # exported server application context factory, no auto listen
  modules/             # domain-owned ports/use cases/repositories
  use-cases/           # cross-domain composition with same transaction context
  platform/            # DB unit-of-work, command,outbox,auth,audit,files,telemetry
  public/              # explicit exports for worker app, never deep imports
apps/api/prisma/        # schema + ordered migrations
apps/worker/src/        # bootstrap, handlers, scheduler; use @botsales/backend/application
packages/contracts/    # copied/adopted canonical contract + generated DTO only
packages/design-tokens/# JSON + CSS/MUI generator
infra/                 # local/staging/prod config; never credentials
```

API package may export a documented `@botsales/backend/application` entry for worker reuse. Worker must NOT import `../../api/src/internal/...`, start the HTTP listener as side effect or duplicate business logic. HTTP and worker are two entry points into one domain implementation, not two owners of inventory/finance. T007 verifies package exports/project references actually resolve. No extra package per entity.

## 3. Dependency rules — frontend
app → public module entries + shared; module X → only X/shared/contracts/tokens; shared → no modules/app/business IO; contracts → no runtime SDK. Cross-feature screen composition at app layer. Domain decisions authoritative in backend. Boundary checker resolves alias + relative imports and cycles; regex naming alone is not enough.

## 4. Dependency rules — backend
Controllers → local application use cases → local domain/repository ports. Cross-domain use cases in `use-cases/` coordinate public ports and pass the SAME database transaction handle through inventory/order/finance as needed. Module must not update another module's table directly. No module can auto-create independent transaction inside a composing transaction and silently partially commit. Repositories accept tenant-aware context; no global unscoped Prisma client escape hatch exposed to features.

Queue handlers call application use cases; do not recalculate prices/totals. External adapters call provider outside DB locks and return observed result. The persistent command state coordinates crash/unknown transitions. Reports build read models; only source-owning domain changes ledger/state. Supervisor dispatches typed intent, not free-form SQL or arbitrary tools.

## 5. Transaction boundaries
Order confirm: read evidence/policy+lock positions → validate → reserve + order state + audit + outbox in one transaction. Claim: check workItem version and unassigned + membership → assign once. Dispatch: validated packed prep → consume reservation, stock transfer, shipment state and outbox. Receive purchase: validate remaining quantities → stock/GRNI-or-AP/journal + receipt+outbox. Financial posting: source uniqueness, period check/lock and balanced lines in transaction. External send: commit intent, execute outside transaction, save observed result; unknown reconciled, never falsely rolled back as unsent.

## 6. Mở rộng sau này
Horizontal scale API/worker and partition/index measured tables before sharding. Separate service only after measured independent load/team/release/isolation requirements and ADR with cost/rollback. Do not add Kubernetes, event sourcing toàn hệ thống, generic rule-language framework, distributed lock service or four LLM engines by default. Dynamic rules restricted typed data, no user-supplied executable code.

## 7. Development/build policy
`.env.example` only names/placeholder references, never production values. `STACK_LOCK.md` records version, rationale, source, install/test commands and date. Development mock mode must be explicit and fail startup if accidentally configured in production. Local seed synthetic; real launch starts with validated onboarding, not demonstration financial balances.


---

<!-- SOURCE: docs/03_DESIGN_SYSTEM.md -->

# 03 — Design system dark-only và tiêu chuẩn trải nghiệm

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## 1. Hướng thị giác

Ứng dụng vận hành hằng ngày, không landing page. Ưu tiên nội dung, trạng thái và thao tác rõ ràng. Graphite Gold: nền than trung tính, card sáng hơn nền, chữ trắng ngà và điểm nhấn vàng champagne. Không nhuộm xanh toàn trang, không neon hoặc kính mờ. Gradient trung tính chỉ dùng ở khối giới thiệu, không phủ trang hay chứa số liệu quan trọng trên ảnh. Dark-only là yêu cầu; không thêm switch light/dark. Logo/tên thương hiệu tạm phải thay được qua cấu hình, không đẩy vào logic.

`design/tokens.json` là nguồn chuẩn. Màu dùng semantic role, không trỏ hex trong module. `tokens.css` là bản sinh; theme MUI phải map từ token, không tạo palette riêng. Bản PDF tài liệu có nền sáng để đọc/in, không thay đổi yêu cầu dark của sản phẩm.

## 2. Tokens cơ sở

<!-- BEGIN GENERATED CORE PALETTE -->
| Token nguồn | HEX đã duyệt | Cách dùng |
|---|---|---|
| `colors.canvas` | `#111318` | Nền ứng dụng |
| `colors.surface` | `#1C2028` | Card, bảng và dialog |
| `colors.raised` | `#282F3A` | Bề mặt nổi |
| `colors.textPrimary` | `#F5F7FA` | Chữ chính |
| `colors.textSecondary` | `#B9C2D0` | Chữ phụ |
| `colors.onAccent` | `#15181E` | Chữ tối trên CTA vàng |
| `colors.accent` | `#F6C85F` | CTA, mục chọn, liên kết |
| `colors.accentHover` | `#FFDB8C` | CTA khi rê chuột |
| `colors.accentPressed` | `#DFAE4F` | CTA khi nhấn |
| `colors.borderDecorative` | `#343D4B` | Viền trang trí |
| `colors.borderControl` | `#7B879A` | Biên input có ý nghĩa |
| `colors.success` | `#4DD7A3` | Thành công, có nhãn |
| `colors.warning` | `#FFB078` | Cảnh báo, có nhãn |
| `colors.danger` | `#FF8596` | Lỗi, có nhãn |
| `colors.info` | `#8ABCFB` | Thông tin, không là CTA |
<!-- END GENERATED CORE PALETTE -->

Các cặp màu cụ thể được tính tương phản trong evidence. Token đạt contrast không có nghĩa màn hình đạt WCAG; opacity, hover, disabled và ảnh nền cần kiểm thử riêng. Đường phân chia trang trí không bị lẫn với viền input bắt buộc tương phản.

Typography dùng system sans-serif hỗ trợ tiếng Việt; không đưa file font vào gói. Body 14–16 px, page title 28 px, section title 18 px, meta tối thiểu 12 px với độ tương phản hợp lệ. Số tiền dùng tabular numerals, canh phải, hiển thị mã tiền tệ rõ. Line-height body 1.5. Spacing theo thang 4, 8, 12, 16, 24, 32, 48 px. Radius control 8, card 12, dialog 16 px.

## 3. Layout và responsive

Desktop ≥1280: sidebar 240 px, topbar 64 px, content padding 24 px. Tablet 768–1279: sidebar compact 72 px hoặc drawer; không ép inbox ba cột nhỏ. Mobile <768: menu drawer, topbar 56 px, padding 16 px, một pane chính. Đây là breakpoint thiết kế; kiểm cả 320 CSS px ở reflow/zoom ngoài viewport test 390/768/1440.

Inbox desktop có list 300 px, conversation linh hoạt ≥400 px, customer/context panel 320 px. Khi không đủ chiều ngang, context chuyển drawer, sau đó conversation thành route chi tiết một pane. Nút Back quay về cùng filters/scroll. Composer không bị bàn phím mobile che; không dùng fixed height phá zoom.

Table: pagination server, sticky header nếu container phù hợp; mobile ưu tiên cột chính + row details drawer. Bảng thật cần hai chiều có vùng scroll nhãn rõ; không làm cả trang cuộn ngang. Dashboard không hiển thị 20 KPI ngang; mỗi card có label, kỳ và asOf. Không chỉ dùng màu xanh/đỏ để thể hiện biến động.

## 4. Component contracts

| Component/pattern | Props/behavior bắt buộc | State phải chứng minh |
|---|---|---|
| PageHeader | title, description?, actions, breadcrumb | action hidden/disabled, long title |
| AsyncBoundary | loading, empty, error, forbidden, stale | không lộ dữ liệu cũ sau 403 |
| DataTable | rows, columns, pagination, sorting, row actions | 0/1/25 rows, long values, error |
| MoneyText | decimal amount, currency, redacted/null | null là “Chưa có”, không là 0 |
| StatusBadge | status semantic + text | icon/text không phụ thuộc màu |
| ConfirmActionDialog | effect summary, permission, pending | double submit, error, keyboard |
| FormField | visible label, hint, error linkage | required, invalid, read-only |
| JobProgress | jobId, progress, partial failures | queued/running/partial/failed |
| SecretInput | local transient value, one-time submit | no echo/log, clear after completion |
| SourceEvidence | title, revision, asOf, availability | retired/missing/outdated source |

Không bọc mọi MUI primitive chỉ để đổi tên. Tạo wrapper khi có policy/design/accessibility dùng chung thật. Storybook/component gallery nội bộ phải thể hiện state của các pattern nền tảng; gallery không được bật ở production công khai.

## 5. Form và feedback

Nhãn luôn hiển thị, placeholder không thay label. Validate client để hỗ trợ người dùng, validate server để quyết định. Backend `errors` map vào field path; lỗi chung lên summary focus được. Không reset form sau thất bại. Unsaved changes guard trước đổi route/shop; có lựa chọn hủy điều hướng hoặc bỏ bản nháp. Không persist secret.

Nút submit pending giữ chiều rộng, chặn submit lặp; Enter có hành vi phù hợp loại form. Toast chỉ thông báo phụ, trạng thái nghiệp vụ phải nằm trên màn hình. Thao tác mất mạng hiển thị trạng thái chưa xác nhận, không nói “đã lưu” hoặc tự retry side-effect. Delete product đã có lịch sử chuyển thành archive với xác nhận; không xóa sổ đơn/tiền.

## 6. Accessibility gates

Mục tiêu WCAG 2.2 AA [S06]. Text bình thường contrast ≥4.5:1; text lớn ≥3:1; dấu hiệu control/focus cần kiểm non-text contrast. Vùng chạm sản phẩm chọn tối thiểu 44×44 px cho thao tác chính; đây là mục tiêu thiết kế cao hơn mức tối thiểu 24×24 có ngoại lệ của SC 2.5.8. Không gọi 44×44 là yêu cầu AA bắt buộc cho mọi phần tử.

Có skip link, landmark, heading thứ bậc, icon button có accessible name, keyboard menu/table/form, focus trap/return cho dialog, Escape phù hợp, reduced motion, text resize 200%, reflow 400% theo trường hợp. Không dùng focus ring bị sticky header che. Chart có bảng/tóm tắt thay thế. Stream messages announce vừa phải; không đọc lại toàn cuộc hội thoại mỗi event. Không tự scroll người dùng khỏi đoạn đang đọc; nút “Có tin mới” thay auto-jump khi không ở cuối.

Axe là kiểm tự động một phần; vẫn cần keyboard thủ công và screen reader cho đăng nhập, tạo đơn, inbox, popup xác nhận và form lỗi. Gói này có prototype review; kiểm browser cục bộ không phải bằng chứng accessibility toàn ứng dụng sản phẩm.

## 7. Ngôn ngữ giao diện

Dùng thuật ngữ nhất quán: “Hộp thư”, “Sản phẩm”, “Biến thể”, “Tồn khả dụng”, “Đơn nháp”, “Đã xác nhận”, “Thu/chi”, “Lợi nhuận tạm tính”, “Nguồn kiến thức”, “Bản đang dùng”. Không gọi nhập tài liệu là “AI đã học xong”; dùng “Đã lập chỉ mục” rồi “Đã duyệt sử dụng”.

Ví dụ lỗi: “Sản phẩm đã được người khác cập nhật. Hãy tải bản mới trước khi lưu lại.”; “Chưa xác định tin nhắn đã gửi hay chưa. Đang kiểm tra trạng thái, vui lòng không tạo lần gửi mới.”; “Không thể gửi vì trạng thái quyền của kênh chưa được xác minh.”

## 8. Quyết định dark-only đã chốt, không chỉ mặc định

ADR-011 và DARK-001..012 ở docs/19 là nguồn phạm vi chi tiết: không light/system,
không theme selector, không persisted preference; CSS bootstrap dark trước JS,
portal/error/login cùng root theme. Không dùng nhu cầu bản in để thêm palette
light cho app. Forced-colors/reduced-motion/zoom vẫn được tôn trọng. Cơ chế token và nền bootstrap được giữ từ baseline; bảng màu hiện hành là
Graphite Gold 2.1 trong design/tokens.json, thay bảng màu xanh 1.1/2.0.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.

## 9. Graphite Gold — màu chính thức đã duyệt

Nguồn yêu cầu: Jokertrader, 29/09/2026 14:59:51Z, phối màu lại lấy cảm hứng từ Binance, Bybit và nền tảng tài chính. Đây là quyền thay đổi thị giác; không tự cấp quyền đổi nghiệp vụ, API, task hay điểm tiến độ. Màu cụ thể là thiết kế BotSales đã được tiếp nhận theo yêu cầu 15:30:32Z, không sao chép logo, font độc quyền hoặc toàn bộ layout của các sàn.

Nguồn duy nhất: `design/tokens.json`. Chạy `python scripts/generate-theme.py`; kiểm drift bằng `python scripts/generate-theme.py --check`. CSS, bản token trong prototype và `design/PALETTE.md` là output. `prototype/build.py` tự sinh theme trước khi đóng gói. `scripts/progress.mjs report` lấy cùng CSS. Quyết định duyệt là `design/decision.json`; không hỏi chọn màu lại. T001–T084 và trọng số kế hoạch 2.0 được giữ nguyên; trước T010 (Theme tối và component nền), đọc bổ sung docs/03, docs/19 và design/IMPLEMENTATION_NOTES.md. Các task giao diện dùng cùng nguồn này; không đổi dependency/trọng số trong plan.json.

Màu vàng dùng cho CTA, điều hướng đang chọn, liên kết và đường dữ liệu chính; không tô cả bảng hoặc mọi KPI. Màu xanh mint/cam/đỏ là trạng thái có nhãn; xanh lam là thông tin, tím là biểu tượng vai trò trưởng nhóm. Phân vai chỉ bằng icon, không biến bốn vai trò thành bốn theme. `badge.blue` trong prototype ánh xạ `info`, không ánh xạ accent vàng.

Card: surface; input: input; hàng hover: hover; điều hướng/chat đang chọn: selected. Không dùng border trang trí làm bằng chứng đạt tương phản input. CTA vàng luôn dùng onAccent màu mực, không chữ trắng. Nội dung nhỏ thiết yếu tối thiểu 12px trong prototype; nhãn nhóm trang trí 11px; các nút mobile chính tối thiểu 44px. Giữ overflow vùng bảng, không ép toàn trang cuộn ngang.

Bắt buộc kiểm login, lỗi/loading, menu, modal, inbox, tài chính, điện thoại, đơn mua, report; kiểm OS light vẫn dark, JavaScript bị chặn, focus, disabled, hover, reduced-motion và forced-colors. Tỷ lệ màu không thay thế kiểm tra toàn bộ WCAG. Kết quả mới ở `evidence/visual-validation.json` và `prototype/evidence/visual-browser-tests.json`.


---

<!-- SOURCE: docs/04_SCREENS_AND_FLOWS.md -->

# 04 — Màn hình và luồng hiện hành

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Nguồn chuẩn: contracts/route-manifest.json. File này sinh bởi scripts/generate-reference.py. 54 route là hợp đồng màn hình sản phẩm; prototype có phạm vi riêng tại prototype/PROTOTYPE_SCOPE.json.

Mọi màn hình kế thừa Graphite Gold theo design/decision.json đã duyệt và design/tokens.json, dark-only, session/tenant/permission, lỗi/empty/stale/unknown và navigation keyboard ở docs/03,08,09. Actions phải có backend allowedActions, không chỉ đủ permission string.

## R01 — Đăng nhập

**Route:** `/login` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Xác thực vào ứng dụng quản trị; không nhầm với đăng nhập Facebook Page.

**Nội dung:** OIDC login redirect, session error và returnTo đã allowlist; không tự giữ password/token.

**Hành vi:** Dùng beginLogin / completeLogin; nonce/state/PKCE/session rotation ở backend. Local IdP fake chỉ test.

**Trường hợp cần xử lý:** Sai thông tin; rate limit; expired pre-session CSRF; network error; không tiết lộ email tồn tại.

**API đọc:** getCsrfToken

| Hành động | operationId | Quyền |
|---|---|---|
| Đăng nhập qua hệ thống nhận dạng | `beginLogin` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R02 — Chọn cửa hàng

**Route:** `/workspaces` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Chọn shop người dùng có membership hợp lệ.

**Nội dung:** Shop name, role summary, trạng thái; không hiện dữ liệu doanh thu của shop khác.

**Hành vi:** Đổi shop mount scope mới; có guard bản nháp chưa lưu; cache và stream cũ bị dọn.

**Trường hợp cần xử lý:** Không shop; membership revoked; late response của shop trước; không tự fallback sang shop không có quyền.

**API đọc:** listShops, getSession

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R03 — Thiết lập cửa hàng

**Route:** `/onboarding` · **Module:** `workspace` · **Đọc:** `session/bootstrap`

**Mục đích:** Tạo thông tin shop ban đầu trong môi trường được cấp quyền.

**Nội dung:** Tên, currency, timezone, locale; xác nhận base currency trước tạo.

**Hành vi:** Wizard có thể quay lại giữ input memory; chỉ complete sau backend tạo default warehouse/membership.

**Trường hợp cần xử lý:** Tên trống, mã currency sai, timezone không hợp lệ, submit lặp; create permission/policy server mới quyết định.

**API đọc:** getSession

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo cửa hàng | `createShop` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R04 — Tổng quan

**Route:** `/s/:shopId/overview` · **Module:** `dashboard` · **Đọc:** `dashboard.read`

**Mục đích:** Thấy ngay việc cần xử lý và dữ liệu nào đang chưa đầy đủ.

**Nội dung:** Hội thoại chờ, đơn chờ, hàng sắp hết, bot health; revenue/cash chỉ theo finance permission; asOf.

**Hành vi:** KPI mở trang tương ứng với bộ lọc; pause có xác nhận/reason và command status.

**Trường hợp cần xử lý:** Null tiền hiển thị bị hạn chế/chưa có, không 0; partial dashboard và stale; widget lỗi không làm trắng toàn trang.

**API đọc:** getDashboard, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Tạm dừng bot | `pauseBot` | `bot.publish` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-053. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R05 — Hộp thư

**Route:** `/s/:shopId/inbox` · **Module:** `inbox` · **Đọc:** `conversations.read`

**Mục đích:** Tìm hội thoại cần phản hồi hoặc được phân công.

**Nội dung:** Search, status, mode bot/human, channel/assignee filter được backend hỗ trợ; preview và unread.

**Hành vi:** Chọn row tới R06; URL giữ filter/cursor; bàn phím tới từng hội thoại, không đọc raw PII qua toast.

**Trường hợp cần xử lý:** Không kết quả khác inbox trống; event mới không giật vị trí; slow response không đổi shop đang xem.

**API đọc:** listConversations, getInboxMetadata

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-033, SC-034, SC-035, SC-036, SC-037. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R06 — Chi tiết hội thoại

**Route:** `/s/:shopId/inbox/:conversationId` · **Module:** `inbox` · **Đọc:** `conversations.read`

**Mục đích:** Hỗ trợ khách và kiểm soát bot/human rõ ràng.

**Nội dung:** Message timeline, delivery status, composer, sendEligibility, mode/assignee, source evidence, customer/order panel theo quyền.

**Hành vi:** Lịch sử phân trang giữ scroll; draft reply không persist; Enter gửi chỉ theo setting, Shift+Enter xuống dòng; internal note có nhãn nổi bật.

**Trường hợp cần xử lý:** Policy unknown/blocked disable gửi; takeover race; send timeout unknown; duplicate/out-of-order event; 403 gỡ messages; không tự gửi lại.

**API đọc:** getConversation, listMessages, getCommand, getInboxMetadata

| Hành động | operationId | Quyền |
|---|---|---|
| Gửi tin | `sendMessage` | `conversations.reply` |
| Ghi chú nội bộ | `addInternalNote` | `conversations.reply` |
| Tiếp quản | `takeoverConversation` | `conversations.assign` |
| Trả lại bot | `releaseConversation` | `conversations.assign` |
| Phân công | `assignConversation` | `conversations.assign` |
| Đánh dấu xong | `resolveConversation` | `conversations.assign` |
| Đánh giá câu trả lời | `createFeedback` | `conversations.read` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-033, SC-034, SC-035, SC-036, SC-037. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R07 — Khách hàng

**Route:** `/s/:shopId/customers` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Danh sách khách theo shop, không phải tài khoản nhân viên.

**Nội dung:** Tên, thông tin liên hệ masked, external identity khi được phép; search/cursor.

**Hành vi:** Tạo khách qua form validate; chọn vào R08; không gộp khách tự động theo tên.

**Trường hợp cần xử lý:** Khách trùng số điện thoại chỉ cảnh báo/policy server; masked contact; special characters không XSS.

**API đọc:** listCustomers

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm khách | `createCustomer` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-038. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R08 — Hồ sơ khách

**Route:** `/s/:shopId/customers/:customerId` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Xem và sửa dữ liệu chăm sóc khách được cấp quyền.

**Nội dung:** Tên, phone/email, notes, trường bị che; links tới orders/inbox scoped filter thay vì tải chéo tự do.

**Hành vi:** Edit chờ server + ETag; notes plain/sanitized text; đổi customer reset form.

**Trường hợp cần xử lý:** 412 giữ draft và cho tải phiên bản mới; contact null không bị ghi đè thành chuỗi rỗng; permission change.

**API đọc:** getCustomer

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu hồ sơ | `updateCustomer` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-038. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R09 — Sản phẩm

**Route:** `/s/:shopId/products` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Quản lý danh mục sản phẩm với search/filter thật toàn dataset.

**Nội dung:** Tên, SKU/biến thể summary, category, status, price range theo quyền; search/category/status/sort.

**Hành vi:** Nút thêm điều hướng R10; row tới R11; mọi phân trang ở server; không tính tổng tồn từ product DTO.

**Trường hợp cần xử lý:** 0/1/100k records; long Vietnamese names; product archived; invalid cursor/filter; không fetch tất cả rồi lọc browser.

**API đọc:** listProducts, listCategories

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R10 — Thêm sản phẩm

**Route:** `/s/:shopId/products/new` · **Module:** `catalog` · **Đọc:** `catalog.write`

**Mục đích:** Tạo Product và tối thiểu một Variant.

**Nội dung:** Tên 1–160 ký tự, mô tả, category, status draft/active; mỗi variant có SKU, options, name, currency/price, active; ảnh.

**Hành vi:** Client validation và server errors theo field; submit idempotent; thành công tới detail. Giá decimal string, không nhập stock ở form này.

**Trường hợp cần xử lý:** SKU trùng scoped; variant options trùng; upload quarantined; currency khác shop; mạng đứt không reset form.

**API đọc:** listCategories

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo sản phẩm | `createProduct` | `catalog.write` |
| Tải ảnh | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R11 — Chi tiết sản phẩm

**Route:** `/s/:shopId/products/:productId` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Sửa danh mục mà không phá lịch sử đơn/kho.

**Nội dung:** Overview, variants/prices/images, version và updatedAt; links kho theo variant chỉ khi có quyền.

**Hành vi:** Edit dùng ETag; archive confirm nêu tác động; variants đã có order không xóa lịch sử; image chỉ dùng ready file.

**Trường hợp cần xử lý:** 412; SKU conflict; product archived; unauthorized field; thay giá không đổi giá snapshot order cũ.

**API đọc:** getProduct, listCategories, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu sản phẩm | `updateProduct` | `catalog.write` |
| Lưu trữ sản phẩm | `archiveProduct` | `catalog.write` |
| Tải ảnh | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R12 — Danh mục hàng

**Route:** `/s/:shopId/categories` · **Module:** `catalog` · **Đọc:** `catalog.read`

**Mục đích:** Sắp xếp sản phẩm theo nhóm mà không tạo cây vô hạn.

**Nội dung:** Tên, parent, active, phiên bản; table hoặc tree bounded.

**Hành vi:** Create/edit parent selection chống cycle server; archive hiển thị tác động với sản phẩm đang tham chiếu.

**Trường hợp cần xử lý:** Parent khác shop; cycle; danh mục đang dùng; 412; không xóa hàng hóa theo cascade ở UI.

**API đọc:** listCategories, getCategory

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm danh mục | `createCategory` | `catalog.write` |
| Sửa danh mục | `updateCategory` | `catalog.write` |
| Lưu trữ danh mục | `archiveCategory` | `catalog.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R13 — Nhập dữ liệu

**Route:** `/s/:shopId/imports` · **Module:** `catalog` · **Đọc:** `catalog.import`

**Mục đích:** Import catalog có kiểm tra trước khi ghi, không import âm thầm vào kho.

**Nội dung:** File CSV/XLSX không macro, purpose, mapping sku/name/description/category/price/currency/variantName, duplicate strategy.

**Hành vi:** Upload→validate→preview; nút commit ở R14. File quá hạn/quarantine không được parse. Giới hạn do backend trả và tối đa baseline.

**Trường hợp cần xử lý:** Sai encoding/cột/currency; formula/external link; file size/rows over-limit; không đẩy toàn file parsed vào DOM.

**API đọc:** listJobs, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Tải file | `uploadFile` | `authenticated/context` |
| Kiểm tra file | `createProductImport` | `catalog.import` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R14 — Kết quả nhập dữ liệu

**Route:** `/s/:shopId/imports/:jobId` · **Module:** `catalog` · **Đọc:** `catalog.import`

**Mục đích:** Cho người dùng quyết định rõ trước commit kết quả dry-run.

**Nội dung:** Số dòng hợp lệ/lỗi, paginated errors/export lỗi, validationToken, strategy, progress và thành công một phần.

**Hành vi:** Confirm đúng validation snapshot; key cùng payload; job chạy backend, đóng tab không hủy lệnh đã tiếp nhận.

**Trường hợp cần xử lý:** File/dữ liệu đổi sau preview; partial commit; retry chỉ failed rows với intent mới có preview; không ghi lại dòng đã thành công.

**API đọc:** getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Ghi các dòng hợp lệ | `commitProductImport` | `catalog.import` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-012, SC-013, SC-014, SC-015, SC-016, SC-017, SC-018. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R15 — Tồn kho

**Route:** `/s/:shopId/inventory` · **Module:** `inventory` · **Đọc:** `inventory.read`

**Mục đích:** Thấy onHand, reserved và available theo SKU/warehouse.

**Nội dung:** SKU, warehouse, onHand, reserved, available, low-stock, asOf; unitCost chỉ khi server cho phép.

**Hành vi:** Điều chỉnh drawer delta + reason + expectedVersion + cost cần thiết; chờ command rồi refetch; v1 default warehouse.

**Trường hợp cần xử lý:** Oversell/negative available, version conflict, thiếu cost, unknown command; không optimistic và không PUT absolute stock.

**API đọc:** listStockSnapshots, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Điều chỉnh tồn | `createInventoryAdjustment` | `inventory.adjust` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-019, SC-020, SC-021. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R16 — Lịch sử kho

**Route:** `/s/:shopId/inventory/movements` · **Module:** `inventory` · **Đọc:** `inventory.read`

**Mục đích:** Truy nguyên mỗi thay đổi kho đến nguồn nghiệp vụ.

**Nội dung:** Thời gian, SKU, warehouse, onHand delta, reserved delta, kind, actor, reason, source link.

**Hành vi:** Read-only, cursor/search/filter; links order chỉ mở khi có quyền; chỉnh sai bằng adjustment bù, không edit movement.

**Trường hợp cần xử lý:** Event lặp không tạo row lặp; source archived vẫn có history; timezone và sort stable.

**API đọc:** listStockMovements

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-019, SC-020, SC-021. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R17 — Đơn hàng

**Route:** `/s/:shopId/orders` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Theo dõi đơn mà không trộn trạng thái giao hàng/thanh toán.

**Nội dung:** Order/customer refs, createdAt, order/fulfillment/payment states riêng, tổng tiền nếu được phép.

**Hành vi:** Filter qua URL, tạo đơn tới R18, row tới R19; bulk mutation chưa hỗ trợ phải ẩn. V2: tách claim/pick/pack/handover/shipment/delivery/payment. Không dùng v1 fulfill tổng hợp; C07 returns theo từng dòng.

**Trường hợp cần xử lý:** Enum mới fallback read-only; stale paid badge; redacted total; phân trang không tự cộng thành doanh thu shop.

**API đọc:** listOrders

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R18 — Tạo đơn nháp

**Route:** `/s/:shopId/orders/new` · **Module:** `orders` · **Đọc:** `orders.write`

**Mục đích:** Tạo draft theo nhu cầu khách, chưa giữ hàng/chưa ghi nhận doanh thu.

**Nội dung:** Customer, optional conversation ref, variant selection, quantities integer, warehouse mặc định, notes.

**Hành vi:** Product picker remote search; preview giá có nhãn chưa chốt; request gửi IDs/qty, server trả authoritative snapshots. V2: tách claim/pick/pack/handover/shipment/delivery/payment. Không dùng v1 fulfill tổng hợp; C07 returns theo từng dòng.

**Trường hợp cần xử lý:** Variant archived/out of stock; customer/variant khác shop; trùng submit; thiếu quyền xem khách; intent seeded từ inbox vẫn revalidate.

**API đọc:** listCustomers, listProducts, getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Tạo đơn nháp | `createOrder` | `orders.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R19 — Chi tiết đơn hàng

**Route:** `/s/:shopId/orders/:orderId` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Vận hành workflow dựa trên allowedActions và quyền, không sửa status tùy ý.

**Nội dung:** Snapshot dòng hàng, totals, ba state, source customer/conversation, version, các action server cho phép.

**Hành vi:** Quote/consent → reserve → preparation → handover → delivery/control-transfer → payment reconciliation. Return request/inspection is separate from recording an observed refund. No direct v1 fulfill/return bypass.

**Trường hợp cần xử lý:** Double submit, last SKU race, expired quote, unknown delivery outcome, partial returns, COD outstanding and closed period. No real money movement initiated by this UI.

**API đọc:** getOrder, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu đơn nháp | `updateOrderDraft` | `orders.write` |
| Lấy báo giá | `quoteOrder` | `orders.write` |
| Xác nhận giữ hàng | `confirmOrder` | `orders.confirm` |
| Bàn giao shipment sau đóng gói | `handoverShipment` | `fulfillment.handover` |
| Hủy đơn | `cancelOrder` | `orders.write` |
| Tạo yêu cầu đổi trả có kiểm hàng | `createReturnCase` | `orders.return` |
| Ghi nhận đã thu tiền | `payOrder` | `finance.post` |
| Ghi nhận hoàn tiền | `refundOrder` | `finance.refund` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-022, SC-023, SC-024, SC-025, SC-026, SC-027. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R20 — Thu/chi tổng quan

**Route:** `/s/:shopId/finance` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Phân biệt tiền vào/ra trong kỳ với lợi nhuận.

**Nội dung:** From/to/timezone, receipts, disbursements, netCashMovement, asOf/warnings.

**Hành vi:** Bộ lọc kỳ dùng [from,to); drilldown sang entries với context; currency shop duy nhất. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** Negative cashflow không tự gọi lỗ; incomplete period; timezone boundary; zero có thật khác null.

**API đọc:** getCashflow

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R21 — Sổ thu/chi

**Route:** `/s/:shopId/finance/entries` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Theo dõi phiếu có phân loại và nguồn, không sửa sổ đã ghi.

**Nội dung:** Kind receipt/disbursement, classification, amount/currency, occurredAt, description, sourceRef, status, reversal link.

**Hành vi:** Draft edit ETag; post/reverse explicit confirmation; capital/loan/inventory_purchase không tự tính vào operating expense. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** SourceRef trùng đơn; tiền âm/0 không hợp lệ cho phiếu; posted không edit; double post; reversal có lý do và audit.

**API đọc:** listFinanceEntries, getFinanceEntry, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm phiếu nháp | `createFinanceEntry` | `finance.post` |
| Sửa phiếu nháp | `updateFinanceEntry` | `finance.post` |
| Ghi sổ | `postFinanceEntry` | `finance.post` |
| Đảo phiếu đã ghi | `reverseFinanceEntry` | `finance.post` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R22 — Lợi nhuận quản trị

**Route:** `/s/:shopId/finance/profit-loss` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Trình bày lãi/lỗ quản trị có nguồn và mức đầy đủ dữ liệu.

**Nội dung:** Gross/net sales, discounts/returns, COGS, gross profit, shipping/fees/AI/opex, operating profit, policyVersion/asOf.

**Hành vi:** Kỳ/timezone server; null/unknown hiện chưa xác định; provisional badge và drilldown; không recompute từ list entries trên client. V2: posted journal là nguồn tính; revenue theo policy được duyệt. Cash/COD/AP/AR tách biệt; không cộng tiền chưa nhận.

**Trường hợp cần xử lý:** Thiếu unit cost; hoàn hàng khác hoàn tiền; invoice AI chưa đối soát; không gọi báo cáo là tuân thủ thuế quốc gia.

**API đọc:** getProfitLoss

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-028, SC-029, SC-030, SC-031, SC-032. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R23 — Nguồn kiến thức

**Route:** `/s/:shopId/knowledge` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Tách tri thức đã duyệt với file đang xử lý.

**Nội dung:** Tên, sourceKind, status, revision, publishedAt, warnings; search/status filter.

**Hành vi:** Manual source hoặc file ready; tạo draft; trạng thái processing không có nghĩa đã đưa vào bot.

**Trường hợp cần xử lý:** Duplicate/content hash; parse failed/quarantine; dữ liệu PII; published vs indexed hiển thị khác nhau.

**API đọc:** listKnowledge, getFile

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm nguồn | `createKnowledge` | `knowledge.write` |
| Tải tài liệu | `uploadFile` | `authenticated/context` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R24 — Chi tiết kiến thức

**Route:** `/s/:shopId/knowledge/:knowledgeId` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Quản lý nội dung và vòng đời revision có review/evaluation.

**Nội dung:** Content/source, draft/live IDs, history, approver, warnings và evaluation reference.

**Hành vi:** Published immutable; sửa tạo revision; restore tạo draft mới; publish cần eval đúng revision, không auto-live từ restore.

**Trường hợp cần xử lý:** Eval stale so với revision/model; người sửa không có publish permission; retired source còn được trích cần warning/cache cleanup.

**API đọc:** getKnowledge, listKnowledgeRevisions, getKnowledgeRevision

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu bản nháp | `updateKnowledge` | `knowledge.write` |
| Tạo revision mới | `createKnowledgeRevision` | `knowledge.write` |
| Gửi kiểm tra và duyệt | `submitKnowledgeReview` | `knowledge.write` |
| Publish revision | `publishKnowledge` | `knowledge.publish` |
| Ngừng sử dụng | `retireKnowledge` | `knowledge.publish` |
| Khôi phục thành nháp | `restoreKnowledgeRevision` | `knowledge.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R25 — Đánh giá và phản hồi

**Route:** `/s/:shopId/knowledge/review` · **Module:** `knowledge` · **Đọc:** `knowledge.read`

**Mục đích:** Biến phản hồi có ích thành đề xuất đã kiểm soát, không tự học mọi chat.

**Nội dung:** Conversation/message reference, rating, correction, trạng thái; redaction và review reason.

**Hành vi:** Review yêu cầu correction đã loại PII; approve chỉ tạo candidate/reference cho KB draft, không publish tự động.

**Trường hợp cần xử lý:** Prompt injection trong correction; wrong shop evidence; concurrent reviewer; rejected có lý do; không lộ raw khách cho người thiếu quyền.

**API đọc:** listFeedback

| Hành động | operationId | Quyền |
|---|---|---|
| Duyệt hoặc từ chối | `reviewFeedback` | `knowledge.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-039, SC-040, SC-041, SC-042. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R26 — Cấu hình bot

**Route:** `/s/:shopId/bot` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Tách cấu hình đang dùng với cấu hình đang soạn.

**Nội dung:** Connection/model capability, instructions, knowledge revisions, limits/budget, human-confirm flag, live/draft/version.

**Hành vi:** Save draft dùng ETag; publish cần eval chính xác; pause explicit; restore không tự active, phải qua eval/publish.

**Trường hợp cần xử lý:** Provider unsupported/degraded, budget hết, stale eval, config conflict; UI không tự bypass human-confirmation.

**API đọc:** getBotConfig, listAIConnections, listKnowledge, listBotRevisions, getBotRevision

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu cấu hình nháp | `updateBotDraft` | `bot.configure` |
| Publish cấu hình | `publishBotConfig` | `bot.publish` |
| Tạm dừng | `pauseBot` | `bot.publish` |
| Khôi phục revision thành nháp | `restoreBotRevision` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R27 — Thử bot an toàn

**Route:** `/s/:shopId/bot/playground` · **Module:** `bot` · **Đọc:** `bot.configure`

**Mục đích:** Kiểm tra phản hồi mà không gửi khách thật.

**Nội dung:** Input giả, model/config revision, answer, sources, warnings, tools summary, latency/usage/cost estimate.

**Hành vi:** Banner sandbox; không external send; nguồn live price/stock tool backend scope; reset history khỏi scope cũ.

**Trường hợp cần xử lý:** Missing sources; hallucination rubric; provider timeout; unsupported capability; usage unknown không 0; không nhập PII thật trong demo.

**API đọc:** getBotConfig

| Hành động | operationId | Quyền |
|---|---|---|
| Chạy thử | `runPlayground` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R28 — Kiểm thử chất lượng AI

**Route:** `/s/:shopId/bot/evaluations` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Theo dõi kết quả theo dataset/config revision để chặn hồi quy.

**Nội dung:** Run ID, config/dataset versions, status, total/pass/critical failures, report link.

**Hành vi:** Chạy async, poll/stream progress; retry failed run tạo run mới giữ history; không dùng rate tự tin do LLM tạo.

**Trường hợp cần xử lý:** Evaluation pending/error; critical failure blocks publish; dataset thay đổi làm kết quả cũ không đủ; partial output không coi passed.

**API đọc:** listEvaluations, getEvaluation, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Chạy evaluation | `createEvaluation` | `bot.configure` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-043, SC-044, SC-045, SC-046. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R29 — Kết nối Facebook

**Route:** `/s/:shopId/integrations/channels` · **Module:** `integrations` · **Đọc:** `integrations.read`

**Mục đích:** Theo dõi kênh chính thức và điều kiện gửi tin thực.

**Nội dung:** Page name/id, trạng thái, lastWebhookAt, policyVersion/verification, capability/warnings.

**Hành vi:** OAuth do backend khởi tạo; chỉ dùng authorizationUrl validated, callback kiểm state server; không nhập Page token công khai vào UI settings.

**Trường hợp cần xử lý:** Chưa app review/quyền; token revoked; webhook stale; policy unknown; disconnect không xóa lịch sử khách/đơn.

**API đọc:** listChannels, getChannel, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Kết nối Page | `beginChannelConnect` | `integrations.manage` |
| Kết nối lại | `reconnectChannel` | `integrations.manage` |
| Ngắt kết nối | `disconnectChannel` | `integrations.manage` |
| Kiểm tra sức khỏe | `checkChannelHealth` | `integrations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-047, SC-048, SC-049, SC-050. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R30 — Nhà cung cấp AI

**Route:** `/s/:shopId/integrations/ai` · **Module:** `integrations` · **Đọc:** `integrations.read`

**Mục đích:** Quản lý adapter/model/capability, không giả định mọi key dùng được.

**Nội dung:** Provider/model catalog, capabilities, status, keyLast4, hasCredential, endpoint theo policy, lastCheckedAt.

**Hành vi:** Secret nhập một lần local; clear submit/unmount; test tính phí có xác nhận khi real; xoá connection đang được bot dùng bị server chặn hoặc cần đổi trước.

**Trường hợp cần xử lý:** Protocol mismatch; custom endpoint SSRF; expired key; quota; unknown model capability; response/log không chứa credential.

**API đọc:** listAIConnections, getAIConnection, getProviderCatalog, getJob

| Hành động | operationId | Quyền |
|---|---|---|
| Thêm kết nối | `createAIConnection` | `integrations.manage` |
| Cập nhật/đổi key | `updateAIConnection` | `integrations.manage` |
| Kiểm tra kết nối | `testAIConnection` | `integrations.manage` |
| Gỡ kết nối | `deleteAIConnection` | `integrations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-047, SC-048, SC-049, SC-050. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R31 — Báo cáo và xuất dữ liệu

**Route:** `/s/:shopId/reports` · **Module:** `reports` · **Đọc:** `reports.read`

**Mục đích:** Chọn báo cáo theo quyền và xuất snapshot nhất quán.

**Nội dung:** Report type inventory/orders/cashflow/profit_loss, kỳ/timezone/asOf, format CSV, trạng thái job.

**Hành vi:** Report view điều hướng route nghiệp vụ tương ứng; export cần cả reports.export và permission nguồn; tải qua URL authorized ngắn hạn.

**Trường hợp cần xử lý:** Mixed currency không cộng; signed URL hết hạn; export khác tenant; formula injection; partial/error job không phát file giả.

**API đọc:** getReportSummary, listJobs

| Hành động | operationId | Quyền |
|---|---|---|
| Xuất báo cáo | `createExport` | `reports.export` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-006, SC-007, SC-008, SC-010, SC-011, SC-051, SC-052. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R32 — Nhân sự và quyền

**Route:** `/s/:shopId/settings/team` · **Module:** `workspace` · **Đọc:** `members.manage`

**Mục đích:** Quản lý membership scoped theo shop.

**Nội dung:** Email/user, roles, permission preview, status, permissionVersion; không trộn Customer.

**Hành vi:** Đổi role/revoke dùng ETag; server bảo vệ owner cuối; session/stream bị revoke ở tab người bị đổi.

**Trường hợp cần xử lý:** Mời trùng; role escalation; tự xóa owner cuối; stale form; không hiện token/email invitation secret trong log.

**API đọc:** listMembers, getMember

| Hành động | operationId | Quyền |
|---|---|---|
| Mời nhân viên | `inviteMember` | `members.manage` |
| Đổi vai trò | `updateMemberRoles` | `members.manage` |
| Thu hồi quyền | `revokeMembership` | `members.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R33 — Thiết lập cửa hàng

**Route:** `/s/:shopId/settings/shop` · **Module:** `workspace` · **Đọc:** `shop.manage`

**Mục đích:** Sửa thông tin hoạt động không phá lịch sử tiền tệ.

**Nội dung:** Tên, locale, timezone; currency/default warehouse/policyVersion read-only sau onboarding.

**Hành vi:** ETag và preview ảnh hưởng timezone tới báo cáo; base currency đổi là migration riêng, không inline select tùy tiện.

**Trường hợp cần xử lý:** Invalid timezone/locale; 412; đổi shop giữa lúc save; không fallback currency bằng browser locale.

**API đọc:** getShop

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu thiết lập | `updateShop` | `shop.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R34 — Nhật ký kiểm toán

**Route:** `/s/:shopId/settings/audit` · **Module:** `workspace` · **Đọc:** `audit.read`

**Mục đích:** Truy nguyên hành động mà không lộ raw secret/PII.

**Nội dung:** Actor, action, time, resource ref, requestId, sanitized summary; search/filter/cursor.

**Hành vi:** Read-only; links được permission guard; không cho sửa/xóa audit từ UI; giữ context filter.

**Trường hợp cần xử lý:** Long messages; deleted resource; unauthorized cross-shop; raw key/phone có trong summary phải bị scrub ở server.

**API đọc:** listAuditEvents

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R35 — Quyền riêng tư và lưu trữ

**Route:** `/s/:shopId/settings/privacy` · **Module:** `workspace` · **Đọc:** `privacy.manage`

**Mục đích:** Quản lý policy và request xóa/xuất theo phạm vi đã duyệt.

**Nội dung:** Retention draft/active, jurisdiction note, customer request type/reason/status, legal_hold và job result.

**Hành vi:** Xác nhận scope, step-up khi approve; server xét legal hold/authority; deletion bao gồm index/cache/downstream theo policy.

**Trường hợp cần xử lý:** Retention chưa được legal approve; hold; job failed một phần; không hứa xóa toàn bộ backup ngay; token step-up không persist.

**API đọc:** getPrivacyPolicy, listPrivacyRequests, getCommand

| Hành động | operationId | Quyền |
|---|---|---|
| Lưu policy | `updatePrivacyPolicy` | `privacy.manage` |
| Tạo yêu cầu dữ liệu | `createPrivacyRequest` | `privacy.manage` |
| Xác thực lại | `stepUp` | `authenticated/context` |
| Phê duyệt yêu cầu | `approvePrivacyRequest` | `privacy.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R36 — Theo dõi công việc nền

**Route:** `/s/:shopId/jobs/:jobId` · **Module:** `workspace` · **Đọc:** `jobs.read`

**Mục đích:** Theo dõi import/export/index/eval/privacy được phép từ mọi module.

**Nội dung:** Kind/status, progress, counts/errors, result ref, downloadUrl khi ready.

**Hành vi:** Refetch stream/poll bounded; source-specific permission ngoài jobs.read; trở về trang nguồn; download không chứa permanent public URL.

**Trường hợp cần xử lý:** Không thấy job người khác/tenant khác; unknown total progress; partial/failed; link expired và unauthorized data không còn cache.

**API đọc:** getJob

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC-001, SC-002, SC-003, SC-004, SC-005, SC-006, SC-007, SC-008, SC-009, SC-010, SC-011, SC-054, SC-055. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R37 — Điều hành và công việc

**Route:** `/s/:shopId/operations` · **Module:** `operations` · **Đọc:** `operations.read`

**Mục đích:** Bảng công việc chung / Giám sát ngoại lệ / Trạng thái hệ thống

**Nội dung:** One WorkItem per business intent; assignee/dependencies/due/status/evidence.
Rules detect unanswered cases/unclaimed orders/late shipments/low stock/unmatched money.
Provider/channel/worker heartbeat/lag/budget/failed/unknown; degraded runbook link.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Notification ack liên kết task, không thành tracker cạnh tranh; cancelled source cancels task.
Rule version, cooldown, dedupe; no endless self-created tasks.
No green healthy when last check too old; unknown distinct down.

**API đọc:** getOperationsSummary, listWorkItems

| Hành động | operationId | Quyền |
|---|---|---|
| claimWorkItem | `claimWorkItem` | `operations.claim` |
| updateWorkItem | `updateWorkItem` | `operations.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F02, SC2-F03, SC2-F07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R38 — Hàng chờ phê duyệt

**Route:** `/s/:shopId/approvals` · **Module:** `operations` · **Đọc:** `approvals.read`

**Mục đích:** Hàng chờ duyệt / Ủy quyền

**Nội dung:** Approval binds shop/action/resourceVersion/policyVersion/intentHash/expiry; reason required reject.
Versioned rule amounts/actions/scopes; current effective authority checked before execution.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Expired/changed/replayed approvals fail; batch approval excludes stale rows with reasons.
Supervisor không tự nâng scope, không approval của mình thành người thật.

**API đọc:** listApprovals, getApproval

| Hành động | operationId | Quyền |
|---|---|---|
| decideApproval | `decideApproval` | `approvals.decide` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F04, SC2-F05. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R39 — Trung tâm thông báo

**Route:** `/s/:shopId/notifications` · **Module:** `notifications` · **Đọc:** `notifications.read`

**Mục đích:** Báo đơn đủ điều kiện chuẩn bị / Mở đơn an toàn từ thông báo / Xác nhận nhận chuẩn bị / Theo dõi gửi/mở/nhận việc

**Nội dung:** order.confirmed + reservation bền vững + payment/COD policy cho phép mới tạo task và notification intent.
Deep-link đến shop/order sau session bootstrap; nội dung lockscreen tối thiểu; không có PII trong URL.
Nút Tôi nhận đơn thực hiện compare-and-set task.version/assignee trong transaction; người nhận và thời gian rõ.
Tách accepted_by_provider, failed, unknown, opened_if_observed, acknowledged; không suy diễn giao thành công.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Đơn nháp, reservation fail hoặc transaction rollback không phát lệnh chuẩn bị; event trùng chỉ một việc.
Người không thuộc shop nhận 403/404; URL cũ không vượt quyền hiện hành.
Hai nhân viên đồng thời nhận: một thắng, một thấy người đã nhận; delivery receipt không đồng nghĩa nhận việc.
Timeout không gắn failed; không có callback mở thì giữ unknown, không tạo tỷ lệ đọc giả.

**API đọc:** listNotifications, getNotification

| Hành động | operationId | Quyền |
|---|---|---|
| acknowledgeNotification | `acknowledgeNotification` | `operations.claim` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-A02, SC2-A03, SC2-A04, SC2-A07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R40 — Thiết bị, kênh nhận và lịch trực

**Route:** `/s/:shopId/notifications/devices` · **Module:** `notifications` · **Đọc:** `notifications.manage`

**Mục đích:** Đăng ký thiết bị nhận thông báo / Nhắc hạn và dự phòng / Loại thông báo và lịch trực / Chống trùng và bảo vệ thông báo

**Nội dung:** Hiển thị khả năng thiết bị, hướng dẫn cài PWA, xin quyền sau thao tác người dùng; gửi kiểm tra; thu hồi subscription.
Lịch nhắc dựa lịch trực/múi giờ, policy có version; định danh intent và số lần tối đa; fallback Telegram đã liên kết.
Ưu tiên đơn mới, trễ, hết hàng, lệch tiền, lỗi; giờ yên lặng; chủ shop duyệt ngoại lệ khẩn.
Dedupe theo shop/event/recipient/channel, payload tối thiểu, callback token ngắn hạn, rate/budget cap.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Từ chối quyền không ghi connected; thiết bị đã thu hồi không nhận lại; không yêu cầu key trong trình duyệt.
Nhận việc/hủy đơn dừng nhắc; worker restart không phát trùng; không có người trực thì vào hàng ngoại lệ.
Không tự bỏ qua giờ yên lặng; bộ nhớ cấu hình mẫu không thành chính sách live.
Callback replay, membership revoked, sai shop hoặc TTL hết đều bị chặn; tắt SMS/voice mặc định.

**API đọc:** listDevices, getNotificationPolicy

| Hành động | operationId | Quyền |
|---|---|---|
| createDevice | `createDevice` | `notifications.manage` |
| revokeDevice | `revokeDevice` | `notifications.manage` |
| testDevice | `testDevice` | `notifications.manage` |
| beginTelegramPairing | `beginTelegramPairing` | `notifications.manage` |
| updateNotificationPolicy | `updateNotificationPolicy` | `notifications.manage` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-A01, SC2-A05, SC2-A06, SC2-A08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R41 — Chuẩn bị và lấy hàng

**Route:** `/s/:shopId/fulfillment` · **Module:** `fulfillment` · **Đọc:** `fulfillment.read`

**Mục đích:** Bảng chuẩn bị hàng / Phiếu lấy hàng theo SKU / Kiểm đóng gói

**Nội dung:** Task board queued/claimed/picking/packed/handed_over với assignee, dueAt, thời gian trễ.
Checklist line, phiên bản, quantity; barcode tùy chọn và sửa lượng có reason.
Thiếu/hỏng/sai biến thể tạo issue; chỉ đóng gói đủ dòng và điều kiện bắt buộc.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không gộp packed với delivered; bộ lọc không làm mất việc chưa nhận.
Quét sai SKU/nhập vượt lượng chặn pack; snapshot không dùng ảnh hiện tại sai phiên bản.
Có issue chưa giải quyết thì không ready; ảnh chứng cứ không công khai PII.

**API đọc:** listPrepJobs, getPrepJob

| Hành động | operationId | Quyền |
|---|---|---|
| pickPrepLine | `pickPrepLine` | `fulfillment.write` |
| packPrepJob | `packPrepJob` | `fulfillment.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C01, SC2-C02, SC2-C03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R42 — Vận đơn và giao hàng

**Route:** `/s/:shopId/shipments` · **Module:** `fulfillment` · **Đọc:** `fulfillment.read`

**Mục đích:** Phí và vùng giao hàng / Vận đơn và bàn giao / Trạng thái giao độc lập

**Nội dung:** Shipping address, serviceability, quote/actual fee, shipper, package size nếu yêu cầu.
Adapter carrier hoặc nhập mã thủ công; idempotent label; người thật xác nhận bàn giao.
Shipment separate from order/payment; transit/delivered/failed/returning/returned với evidence event.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Ngoài vùng, quote phí hết hạn hoặc thiếu address không hứa giao.
Timeout create label phải reconcile; bàn giao lần hai không trừ tồn lần hai.
Event lùi/trùng không hoàn tất sai; delivered không đồng nghĩa tiền về ngân hàng.

**API đọc:** listShipments, getShipment

| Hành động | operationId | Quyền |
|---|---|---|
| createShipment | `createShipment` | `fulfillment.write` |
| handoverShipment | `handoverShipment` | `fulfillment.handover` |
| recordShipmentEvent | `recordShipmentEvent` | `fulfillment.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C04, SC2-C05, SC2-C06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R43 — Đổi trả và kiểm hàng hoàn

**Route:** `/s/:shopId/returns` · **Module:** `orders` · **Đọc:** `orders.read`

**Mục đích:** Đổi/trả từng phần / Sửa/hủy theo giai đoạn

**Nội dung:** Return line/quantity, kiểm tình trạng, refund obligation, người duyệt, reversal.
Draft edit; confirmed release/requote; sau handover là return process; notify task changes.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Returned item chưa kiểm không available; không hoàn quá paid/qty; partial return không làm hoàn toàn đơn.
Không hủy đơn đã handed_over bằng cancel thường; reservation release đúng một lần.

**API đọc:** listReturnCases, getReturnCase

| Hành động | operationId | Quyền |
|---|---|---|
| createReturnCase | `createReturnCase` | `orders.return` |
| inspectReturn | `inspectReturn` | `inventory.adjust` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-C07, SC2-C08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R44 — Nhà cung cấp hàng hóa

**Route:** `/s/:shopId/suppliers` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Nhà cung cấp hàng hóa

**Nội dung:** Supplier/SKU price/MOQ/packSize/leadTime/currency/paymentTerms; approved status.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Supplier khác shop hoặc chưa duyệt không auto-purchase; lịch sử đổi giá được giữ.

**API đọc:** listSuppliers, getSupplier, listSupplierOffers

| Hành động | operationId | Quyền |
|---|---|---|
| createSupplier | `createSupplier` | `procurement.write` |
| updateSupplier | `updateSupplier` | `procurement.write` |
| setSupplierStatus | `setSupplierStatus` | `procurement.manage` |
| createSupplierOffer | `createSupplierOffer` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D02. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R45 — Đề nghị nhập và quy tắc

**Route:** `/s/:shopId/replenishment` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Quy tắc nhập lại / Nguy cơ hết hàng / Ngăn đặt trùng và vượt vốn

**Nội dung:** Reorder point/target/safety stock/rounding/approved suppliers/max commitments; versioned.
Baseline min-max; optional forecast từ lịch sử có coverage/seasonality warnings.
Kế hoạch tính confirmed inbound + open proposals separately; reserve budget cùng transaction tạo PO.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Thiếu budget cho auto_send phải block; qty không âm và đúng packSize/MOQ.
Chưa đủ lịch sử hiển thị static rule; không dự báo confidence giả.
Hai workers reorder cùng SKU tạo tối đa một active proposal; reserved budget không vượt cap.

**API đọc:** listPurchaseSuggestions, listReorderRules

| Hành động | operationId | Quyền |
|---|---|---|
| evaluateReorder | `evaluateReorder` | `procurement.write` |
| createReorderRule | `createReorderRule` | `procurement.manage` |
| updateReorderRule | `updateReorderRule` | `procurement.manage` |
| createPurchaseOrder | `createPurchaseOrder` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D03, SC2-D04, SC2-D07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R46 — Đơn mua hàng

**Route:** `/s/:shopId/purchases` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Vòng đời đơn mua / Tự gửi đơn mua có giới hạn

**Nội dung:** draft/pending_approval/approved/sending/unknown/sent/confirmed/part_received/received/cancelled.
Mặc định draft_for_approval; automatic chỉ khi allowlist giá/số lượng/budget + approval authority còn hợp lệ.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Timeout send giữ unknown; không gửi đơn mới trước reconcile.
Approval thay giá/qty/supplier cần cấp lại; không tự thanh toán từ quyền mua.

**API đọc:** listPurchaseOrders, getPurchaseOrder

| Hành động | operationId | Quyền |
|---|---|---|
| createPurchaseOrder | `createPurchaseOrder` | `procurement.write` |
| requestPurchaseApproval | `requestPurchaseApproval` | `procurement.write` |
| sendPurchaseOrder | `sendPurchaseOrder` | `procurement.send` |
| confirmPurchaseOrder | `confirmPurchaseOrder` | `procurement.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D05, SC2-D06. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R47 — Nhận hàng và đối chiếu

**Route:** `/s/:shopId/receipts` · **Module:** `procurement` · **Đọc:** `procurement.read`

**Mục đích:** Tồn theo trạng thái và SKU / Nhận và đối chiếu hàng

**Nội dung:** Sellable, reserved, in_transit_to_customer, quarantined, inbound_confirmed; warehouse scoped.
GoodsReceipt line qty accepted/rejected; over-delivery policy; link PO/invoice; AP.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Hàng đang về/hỏng không có trong available; tổng projection khớp movement ledger.
Nhận một phần đúng tồn và công nợ; replay receipt không double stock; rejects không sellable.

**API đọc:** listGoodsReceipts, getGoodsReceipt

| Hành động | operationId | Quyền |
|---|---|---|
| createGoodsReceipt | `createGoodsReceipt` | `procurement.write` |
| postGoodsReceipt | `postGoodsReceipt` | `procurement.receive` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-D01, SC2-D08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R48 — Chứng từ và sổ kép

**Route:** `/s/:shopId/finance/journals` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Chứng từ và sổ kép / Giá vốn và lợi nhuận / Chi phí và phân bổ

**Nội dung:** Journal header/lines, debit/credit exact Decimal, source uniqueness, posted immutable.
Moving weighted average baseline có policyVersion; cost snapshot tại dispatch; recognize revenue theo approved transfer rule.
Quảng cáo/AI/carrier/packaging/fees; actual/estimated separate; không double expense.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không post journal mất cân bằng; source trùng không ghi lặp; reversed phải reason.
Không lấy toàn purchase cost vào P&L; không giả định dispatch = delivered; policy chưa duyệt chặn live post.
Phí COD đã khấu trừ không hạch toán thêm lần thứ hai; nhãn estimate không đổi thành actual.

**API đọc:** listJournals, getJournal

| Hành động | operationId | Quyền |
|---|---|---|
| createJournal | `createJournal` | `finance.post` |
| postJournal | `postJournal` | `finance.post` |
| reverseJournal | `reverseJournal` | `finance.post` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E01, SC2-E02, SC2-E03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R49 — Đối soát ngân hàng và COD

**Route:** `/s/:shopId/finance/reconciliation` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Đối soát ngân hàng / Đối soát COD

**Nội dung:** Import deterministic mapping, dedupe externalTxnId/account; match suggestions need review.
Delivered COD receivable; carrier collection/fees/remittance; pending mismatch queue.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Ảnh chuyển khoản chỉ evidence chờ kiểm; unmatched/partial/duplicate visible; offline không post.
Khách trả carrier khác shop received cash; net remittance + fees cân bằng gross clearing.

**API đọc:** listReconciliationCases, listBankTransactions, listCODSettlements

| Hành động | operationId | Quyền |
|---|---|---|
| importBankStatement | `importBankStatement` | `finance.reconcile` |
| importCODStatement | `importCODStatement` | `finance.reconcile` |
| matchSettlement | `matchSettlement` | `finance.reconcile` |
| matchCODSettlement | `matchCODSettlement` | `finance.reconcile` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E04, SC2-E05. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R50 — Công nợ và khóa kỳ

**Route:** `/s/:shopId/finance/debts-periods` · **Module:** `finance` · **Đọc:** `finance.read`

**Mục đích:** Công nợ / Khóa kỳ và điều chỉnh

**Nội dung:** AP/AR, deposits, dueAt, aging buckets, dispute holds; base currency locked per shop.
Period close prerequisite unresolved count, role + approval, reopen/reversal audit.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không cộng khác currency chưa FX policy; deposit không bị coi revenue sai kỳ.
Backdated post vào locked period bị chặn; export không thay dữ liệu nguồn.

**API đọc:** listDebtItems, listAccountingPeriods

| Hành động | operationId | Quyền |
|---|---|---|
| closeAccountingPeriod | `closeAccountingPeriod` | `finance.close` |
| reopenAccountingPeriod | `reopenAccountingPeriod` | `finance.close` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-E06, SC2-E07. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R51 — Bốn vai trò AI và quyền

**Route:** `/s/:shopId/bot/team` · **Module:** `bot` · **Đọc:** `bot.read`

**Mục đích:** Bốn vai trò AI / Kill switch / Chi phí và failover

**Nội dung:** Role capabilities, tools, scopes, budget, version, human accountable owner; one orchestration substrate.
Shop/role/conversation generations; check immediately before side effect; cancel pending.
Token/channel budgets and procurement budgets separate; approved fallback providers only.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không xem bốn cards là bốn process; bot role không có members.manage hoặc payment transfer.
Stop cannot unsend accepted message; UI shows accepted/unknown boundary honestly.
No silent PII transfer to unapproved model; exhausted budget moves to safe handoff.

**API đọc:** listAgentRoles, listBudgetPolicies

| Hành động | operationId | Quyền |
|---|---|---|
| updateAgentRole | `updateAgentRole` | `bot.configure` |
| controlAutomation | `controlAutomation` | `bot.pause` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F01, SC2-H02, SC2-H03. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R52 — Bản tin và sức khỏe hệ thống

**Route:** `/s/:shopId/operations/digests` · **Module:** `operations` · **Đọc:** `operations.read`

**Mục đích:** Bản tin chủ shop / Trạng thái hệ thống / Đánh giá chất lượng / Worker phía máy chủ / Chống trùng và phục hồi / Khôi phục và readiness

**Nội dung:** Scheduled durable job per shop timezone; summarize pending/blocked/completed with links.
Provider/channel/worker heartbeat/lag/budget/failed/unknown; degraded runbook link.
Ground-truth eval datasets, failed cases, response time, cost, human corrections.
Durable outbox + command log + queue consumers; health/progress in UI.
Command idempotency/body hash, transaction/outbox, retries bounded, unknown reconciliation.
Restore rehearsal, stale check expiry, deploy gates, last verified environment/revision.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Thiếu giờ/recipient thì chưa bật; gửi lại bản tin cùng kỳ không trùng.
No green healthy when last check too old; unknown distinct down.
Không tự nhận confidence từ model là accuracy; version linkage and sample counts visible.
Close browser and restart worker preserves due work; queue loss rebuild from DB.
Crash after external accept before local save not blindly retried; poison jobs isolated.
Backup exists not restore proof; missing mandatory criterion cannot greenlight launch.

**API đọc:** listDigests, getOperationsSummary

| Hành động | operationId | Quyền |
|---|---|---|
| controlAutomation | `controlAutomation` | `bot.pause` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-F06, SC2-F07, SC2-F08, SC2-H01, SC2-H04, SC2-H08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R53 — Thông tin hỗ trợ marketing

**Route:** `/s/:shopId/reports/marketing` · **Module:** `reports` · **Đọc:** `reports.read`

**Mục đích:** Thông tin marketing cho chủ shop / Hiệu quả chiến dịch

**Nội dung:** Frequently asked, lost-sale reasons, demand vs stock and content ideas, evidence links.
Spend import with source IDs, promo results, known/estimated attribution split.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Report missing attribution separately; no auto publish ads/content.
Không tự tăng ad spend; không ghi estimate thành actual finance expense.

**API đọc:** getMarketingSummary

| Hành động | operationId | Quyền |
|---|---|---|

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-G07, SC2-G08. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.

## R54 — Yêu cầu sau bán

**Route:** `/s/:shopId/service-cases` · **Module:** `customers` · **Đọc:** `customers.read`

**Mục đích:** Chăm sóc sau mua / Hồ sơ khách liên kết

**Nội dung:** Tra shipment/order theo khách xác thực; tiếp nhận yêu cầu đổi/trả và tạo case.
Page-scoped customer identity, contact verification, case/order/conversation linkage.

**Hành vi:** Các mutation qua command/version/policy; disable stale/offline và reconcile unknown; không tự cấp quyền từ frontend.

**Trường hợp cần xử lý:** Không gửi đơn khách khác; không hứa hoàn tiền hoặc xác nhận hoàn tiền thật.
Không tự merge cùng tên/số bị che; scope mismatch denied.

**API đọc:** listServiceCases, getServiceCase

| Hành động | operationId | Quyền |
|---|---|---|
| createServiceCase | `createServiceCase` | `customers.write` |
| setServiceCaseStatus | `setServiceCaseStatus` | `customers.write` |

**States:** loading, empty, error, forbidden, stale_or_offline, success, command_unknown, capability_unavailable

**Kịch bản:** SC2-B06, SC2-G04. SC-* tại fixtures/core-acceptance-scenarios.json, SC2-* tại fixtures/acceptance-scenarios.json; đều chưa chạy trên sản phẩm.


---

<!-- SOURCE: docs/05_DOMAIN_AND_INVARIANTS.md -->

# 05 — Nguồn dữ liệu, máy trạng thái và bất biến

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Ownership
| Dữ kiện | Nguồn có quyền đổi | Bên khác |
|---|---|---|
| Giá/biến thể/promotion | catalog | Quote đọc snapshot; AI không viết giá |
| Sellable/reserved/transit/quarantine | inventory ledger | Orders gửi intent reserve/consume/release |
| Commercial order and confirmation | orders | Inbox truyền source refs, không tự chốt bằng local state |
| Pick/pack/shipment | fulfillment | Người thật xác nhận tác vụ vật lý |
| PO/receipt/supplier | procurement | Inventory nhận accepted receipt theo giao tiếp |
| Journal/cash/AR/AP/period | finance | AI/report đọc; không sửa số tiền bằng ngôn ngữ |
| Tasks/approval/policy | operations | Notification chỉ chuyển/tường minh trạng thái, không tạo owner thứ hai |
| Provider observation | integration attempt/command | Timeout => unknown; không biến unknown thành failed để gửi lại |

## States
Order: draft→confirmed→completed; cancel before handover with no irreversible obligation, otherwise return/settlement process. Prep: queued→claimed→picking→packed→handed_over; blocked is reason/state of work item; cancel cancels outstanding work. Shipment: planned→label_pending→label_ready→handed_over→in_transit→delivered; failed/returning/returned; unknown when external result unavailable. Partial shipment/return at line-level; aggregate states derived without hiding quantities. Payment: unpaid/part_paid/verified/cod_collected/settled/part_refunded/refunded; multiple transactions do not overwrite history.

PO: draft→pending_approval→approved→sending→sent→confirmed→part_received→received. sending→unknown on ambiguous external response. No sent on mere HTTP timeout, no new PO until reconcile. Approval: pending→approved/rejected/expired/revoked; approved→consumed exactly once for bound intent. Journal: draft→posted; correction creates reversing entry and replacement, not edit posted lines. Period open→closing→closed; reopening requires real authorization.

## Invariants (INV2)
| ID | Bắt buộc |
|---|---|
| INV2-01 | Shop/tenant boundary on DB FK, API, workers, SSE, retrieval, exports and callbacks |
| INV2-02 | available = sellable_on_hand − active_reserved ≥ 0; rejected/inbound/in-transit-to-customer not available |
| INV2-03 | One reservation consume/release per line intent; atomic multi-SKU reserve or no reserve |
| INV2-04 | Confirmation binds exact quote, expiry, customer identity, order lines and policy; modified inputs invalidate consent |
| INV2-05 | Claim compare-and-set: one active assignee, current membership and source validity |
| INV2-06 | Dispatch not delivered; delivered not bank cash. Each state has independent evidence |
| INV2-07 | PO open proposal dedupe and budget reservation atomic; never double-count inbound and pending proposal |
| INV2-08 | Accepted receipt total ≤ ordered remainder unless explicit approved overdelivery; rejects not sellable |
| INV2-09 | Sum debits = sum credits per currency; exact decimal; journal sources unique by shop/type/id/event/revision |
| INV2-10 | Posted ledger immutable; refund ≤ eligible paid/owed and returned quantity within sold line quantity |
| INV2-11 | A closed period cannot be written concurrently; reopen is audited authority action |
| INV2-12 | Provider accepted/failed/unknown distinct from opened/acknowledged; no false success |
| INV2-13 | Approval hash/version/expiry/current permission rechecked before action; replay cannot reuse approval |
| INV2-14 | Pause fence blocks not-yet-dispatched work; accepted external effects are not claimed undone |
| INV2-15 | No silent PII model failover; retention/deletion propagates all stores and restored backups via tombstones |
| INV2-16 | No client/LLM-derived money, stock, rights or performance numbers are trusted as authority |

## Time / Money / Identifiers
API Money `{amount: decimal string,currency: ISO code}`; quantities integer for discrete retail in initial scope. No JS Number for financial arithmetic; exact math backend and BigInt synthetic integer VND in demo only. UTC timestamps ISO; shop timezone to render/schedule. Do not aggregate currencies without approved FX policy. Composite unique tenant refs everywhere; external Meta identities page-scoped, bank IDs account-scoped, provider attempts external-ref scoped.

## Side-effect protocol
intent accepted with idempotency body hash → authoritative transaction → outbox → worker preflight current policy/generation → provider send → observation. When result is unknown, operation remains nonfinal and disables unsafe duplicate submit. Reconcile queries/observations may establish accepted/failed; manual resolution carries actor/evidence. Never claim exactly-once across arbitrary external APIs.


---

<!-- SOURCE: docs/06_API_AND_REALTIME.md -->

# 06 — Contract-first API và realtime

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

`contracts/openapi.json` is canonical; YAML and operation-index generated, not independently edited. Operation IDs linked from route manifest and tests. HTTP base /api/v2; old v1 archive not active. Before writing server/controllers or UI clients, T009 validates all refs and generates DTO. Only extension via source JSON + scenario + migration map, single owner.

Queries use server cursor+limit (bounded), stable ordering and metadata `asOf`/trace info. No totals computed from current page. Mutations require CSRF for cookie sessions, idempotency key scoped operation and current version in body/If-Match where specified. 202 means command accepted, not side effect completed. GET command current status before retry after timeout. 409 conflicting idempotency body/business state; 412 stale version; 422 field errors; 428 missing version when required; 429 retry-after; UI must preserve user edits.

Every resource read checks tenant/object/field visibility. list/read/export/async job must agree on permissions. Effective allowedActions includes capabilities, current state and policy; client does not reproduce permission engine. Write requests do not trust totals/amount caps/policy approval boolean supplied by caller. Any response carrying redacted fields must identify unavailable vs unknown values.

SSE event schema only invalidation/source refs, not confidential full records. Event sequence supports duplicate/out-of-order/resume/resync-required. Reconnect fetch current snapshot on gaps; no client applies stale stock delta as authority. Shop switch/logout/revoke closes old stream, aborts queries, clears state and rejects late responses by scope token. Worker/notification/task observation is still authoritative server state.

New APIs in notifications, operations, fulfillment, procurement and finance are specified but no actual server is shipped with this kit. API schema validation is not contract execution proof. OIDC callback is protocol endpoint; external Meta/carrier/Telegram webhooks must validate signature/identity by their official adapters, not use cookie auth as substitute. Ingress wire contracts are verified at T037/T068–T071 against selected providers, then frozen in adapter fixtures.


---

<!-- SOURCE: docs/07_AI_AND_CHANNELS.md -->

# 07 — Admin AI, dữ liệu và kênh Facebook

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Provider boundary
Four business roles use one provider abstraction; adapter catalog declares protocol, tool/vision/audio/structured output/streaming support and limits, data region policy and tested version. API-key field is write-only to server secret store, responses only fingerprint/health. OpenAI-compatible is an API family, not a guarantee every provider works identically. Custom endpoints need HTTPS allowlist, DNS/private/metadata address protections and no unsafe redirects. Lock model/provider price source at evaluation; unknown prices are unknown, not zero.

## Sales execution
Detect customer need → retrieve current published knowledge with tenant/customer boundaries → read catalog/quote through scoped tools → respond with checked price/availability → gather required address/contact → present exact quote summary → record customer confirmation → deterministic confirm-order policy. A model cannot set `confirmed=true` to synthesize proof. Coupons/combo/discount floor are published rules with dates. Missing data, complaint, policy mismatch or request for human leads to handoff WorkItem.

## Knowledge vs memory
Published shop knowledge, live product/stock/price, private customer memory and raw chat are separate stores/purposes. Ingest untrusted input with file/type/size/scan/redaction; prompt instructions inside documents/messages are data, not authority. Feedback becomes draft correction, human-reviewed and evaluated before publish. Store model/prompt/knowledge/price/permission/policy versions in evaluation and side-effect audit. Retirement/deletion must stop future retrieval promptly.

## Channel constraints
24/7 means backend worker availability target, not unlimited right to message. Meta's official collection lists Page token/message permission and standard 24-hour recipient condition [N10]. Backend computes eligibility and blocks unsupported send; UI displays reason. Comments/media/private replies need actual permissions/API support and tests, not assumed from Messenger enablement. Image transfer receipt is not verified payment; voice address transcript requires confirmation.

Takeover increments conversation generation; revalidate before every send to prevent human+bot double reply. External send timeout is unknown, not a reason for a second message. No bulk promotional messages from service reply consent. Respect marketing opt-out and suppression checks again at execution time.

## Evaluation and release
Use curated golden cases and adversarial cases for fake consent, stock/price mismatch, prompt injection, forbidden refunds, handoff, media and policy-window errors. Keep actual sample counts and sources; model self-reported confidence is not measured accuracy. Owner/risk-approved threshold per enabled feature, not arbitrary universal 100%. Critical invariants must not be traded for high average response quality. Pause/cap/fallback policies tested before actual API deployment. OWASP Excessive Agency guides least authority and downstream verification [N11].


---

<!-- SOURCE: docs/08_SECURITY_TENANCY_RBAC.md -->

# 08 — Bảo mật, phân quyền và quyền tự động

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Trust boundaries
Browser/LLM/customer message/attachments/provider callbacks are untrusted. Backend policies authorize every tool/command by principal, shop, resource, field, current state and budget. Route guard/disabled button is UX only. Agent identities have actorKind=agent and delegation refs; cannot turn into human approver by emitting a string. Universal code rules are different from runtime agent policies.

## Mandatory controls
Session cookies HttpOnly/Secure; same-origin CSRF checking; OIDC state/nonce/PKCE validated server. Secrets only in managed server environment/vault; no demo key entry, URL secret or console sensitive payload. CSP/safe Markdown and escaped text, parameterized SQL, SSRF protections for provider URLs/media/push endpoints, malware/type/size limits, private object store, signed downloads with auth recheck. Limit auth, messaging, APIs and async consumption by tenant.

Membership revoke affects API, queue execution, SSE, reports, file URLs and Telegram callbacks. Pairing token short lived/single use and mapped to actual user identity; callback bind action+resource+version+shop+expiry, recheck authorization. Device revoke retires subscriptions. Push payload no full address or phone on lockscreen. Token rotation disconnects affected adapter and no false green readiness.

## Authorization matrix for autonomous roles
Sales: trusted read+draft; confirm only customer-evidence policy. Accountant: reads, classification suggestions, report explanation; deterministic posting by verified event owner. Warehouse: read stock, draft purchase, eligible permitted send only in separately activated rules. Supervisor: create/assign/escalate/summarize under allowed rules; never changes its own limits. Actual transfer/payment/refund bank action absent from default tools. Human approval recorded from authenticated actor, not generated by another agent.

## Tenancy in database
Use `(shopId,id)` resource linkage and unique constraints for every tenant-scoped relation. Repositories accept transaction context; no `where id=...` without tenant. PostgreSQL RLS is optional additional defense only when configured/tested including table owner/runtime role bypass, FORCE and transaction-local settings with pooling [N05]. Do not claim RLS alone covers external object storage/search. Migration role separate from runtime DB role.

## Data lifecycle
Retention/country/legal hold unresolved values do not activate deletion; synthetic demo policies not live. Deletion removes/redacts all allowed chat/vector/object/export/cache copies, with evidence and recovery tombstones so restore doesn't resurrect suppressed data. Financial/legal retention is policy-specific and reviewed, not blanket delete. PII minimization and redacted logs before provider sends. No SOC2/GDPR/PDPA/ASVS certification claimed. Map applicable ASVS controls and test actual target at T073 [N12].


---

<!-- SOURCE: docs/09_STATE_AND_DATA_ACCESS.md -->

# 09 — State, cache, forms và mô hình dữ liệu UI

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## 1. Quyết định state ownership

| Loại state | Nơi giữ | Ví dụ | Không giữ ở |
|---|---|---|---|
| Server state | TanStack Query, scoped query client | product, order, permissions snapshot, jobs | store toàn cục thứ hai |
| URL state | Router search params | q, status, sort, cursor, date range | local state không share/bookmark được |
| Form state | React Hook Form + schema module | draft product, điều chỉnh kho, secret transient | query cache hoặc localStorage |
| UI transient | component/context phạm vi nhỏ | dialog open, selected tab, current row | backend database |
| Session scope | bootstrap/session context | principal, shop, permissionVersion | tin từ query string |
| Durable business workflow | backend Command/Job | import, send message, refund | useEffect hoặc browser timer |

Không chọn Redux/Zustand mặc định. Chỉ thêm nếu đã có state local dùng chéo thật mà context/query không giải quyết hợp lý; cần ADR mô tả nguồn chân lý và phạm vi. Server state vẫn chỉ có một owner [S04].

## 2. Query key và scoping

```ts
// Ví dụ minh họa quy tắc; nối với generated types trong repo thực.
const productListKey = (
  scope: { userId: string; shopId: string; permissionVersion: number },
  filters: { q: string; status: string; cursor: string | null; limit: number },
) => ['scope', scope.userId, scope.shopId, scope.permissionVersion,
       'catalog', 'products', filters] as const;
```

Include mọi biến thay đổi dữ liệu, kể cả currency/timezone/warehouse/asOf khi có. Không dùng key `['products']` chung cho mọi shop. Prefix invalidation cụ thể module/scope; không `invalidateQueries()` toàn app mỗi click. Chỉ persist UI preference không nhạy (sidebar density) có version; v1 không persist query cache PII/finance/chat.

## 3. DTO → view model

Generated DTO biểu diễn hợp đồng server; view model cục bộ chỉ thêm label/format/derived presentation. Ví dụ MoneyView `formatted` từ amount/currency, không đổi amount gốc. Unknown enum có fallback read-only. Null redacted/unknown khác 0/empty. Không cast `as Product` để che schema mismatch.

Form schema riêng cho input (trim, decimal string, required); mapper explicit tới request DTO. PATCH gửi trường thực sự đổi, không serialize toàn DTO read với read-only fields. Không sửa generated types để thỏa form. ID không parseInt; quantity limits kiểm server. Một Product view có thể kèm StockSummary response read model, nhưng không tái tạo nguồn stock trong local store.

## 4. Fetch/retry/cancellation

API wrapper chịu base URL, credentials, CSRF, requestId propagation, response parsing/problem mapping, AbortSignal, timeout và telemetry scrub. Module API chịu endpoint/query key/request/response mapping. Component không fetch/axios trực tiếp, không tự nối URL khác quy tắc.

GET có bounded retry chỉ cho network/5xx với backoff; 401/403/404/422 không retry tự động. Mutation mặc định không retry trừ cùng idempotency key và server contract có hỗ trợ. Không retry login hoặc provider-test vô hạn. Request cancellation không bảo đảm server command đã hủy; cancel transport khác cancel business operation.

## 5. Staleness và dữ liệu live

StaleTime là tuning theo module, không đảm bảo tính mới nghiệp vụ. Gợi ý baseline cho test: catalog 30 giây, kho/order 5 giây, taxonomy 5 phút; backend command vẫn revalidate bất kể cache “fresh”. UI hiển thị asOf/stale rõ cho kho/báo cáo và khi mất mạng. Không cho quote cache thay giá cuối lúc confirm.

Messages paginated, giữ scroll khi prepend lịch sử; có giới hạn số pages trong memory và virtualization chỉ khi đo cần. Stock/order refetch khi focus/stream invalidate, không poll mọi tab song song. Reports theo snapshot/asOf để export nhất quán; khi filter đổi hủy request cũ.

## 6. Mutation UX

Sửa text sản phẩm: chờ server success, invalidate đúng list/detail; version conflict giữ draft local và hiển thị diff. Rủi ro tiền/kho/publish/send: pending rõ, chưa cho status cuối cho đến server xác nhận hoặc Command complete. Không optimistic ledger/inventory/order.

Có thể optimistic preference không nhạy như mở/đóng sidebar; assignment label chỉ optimistic nếu backend/team chốt và có rollback không ảnh hưởng bot authority. Baseline assignment/handoff vẫn chờ server. Double click cùng action dùng cùng logical intent và in-flight guard.

## 7. Offline và recovery

Mất mạng: banner offline, đọc tạm dữ liệu đang ở memory với asOf; disable writes, secrets/provision/publish. Giữ form local memory trong session khi hợp lý, nhưng không gửi ngầm khi mạng trở lại. Reload có thể mất draft và phải được báo, không hứa offline support đầy đủ.

Trở lại online: refresh session/scope trước query, reconnect stream rồi refetch snapshots khi cần. Command pending được server tra lại; không tái tạo mutation từ component mount. Cleanup timers/listeners/subscriptions khi đổi scope; stress test 50 lần chuyển shop để tìm leak.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.


---

<!-- SOURCE: docs/10_TESTING_ACCEPTANCE.md -->

# 10 — Kiểm thử và tiêu chí nghiệm thu

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Levels of proof
Kit validator: files, references, JSON/schema, tracker corruption handling. Prototype tests: rendered UI and local state interactions. Local product: actual React/Nest/database/worker source+network; mocked external adapters labeled. Staging integration: granted provider accounts and actual devices. Production readiness: security, concurrency, observability, recovery and business approval on release artifact. No level substitutes for another.

## Mandatory families
Contract response/request validation; tenant read/write/callback/search/export tests; concurrency last-stock/order claim/budget/period close; property ledger money/journal balance; state transitions and out-of-order events; unknown side-effect reconciliation; queue restart/redis-loss/outbox replay; knowledge injection/stale revocation; privacy deletion and restore. UI focus/keyboard/responsive/zoom/offline/stale/failed/unknown/403 across all enabled routes. Fake adapter tests must throw/timeout/accept-then-timeout, not only success.

## Golden business fixtures
Sale: 10 units at 100000 VND cost, sell 2 at 150000, COD carrier fee 20000 and remit 280000. Gross margin 100000, management profit 80000, AR carrier zero only after full settlement, cash independent of inventory acquisition. Purchasing: suggestion after threshold with an existing open PO, partial receipt and damaged unit. Returns: one sold unit returning, no available until inspected, refund obligation independent of cash transferred. Explicit examples in fixtures/finance-golden.json and docs/24.

## Evidence schema and gates
Use execution/plan.json per-checkpoint evidence kind; real-device steps require real device info/observations, not screenshot of phone frame. `execution/progress.json` initially zero. Validator checks evidence path/hash and source snapshot and command registration. It cannot know whether someone fabricated observed output; reviewer/CI needs actual checks. A skip/unrun/zero-test success cannot pass mandatory test. Missing external account or budget is BLOCKED only relevant task; ready independent tasks can proceed.

Feature scenarios SC2-A01…SC2-H08 are intended tests, NOT test results. Core v1 scenarios are historical until mapped in T062/T066. Mandatory acceptance route×operation×invariant matrix produced from actual tests, no screenshot-only coverage. Mutation tests must catch removing guard/dedupe/tenant checks. Re-run impacted checks after source/contract/policy/dependency merge changes; stale evidence cannot count. No arbitrary coverage percentage replaces behavioral tests.


Core regressions hiện hành: fixtures/core-acceptance-scenarios.json (55 SC-*); bổ sung scope A–H: fixtures/acceptance-scenarios.json (64 SC2-*); code/dark QA: governance/acceptance-scenarios.json. Tất cả là đặc tả NOT_RUN_PRODUCT_TEST cho đến khi task tương ứng có evidence thật.

## Cổng màu đã duyệt

QA-025..030 ở governance/acceptance-scenarios.json bổ sung cho QG-04/05/06/07/12: quyết định và hash token đúng; output không drift; semantic colors không tráo nghĩa; boot/portal/mobile cùng theme; giữ tiến độ và ngoại lệ accessibility. Các ca sản phẩm vẫn NOT_RUN_PRODUCT_TEST. `scripts/validate-release.py` chỉ kiểm đồng bộ artifact trong kit; source/app thật phải được kiểm ở T010 và các task liên quan.


---

<!-- SOURCE: docs/11_DELIVERY_MULTI_AGENT.md -->

# 11 — Phối hợp AI và bàn giao không lệch code

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

One coordinator owns canonical contracts, routing root, design tokens, lockfile, migrations and CI. Default task loop is sequential. Do not spawn multiple agents or copy tracker branches and assume tasks locked globally. A .progress.lock prevents concurrent writes to THIS file in THIS filesystem only. Parallel branch work needs real coordinator assignment, isolated worktree/db ports/queues and integration authority. Do not auto-steal abandoned task.

Before task start read task card + direct dependencies evidence + real code, list exact write scope and source revision. Public interface change first updates canonical contract, generation and consumers; don't handwrite temporary DTO in each module. Missing requirement not excuse to invent a second UI kit or global utils service. Follow CODE rules and target repo formatting, not subjective redesign.

Each handoff records actual changed paths, commands/cwd/exit/test counts, artifact digest, unresolved issues and next eligible task. New session verifies source and stale evidence before resume; no trust in chat memory over repo. Do not keep retrying failed command infinitely or ask owner to repeat approved A–H scope. Ask only real material inputs when necessary; document blockers and continue unrelated ready tasks.

Agent can work through eligible tasks within granted local repo tools and active session. This plan is not a daemon: after session/tool/compute ends, save SESSION_HANDOFF. Do not promise background development or automatic continuation without an actual configured runner. No force push/merge/deploy/production mutation inferred from file presence.


---

<!-- SOURCE: docs/12_OPERATIONS_RELEASE.md -->

# 12 — Hạ tầng, CI/CD và vận hành thực tế

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Environments
Local: isolated Postgres/Redis/object storage development alternatives + fake providers; explicit synthetic seed and IdP. Staging: actual granted service accounts, approved test users/devices, no customer dataset copying by default. Production: separate secrets, DB/buckets/queues/region, validated policy and enabled capability set. Vercel may host static web/PWA; long-lived workers need suitable process hosting and persistent backing stores, not relying on open browser or short HTTP function. Exact provider/cost/region permission at T067; do not provision merely because plugin connected.

## Operational objects
Health checks distinguish liveness (process) vs readiness (can serve relevant feature). Provider last check can be unknown/stale; healthy must expire. Metrics: queue oldest age/retry/unknown counts, confirmation failures, inventory negative-check attempts, unsettled COD, failed notifications, auth rejections, AI tokens/cost estimate/actual. Logs correlate command/shop/trace, redact content. Alert assignee and approved hours configured; no assumed around-the-clock staff.

## Deployment order
Schema additive → compatible API/worker → backfill from evidence → verify source/derived sums → new UI → drain old workers → retire contract fields after approved usage window. Build once, promote same digest; images and tool versions pinned. Production source maps restricted. Migration rollback must not drop new valid data. Kill switch configuration rollback tested separately from artifact rollback.

## Release gates
T066: complete local feature coverage. T072: actual external staging chain. T078: release candidate with security/load/restore evidence on intended digest. T079: business/country/currency/recognition/retention settings reviewed. T080: actual owner UAT and devices. T081: explicit release permission. T082–084: controlled deployment, actual post-deploy checks and handover. 100% documentation/mock coverage does not satisfy any live gate.

## Runbooks required
Meta/provider key compromise: disable/rotate/revoke, bound impact audit, no keys copied to ticket. Bot wrong/out-of-control cost: pause generation, inspect already accepted/unknown sends, stop future effects, roll back reviewed config. Notification unseen: delivery observation vs ack, check device revoked/quiet hours, fallback only policy. Purchase unknown: query supplier/ref, human verify, never blind resend. Stock drift: freeze affected SKU allocation, reconcile movement, controlled correction. Finance mismatch: block close/post of disputed resource, reconcile source, reversal not delete. Queue loss: rebuild from outbox/commands, idempotent consumers. Restore: isolated DB/object check, reapply deletion tombstones, reconcile external effects before activation.

SLO/RPO/RTO/traffic/retention targets remain owner inputs with reason; use synthetic performance benchmark labels until approved. Never call backup restore “tested” when only schedule was created. Maintenance schedules are proposals unless scheduled by authorized actual service/tool.


---

<!-- SOURCE: docs/13_EXTENSION_AND_MIGRATION.md -->

# 13 — Nâng cấp từ 1.1 và mở rộng về sau

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Changes requiring real migration analysis
V1 demo's fulfill combined dispatch and delivered; v2 splits commercial/preparation/shipment/payment. Historical real rows cannot be auto-tagged delivered from that field alone. Use carrier/customer evidence or hold unknown/manual review. V1 full-only returns become line partial returns with refund obligations. V1 expense read model becomes source-based journal financial reports. V2 APIs reside /api/v2; mutation snapshots and approval intent hashes must include updated schema/policy versions.

64 feature IDs remain A01–H08; R01–R36 keep navigation meaning, R37–R54 extend. Operation names for obsolete password login/fulfill routes mapped in contracts/migration-map.json. Legacy schemas unused by new operations may remain for DTO archaeology only if explicitly deprecated; do not expose unsafe old behavior in new app. Source archive is not a second execution plan.

Brownfield intake must inspect actual code/data/consumers; preserve instructions, uncommitted work and existing customizations. Work in slices and tests; no blind overwrite by extracting full kit into active source paths. Greenfield copy kit into `botsales-kit/`; AI creates app outside prototype folder. If user has universal AI files at root, compare hash and reference original instead of altering it.

New feature process: approved requirement → ownership → typed contract/permission → invariants/events → UI/API/worker implementation → tests/evidence → rollout/migration. New plan tasks require approved scope/version/weight migration; do not silently reduce denominator or delete failed tasks to improve percentage. Existing evidence affected by source change marked stale. Growth by adding bounded modules, not sprinkling cross-module state or generic custom rule language.


SC-008/022/026/027/044 được chuyển kỳ vọng v2 tại fixtures/core-acceptance-scenarios.json. Bỏ đường tắt returnOrder; tạo case/kiểm hàng riêng. payOrder/refundOrder chỉ ghi nhận khoản đã được xác minh, có evidenceRef, không thực thi chuyển tiền.

## Tiếp nhận gói màu 2.1.1

Xem `UPGRADE.md` cho repo mới và repo đang chạy. Palette giữ nguyên 2.1, nghiệp vụ/API không đổi; chỉ hướng dẫn màu/nguồn sinh/đầu vào kế hoạch được đồng bộ. Giữ task states, owner-inputs thật và evidence; xét stale theo phần bị ảnh hưởng, không xóa tracker để bắt đầu lại.


---

<!-- SOURCE: docs/14_IMPLEMENTATION_BACKLOG.md -->

# 14 — Kế hoạch triển khai có thể thực thi theo từng bước

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Nguồn đầy đủ: `../IMPLEMENTATION_PLAN.md` (generated from execution/plan.json + progress.json) và `../execution/tasks/T001.md`…`T084.md`. Tổng 14 giai đoạn, 84 task, 420 checkpoint. Mỗi task có dependency rõ, feature IDs, readFirst, vùng sửa, outputs, 5 bước cụ thể và ca từ chối/lỗi. Không dùng lại backlog 23 task của v1.1.

## Loop bắt buộc
1. Xác minh source/worktree/tool quyền. Đọc START_HERE, Universal, AI_RULES_PROJECT và task hiện tại.
2. Chạy tracker validate/status/next. next chọn task có mọi dependency được kiểm chứng và không BLOCKED, theo priority. Không tự nhảy task vì màn hình đó dễ.
3. `start TASK OWNER`; đọc actual files/scope, rồi thực hiện từng S01–S05 đúng thứ tự. Nối contract/data/test trước khi làm trang hàng loạt.
4. Ghi evidence JSON/log/source hashes cho mỗi bước đã thực sự đạt; `checkpoint` từ chối thiếu/sai loại/hash/dep.
5. Report tự sinh %; nếu input thiếu thì `block TASK reason`, chọn task độc lập tiếp theo. Không biến mock thành live PASS. Hết phiên thì handoff và lời resume.

## Tiến độ
Một task có checkpoint weights 1/3/2/2/2; task % = tổng trọng số bước VERIFIED còn hiệu lực / 10. Mỗi phase 6 task, weighted equally by checkpoint totals; project % = tổng phase weight × phase verified ratio. Trọng số phase tổng 100%. Đây là tỷ lệ nghiệm thu phạm vi đã lập, không phải ước lượng thời gian hoặc % code lines. STALE/BLOCKED/NOT_STARTED không tự sinh điểm. Done task cũng mất hiệu lực nếu nguồn/hash/dependency thay đổi.

Đặt file tracker JSON và evidence vào version control khi được phép commit. Local lock không khóa tracker ở máy/branch khác. Actual required tests/review remain ground truth; script chỉ giúp phát hiện cập nhật sai cấu trúc/hash và giảm tự báo phần trăm tùy ý.


---

<!-- SOURCE: docs/15_RISKS_DECISION_REGISTER.md -->

# 15 — Rủi ro, dữ kiện còn thiếu và chặn đúng chỗ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Design decisions already approved: A–H scope, dark-only, four roles, PWA+Telegram, bounded automatic order confirmation, purchase draft default, professional management finance, no autonomous bank transfer or ad spend. Do not re-ask these each session.

Unknowns are explicit at execution/owner-inputs.json: country/base currency/hours/actual responsible people/hosting budget+region/IdP/Meta+AI grants/device consent/carrier+supplier mode/finance policy/purchase cap/retention/workload+SLO+recovery/release authority. AI resolves harmless reads when possible before asking. Null means unknown, not zero or not applicable. Concrete provider credentials cannot be synthesized from public docs.

Risk responses: no phone ack means unclaimed task, not assumed seen; no data to forecast means static threshold with label; no exact bank matching means review, not guessed paid; unknown supplier send means reconcile, not new PO. User marketing freedom does not remove human physical fulfillment or authorization accountability. 24/7 target depends actual infra/on-call/service policies; no uptime warranty in doc.

Input gates block specific live actions, not local implementation of adapters/simulators. Missing legal approval for live ledger does not stop dark UI/layout/typed local tests. Missing budget for auto_send keeps draft mode functional and must not lead to unlimited budget. Feature explicitly deferred/disabled can only leave mandatory plan with new scoped approval and history; not by changing required=false to make completion higher.


---

<!-- SOURCE: docs/16_SOURCES.md -->

# 16 — Nguồn và giới hạn chứng cứ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Nguồn kiểm tra khi chuẩn hóa v2
Truy cập 29/09/2026. Chỉ dùng nguồn chính thức cho điểm kỹ thuật liên quan. Đây không phải certification hay kiểm chứng rằng account người dùng đã có capability. Các choices kiến trúc, trọng số tiến độ, task và UI là quyết định thiết kế cho dự án, không là con số từ nguồn ngoài. Khi thực hiện T003/T037/T068–071 kiểm lại đúng phiên bản tài khoản/thư viện.

- **[N01] NestJS modules / encapsulated public exports** — https://docs.nestjs.com/modules
- **[N02] NestJS queues / persisted workers** — https://docs.nestjs.com/application/queues
- **[N03] Node.js release status / LTS baseline** — https://nodejs.org/en/about/previous-releases
- **[N04] Prisma transactions and idempotent/OCC patterns** — https://docs.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- **[N05] PostgreSQL RLS and locking** — https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **[N06] BullMQ idempotent jobs** — https://docs.bullmq.io/patterns/idempotent-jobs
- **[N07] BullMQ stalled workers / replay conditions** — https://docs.bullmq.io/guide/workers/stalled-jobs
- **[N08] WebKit Home Screen Web Push support and user gesture** — https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- **[N09] Telegram Bot API / callbacks** — https://core.telegram.org/bots/api
- **[N10] Official Meta Messenger collection / message eligibility** — https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api
- **[N11] OWASP Excessive Agency / downstream authorization** — https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
- **[N12] OWASP ASVS / application security verification** — https://owasp.org/www-project-application-security-verification-standard/
- **[N13] IAS 2 inventories / matching cost with revenue** — https://www.ifrs.org/issued-standards/list-of-standards/ias-2-inventories/
- **[N14] MUI dark mode configuration** — https://mui.com/material-ui/customization/dark-mode/

## Sổ nguồn kế thừa 1.1
Các mục Sxx sau được giữ cho provenance của các quy tắc/UI kế thừa; không tuyên bố đã tái kiểm toàn bộ trong v2.

# 16 — Nguồn và phạm vi sử dụng

Ngày đối chiếu: 29/09/2026. Nội dung thiết kế là baseline đề xuất; nguồn tham khảo không chứng nhận ứng dụng đã production-ready.

## Nghiên cứu nội bộ đã đọc

- Tóm tắt điều hành(3), Library file `file_000000005ba481fb98c619a521620fb4`: yêu cầu sản phẩm, dark UI và định hướng kiến trúc.
- Tóm tắt điều hành(1), Library file `file_000000003cd0820993ce47d6e25176a8`: phạm vi bot, kho và tài chính.
- URL share do chủ dự án đưa chỉ đọc được tiêu đề, không đọc được toàn bộ hội thoại. Không khẳng định kit tái hiện mọi quyết định cuối trong share. Các điểm được chuẩn hóa mới nêu ở docs/00.

## Nguồn chính thức

### S01 — React: Creating a React App

https://react.dev/learn/creating-a-react-app

Trạng thái: Đã truy cập. Phạm vi sử dụng: Framework là hướng khuyến nghị chung; chọn SPA có chủ đích, không gán Vite thành lựa chọn enterprise bắt buộc.

### S02 — React: Build a React app from Scratch

https://react.dev/learn/build-a-react-app-from-scratch

Trạng thái: Đã truy cập. Phạm vi sử dụng: Build tool Vite và trách nhiệm routing/data fetching khi tự tổ hợp SPA.

### S03 — TypeScript: strict

https://www.typescriptlang.org/tsconfig/strict.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: Bật họ kiểm tra kiểu strict; không thay thế runtime validation.

### S04 — TanStack Query: Query Keys

https://tanstack.com/query/latest/docs/framework/react/guides/query-keys

Trạng thái: Đã truy cập. Phạm vi sử dụng: Query key chứa các biến ảnh hưởng dữ liệu; tenant scope là thiết kế của kit.

### S05 — Material UI: Dark mode

https://mui.com/material-ui/customization/dark-mode/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Dark-only theme và tùy biến palette.

### S06 — W3C: WCAG 2.2

https://www.w3.org/TR/WCAG22/

Trạng thái: Đã đối chiếu nội dung WCAG 2.2 từ W3C. Phạm vi sử dụng: Contrast, keyboard, focus, target size; cần audit thực tế.

### S07 — OpenAPI Specification 3.1.0

https://spec.openapis.org/oas/v3.1.0.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: Chọn 3.1.0 vì hợp đồng/toolchain, không tuyên bố đây là phiên bản mới nhất.

### S08 — RFC 9457: Problem Details for HTTP APIs

https://www.rfc-editor.org/rfc/rfc9457.html

Trạng thái: Đã truy cập. Phạm vi sử dụng: application/problem+json và extension lỗi nghiệp vụ.

### S09 — OWASP ASVS

https://owasp.org/www-project-application-security-verification-standard/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Tham chiếu kiểm soát bảo mật; không có chứng nhận tuân thủ tự động.

### S10 — OWASP GenAI: LLM01 Prompt Injection

https://genai.owasp.org/llmrisk/llm01-prompt-injection/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Tài liệu/hội thoại truy xuất là dữ liệu không tin cậy, không phải lệnh.

### S11 — Playwright: Best practices

https://playwright.dev/docs/best-practices

Trạng thái: Đã truy cập. Phạm vi sử dụng: Test hành vi người dùng, isolation và locator có ý nghĩa.

### S12 — Mock Service Worker: Documentation

https://mswjs.io/docs/

Trạng thái: Đã truy cập. Phạm vi sử dụng: Mock tại ranh giới network, dùng lại trong môi trường test.

### S13 — Meta Messenger policy overview

https://developers.facebook.com/docs/messenger-platform/policy/policy-overview/

Trạng thái: Truy cập bị HTTP 429; CHƯA xác minh policy hiện hành. Phạm vi sử dụng: Release owner phải xác minh version, quyền, app review, window và loại tin trước kết nối thật.

## Quy tắc cập nhật

Trước khóa dependency và tích hợp thật, kiểm lại tài liệu chính thức/compatibility, ghi ngày và exact version. Không lấy model price, Graph version hoặc quy định pháp lý cũ trong nghiên cứu làm dữ liệu hiện hành. Hạn chế truy cập Meta là blocker được ghi rõ, không phải bằng chứng chính sách không tồn tại.

## Nguồn bổ sung đã đối chiếu trong 1.1 (29/09/2026)

S03 (strict) và S05 (MUI dark-only) được mở lại trong lần này. Các nguồn khác từ
1.0 giữ như provenance của lần bàn giao trước, không nhận đã kiểm lại tất cả.

| ID | Nguồn chính thức | Dùng cho |
|---|---|---|
| S14 | MDN: color-scheme — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme | CSS/native controls, head metadata; không tự theme mọi component. |
| S15 | Playwright: Emulation — https://playwright.dev/docs/emulation | Color-scheme/media emulation; chỉ phương pháp, chưa chạy UI. |
| S16 | TypeScript: noUncheckedIndexedAccess — https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html | Kiểm truy cập index, riêng với strict. |
| S17 | TypeScript: exactOptionalPropertyTypes — https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html | Phân biệt optional và undefined theo cấu hình. |
| S18 | MUI: Palette — https://mui.com/material-ui/customization/palette/ | primary.light là sắc độ, không là theme mode. |
| S19 | ESLint: Custom Rules — https://eslint.org/docs/latest/extend/custom-rules | Tham khảo AST-based enforcement; chưa cấu hình linter app trong kit. |

Nguồn nội bộ mới: file AI_RULES.md 3.1 do người dùng đính kèm, giữ nguyên; trực tiếp
yêu cầu dark-only và thống nhất code/AI ngày 29/09/2026. Thông số kỹ thuật/stack
trong quy tắc project là baseline triển khai, không biến thành yêu cầu Universal.

## Nguồn thị giác 2.1 — kiểm ngày 29/09/2026

- VIS-01 — Binance, trang chính thức: https://www.binance.com/en . Tham chiếu bối cảnh nhận diện/điểm nhấn ấm; không khẳng định mã HEX chính thức. Web đọc được trang; trình duyệt tự động trong môi trường này bị chặn truy cập trang live.
- VIS-02 — Bybit Press, 24/09/2026, mô tả điểm nhấn cam trong visual identity: https://www.bybit.com/en/press/post/bybit-unveils-make-your-move-as-new-global-brand-campaign-for-the-new-financial-platform-bb81b32d32e08542c5b . Chỉ tham chiếu ý tưởng điểm nhấn ấm, không sao chép biểu tượng chữ I. Trang live trong browser bị chặn; không tuyên bố đối chiếu pixel của Bybit.
- VIS-03 — Coinbase Design System / Colors: https://cds.coinbase.com/getting-started/colors . Tham chiếu cách tách foreground/background/semantic status và vai trò token; không thêm CDS dependency hoặc hệ thống multi-theme.
- VIS-04 — W3C / Contrast Minimum: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html . Căn cứ mục tiêu tương phản 4.5:1 cho chữ thường. Kiểm token không phải chứng nhận toàn ứng dụng.

Thiết kế mới là lựa chọn riêng của dự án. Không dùng bài viết cộng đồng hay bản trích design.md không chính thức để xác nhận giá trị brand color.


---

<!-- SOURCE: docs/17_TRACEABILITY.md -->

# 17 — Truy vết yêu cầu → màn hình → kế hoạch → kiểm thử

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Sinh từ feature-catalog.json bằng scripts/generate-reference.py. Đây là liên kết đặc tả, không là bằng chứng đã chạy.

| Yêu cầu | Màn hình | Task | Kịch bản |
|---|---|---|
| A01 — Đăng ký thiết bị nhận thông báo | R40 | T033, T034, T066, T070 | SC2-A01 |
| A02 — Báo đơn đủ điều kiện chuẩn bị | R39 | T031, T033, T036, T072 | SC2-A02 |
| A03 — Mở đơn an toàn từ thông báo | R39 | T034, T061, T070 | SC2-A03 |
| A04 — Xác nhận nhận chuẩn bị | R39 | T031, T036, T070, T080 | SC2-A04 |
| A05 — Nhắc hạn và dự phòng | R40 | T034, T056, T070 | SC2-A05 |
| A06 — Loại thông báo và lịch trực | R40 | T034, T070 | SC2-A06 |
| A07 — Theo dõi gửi/mở/nhận việc | R39 | T033, T034, T070 | SC2-A07 |
| A08 — Chống trùng và bảo vệ thông báo | R40 | T033, T034, T070 | SC2-A08 |
| B01 — Kịch bản tư vấn theo ngành hàng | R06 | T038, T039, T066 | SC2-B01 |
| B02 — Giá/tồn từ dữ liệu nghiệp vụ | R06 | T019, T024, T040, T041, T069 | SC2-B02 |
| B03 — Thu thập và xác nhận đặt hàng | R06 | T021, T024, T025, T026, T029, T041 | SC2-B03 |
| B04 — Tự chốt đơn có điều kiện | R06 | T023, T026, T030, T041, T069, T072 | SC2-B04 |
| B05 — Bán kèm theo chương trình | R06 | T041 | SC2-B05 |
| B06 — Chăm sóc sau mua | R54 | T038, T042 | SC2-B06 |
| B07 — Bot/người thật tiếp quản | R06 | T037, T038, T069 | SC2-B07 |
| B08 — Bình luận/ảnh/tin thoại | R06 | T037, T042, T069 | SC2-B08 |
| C01 — Bảng chuẩn bị hàng | R41 | T029, T031, T036, T061, T066, T080 | SC2-C01 |
| C02 — Phiếu lấy hàng theo SKU | R41 | T032 | SC2-C02 |
| C03 — Kiểm đóng gói | R41 | T032 | SC2-C03 |
| C04 — Phí và vùng giao hàng | R42 | T027, T035 | SC2-C04 |
| C05 — Vận đơn và bàn giao | R42 | T032, T035, T071 | SC2-C05 |
| C06 — Trạng thái giao độc lập | R42 | T025, T035, T036, T062, T071, T072 | SC2-C06 |
| C07 — Đổi/trả từng phần | R43 | T035, T062 | SC2-C07 |
| C08 — Sửa/hủy theo giai đoạn | R43 | T023, T025, T026, T029, T030 | SC2-C08 |
| D01 — Tồn theo trạng thái và SKU | R47 | T013, T020, T022, T047, T066 | SC2-D01 |
| D02 — Nhà cung cấp hàng hóa | R44 | T043, T048 | SC2-D02 |
| D03 — Quy tắc nhập lại | R45 | T022, T043, T044, T048 | SC2-D03 |
| D04 — Nguy cơ hết hàng | R45 | T044, T048 | SC2-D04 |
| D05 — Vòng đời đơn mua | R46 | T045, T046, T048, T071, T080 | SC2-D05 |
| D06 — Tự gửi đơn mua có giới hạn | R46 | T045, T046, T048 | SC2-D06 |
| D07 — Ngăn đặt trùng và vượt vốn | R45 | T044, T045, T046, T048 | SC2-D07 |
| D08 — Nhận và đối chiếu hàng | R47 | T047, T048, T071, T072 | SC2-D08 |
| E01 — Chứng từ và sổ kép | R48 | T013, T028, T030, T047, T054, T066 | SC2-E01 |
| E02 — Giá vốn và lợi nhuận | R48 | T028, T035, T036, T049, T054, T062, T079 | SC2-E02 |
| E03 — Chi phí và phân bổ | R48 | T049, T051, T054 | SC2-E03 |
| E04 — Đối soát ngân hàng | R49 | T027, T050, T054, T071 | SC2-E04 |
| E05 — Đối soát COD | R49 | T027, T051, T054, T071, T072 | SC2-E05 |
| E06 — Công nợ | R50 | T047, T049, T050, T051, T052, T054 | SC2-E06 |
| E07 — Khóa kỳ và điều chỉnh | R50 | T052, T054, T079 | SC2-E07 |
| E08 — Báo cáo và hỏi đáp có nguồn | R22 | T053, T054, T064, T080 | SC2-E08 |
| F01 — Bốn vai trò AI | R51 | T040, T055, T057, T060, T066 | SC2-F01 |
| F02 — Bảng công việc chung | R37 | T031, T056, T060, T072 | SC2-F02 |
| F03 — Giám sát ngoại lệ | R37 | T056, T060 | SC2-F03 |
| F04 — Hàng chờ duyệt | R38 | T045, T055, T060 | SC2-F04 |
| F05 — Ủy quyền | R38 | T015, T041, T055, T057, T060 | SC2-F05 |
| F06 — Bản tin chủ shop | R52 | T056, T060, T080, T084 | SC2-F06 |
| F07 — Trạng thái hệ thống | R37, R52 | T059, T060 | SC2-F07 |
| F08 — Đánh giá chất lượng | R52 | T042, T059, T060 | SC2-F08 |
| G01 — Onboarding vận hành | R33 | T002, T010, T011, T014, T018, T059, T063, T066, T068, T079 | SC2-G01 |
| G02 — Nội dung sản phẩm | R33 | T019, T020, T024, T039 | SC2-G02 |
| G03 — Chính sách phiên bản | R33 | T039, T063 | SC2-G03 |
| G04 — Hồ sơ khách liên kết | R54 | T021, T038 | SC2-G04 |
| G05 — Consent và ngừng liên hệ | R33 | T021, T063, T075, T079 | SC2-G05 |
| G06 — Vòng cải thiện có duyệt | R33 | T039, T042, T063 | SC2-G06 |
| G07 — Thông tin marketing cho chủ shop | R53 | T053, T058, T064 | SC2-G07 |
| G08 — Hiệu quả chiến dịch | R53 | T053, T058 | SC2-G08 |
| H01 — Worker phía máy chủ | R52 | T007, T017, T037, T066, T067, T074, T076, T082 | SC2-H01 |
| H02 — Kill switch | R51 | T057, T076, T083 | SC2-H02 |
| H03 — Chi phí và failover | R51 | T017, T040, T057, T069, T074, T076 | SC2-H03 |
| H04 — Chống trùng và phục hồi | R52 | T009, T016, T017, T023, T028, T030, T036, T037, T046, T050, T062, T065, T072, T076, T083 | SC2-H04 |
| H05 — Quyền xuyên mọi entrypoint | R34 | T004, T008, T009, T011, T013, T014, T015, T018, T055, T061, T064, T065, T068, T073, T078 | SC2-H05 |
| H06 — Audit | R34 | T002, T004, T006, T016, T073, T084 | SC2-H06 |
| H07 — Phòng thử | R34 | T001, T003, T005, T006, T007, T008, T010, T012, T065, T073, T077, T078 | SC2-H07 |
| H08 — Khôi phục và readiness | R52 | T001, T003, T005, T059, T067, T074, T075, T077, T078, T079, T081, T082, T083, T084 | SC2-H08 |


---

<!-- SOURCE: docs/18_CODING_STANDARDS.md -->

# 18 — Chuẩn code thống nhất cho BotSales AI

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Các quy định dưới đây cụ thể hóa yêu cầu mới về thống nhất code. Không chỉnh Universal,
không tự chứng nhận sản phẩm. Áp dụng trong phạm vi đã được giao; stack greenfield
kế thừa docs/02, không áp đặt lại cho repo đang làm dở.

## 1. Cách dùng chuẩn và thẩm quyền

CODE-001 — Một nguồn chuẩn cho mỗi loại thông tin. HTTP: contracts/openapi.json (canonical), openapi.yaml sinh cùng dữ liệu;
route: route-manifest.json; quyền: permission-catalog.json; token: design/tokens.json;
bất biến nghiệp vụ: docs/05; chính sách code: tài liệu này; theme: docs/19. Mã sinh
là đầu ra, không phải nguồn song song. governance/project-policy.json là tóm tắt máy
đọc được; có mâu thuẫn phải sửa đồng bộ, không tự chọn bản thuận tiện.

CODE-002 — T001–T007 khảo sát stack, hướng dẫn, manifest/lockfile, CI, module, auth và diff
thật. STACK_LOCK phải ghi framework/router/UI/query/form/schema/i18n/test runner,
phiên bản chính xác, package manager, Node target, lý do và nguồn kiểm chứng. Không
ghi "latest" như version, không tạo lockfile bằng phỏng đoán, không cài hai lựa chọn
để agent tự chọn. Không phải mọi tên công cụ ở ví dụ đều phải cài vào repo cũ.

CODE-003 — Một thay đổi = một mục tiêu và phạm vi có căn cứ. Áp dụng Change Budget
Universal 10 và Complexity/Abstraction Gate 9.1 trước thay đổi làm tăng bảo trì.
Không generic CRUD engine, plugin framework, microfrontend, global event bus, DI
container hoặc các package rỗng vì dự đoán tương lai. Một rủi ro thật có thể đủ để
tạo ranh giới; không bắt buộc phải có đúng hai use-case. Không thêm wrapper chỉ đổi tên.

## 2. Cấu trúc và phụ thuộc

CODE-004 — Theo cấu trúc docs/02. App chỉ bootstrap/provider/router/composition.
Nghiệp vụ nằm trong modules/<module>/{api,model,ui}. shared chỉ chứa cơ chế không
phụ thuộc nghiệp vụ. Không tạo thư mục services/utils/components cấp toàn app làm
nơi chứa hỗn hợp đơn hàng, kế toán và chatbot.

CODE-005 — Trong FRONTEND, Module X không import module Y, kể cả public index của Y. Backend giao tiếp qua public application ports và cùng transaction context theo docs/02, không nhập private repository của module khác. App composition
được ghép public API của X và Y. Không deep import từ app vào nội bộ module. Cấm
cycle, kể cả qua barrel, dynamic import và alias. Type-only import cũng chịu ranh
giới kiến trúc trừ hợp đồng công khai đặt ở contracts. Công cụ graph phải resolve
alias/relative paths đúng tsconfig, không chỉ grep tên thư mục. Các ca QA-007..009
kiểm tra hiệu lực luật; rule không được im lặng bỏ qua file không parse được.

CODE-006 — Public export dùng tên rõ; không export * mọi file. Component dùng
PascalCase.tsx, hook useX.ts, model/API helper camelCase.ts, thư mục module lowercase.
Test đặt cạnh phần được test khi cục bộ; E2E/cross-module ở tests. Repo cũ giữ kiểu
đặt tên đang có đã được chấp nhận, ghi mapping thay vì format toàn repo. Identifier
code tiếng Anh; copy UI tiếng Việt qua i18n keys. Formatter quyết định quote,
semicolon, indent; không để từng AI tranh luận hay dùng formatter khác.

## 3. TypeScript và ranh giới dữ liệu

CODE-007 — Greenfield bật strict; thêm noUncheckedIndexedAccess và
exactOptionalPropertyTypes sau khi kiểm tương thích toolchain. Hai tùy chọn bổ sung
không được coi là tự bật chỉ vì strict [S03, S16, S17]. Các cấu hình include/exclude
phải bao phủ source nghiệp vụ, không lách bằng exclude module lỗi. Repo cũ ghi
baseline và kế hoạch nâng an toàn theo thành phần; không hạ tiêu chuẩn hiện hữu.

CODE-008 — unknown ở ranh giới không tin cậy, parse/validate rồi mới dùng. Không any,
as any, @ts-ignore hoặc non-null assertion để bỏ qua dữ liệu thiếu. Ngoại lệ bắt
buộc do SDK phải có issue, phạm vi hẹp, lý do, test và người nhận trách nhiệm thật;
@ts-expect-error chỉ dùng khi chứng minh lỗi kiểu cụ thể và kiểm tra nó không còn
cần thiết sau nâng version. Không `catch { return [] }` biến lỗi thành empty success.

CODE-009 — DTO sinh từ contract đã khóa; API mapper xử lý request/response và chuyển
sang view model khi có nhu cầu. Không khai báo lại Product/Order/Money để né lỗi
contract. Schema form chỉ kiểm trải nghiệm form, không là bản API schema thứ hai.
Optional (vắng trường) khác null (giá trị rỗng có nghĩa). Enum mới từ server phải
đi vào trạng thái hỗ trợ an toàn/unsupported; không map ngầm thành trạng thái tốt.

CODE-010 — Money là decimal string + currency; ID là opaque string; thời điểm API
UTC ISO 8601, hiển thị theo timezone shop. Không Number(amount) để tính tiền, không
làm tròn/cộng tiền ở nhiều component khác nhau. preview dùng helper đã chọn hoặc
quote từ backend; backend quyết định số thực. Giá vốn thiếu hiển thị "Chưa có dữ
liệu", không chuyển thành 0. Giá trị snapshot quá khứ không bị thay bằng giá mới.

## 4. React, truy cập dữ liệu và trạng thái

CODE-011 — Component trình bày nhận dữ liệu/intent; API IO ở module api và transport
chung. Model thuần không gọi mạng/DB/browser storage. Không dùng useEffect để sao
chép server entities hoặc tính state có thể suy ra trong render. Effect có lý do
IO/subscription và cleanup; không tắt exhaustive-deps để che vấn đề vòng đời.

CODE-012 — Một cache server-state (baseline TanStack Query), form state ở React
Hook Form, state chia sẻ được trong URL qua router, state UI ngắn hạn cục bộ.
Không sao chép cùng danh sách sản phẩm vào context + Redux + query. Mọi query key
phản ánh scope principal/shop/permissionVersion và filters/pagination ảnh hưởng
kết quả; không đưa key, token hoặc nội dung PII vào URL/query key có thể bị log.
Scope change hủy request, đóng streams và loại response cũ [xem docs/09].

CODE-013 — HTTP client xử lý base URL, session credentials, request ID, AbortSignal,
problem details và retry có giới hạn. Module dùng API operationId được định nghĩa;
không fetch trực tiếp trong JSX, không hardcode endpoint trên từng màn hình. Cấm
retry mù lệnh có tác động, fallback ngầm về MSW, hoặc báo thành công cho 202 chưa
hoàn tất. Authentication/cookie/CSRF theo backend thực, không tự nhét JWT storage.

CODE-014 — Command rủi ro không optimistic: xác nhận đơn, trừ kho, thu/chi, hoàn tiền,
post/reversal, publish AI, đổi quyền. Khi timeout, giữ command ID/idempotency key,
đọc lại trạng thái có thẩm quyền. Command khác biệt mới được cấp key mới. Cập nhật
thông thường dùng version/ETag theo contract và UI giải quyết xung đột. Mất mạng
không đồng nghĩa thất bại; không nút "Gửi lại" tạo tác động mới khi chưa đối soát.

CODE-015 — Hiển thị đầy đủ trạng thái theo docs/04 và docs/10: loading, empty,
partial/error, forbidden, not-found, offline/stale, validation, submitting,
conflict và unknown outcome khi liên quan. Không spinner vô hạn, thành công giả,
KPI random, action rỗng hoặc reset input sau 422. React list dùng key ổn định từ ID;
không index key trên danh sách chỉnh sửa/reorder. Error boundary không lộ stack/PII.

## 5. UI và kiểm soát thư viện

CODE-016 — Mọi màn hình theo DARK-001..012; một theme dark được tạo ở nền tảng,
không tạo theme riêng trong module. Các token, breakpoint, typography, spacing,
z-index dùng nguồn chuẩn. MUI sx/styled được phép khi tham chiếu token/theme;
không trộn AntD/shadcn/Tailwind/Chakra chỉ vì làm một màn hình nhanh hơn. CSS cục bộ
hợp lệ cho bố cục đặc thù; màu biểu đồ cũng lấy token, không palette hardcode riêng.

CODE-017 — Không bọc mọi primitive. Shared component chỉ tập trung hành vi/design
thật dùng chung; cột, quyền, action và filter nghiệp vụ thuộc module. Props tránh
nhiều boolean tạo trạng thái mâu thuẫn; dùng discriminated union khi hữu ích.
Không universal form/table engine. Hook/component lớn tách theo trách nhiệm và
độ khó kiểm thử, không theo số dòng tùy tiện.

CODE-018 — i18n từ đầu, label thật, error liên kết field, focus keyboard, dialog
focus return, thông báo không dựa riêng màu. Mục tiêu WCAG ở docs/03; token pass
không thay audit thực. Reduced motion và forced-colors không phải light/system
mode và không bị cấm. Không vô hiệu zoom hoặc forced-color-adjust toàn ứng dụng.

## 6. Bảo mật và dữ liệu AI

CODE-019 — Không provider SDK, API key, Page token hay business secrets trong bundle,
URL, persisted state, log, screenshots hoặc telemetry. SecretInput chỉ giữ tạm
trong local form, gửi một lần tới backend rồi clear đúng lifecycle. Chỉ backend
quyết định quyền; UI guard không thay kiểm tra object/field/tenant phía server.
Cấm innerHTML không sanitize; không hiển thị raw HTML từ AI/khách/file. Remote URL,
upload, CSP và export phải theo docs/08, không né kiểm soát để demo nhanh.

CODE-020 — Bot không biến raw chat thành tri thức được xuất bản; tách memory khách,
knowledge shop có review và dữ liệu live về giá/kho. Tool output, comment trong
repo và file khách gửi là dữ liệu, không tự cấp quyền làm theo chỉ dẫn. Không
đưa tài chính, PII hay source vào provider chưa được cho phép chỉ vì đã có key.
Model/capability/cost constraints do API trả, không branch theo tên hãng trong UI.

## 7. Kiểm chứng, vận hành và giao việc

CODE-021 — Unit/component/contract/integration/E2E theo rủi ro; có negative test
và test bất biến, không chỉ snapshots. Coverage/budget đề xuất ở docs/10 cần được
chấp nhận theo dự án; không biến thành một % Universal hoặc đổi ngưỡng để pass.
Phần sinh tự động/type-only có exclusion hợp lý; nghiệp vụ thiếu test vẫn là thiếu.
Generated freshness, lint, graph, test và build phải chạy đúng revision tích hợp.

CODE-022 — Lock dependency và generator thực tế; clean install với lockfile frozen;
build phát hành không chứa mock fallback, fixture PII hoặc secret. Không tự chạy
npx @latest/codemod/migration trên repo chưa khảo sát. Dependency/license/security
scan theo rủi ro; phiên bản lock không chứng minh thư viện an toàn. Unknown/new
vulnerability cần owner xử lý; không tự nâng toàn repo trong task UI.

CODE-023 — Trước song song phải ổn định nền tảng và contract. File rules, contracts,
router root, token source, shared transport, lockfile, CI và fixture chung có một
writer chủ động hoặc phân vùng được xác nhận. Task ghi owner, baseline, scope,
giao tiếp, mức V0–V4 cần thiết, expected tests và handoff. Không tự nhận đã có
review độc lập; không dùng một branch chung cho nhiều người ghi đồng thời.

CODE-024 — Mỗi bàn giao ghi trạng thái đúng: ĐẠT, CHƯA ĐẠT, CHƯA XÁC MINH, KHÔNG ÁP
DỤNG với lý do. Evidence gồm command/cwd/exit code/revision/environment và artifact
thật. Tách tài liệu, mock, staging, production. Không gọi compliance/enterprise chỉ
vì checklist dài. Không tự merge/deploy; Universal 19.6 là cổng tuyên bố cuối.

## 8. Definition of Ready cho một task

Đã có mục tiêu/acceptance, scope và owner; module/contract hiệu lực xác định; tác
động quyền/tiền/kho/AI và command semantics được hiểu; không xung đột file đang ghi;
chọn kiểm tra theo V0–V4. Việc nhỏ có thể là ghi chú ngắn, không bắt tạo thêm tracker.
Chưa có input tối quan trọng thì chặn đúng phần, tiếp tục phần độc lập được phép.

## 9. Definition of Done cho một task

Hành vi và các trạng thái liên quan hoạt động đúng trong môi trường đã nêu;
contract/token/doc/test khớp; không import sai/cycle/secret; cổng liên quan chạy thực
và có test khiến vi phạm bị từ chối; diff không đè người khác; reviewer đúng phạm
vi nếu bắt buộc; bằng chứng và giới hạn được bàn giao. Hoàn thành task không đồng
nghĩa hoàn thành hệ thống. Các gate máy đọc được nằm ở governance/quality-gates.json.

## 10. Ví dụ phân tách đúng và sai

Đúng: ProductsPage dùng useProductsQuery của catalog/api; hook dùng generated DTO
và HTTP client; query key có shop/principal/filter. Modal sửa dùng form schema;
412 giữ input và hiện lựa chọn tải bản mới. UI dùng background.paper của dark theme.

Sai: ProductsPage fetch endpoint riêng, cast any, fallback sản phẩm giả, cộng Number
của giá, lưu list vào localStorage, tạo ThemeProvider riêng và success toast trong
catch. Không được chấp nhận chỉ vì trang nhìn đúng.

Đúng: app ghép InboxPage và CreateOrderPanel qua public props. Sai: inbox import
orders/ui/CreateOrderForm hoặc finance sửa trực tiếp state của orders.

Nguồn kỹ thuật mới kiểm ngày 29/09/2026: S03/S16/S17 (TypeScript), S05 (MUI), S14/S15
(CSS/Playwright). Các quy tắc module/ownership và mức cổng là quyết định thiết kế
của kit, không phải trích dẫn rằng nhà cung cấp bắt mọi dự án phải dùng như vậy.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.

## Bổ sung màu chính thức — Graphite Gold

Trước T010 và mọi thay đổi UI, đọc docs/03_DESIGN_SYSTEM.md, docs/19_DARK_ONLY_POLICY.md và design/IMPLEMENTATION_NOTES.md. Canonical palette: design/tokens.json, Graphite Gold dark-only. Sinh bằng scripts/generate-theme.py; không tiếp tục dùng HEX v1.1/2.0 từ reference. Không sửa palette riêng theo module. Kế hoạch nghiệp vụ và trạng thái task không thay vì bản recolor.

CODE-016 và DARK-004 áp dụng với quyết định `design/decision.json` đã duyệt. Mọi task có UI phải đọc nguồn này và docs/03,19 trước sửa; cấm chọn lại màu theo sở thích của agent. Bảng màu/nguồn sinh và chữ ký nội dung phải được kiểm, không chỉ nhìn screenshot. Các ca QA-025..030 bổ sung kiểm quyết định, drift, phân biệt màu hành động/trạng thái, phạm vi và giữ tiến độ.


---

<!-- SOURCE: docs/19_DARK_ONLY_POLICY.md -->

# 19 — DARK-ONLY: quyết định đã chốt từ nền tảng

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

**ADR-011 | Chủ dự án: Jokertrader | Quyết định dark-only gốc ngày 29/09/2026.**
Nguồn phê duyệt: yêu cầu trực tiếp của người dùng lúc 06:44:43Z về chốt theme dark
ngay từ đầu, không code nhiều loại. Phạm vi chốt là UI ứng dụng Bot bán hàng;
không suy ra phê duyệt toàn stack, mọi chỉ tiêu tải hoặc quyền triển khai production.

## 1. Quyết định sản phẩm

Chỉ xây dựng và bảo trì **một giao diện dark**. Không phải "mặc định dark" trong
một sản phẩm vẫn có light và system. Không có lộ trình ngầm thêm light, không theme
switcher, không setting đổi theme, không API/cookie/localStorage field cho lựa chọn
theme. Một bộ token semantic và một điểm tạo theme cho UI ứng dụng.

## 2. Các điều bắt buộc

| ID | Quy định | Điều kiện nghiệm thu |
|---|---|---|
| DARK-001 | Chỉ một app theme dark | OS light, OS dark và no-preference đều cho palette dark |
| DARK-002 | Không light/system trong state/config sản phẩm | Không ThemeMode union hoặc lựa chọn theme API/UI |
| DARK-003 | Không toggle hoặc persistence chọn theme | Không button/hook/store/cookie/localStorage phục vụ đổi theme |
| DARK-004 | Token là nguồn màu chuẩn | Source token → output CSS/bridge; regenerate không tạo diff ngoài dự kiến |
| DARK-005 | Nền đúng trước JS | HTML/CSS bootstrap dark, chặn JS vẫn thấy nền/fallback dark |
| DARK-006 | Một theme provider ứng dụng | Login, boot, session error, 403/404/500 và portal đều kế thừa |
| DARK-007 | Không nhánh theo màu hệ điều hành | Không matchMedia/prefers-color-scheme/light-dark() trong app-owned style logic |
| DARK-008 | Shared primitive/component/chart đồng nhất | Menu, dialog, tooltip, table, disabled/hover/focus được kiểm |
| DARK-009 | Không vô hiệu accessibility | Forced-colors, reduced-motion, keyboard, zoom vẫn sử dụng được |
| DARK-010 | Phạm vi rõ | Ảnh hàng, màu biến thể sản phẩm, Meta OAuth UI và bản in không là theme app |
| DARK-011 | Thay đổi có quyền và chuyển đổi | Chỉ yêu cầu rõ của chủ dự án mới đổi quyết định; ADR không tự cấp quyền |
| DARK-012 | Test chứng minh cổng hoạt động | Ca thêm light/system/toggle phải bị từ chối; không grep chữ light bừa bãi |

Các từ primary.light/primary.dark của MUI có thể chỉ sắc độ một màu, không phải
chế độ giao diện [S18]. Không viết linter cấm mọi token/chữ "light" trên toàn repo:
có thể làm hỏng dữ liệu sản phẩm, fixture âm và thư viện. Guard phân tích đúng AST,
resolved imports và CSS trong source ứng dụng do dự án sở hữu; unit test xác minh
các ngoại lệ hợp lệ. Thư viện có mã hỗ trợ nhiều theme không có nghĩa app đã tạo
nhiều theme; cấm app chủ động cấu hình/sinh/đóng gói palette thay thế.

## 3. Cách triển khai cho baseline MUI

MUI có hướng dẫn dark-only dùng createTheme với palette.mode='dark' [S05].
Chỉ tạo theme một lần ở platform/design bridge, ánh xạ màu từ tokens.json. Không
copy bảng màu MUI mặc định thành nguồn độc lập; không đưa tham số mode vào factory.

```ts
// Hình dạng cần triển khai trong repo thật, không phải file app đã được kiểm chạy.
const appTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: tokens.colors.canvas,
      paper: tokens.colors.surface,
    },
    text: {
      primary: tokens.colors.textPrimary,
      secondary: tokens.colors.textSecondary,
    },
    primary: {
      main: tokens.colors.accent,
      contrastText: tokens.colors.onAccent,
    },
  },
  typography: { fontFamily: tokens.fontFamily },
});
```

ThemeProvider ở root bao ngoài loading/session/router; CssBaseline bên trong.
Success/warning/error, contrastText và mọi component override lấy semantic tokens
như design/IMPLEMENTATION_NOTES.md. Không coi snippet palette này là toàn theme
hoàn chỉnh. Portal dùng context đúng; error boundary ngoài provider cần fallback
CSS bootstrap. Không khởi tạo provider mới trong từng route để "sửa màu".

Không dùng colorSchemes đa chế độ, useColorScheme/setMode, InitColorSchemeScript,
ThemeModeContext, next-themes hoặc theme storage manager cho baseline một theme.
Nếu phiên bản thư viện/repo cũ cần API khác, map sang hành vi dark-only đã chốt,
kiểm output CSS và runtime; không tự nâng/thay thư viện. useTheme đọc token vẫn hợp lệ.

## 4. Tránh chớp nền sáng khi khởi động

Trong head, trước CSS ứng dụng:

```html
<meta name="color-scheme" content="dark">
```

CSS nguồn sinh từ tokens (design/tokens.css) phải được tải trước entry JS, có:

```css
:root { color-scheme: dark; }
html, body, #root {
  min-height: 100%;
  background-color: var(--color-canvas);
  color: var(--color-text-primary);
}
body { margin: 0; }
```

CSS color-scheme giúp native controls/browser UI theo màu đã chỉ định; nó không
tự đổi màu mọi component [S14]. Phần bootstrap có thể inline với nonce/hash CSP
hoặc external render-blocking CSS; không mở unsafe-inline để làm nhanh. Nếu inline,
nó phải được generator lấy từ token, không chép màu bằng tay vào HTML cạnh nguồn.
Cần test lúc chặn JS và lúc tải chậm/cold-cache, không chỉ screenshot sau hydration.
Nếu build SSR, server và client xuất cùng dark theme; không thêm logic đọc OS.
Browser extension hoặc giao diện ngoài quyền kiểm soát không được cam kết đồng màu.

## 5. Những gì không tạo thêm một theme

Forced-colors/high-contrast là lựa chọn hỗ trợ tiếp cận của người dùng; không ghi
forced-color-adjust:none toàn app để ép palette. System colors cho forced-colors
được phép có lý do và test. prefers-reduced-motion là preference chuyển động, không
phải lựa chọn light/dark. Không khóa zoom hoặc loại bỏ focus vì thẩm mỹ.

Bản PDF hướng dẫn và template in phiếu có thể nền sáng để đọc/in, tách khỏi bundle
và token runtime UI; không thêm light theme ứng dụng để in một phiếu. Ảnh sản phẩm,
logo shop, mã màu biến thể do nghiệp vụ nhập được giữ nguyên nội dung nhưng không
được dùng để override palette app. Meta/OAuth trang bên ngoài không thuộc theme app.

## 6. Khi tiếp quản repo đã có light/dark

T001–T009 tìm source theme, storage keys, switcher, listener, tests và output CSS. Áp dụng
chuyển đổi có giới hạn: cố định provider dark; bỏ UI selector/hook/listener và nhánh
light do app sở hữu; bỏ đọc/ghi preference cũ; dọn đúng key của theme nếu được phép,
không localStorage.clear() làm mất session/dữ liệu khác. Thử preference cũ='light'
vẫn render dark. Không xóa code ngoài phạm vi hoặc mã vendor.

Một sản phẩm có chung theme với app khác chưa thuộc phạm vi phải được khoanh ranh
giới trước; không biến yêu cầu này thành quyền thay theme của tất cả repo. Không
để dual-theme chạy song song vô thời hạn; phần chuyển đổi tạm cần owner/mốc kết thúc
và test, không được coi là trạng thái hoàn thành dark-only.

## 7. Bộ kiểm tra bắt buộc

QA-001..006 và QA-021..024 trong governance/acceptance-scenarios.json bao phủ:
OS light/dark/no-preference; DOM không có switch; storage cũ không đổi theme;
JS bị chặn/cold-load; portal/error states; forced-colors/zoom/reduced-motion;
không cảnh báo sai với primary.light hoặc fixture âm; output không có palette
app light. Thử viewport 390/768/1440 và reflow theo docs/03. Playwright có emulation
color scheme/media [S15], nhưng chỉ có file test chưa chứng minh app đã được kiểm.

## 8. Điều kiện thay quyết định

AI không được thêm lựa chọn theme qua ADR tự duyệt. Chỉ khi chủ dự án yêu cầu rõ,
đánh giá ảnh hưởng token/component/QA/config/persistence rồi duyệt phạm vi chuyển
đổi. Trong phiên bản này, thay thế dark-only chưa được phê duyệt. Tiếp tục mở rộng
module không được nhân tiện "chuẩn hóa" lại thành light+dark.


## Phạm vi nghiệp vụ kế thừa từ 2.0 (vẫn hiệu lực)
Phạm vi hiện hành gồm 64 bổ sung A01–H08 ở contracts/feature-catalog.json. Giữ CODE-001..024 và DARK-001..012; bổ sung governance backend/worker theo docs/02,21–27. Không lấy ví dụ cũ về fulfill/payment làm nghiệp vụ v2; docs/05,22,24 và OpenAPI v2 là nguồn hiện hành. Kế hoạch cũ G0–G5 đã được thay bằng execution/plan.json T001–T084.

## Bảng màu Graphite Gold chính thức

Graphite Gold thay thế bảng màu xanh cũ ở `design/tokens.json`. Vẫn duy nhất dark-only; “sáng sủa” nghĩa là nội dung và các lớp nền dễ phân biệt hơn, không thêm light/system. Generator: `scripts/generate-theme.py`; hướng ứng dụng ở docs/03 và design/IMPLEMENTATION_NOTES.md. Các trạng thái cam/đỏ/xanh không được đổi ý nghĩa vì accent nay là vàng.

Quyết định màu hiện hành: `design/decision.json` (ADR-VIS-021, APPROVED, 2026-09-29T15:30:32Z). Việc đổi màu hoặc thêm palette cần yêu cầu mới có thẩm quyền; AI không tự tái thiết kế. Token 2.1 được giữ nguyên trong gói 2.1.1. Bảng màu tham khảo 1.1/2.0 chỉ là lịch sử, không là lựa chọn runtime.


---

<!-- SOURCE: docs/20_AI_BOOTSTRAP_AND_ENFORCEMENT.md -->

# 20 — Cho AI bắt đầu và tiếp tục đúng thứ tự

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Cách đặt vào repo
Khuyến nghị giữ toàn bộ gói trong `project-root/botsales-kit/`. Tài liệu nằm một nơi, code sản phẩm sẽ ở root apps/ hoặc cấu trúc repo đã có. Không chạy app bằng prototype/index.html rồi coi đó là sản phẩm. Không overwrite root AGENTS/AI_RULES nếu đang có; loader snippet chỉ tham chiếu tới kit. Không sửa Universal.

Chủ repo giao câu lệnh ở PROJECT_BUILD_PROMPT_VI.txt cho AI có công cụ đọc/ghi/chạy test. File tự nó không chạy, không cấp credentials hay kéo dài phiên. AI tự đọc kế hoạch và tracker, start T001, làm từng task trong quyền hiện có. Không dừng ở tóm tắt kế hoạch khi được giao implement; cũng không vượt gate live vì muốn tự làm tất cả.

## Nguồn và lệnh
T001 xác định repo root rồi `node scripts/progress.mjs bind ..` khi kit nằm trực tiếp dưới repo root. Bind không đổi source. Lệnh tracker chạy trong folder kit. Lệnh app ở execution/command-map.json ban đầu PLANNED_NOT_VERIFIED; T005 phải map vào lệnh có thật. Không copy bừa `pnpm test` rồi báo pass nếu package chưa tồn tại.

## Evidence
Dùng templates/CHECKPOINT_EVIDENCE.json làm shape, thay bằng actual outputs/source digest. Lưu log trực tiếp và test count; không tự viết nội dung output như thể test đã chạy. Chỉ ghi sourceFiles thật thuộc repo root; expected/observed phải đối chiếu bước task. Checkpoint evidence không được dẫn vào old HTML để pass React/Nest tasks. Mỗi bước update sinh báo cáo tiến độ mới. Missing evidence -> chưa đạt; stale file -> reverify impacted task.

## Khi thay phiên
Đọc root instructions, kit START_HERE/Universal/lộ trình, SESSION_HANDOFF, tracker next và code tác vụ. Kiểm source/plan hash và outstanding diffs trước tiếp. Không restart toàn dự án, không tạo task thứ hai cho cùng ID, không nhân bản rules thành bản riêng từng AI. Commit/merge/đưa live chỉ khi nhiệm vụ thực có quyền đó.

## Tiếp nhận quyết định màu và nâng gói

Root loader phải tham chiếu đúng một kit hiện hành. Trước UI, đọc `design/decision.json`, docs/03,19 và design/IMPLEMENTATION_NOTES.md; không tự chọn bảng màu khác. Hướng dẫn gói ở `release.json`, nguồn màu chỉ ở `design/tokens.json`. Repo có tiến độ đi qua `UPGRADE.md`, không dùng tracker 0% của ZIP để ghi đè. Chạy `python scripts/validate-release.py` để kiểm gói, không suy kết quả này thành CI sản phẩm đã cấu hình.


---

<!-- SOURCE: docs/21_NOTIFICATIONS.md -->

# 21 — Đơn hàng tới điện thoại: gửi, nhận việc và nhắc hạn

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Boundary và lựa chọn
In-app notification center là read model của durable intents. Web Push/PWA là kênh chính, Telegram là dự phòng được chủ shop liên kết. SMS/voice không thuộc baseline triển khai live; UI không cho nhập fake config rồi báo hoạt động. App chạy HTTPS và service worker; trên iOS/iPadOS Home Screen web app hỗ trợ push từ 16.4, xin quyền do user gesture, feature detection trước [N08]. Không đảm bảo tất cả máy/OS/chế độ tập trung đều phát âm/hiện ngay.

## Flow chuẩn
1. Order confirm transaction đã reserve và đáp ứng payment readiness; insert WorkItem + event outbox.
2. Worker reads current policy/users/schedule and generation, creates one notification intent per recipient/channel/key.
3. Adapter sends minimal payload: shop-safe label, order short id, count, deep link containing opaque id (not address/phone/token).
4. Record accepted_by_provider / failed / unknown according to observable result. Opened optional only observable; no invent delivered on HTTP accept.
5. User taps → authenticated app fetches current resource → claim WorkItem using expectedVersion. Acknowledged is business claim result, not push open.
6. Reminders use due schedule, max count and fallback policy; on ack/cancel/reassign revoke pending reminders. Recheck just before send for delayed queue jobs.

## Schemas and uniqueness
DeviceSubscription: user+device+channel, fingerprint/status/verifiedAt; raw push endpoint/key write-only server. NotificationIntent: shop+sourceEvent+recipient+channel uniqueness, payloadVersion, policyVersion, sourceTaskVersion, maxAttempts/deadline. DeliveryAttempt has providerRef/result/raw code sanitized; never overload status with task status. Callback token binds user/shop/workItem/action/resourceVersion/expiry, nonce single use where needed. Payload is suggestion to open, not authority to mutate.

## Schedule behavior
Business timezone converts wall-clock to UTC dueAt; handle clock/timezone policy change by generation/version recalculation of future jobs. Quiet hours mean delay or use an explicitly approved urgent route, not unconditional bypass. Default real schedule/recipients/limits null until configured. Prototype reminders (5-minute example etc.) are synthetic display only. If no one accepts, work remains unclaimed/overdue and leader reports, not auto-completed.

## Telegram security
Pair authenticated staff account with Telegram user using one-time short-lived code; bot token only backend. Verify update source and dedupe update_id. Buttons send bounded callback data/opaque IDs then fetch server decision; never trust amount/role in callback. Group membership is not shop authorization. Recheck actual user/membership on each callback; revoke invalidates future actions. No customer PII in group notifications by default [N09].

## Error acceptance
Two users claim same task -> one assigned; callback replay/expired/stale -> no second claim. Provider accepted but DB write lost -> unknown observation reconcile, retry per safe adapter policy, not blindly create intent. Canceled order while queued -> no prepare notification; cancellation arriving after send -> app shows current cancelled state. Device revoked/user removed -> no new sends; old deep link fails authorization. No receipt observation -> UI says unknown. Real closed-browser push must pass T070 on each tested actual device; phone-frame UI preview never substitutes.


---

<!-- SOURCE: docs/22_FULFILLMENT.md -->

# 22 — Lấy hàng, đóng gói, giao và trả từng phần

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Preparation
WorkItem linked one order release/fulfillment batch; assignee is authenticated staff member. Claim doesn't ship, packing doesn't deliver. Pick checklist keyed orderLineId/variant snapshot and quantity; mark picked quantities rather than boolean if partial. Wrong SKU/extra qty blocks. Damaged/missing items create issue and hold, with reason+actor; owner chooses correction/substitute requiring customer approval if contract changes. No AI asserts physical work completed without responsible human/device event.

## Dispatch
Packed order/batch + current reservation -> handover transaction. Consume reserve and move quantity from sellable warehouse to in_transit_to_customer. Persist cost snapshot and shipment handing evidence. Stock cost held as transit asset under delivery-recognition fixture; not automatically COGS/revenue on dispatch. Carrier label creation outside transaction, intent idempotency; create timeout goes unknown/reconcile.

Carrier events have unique externalEventId, normalized type, occurredAt and observedAt. Out-of-order event must not regress delivered to transit. Distinguish failed delivery/returning/returned. Manual carrier mode explicit; recording a manually verified event must include human/evidence, not inferred from timer. Tracking link external safe allowlist.

## Returns
Return request at line/quantity; authorize per policy with original sales/paid refs. Receive returned goods first into quarantine; inspect sellable/damaged decision, then movement. Accepted return may create credit/refund obligation; actual bank refund is separate authorized external action and not exposed as autonomous tool. Partial returns retain remaining delivered lines and preserve cost snapshots. Multiple return requests cumulative qty cannot exceed eligible sold quantity; duplicate receipt cannot restock twice. Exchange = return + new order under explicit policy, not mutate original historical price.

## UI
Preparation board chronological/due priority, mobile large claim/pick/pack buttons. Detail has independent timelines for order/customer confirmation, prep, shipment, payment and return. Show who can act/why disabled and source staleness. Old `Xuất kho & ghi doanh thu` combined demo action removed in v2; user now walks handover→delivery→COD settlement. Full financial semantics in docs/24.


---

<!-- SOURCE: docs/23_PROCUREMENT.md -->

# 23 — Quản lý mua hàng và tự đặt có giới hạn

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Default behavior and constraints
notify_only: suggest/call attention. draft_for_approval: prepare PO, require owner approval to send. auto_send: opt-in supplier/SKU/price/qty/budget rules, independent explicit policy authority; absent limit -> disabled, not infinite. Real supplier payment is never implied by purchase-order send approval. Model suggests; deterministic engine computes.

## Reorder math, baseline
For warehouse+SKU: available = sellable_on_hand − reserved. inventory_position = available + confirmed inbound remaining. Pending drafts are NOT confirmed inbound, but an active proposal key prevents creating a second proposal for same shortage. Trigger when position <= reorderPoint. targetNeed = max(0,targetQuantity−position). suggestedQty = 0 if targetNeed=0 else max(MOQ,ceil(targetNeed/packSize)*packSize), with configured cap/budget check after rounding. If MOQ forces overshoot cap, create exception, do not cut below supplier constraints silently. Nonnegative available enforced elsewhere.

Baseline uses min/max thresholds entered/approved by owner; statistical lead-time/demand forecast optional with sample coverage, source age and uncertainty. No data -> no invented forecast confidence. Confirmed inbound subtracts receipts/cancelled lines once; do not sum original PO qty after partial receipt. Existing draft can be refreshed/versioned, requiring new approval if terms change.

## Purchase workflow
Supplier approved + valid offer -> suggestion -> draft PO snapshot supplier/offer/currency/qty/unit cost -> requestApproval(intentHash,payloadVersion,policyVersion) -> decide by authenticated authorized human -> revalidate at send -> sending -> sent/unknown -> supplier confirmed -> partial receipt/received. Cancel before irreversible send subject to state, release reservations; after send use supplier cancellation with observed confirmation, not local delete. Existing scheduled send must be fenced on revoke/pause/new version.

## Budget/consistency
Budget uses purchase commitment amount, not LLM estimate. Reserve commitment and create PO atomically; consume/release once. Parallel reorder workers for same warehouse/SKU acquire unique activeProposal and stable locks; duplicate event returns existing reference. Approval check validates amount/currency/supplier/line hash and current authority. Delayed send with changed supplier price or limit -> pending review, not auto-upgrade cost.

## Receiving
GoodsReceipt carries PO/version/source document and accepted/rejected quantities per purchaseLineId. Received accepted increases sellable (or quarantine if awaiting inspection), rejects segregated; inbound remainder reduced once. Invoice accompanies receipt in demo fixture; production can use GRNI until supplier invoice then AP. Receipt posting composes inventory/finance in transaction. Overdelivery needs policy approval; no duplicate stock on retried receipt. UI exposes remaining/rejected, approval diff, source evidence and AP link.

## Integration
No universal supplier API assumed. Initial reliable mode is approved human-confirmed communication or a specific adapter the actual supplier supports. Sending a PO by email/Telegram is only a message intent; supplier acknowledgment separate. Unknown send must reconcile before retry. Live connector and commercial authority at T071/T079, not synthetic demo approvals.


---

<!-- SOURCE: docs/24_FINANCE.md -->

# 24 — Kế toán quản trị, công nợ, COD và lời/lỗ

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

## Scope
Management accounting with balanced immutable journals, source reconciliation and audit. Not certification of national books/tax/payroll. Actual business country/base currency/recognition/tax/period policies require owner+appropriate professional review before live use. IAS 2 distinguishes inventory expense relative to related revenue [N13]; source used as design principle, not assumption shop legally applies IFRS. AI classifies/explains based on records; cannot choose arbitrary amounts or override ledger invariants.

## Core accounts in test fixture
Cash/Bank, InventoryWarehouse, InventoryTransit, CustomerReceivable, CarrierCODReceivable, SupplierPayable/GRNI, RefundPayable, OwnerCapital, Sales, SalesReturns, COGS, CarrierFees, OperatingExpenses. These are logical labels, not a country-specific chart of accounts. Debit/credit lines exact Decimal with single currency per balanced journal. Multi-currency unsupported live until explicit FX/subledger policy. Amount display follows currency scale, not hardcoded two decimals for all.

## Recognition and stock valuation
Moving weighted average is a proposed operating baseline selected for implementation tests, needs live finance approval. On receipt accepted qty update quantity/value; dispatch stores exact cost snapshot and moves asset to transit. For fixture delivery/control-transfer policy, delivery posts Sales/Receivable and COGS/Transit. Other verified control-transfer policies can change event through explicit versioned rules; don't infer transfer just from local button or order.created. Returned sellable inventory uses relevant cost history and approved cost method, not latest catalog cost. Reports show policy/asOf and pending/unmatched flags.

## Fully worked golden example (synthetic VND, no tax)
Opening owner capital: Dr Bank 2000000 / Cr OwnerCapital 2000000.
Receive 10 units with accepted invoice at 100000 each: Dr InventoryWarehouse 1000000 / Cr SupplierPayable 1000000. If invoice absent, credit GRNI instead then invoice reconciliation moves GRNI→AP.
Record verified supplier payment: Dr SupplierPayable 1000000 / Cr Bank 1000000. No purchase payment API is automatically executed.
Customer confirms 2 × 150000: no revenue/cash journal; reserve qty 2.
Handover: Dr InventoryTransit 200000 / Cr InventoryWarehouse 200000; no sale recognition in this fixture yet.
Delivered COD: Dr CarrierCODReceivable 300000 / Cr Sales 300000; Dr COGS 200000 / Cr InventoryTransit 200000.
Carrier remits 280000 net and documented 20000 fee: Dr Bank 280000 + Dr CarrierFees 20000 / Cr CarrierCODReceivable 300000.
Final: Bank 1280000, Inventory 800000, AR/AP zero, revenue 300000, COGS 200000, gross margin 100000, fee 20000, management profit 80000. Assets 2080000 equal capital 2000000 plus profit 80000. Bank movement is not profit.
One accepted return with 150000 refund obligation: Dr SalesReturns 150000 / Cr RefundPayable 150000; Dr InventoryWarehouse 100000 / Cr COGS 100000. Only after actual approved refund observed: Dr RefundPayable 150000 / Cr Bank 150000. Then inventory 900000, Bank 1130000, net revenue 150000, COGS 100000, unchanged documented fee 20000, profit 30000. No automatic carrier fee refund assumed.

## Source/period rules
Unique journal intent key `(shopId,sourceType,sourceId,eventType,sourceRevision)` supports different events of one order without double posting. source IDs cannot collide across bank accounts/providers. Posted lines immutable; corrections via reverse/replacement, no delete to make reports agree. Closed period check and posting race serialized; fiscal dates interpreted with adopted policy. Imported estimates and actual invoices separated and reconciled, not counted twice.

## Reconciliation
Bank/COD imports preview safe parsing/mapping and source IDs; same document reimport is idempotent. Auto-match may propose, ambiguous/partial/split/disputed requires review until safe deterministic policy approved. Customer screenshot is unverified evidence. COD states show delivered/order value, customer cash collected by carrier, fee, batch net bank payment and remaining receivable separately. Deferred revenue/deposits not sales by default. AP due date/credit terms and aging account for partial payments and disputes.

## Reporting and AI
P&L computed server from posted journal and date/policy, cashflow from actual verified cash movements, balance exposures from AP/AR/inventory. Drill-down every total to source; UI never sums just paginated subset. AI receives permission-filtered report snapshot and returns explanation with references; no direct ledger tools. Owner sees Unknown/Estimated/Not reconciled instead of fabricated zero.


---

<!-- SOURCE: docs/25_OPERATIONS_AI.md -->

# 25 — Trưởng nhóm và bốn vai trò vận hành

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

Roles are business identities with capability lists, model connection, knowledge version, human owner, current generation and budgets. Common orchestration infra schedules typed jobs; not four always-running LLMs talking to each other. Admin AI can read/draft/eligible-confirm order. Accounting role reads/labels/explains; posting triggered by deterministic finance services. Warehouse drafts purchase or sends under explicitly activated rule. Supervisor detects/assigns/escalates/summarizes with policy validation. Agent cannot approve its own role/amount increases or impersonate human.

## Work management
One WorkItem per source business intent; prep boards/notification cards are projections of same task. State queued/claimed/working/blocked/completed/cancelled, assignee, dueAt, source ref+version. Leader checks unsolved chat, unclaimed order, late delivery, stock shortage, pending receipt/payment mismatch. Cooldowns/dedupe/generation prevent endless repeated tasks. Source cancellation closes inappropriate jobs; completed task has actual evidence, not model said done.

## Approval model
Canonical intent hash built from exact action/tenant/resource/lines/amount/currency/supplier/policyVersion/resourceVersion; owner review shows diff/impact. Approved bound token is single-use, expires, revoked on changes. Delayed execution rechecks current policy and actor delegation. Batch approve evaluates each row and leaves invalid rows with reasons; no all-or-nothing hidden failures unless business requires transaction. Silence not approval. Human review can be shop owner; no fake second employee requirement for a one-person shop.

## Dashboard and digest
Owner sees things requiring decision, deadlines and accountable person; drill-down into evidence and recommendation. Four role cards display actual readiness/not configured/paused/degraded, never fake numeric trust score. Digest configurable time/recipient/business timezone and low-noise grouping; disabled until set. Detail includes completed/blocked/new risks and financial source snapshots. Creating schedule definition doesn't mean it's running until worker integration verified.

## Budget / Stop
Separate AI spend, message channel quota and purchasing commitments. Estimates vs provider billed costs explicitly labeled. Fallback only to approved provider/capability/data region. Pause per shop/role/conversation increments generation; checked before side effects and running output dispatch. Cannot recall already sent Meta/PO, UI displays accepted/unknown results. Runbook links and genuine health check age determine readiness.


---

<!-- SOURCE: docs/26_DATA_DICTIONARY.md -->

# 26 — Mô hình lưu trữ và ràng buộc triển khai

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

This is a persistence design contract, not a shipped production SQL migration. T013 and domain tasks produce Prisma/SQL migrations under actual DB version with tests. OpenAPI describes wire DTO; database models must not expose internal secrets or mutable journal fields directly.

| Aggregate / tables | Essential keys/fields | Required DB constraints and concurrency |
|---|---|---|
| shop,user,membership | shopId,userId,role/permissionVersion,settingsVersion | unique shop/user, active membership scoped; user identity separate customer |
| product,variant,category | shopId,id,SKU,attributes,price currency,version,archivedAt | unique shop/SKU; all joins tenant composite |
| stock_movement,stock_position,reservation | warehouse/SKU,kind,qty,cost,source,intentId,expiresAt | immutable movement; source intent unique; available nonnegative under atomic writes |
| customer,external_identity,address,consent | page/provider/id,verification,source,version | page-scoped identity; no merge by display name |
| conversation,message,assignment_lease | channel/customer,direction,external id,generation,send state | unique page/external message, sequencing; current lease+generation before send |
| order,order_line,quote,confirmation | snapshots,quoteHash,expiry,address,totals,policyVersion | source-evidence binding; reserve transaction; completed fields not derived from unverified callbacks |
| work_item,task_event | source,kind,assignee,dueAt,state,version | unique business-intent; compare-and-set claim; index shop/state/dueAt |
| prep_job,prep_line,shipment,event,return_case,line | pick qty,status,evidence,carrier refs,cost snapshot | cumulative line qty constraints, external event unique, reject regression |
| supplier,offer,reorder_rule,proposal | MOQ/pack/currency/priceVersion,approved,activeKey | active proposal uniqueness; optimistic offer/rule version |
| purchase_order,line,goods_receipt,line | approved intent/external send/remaining qty/source doc | no overreceipt except authorized; atomic inventory+finance compose |
| approval,policy,budget_reservation | intentHash,actor,scope,expiry,current policy,generation | approved intent consume once; reserve budget ≤ cap |
| journal,line,account,period | source tuple,currency,debit/credit,status,date,policy | balance validation and period lock in transaction; posted immutable; reversals linked |
| bank_transaction,cod_batch,match,receivable,payable | externalId/account/carrier,amount,partial allocation,due/dispute | source uniqueness; allocations cannot exceed eligible balance; no inferred transfer |
| notification_intent,attempt,subscription,pairing | user/device/source/channel/status/observations | intent dedupe, endpoint/key secret, pairing expiry + nonce consume |
| command,outbox,inbox,worker_lease | idempotency key/body hash,attempt,status,lease generation | atomic business+outbox; unknown persists across restart; safe deadletter |
| knowledge_source,revision,chunk,embedding | tenant/purpose/source hash/model/dimension/validity | retrieval filter and tombstones; model change requires reindex migration, not mixing vectors |
| audit,privacy_request,export_job,readiness_check | actor/scope/version/evidence/check time | immutable relevant trace, no secrets; expired health becomes unknown |

## File attachments
Object metadata owns tenant/actor/mime/size/hash/storage key/scan state/retention. Upload is untrusted until scan accepted. Signed download rechecks role/resource; metadata storage key not full public URL. Export generated from authorization scoped query, no arbitrary SQL from report UI.

## Index / transaction plan
List queries need shop+stable cursor order, pending task due indexes, unique command/provider IDs, stock position warehouse+SKU. No indexing every field blindly. Profile and explain measured queries at T074. Tenant RLS (if used) must be transaction-local with pool-safe context. Deadlock order deterministic by SKU/id; retries bounded and re-evaluate policy.


---

<!-- SOURCE: docs/27_RUNTIME_POLICY.md -->

# 27 — Cấu hình live, an toàn mặc định và quyền được giao

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.0.0 · Baseline nghiệp vụ 2.0.**
Nguồn phiên bản: `release.json`; quyết định màu: `design/decision.json`. Phạm vi kiểm chứng là tài liệu/demo, không chứng nhận vận hành sản phẩm.
<!-- END RELEASE META -->

| Setting | Default before real setup | May activate when |
|---|---|---|
| Theme | dark-only, immutable product decision | no other theme in scope |
| Messenger auto reply | disabled until connected + tested policy | Actual page scopes and provider permissions granted |
| Auto confirm eligible order | policy implementation enabled in tests; live gated | customer confirmation + quote + stock + payment/COD/shop rules valid |
| Notification delivery | in-app demo only; live subscriptions empty | real device consent, HTTPS, test and recipient policy |
| Telegram fallback | chosen design, not connected | one-time pairing and secret backend grant |
| Reminders/digest | disabled until real schedule/recipients/limits | owner settings reviewed, worker healthy |
| Purchase mode | draft_for_approval | owner may separately activate auto_send rule with nonnull caps |
| Purchase automatic money transfer | unavailable | outside this baseline; needs separate approved integration |
| Actual refund/bank transfer | not a tool | approval + separate real flow not inferred from UI acceptance |
| Revenue policy/currency/retention | unconfigured for real shop | explicit business/professional confirmation |
| Provider failover | none unless allowed list policy | compatible tested model + data/privacy/budget approval |
| Marketing | analytics/suggestions only | auto spend/publish not in this scope |
| Production deploy | forbidden by default | T081 authentic approval and verified artifact |

Runtime policies are product records, not AI_RULES Universal. Controlled changes need version/diff/approval scope; do not let LLM update rules by suggesting a text. Demo settings visible with synthetic label do not populate production. Prompt returning permission=true is never permission.


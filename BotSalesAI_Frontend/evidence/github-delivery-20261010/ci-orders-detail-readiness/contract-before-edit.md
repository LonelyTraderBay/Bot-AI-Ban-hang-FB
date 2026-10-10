# Contract trước sửa readiness chi tiết Orders

HEAD60 1e3df01dad95696f407599aa9bd9f766757ee7bc; source nguyên byte Git khi ghi contract. Run38062907027: Chromium407E2E+3built-demo+audit/fullverify/upload SUCCESS; Firefox406PASS/1OrdersFAIL, audit/fullverify/upload SUCCESS, built-demo SKIPPED. ArtifactFirefox11676366480 SHA256 8bbc9a8769cad108494df1495afbc32bcdf4c3104f14da965a74afbb216cd84d đã đối chiếu.

Trace thật: At390x844 Orders detail goto(load)3439697.724–3440602.275 completed; version1 expect3440610.859–3445614.853 exhausted5000ms whilemainstillroute-loading. No getOrder GET in selectedtrace. Orders module200 resource entry timestamp3445724.354 is after failedexpectdeadline. The test treated document load as lazyroute/data readiness.

Nguyên nhân sâu: Exact hosted Vite/module/dependency scheduling cause UNKNOWN; the trace proves route/content not ready at assertion, not a Backend fault or a measured production loading SLA.

BaselineCLI gốc8/8PASS và ảnh loadedFirefox390x900/1280x900 đã xem trước sửa. Hai probe data-delayFirefox/module-delayChromium6500ms gốcFAILđúngversion1/candidatePASS toàn callback, duy nhất1quotePOST. Giữ raw harness01/02 FAIL và lý do; không gọiPASS.

Owner tests/ui-orders-layout.spec.ts, chỉ navigation detail ở ca dialog. Đăng kýexactGET /api/v2/shops/shop-demo/orders/DH-1001 trướcgoto, yêu cầu200, chờmain QueryState Đang tải dữ liệu ẩn rồiassertionversion1 cũ. GET chỉphát sinh khi OrderDetail đãmount, nên điều kiện này bao gồm prerequisite lazyroute. CanonicalgetOrder GET200/permissionorders.read đã đốichiếu; defaultlocator30000/expect5000/test180000 giữ nguyên.

Consumer/invariants: giữ5widths/4routes/20observations, draftkhách/conversation/SKU/address/enableSave/noPOST; version1/quote200/currentquote/disabledconfirm;2returnswidth390/1280, cảdialogbounds, quantity1.5disabled, Escape,exactseed10036; không ghiorders/returns ngoại trừ1quote. App/mock/shared/query/router/Shell/operations/config chỉđọc. Không đổiapp/API/dependency/timeout/retry/ngưỡng.

Sau sửa:2ca×repeat3×2engine=12; pairedloadedFirefox390/1280; composition41/layout86/validator11, fullverify238unit/S17COMPLETE275fingerprints; discovery407/69mỗiengine vàvalidatorcuối. S17 sinh lại từnguồn vàlogfresh; giữhistoricalsnapshot. Không táichứngnhận owner/nativezoom/screenreader/Backend/production. HostedSHA mới PENDING_AT_COMMIT.

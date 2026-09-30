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

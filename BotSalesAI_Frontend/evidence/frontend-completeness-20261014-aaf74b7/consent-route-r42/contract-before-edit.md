# R42 baseline truoc khi sua

## Pham vi
- Test: `tests/ui-consent-management.spec.ts`, bai R61 public confirmation o viewport 320x720.
- Hanh vi can giu: tab vao nut, Enter mo noi dung, kiem tra khong tran ngang 320px va khong co loi Axe.
- Khong sua React, API, route manifest hay du lieu mock.

## Bang chung truoc sua
- GitHub run #41 attempt 2: Firefox E2E 439/440; bai R61 khong tim thay nut `Xem nội dung yêu cầu` trong timeout mac dinh 5 giay ngay sau `page.goto`; Firefox built-demo bi bo qua sau E2E fail. Chromium E2E/build-demo pass.
- Firefox local tren commit `932e39fc50afbe0d72dcf3dfee281e0b3739f40a`: bai R61 hien tai chay 3/3; log `repro-firefox.log`. Ket qua local xac nhan test/harness hoat dong o may nay, khong bac bo race tren runner cham hon.
- Nguon: route `/consent/confirm` la route cong khai R61, lazy-loaded trong `apps/web/src/app/router.tsx`; `ConsentConfirmationPage` render heading va nut theo token trong cung component. Test loi goi `page.goto` xong assert nut ngay, khong doi heading/route render.

## Thay doi du kien
Doi readiness trong test: doi heading `Xác nhận lựa chọn marketing` va nut hanh dong hien thi voi timeout 30 giay truoc khi tiep tuc cac assert ban phim, viewport va accessibility. Khong thay assert nghiep vu.

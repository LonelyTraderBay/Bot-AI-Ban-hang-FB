# UI017 — copy và namespace tiếng Việt: inventory

Ngày: 03/10/2026 · Baseline HEAD: `e68cb65e61c5c1aab2ae169dd8033df305df8872` · phạm vi: customer list/create/detail/edit trên R07/R08.

## Hiện trạng i18n

- `apps/web/src/app/i18n.ts` khai báo duy nhất `vi`, `fallbackLng: 'vi'`, và 32 common UI keys trong `app`, `state`, `draft`. Chưa có resource theo nghiệp vụ/module.
- `useTranslation()` hiện chỉ được dùng trong bốn shared UI components. Không có module nghiệp vụ nào gọi hook; `apps/web/src/modules/customers/index.tsx` viết copy trực tiếp.
- Shared API/error states đã dùng i18n (`QueryState`, `ErrorNotice`, `CapabilityUnavailable`); UI017 không tái cấu trúc các component dùng chung hoặc thay common state copy.

## Hiện trạng customer record UI

- Canonical route manifest: R07 `/s/:shopId/customers` và R08 `/s/:shopId/customers/:customerId`, cả hai đọc với `customers.read`. Nguồn chuẩn vẫn OpenAPI/route manifest; UI017 không đổi contract hay permissions.
- Cùng `customerSchema` được dùng bởi form tạo và sửa; hiện có hai lỗi validation inline (`Nhập tên khách`, `Email không hợp lệ`). Email/số liên hệ/ghi chú có thể để trống theo schema.
- Labels của bốn form fields được lặp nguyên cùng một array trong create/detail forms và dựa vào chỉ số `(name, i)`: `Tên hiển thị`, `Số liên hệ`, `Email`, `Ghi chú`. Create/detail title, subtitle, buttons, table/section headings, access copy và empty/detail copy cũng inline.
- FE009 có hai browser scenarios trực tiếp cho customer create/edit/validation/stale-version và redacted fields; FE016/other suite bảo vệ role boundaries. Full current suite trước UI017 là UI016 S05: 187/187.

## Phạm vi được chọn và ranh giới

Chọn customer record flow vì tạo, chỉnh sửa và detail chia sẻ cùng schema/fields trên hai route, có regression hiện hữu và thuật ngữ xuyên màn hình. Sửa labels/validation/microcopy và một resource namespace cùng lúc; namespace được đăng ký trong app i18n, còn từ điển customer nằm riêng dưới `app/locales/vi` để không đặt resource vào shared UI hoặc khiến module nghiệp vụ import module khác. `ServiceCasesPage`, dictionary toàn ứng dụng, tiếng Anh và các nghiệp vụ ngoài R07/R08 không nằm trong phạm vi.

## Source fingerprints trước sửa

SHA-256: `apps/web/src/app/i18n.ts` `FF0218CD9BB4061927C765F6E371EDBF5B40ED309C24534D28675AC61BB5F767`; `apps/web/src/modules/customers/index.tsx` `E90183E27EFA6B99E29D6C85663DD8A2BB713ACF6C546C95F124245576012A52`; `tests/fe009.spec.ts` `5E5A60D0645FDE99C0BE179043A500FA7058DA196E1851AA889BA290EA174CE9`; `route-manifest.json` `360871C008FAC723CFC77DEC79417838D24D4FAE844452909EB347EC8893F2B2`; `openapi.json` `D88A70957A9DE36402FF5AC0CB757A2F1C496519C7E1FD2E28DF17E867F78C7C`.

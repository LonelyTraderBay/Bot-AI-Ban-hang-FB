# Toolchain và dependency lock — đối chiếu 04/10/2026

Nguồn chuẩn phiên bản khai báo: package.json root, apps/web/package.json; phiên bản resolved là package-lock.json thật hiện có. Không dùng tài liệu khai báo cũ để kết luận chưa có lockfile. packageManager npm@11.17.0; engine Node >=24 <25. Evidence S39/S40 dùng Windows Node24.19.0/npm11.17.0.

| Thành phần | Phiên bản khai báo hiện hành |
|---|---|
| React / ReactDOM | 19.1.1 |
| TypeScript / Vite | 5.9.2 / 7.3.6 |
| MUI Material / icons | 7.3.1 |
| TanStack Query / Router | 5.85.5 / 7.18.4 |
| RHF / Zod | 7.62.0 / 4.1.3 |
| i18next / react-i18next | 25.4.2 / 15.7.3 |
| MSW / Vitest / Playwright / axe-core playwright | 2.11.1 / 5.0.3 / 1.63.0 / 4.10.2 |
| Recharts / AJV | 3.1.2 / 8.20.0 |

Các khai báo này đã đọc từ manifests, không là kết quả dependency vulnerability scan mới. Không tự nâng stack, npm audit fix --force hoặc force-install trong task UI/docs. Khi tái lập dùng npm ci theo lock, setup/doctor và checks theo diff. Lượt audit tài liệu không cold-install/build/test lại; runtime logs S39/S40/S08 tại evidence/REPORT.md, fingerprint S08 định danh input đã kiểm.

Baseline khi giao gói 29/09 dùng Node22.16.0/TS5.8.3 và chưa cài dependency là lịch sử, không mô tả checkout hiện tại. Nội dung cũ/hash được giữ trong before-documents.json của hồ sơ audit. Kiến trúc một MUI/Query/Router, canonical contract và Graphite Gold token vẫn theo scope hiện hành.

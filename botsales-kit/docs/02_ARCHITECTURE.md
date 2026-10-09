# 02 — Kiến trúc được chọn và cấu trúc code

<!-- BEGIN RELEASE META -->
**Bộ chuẩn 2.1.1 · 2026-09-29 · Graphite Gold: ĐÃ DUYỆT · Token 2.1 · API 2.5.0 · Baseline nghiệp vụ 2.0.**
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

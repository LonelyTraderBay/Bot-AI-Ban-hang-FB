# FE010 route, operation, and field map

Scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`. The canonical OpenAPI `2.0.0`, route manifest `2.0`, permission catalog, and generated `packages/contracts/src/operations.json` remain authoritative.

| Route | User flow | Contract operations and capabilities |
|---|---|---|
| R09 `/s/:shopId/products` | Search/filter, cursor page, open product | `listProducts` (`catalog.read`) |
| R10 `/s/:shopId/products/new` | Create product with one or more variants and optional files | `createProduct` (`catalog.write`, `ProductWrite` → `ProductResponse`) |
| R11 `/s/:shopId/products/:productId` | Read, versioned update, archive | `getProduct` (`catalog.read`), `updateProduct` (`catalog.write`, `ProductWritePatch`, `If-Match`), `archiveProduct` (`catalog.write`, `VersionedReason`) |
| R12 `/s/:shopId/categories` | List/search/cursor, create, update, archive | `listCategories` (`catalog.read`), `createCategory`, `getCategory`, `updateCategory` (`If-Match`), `archiveCategory` (`catalog.write`) |
| R13 `/s/:shopId/imports` | Upload CSV, map columns, dry-run validation | `uploadFile` (`FileUpload`), `createProductImport` (`catalog.import`, `ImportRequest`) |
| R14 `/s/:shopId/imports/:jobId` | Inspect dry-run and commit valid rows | `getJob` (`jobs.read`), `getFile`, `commitProductImport` (`catalog.import`, `ImportCommit`) |

The 16 IDs selected by FE010 are checked against both canonical OpenAPI and generated operation metadata. `ProductWrite` requires `variants` and `imageFileIds`; each `VariantWrite` requires a positive `price` amount and has no `cost` property. `updateProduct` and `updateCategory` require the canonical `If-Match` parameter. `ImportRequest` requires file ID, column mapping, duplicate strategy and `dryRun`; `ImportCommit` requires a validation token and explicit `confirmValidRowsOnly`.

The UI and mock suite exercise create/update, variants, category versioning, cursor search, CSV row errors, duplicate SKU rejection, valid-only commit, stale validation token (412), 1,000-row demo limit, 5 MB demo upload limit, and read-only role behavior. Those limits apply to the frontend sample only. They do not invent a backend endpoint, product-cost field or production import policy.

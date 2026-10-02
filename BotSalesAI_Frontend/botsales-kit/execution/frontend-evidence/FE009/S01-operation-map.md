# FE009 route and operation map

Verification scope: `FRONTEND_WITH_SYNTHETIC_MOCK_API`. Canonical references: `contracts/openapi.json`, `contracts/route-manifest.json`, `contracts/permission-catalog.json`, and generated `packages/contracts/src/operations.json`.

| Route | Frontend action | Canonical operations and permissions |
|---|---|---|
| R01 `/login` | Start company sign-in | `getCsrfToken`, `beginLogin`; no shop permission |
| R02 `/workspaces` | Load session and list shops | `getSession`, `listShops`; no shop permission |
| R03 `/onboarding` | Create shop and initialize its active owner membership | `createShop` (`ShopWrite` → `ShopResponse`); no shop permission |
| R07 `/s/:shopId/customers` | Search/list customers and create one | `listCustomers` (`customers.read`), `createCustomer` (`customers.write`, `CustomerWrite` → `CustomerResponse`) |
| R08 `/s/:shopId/customers/:customerId` | Read/update one customer | `getCustomer` (`customers.read`), `updateCustomer` (`customers.write`, version required, `CustomerWritePatch` → `CustomerResponse`) |
| R32 `/s/:shopId/settings/team` | List/invite/update/revoke memberships | `listMembers`, `getMember`, `inviteMember`, `updateMemberRoles`, `revokeMembership`; `members.manage`; updates/revokes use version checks |
| R33 `/s/:shopId/settings/shop` | Read/update shop settings | `getShop` (membership scope), `updateShop` (`shop.manage`, version required) |
| R34 `/s/:shopId/settings/audit` | Read audit history | `listAuditEvents` (`audit.read`) |
| R35 `/s/:shopId/settings/privacy` | Read policy/requests, create request, edit policy | `getPrivacyPolicy`, `listPrivacyRequests`, `createPrivacyRequest`, `updatePrivacyPolicy`; `privacy.manage`; update requires version |
| R36 `/s/:shopId/jobs/:jobId` | Read background job/command status | `getJob`, `getCommand`; `jobs.read` |
| R54 `/s/:shopId/service-cases` | Read/create/update after-sale cases | `listServiceCases`, `getServiceCase`, `createServiceCase`, `setServiceCaseStatus`; `customers.read`/`customers.write` |

`approvePrivacyRequest` uses the canonical `ReauthApproval` request, and `stepUp` is an OIDC capability. The frontend exposes no direct delete/approval shortcut; the mock acceptance covers request creation and pending status only. Approval behavior that needs a live backend reauthentication protocol remains outside this frontend-only task. Mock responses are synthetic and do not prove server enforcement; a direct simulator scenario separately verifies that a revoked membership for one shop returns 403 even while the same identity retains an active membership in another shop.

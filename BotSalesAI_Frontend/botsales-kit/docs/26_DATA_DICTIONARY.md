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

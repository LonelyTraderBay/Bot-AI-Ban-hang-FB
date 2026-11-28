import { type Prisma, Role } from '../../../generated/prisma/client.js';
import { DomainConflict } from '../../../http/contracts.js';
import { findDebts, hasUnsettledPayments } from '../../finance/index.js';
import { permissionsFor } from '../policy/access.js';

const acknowledgingRoles = Object.values(Role).filter(role => permissionsFor([role]).includes('operations.claim'));

const groups = {
    ORDER_PROCESSING: 'Hoàn tất hoặc hủy đơn bán đã xác nhận.',
    SHIPMENT_PROCESSING: 'Hoàn tất vận đơn đang xử lý.',
    RETURN_PROCESSING: 'Kiểm nhận hàng trả đang chờ.',
    STOCK_RESERVED: 'Xử lý các lượt giữ tồn còn hiệu lực.',
    PURCHASE_RECEIVING: 'Xác nhận và nhận hàng cho đơn mua đã gửi.',
    BACKGROUND_WORK: 'Hoàn tất công việc, tác vụ nền hoặc lượt gửi đang chờ.',
    RECONCILIATION: 'Đối chiếu các khoản thu, COD, công nợ hoặc hoàn tiền còn mở.',
    EXTERNAL_UNKNOWN: 'Đối chiếu kết quả gửi với nhà cung cấp.',
};

export async function requireCloseableShop(tx: Prisma.TransactionClient, shopId: string, currency: string) {
    // A consumed or expired import preview is historical even though its job retains awaiting_confirmation.
    const [blocked] = await tx.$queryRaw<Record<keyof typeof groups, boolean>[]>`
        WITH scope AS (SELECT ${shopId}::uuid AS shop_id), business_jobs AS (
            SELECT j.* FROM jobs j, scope WHERE j.shop_id = scope.shop_id AND j.kind <> 'privacy'
              -- A finished diagnostic probe has no pending business action.
              AND NOT (j.kind='connection_test' AND j.status='awaiting_confirmation')
              AND NOT EXISTS (SELECT 1 FROM product_import_previews p WHERE p.shop_id=j.shop_id AND p.job_id=j.id
                              AND (p.commit_job_id IS NOT NULL OR p.expires_at <= now()))
        ), standalone_commands AS (
            SELECT c.* FROM commands c, scope WHERE c.shop_id=scope.shop_id
              AND c.operation_id NOT IN ('closeShop','reopenShop','approvePrivacyRequest')
              AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.shop_id=c.shop_id AND j.command_id=c.id)
        )
        SELECT
            EXISTS (SELECT 1 FROM sales_orders WHERE shop_id=scope.shop_id AND order_state='confirmed') AS "ORDER_PROCESSING",
            EXISTS (SELECT 1 FROM shipments WHERE shop_id=scope.shop_id AND state IN ('planned','handed_over','in_transit','failed','returning')) AS "SHIPMENT_PROCESSING",
            EXISTS (SELECT 1 FROM order_returns WHERE shop_id=scope.shop_id AND state='awaiting_goods') AS "RETURN_PROCESSING",
            EXISTS (SELECT 1 FROM stock_reservations WHERE shop_id=scope.shop_id AND status='active' AND expires_at > now()) AS "STOCK_RESERVED",
            EXISTS (SELECT 1 FROM purchase_orders WHERE shop_id=scope.shop_id AND status IN ('sent','confirmed','part_received')) AS "PURCHASE_RECEIVING",
            (EXISTS (SELECT 1 FROM business_jobs WHERE status IN ('queued','running','awaiting_confirmation'))
             OR EXISTS (SELECT 1 FROM standalone_commands WHERE status IN ('accepted','running'))
             OR EXISTS (SELECT 1 FROM work_items WHERE shop_id=scope.shop_id AND state NOT IN ('completed','cancelled'))
             OR EXISTS (SELECT 1 FROM bot_inbound_tasks WHERE shop_id=scope.shop_id AND finished_at IS NULL)
             OR EXISTS (SELECT 1 FROM message_dispatches WHERE shop_id=scope.shop_id AND finished_at IS NULL)
             OR EXISTS (SELECT 1 FROM purchase_orders WHERE shop_id=scope.shop_id AND status='sending')
             OR EXISTS (SELECT 1 FROM app_notifications WHERE shop_id=scope.shop_id AND channel <> 'in_app' AND delivery_status='queued')
             -- Initial PUT and initial purge share the pending state until the lease settles.
             OR EXISTS (SELECT 1 FROM file_storage s JOIN file_objects f ON f.shop_id=s.shop_id AND f.id=s.file_id
                        WHERE s.shop_id=scope.shop_id AND s.state='pending' AND s.lease_until IS NOT NULL
                          AND f.purpose <> 'privacy_export')
            ) AS "BACKGROUND_WORK",
            (EXISTS (SELECT 1 FROM cod_settlements WHERE shop_id=scope.shop_id AND status <> 'matched')
             OR EXISTS (SELECT 1 FROM reconciliation_cases WHERE shop_id=scope.shop_id AND state <> 'matched')
            ) AS "RECONCILIATION",
            (EXISTS (SELECT 1 FROM standalone_commands WHERE status='unknown')
             OR EXISTS (SELECT 1 FROM business_jobs WHERE status='awaiting_confirmation' AND external_started_at IS NOT NULL)
             OR EXISTS (SELECT 1 FROM channel_messages WHERE shop_id=scope.shop_id AND direction='outbound' AND status='unknown')
             OR EXISTS (SELECT 1 FROM purchase_orders WHERE shop_id=scope.shop_id AND status='unknown')
             OR EXISTS (SELECT 1 FROM app_notifications n
                        JOIN memberships m ON m.shop_id=n.shop_id AND m.user_id=n.recipient_user_id
                        WHERE n.shop_id=scope.shop_id AND n.channel <> 'in_app' AND n.delivery_status='unknown'
                          AND n.work_item_id IS NOT NULL AND n.acknowledged_at IS NULL
                          AND m.status='active' AND m.roles && ${acknowledgingRoles}::membership_role[])
            ) AS "EXTERNAL_UNKNOWN"
        FROM scope
    `;
    blocked.RECONCILIATION ||= await hasUnsettledPayments(tx, shopId, currency)
        || (await findDebts(tx, shopId, currency, { unsettledOnly: true })).length > 0;
    const errors = (Object.keys(groups) as (keyof typeof groups)[]).filter(code => blocked[code])
        .map(code => ({ path: '/status', code, message: groups[code] }));
    if (errors.length) throw new DomainConflict('SHOP_CLOSE_BLOCKED', 'Cần xử lý các mục sau trước khi đóng cửa hàng.', errors);
}

import { Alert, Button } from '@mui/material';
import type { ResourceRef } from '@botsales/contracts';
import { useApi } from '@/shared/api/hooks';
import { dateTime } from '@/shared/model/format';
import { useCan, useScope } from '@/shared/model/scope';
import { ActionGroup, SurfaceContent } from '@/shared/ui/composition';
import { DetailLine, EditDialog, QueryState, RouteLink, Status } from '@/shared/ui/components';

export const commandNames: Record<string, string> = {
    createInventoryAdjustment: 'Điều chỉnh tồn kho', postFinanceEntry: 'Ghi nhận thu chi', postGoodsReceipt: 'Nhận hàng',
    sendPurchaseOrder: 'Gửi đơn mua', refundOrder: 'Hoàn tiền', payOrder: 'Ghi nhận thanh toán',
    createShipment: 'Tạo vận đơn', handoverShipment: 'Bàn giao vận đơn', confirmOrder: 'Xác nhận đơn', sendMessage: 'Gửi tin nhắn',
};

const sourceRoutes = {
    order: { permission: 'orders.read', path: (id: string) => 'orders/' + id, label: 'Mở đơn hàng' },
    conversation: { permission: 'conversations.read', path: (id: string) => 'inbox/' + id, label: 'Mở hội thoại' },
    shipment: { permission: 'fulfillment.read', path: (id: string) => 'shipments?q=' + id, label: 'Tìm vận đơn' },
    purchase_order: { permission: 'procurement.read', path: (id: string) => 'purchases?purchaseId=' + id, label: 'Mở đơn mua' },
    bank_transaction: { permission: 'finance.read', path: () => 'finance/reconciliation', label: 'Mở đối soát' },
} as const;

export function RelatedResourceLink({ source }: { source: ResourceRef }) {
    const { shop } = useScope();
    const target = Object.hasOwn(sourceRoutes, source.type) ? sourceRoutes[source.type as keyof typeof sourceRoutes] : undefined;
    const allowed = useCan(target?.permission || null);
    return target && allowed
        ? <RouteLink to={`/s/${shop.id}/${target.path(encodeURIComponent(source.id))}`}>{target.label}</RouteLink>
        : null;
}

export function CommandDetails({ commandId, close }: { commandId: string; close: () => void }) {
    const { shop } = useScope();
    const detail = useApi('getCommand', { path: { commandId } });
    const command = detail.data?.data;
    return <EditDialog open title="Chi tiết trạng thái thao tác" onClose={close} actions={<ActionGroup direction="row">
        <Button disabled={detail.isFetching} onClick={() => void detail.refetch()}>Kiểm tra trạng thái</Button>
        <Button onClick={close}>Đóng</Button>
    </ActionGroup>}>
        <QueryState query={detail}>{command && <SurfaceContent>
            <DetailLine label="Mã thao tác">{command.id}</DetailLine>
            <DetailLine label="Thao tác">{commandNames[command.kind] || 'Thao tác khác'}</DetailLine>
            <DetailLine label="Trạng thái"><Status value={command.status} /></DetailLine>
            <DetailLine label="Cập nhật">{dateTime(command.updatedAt, shop.timezone)}</DetailLine>
            <DetailLine label="Đối tượng kết quả">{command.result ? command.result.type + ' · ' + command.result.id : 'Chưa có kết quả được xác minh'}</DetailLine>
            {command.result && <RelatedResourceLink source={command.result} />}
            {command.status === 'unknown' && <Alert severity="warning">Kết quả chưa rõ. Hãy đối chiếu theo mã thao tác trước khi gửi lại.</Alert>}
            {command.problem && <Alert severity="error">Thao tác có lỗi. Dùng mã thao tác để tra cứu theo quyền được cấp.</Alert>}
        </SurfaceContent>}</QueryState>
    </EditDialog>;
}

export const navigation = [
    { label: 'Điều hành', items: [['R04', 'Tổng quan', 'overview', 'dashboard'], ['R37', 'Công việc hôm nay', 'operations', 'work'], ['R38', 'Cần phê duyệt', 'approvals', 'approval']] },
    { label: 'Bán hàng', items: [
            ['R05', 'Hộp thư khách hàng', 'inbox', 'chat'], ['R07', 'Khách hàng', 'customers', 'people'], ['R17', 'Đơn hàng', 'orders', 'orders'], ['R41', 'Chuẩn bị hàng', 'fulfillment', 'inventory'], ['R42', 'Vận đơn & giao hàng', 'shipments', 'shipping'], ['R43', 'Đổi trả', 'returns', 'return'], ['R54', 'Chăm sóc sau bán', 'service-cases', 'support']
        ] },
    { label: 'Hàng hóa', items: [
            ['R09', 'Sản phẩm', 'products', 'product'], ['R12', 'Danh mục', 'categories', 'category'], ['R13', 'Nhập dữ liệu', 'imports', 'upload'], ['R15', 'Tồn kho', 'inventory', 'inventory'], ['R16', 'Lịch sử kho', 'inventory/movements', 'history'], ['R44', 'Nhà cung cấp', 'suppliers', 'suppliers'], ['R45', 'Đề nghị nhập', 'replenishment', 'reorder'], ['R46', 'Đơn mua hàng', 'purchases', 'purchase'], ['R47', 'Nhận hàng', 'receipts', 'receipt']
        ] },
    { label: 'Kế toán', items: [
            ['R20', 'Thu chi', 'finance', 'money'], ['R21', 'Sổ thu chi', 'finance/entries', 'book'], ['R22', 'Lợi nhuận', 'finance/profit-loss', 'chart'], ['R48', 'Chứng từ & sổ kép', 'finance/journals', 'book'], ['R56', 'Tài khoản kế toán', 'finance/accounts', 'book'], ['R57', 'Mở sổ kế toán', 'finance/opening-balances', 'book'], ['R58', 'Sổ cái', 'finance/ledger', 'book'], ['R59', 'Cân đối phát sinh', 'finance/trial-balance', 'chart'], ['R60', 'Cân đối quản trị', 'finance/balance-sheet', 'chart'], ['R49', 'Đối soát', 'finance/reconciliation', 'match'], ['R50', 'Công nợ & khóa kỳ', 'finance/debts-periods', 'calendar']
        ] },
    { label: 'Đội ngũ AI', items: [
            ['R51', 'Bốn nhân viên AI', 'bot/team', 'ai'], ['R26', 'Cấu hình Admin', 'bot', 'settings'], ['R27', 'Thử bot', 'bot/playground', 'play'], ['R28', 'Chất lượng AI', 'bot/evaluations', 'quality'], ['R23', 'Kiến thức cửa hàng', 'knowledge', 'knowledge'], ['R25', 'Phản hồi cần duyệt', 'knowledge/review', 'feedback'], ['R52', 'Bản tin & sức khỏe', 'operations/digests', 'health']
        ] },
    { label: 'Thông báo & báo cáo', items: [
            ['R39', 'Trung tâm thông báo', 'notifications', 'bell'], ['R40', 'Điện thoại & lịch trực', 'notifications/devices', 'phone'], ['R31', 'Xuất báo cáo', 'reports', 'report'], ['R53', 'Thông tin marketing', 'reports/marketing', 'marketing']
        ] },
    { label: 'Cài đặt', items: [
            ['R29', 'Kết nối Facebook', 'integrations/channels', 'channel'], ['R30', 'Nhà cung cấp AI', 'integrations/ai', 'integration'], ['R32', 'Nhân sự & quyền', 'settings/team', 'people'], ['R33', 'Cửa hàng', 'settings/shop', 'store'], ['R55', 'Quản trị kho', 'settings/warehouses', 'inventory'], ['R34', 'Nhật ký', 'settings/audit', 'history'], ['R35', 'Quyền riêng tư', 'settings/privacy', 'security']
        ] },
] as const;

/** Pick the deepest navigation section on a path boundary, including detail pages. */
export function activeNavigationId(pathname: string, shopId: string): string | undefined {
    let match: { id: string; length: number } | undefined;
    for (const group of navigation) {
        for (const [id, , path] of group.items) {
            const target = `/s/${shopId}/${path}`;
            if ((pathname === target || pathname.startsWith(`${target}/`)) && (!match || target.length > match.length)) {
                match = { id, length: target.length };
            }
        }
    }
    return match?.id;
}

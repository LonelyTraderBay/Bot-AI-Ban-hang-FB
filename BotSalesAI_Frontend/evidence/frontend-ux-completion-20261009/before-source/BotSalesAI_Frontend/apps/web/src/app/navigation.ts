export const navigation = [
    { label: 'ĐIỀU HÀNH', items: [['R04', 'Tổng quan', 'overview', 'dashboard'], ['R37', 'Công việc hôm nay', 'operations', 'work'], ['R38', 'Cần phê duyệt', 'approvals', 'approval']] },
    { label: 'BÁN HÀNG', items: [
            ['R05', 'Hộp thư khách hàng', 'inbox', 'chat'], ['R07', 'Khách hàng', 'customers', 'people'], ['R17', 'Đơn hàng', 'orders', 'orders'], ['R41', 'Chuẩn bị hàng', 'fulfillment', 'inventory'], ['R42', 'Vận đơn & giao hàng', 'shipments', 'shipping'], ['R43', 'Đổi trả', 'returns', 'return'], ['R54', 'Chăm sóc sau bán', 'service-cases', 'support']
        ] },
    { label: 'HÀNG HÓA', items: [
            ['R09', 'Sản phẩm', 'products', 'product'], ['R12', 'Danh mục', 'categories', 'category'], ['R13', 'Nhập dữ liệu', 'imports', 'upload'], ['R15', 'Tồn kho', 'inventory', 'inventory'], ['R16', 'Lịch sử kho', 'inventory/movements', 'history'], ['R44', 'Nhà cung cấp', 'suppliers', 'suppliers'], ['R45', 'Đề nghị nhập', 'replenishment', 'reorder'], ['R46', 'Đơn mua hàng', 'purchases', 'purchase'], ['R47', 'Nhận hàng', 'receipts', 'receipt']
        ] },
    { label: 'KẾ TOÁN', items: [
            ['R20', 'Thu chi', 'finance', 'money'], ['R21', 'Sổ thu chi', 'finance/entries', 'book'], ['R22', 'Lợi nhuận', 'finance/profit-loss', 'chart'], ['R48', 'Chứng từ & sổ kép', 'finance/journals', 'book'], ['R49', 'Đối soát', 'finance/reconciliation', 'match'], ['R50', 'Công nợ & khóa kỳ', 'finance/debts-periods', 'calendar']
        ] },
    { label: 'ĐỘI NGŨ AI', items: [
            ['R51', 'Bốn nhân viên AI', 'bot/team', 'ai'], ['R26', 'Cấu hình Admin', 'bot', 'settings'], ['R27', 'Thử bot', 'bot/playground', 'play'], ['R28', 'Chất lượng AI', 'bot/evaluations', 'quality'], ['R23', 'Kiến thức cửa hàng', 'knowledge', 'knowledge'], ['R25', 'Phản hồi cần duyệt', 'knowledge/review', 'feedback'], ['R52', 'Bản tin & sức khỏe', 'operations/digests', 'health']
        ] },
    { label: 'THÔNG BÁO & BÁO CÁO', items: [
            ['R39', 'Trung tâm thông báo', 'notifications', 'bell'], ['R40', 'Điện thoại & lịch trực', 'notifications/devices', 'phone'], ['R31', 'Xuất báo cáo', 'reports', 'report'], ['R53', 'Thông tin marketing', 'reports/marketing', 'marketing']
        ] },
    { label: 'CÀI ĐẶT', items: [
            ['R29', 'Kết nối Facebook', 'integrations/channels', 'channel'], ['R30', 'Nhà cung cấp AI', 'integrations/ai', 'integration'], ['R32', 'Nhân sự & quyền', 'settings/team', 'people'], ['R33', 'Cửa hàng', 'settings/shop', 'store'], ['R34', 'Nhật ký', 'settings/audit', 'history'], ['R35', 'Quyền riêng tư', 'settings/privacy', 'security']
        ] },
] as const;

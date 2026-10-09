import type { AccountingPeriod, Capabilities, ReturnCase, StockMovement } from '@botsales/contracts';

export const labels: Record<string, string> = {
    active: 'Đang hoạt động', draft: 'Bản nháp', archived: 'Đã lưu trữ', paused: 'Tạm dừng', degraded: 'Cần kiểm tra', unconfigured: 'Chưa cấu hình',
    open: 'Đang xử lý', resolved: 'Đã giải quyết', bot: 'AI phụ trách', human: 'Nhân viên phụ trách',
    queued: 'Đang chờ', running: 'Đang chạy', accepted: 'Đã tiếp nhận', succeeded: 'Hoàn thành', failed: 'Thất bại', unknown: 'Chưa rõ kết quả',
    import: 'Nhập sản phẩm', export: 'Xuất báo cáo', knowledge_index: 'Lập chỉ mục tri thức', evaluation: 'Đánh giá bot', privacy: 'Yêu cầu quyền riêng tư', connection_test: 'Kiểm tra kết nối',
    sent: 'Đã gửi', delivered: 'Đã giao', read: 'Đã đọc', sending: 'Đang gửi', inbound: 'Khách hàng', outbound: 'Trả lời', internal: 'Nội bộ',
    confirmed: 'Đã xác nhận', completed: 'Hoàn tất', cancelled: 'Đã hủy', unfulfilled: 'Chưa chuẩn bị', reserved: 'Đã giữ hàng',
    picking: 'Đang lấy hàng', packed: 'Đã đóng gói', dispatched: 'Đã bàn giao', in_transit: 'Đang vận chuyển', part_delivered: 'Giao một phần',
    part_returned: 'Hoàn một phần', returned: 'Đã hoàn', returning: 'Đang hoàn về', unpaid: 'Chưa thu', part_paid: 'Thu một phần',
    verified: 'Đã xác minh', cod_collected: 'Đơn vị giao đã thu', settled: 'Đã đối soát', part_refunded: 'Hoàn tiền một phần', refunded: 'Đã ghi nhận hoàn tiền',
    receipt: 'Phiếu thu', disbursement: 'Phiếu chi', posted: 'Đã ghi sổ', reversed: 'Đã đảo', provisional: 'Tạm tính', incomplete: 'Chưa đủ dữ liệu', complete: 'Đủ dữ liệu',
    published: 'Đã xuất bản', ready_for_review: 'Chờ duyệt', processing: 'Đang xử lý', rejected: 'Đã từ chối', retired: 'Ngừng sử dụng',
    quarantined: 'Đang cách ly', ready: 'Sẵn sàng',
    connected: 'Đã kết nối', disabled: 'Đã tắt', expired: 'Hết hiệu lực', validating: 'Đang kiểm tra',
    claimed: 'Đã nhận việc', working: 'Đang làm', blocked: 'Bị chặn', pending: 'Đang chờ', pending_approval: 'Chờ phê duyệt', approved: 'Đã duyệt',
    handed_over: 'Đã bàn giao', part_received: 'Nhận một phần', received: 'Đã nhận đủ', awaiting_confirmation: 'Chờ xác nhận', partial: 'Hoàn thành một phần',
    denied: 'Không được phép', revoked: 'Đã thu hồi', released: 'Đã giải phóng', accepted_by_provider: 'Nhà cung cấp đã tiếp nhận', in_app: 'Trong ứng dụng', web_push: 'Web Push', telegram: 'Telegram',
    prepare_order: 'Chuẩn bị đơn', purchase_review: 'Duyệt nhập hàng', payment_mismatch: 'Tiền chưa khớp', customer_handoff: 'Khách cần hỗ trợ', late_shipment: 'Đơn giao chậm', recovery: 'Kiểm tra phục hồi',
    draft_for_approval: 'Lập đơn chờ duyệt', notify_only: 'Chỉ cảnh báo', auto_send: 'Tự gửi có hạn mức',
    sales_receipt: 'Thu bán hàng', inventory_purchase: 'Mua hàng nhập kho', shipping: 'Giao hàng', platform_fee: 'Phí nền tảng', payment_fee: 'Phí thanh toán', ai_expense: 'Chi phí AI', operating_expense: 'Chi phí vận hành', capital: 'Vốn góp', loan_principal: 'Gốc khoản vay', transfer: 'Chuyển nội bộ', other: 'Khác',
    owner: 'Chủ shop', manager: 'Quản lý', sales: 'Bán hàng', warehouse: 'Kho hàng', accountant: 'Kế toán', bot_admin: 'Quản trị AI', viewer: 'Chỉ xem',
    cod: 'Thu hộ COD', bank: 'Ngân hàng', prepay: 'Trả trước', manual: 'Thủ công', approved_adapter: 'Kết nối được duyệt', passed: 'Đạt', error: 'Lỗi',
    sales_admin: 'Admin bán hàng', inventory_agent: 'Kho & mua hàng', finance_agent: 'Kế toán', supervisor: 'Trưởng nhóm',
    locked: 'Đã khóa', closed: 'Đã đóng', warning: 'Cảnh báo', healthy: 'Bình thường', stale: 'Dữ liệu cũ',
    consumed: 'Đã sử dụng', inspected: 'Đã kiểm hàng trả', requested: 'Đã yêu cầu', approved_for_return: 'Đã duyệt nhận trả',
    question: 'Câu hỏi', complaint: 'Khiếu nại', return_request: 'Yêu cầu trả hàng', delivery_issue: 'Vấn đề giao hàng', assigned: 'Đã phân công',
    not_configured: 'Chưa cấu hình', warehouse_buyer: 'Kho & mua hàng', feedback: 'Góp ý đã duyệt', file: 'Tệp tài liệu',
    legal_hold: 'Tạm giữ theo nghĩa vụ', delete: 'Xóa dữ liệu', matched: 'Đã khớp', unmatched: 'Chưa khớp', ambiguous: 'Cần đối chiếu',
    purchase_order: 'Đơn mua hàng', goods_receipt: 'Phiếu nhận hàng', order: 'Đơn hàng', product: 'Sản phẩm', knowledge: 'Nguồn kiến thức',
    finance_entry: 'Chứng từ thu chi', budget_policy: 'Chính sách ngân sách', return: 'Hàng trả', carrier_cod: 'Thu hộ vận chuyển',
    'purchase.send': 'Gửi đơn mua', 'budget.update': 'Sửa ngân sách', 'finance.period.reopen': 'Mở lại kỳ kế toán',
    invited: 'Đã mời', allowed: 'Được phép gửi', facebook_messenger: 'Facebook Messenger', valid: 'Còn hiệu lực', superseded: 'Đã được thay thế',
    messenger: 'Messenger', email: 'Email', sms: 'SMS', marketing: 'Tiếp thị',
    planned: 'Dự kiến', label_pending: 'Đang tạo mã vận đơn', label_ready: 'Đã có mã vận đơn', awaiting_goods: 'Chờ nhận hàng trả',
    suspended: 'Tạm ngừng', suggested: 'Có gợi ý đối chiếu', disputed: 'Có sai lệch', part_settled: 'Đối soát một phần', closing: 'Đang khóa',
    ai_usage: 'Sử dụng AI', notification: 'Thông báo', procurement: 'Mua hàng', down: 'Ngừng hoạt động',
};

const movementLabels = {
    receipt: 'Nhập kho', adjustment: 'Điều chỉnh tồn', reserve: 'Giữ hàng',
    release: 'Giải phóng hàng giữ', fulfillment: 'Xuất kho', return: 'Nhập hàng trả',
} satisfies Record<StockMovement['kind'], string>;
const periodLabels = { open: 'Đang mở', closing: 'Đang khóa', closed: 'Đã khóa' } satisfies Record<AccountingPeriod['state'], string>;
const capabilityLabels = { supported: 'Có hỗ trợ', unsupported: 'Không hỗ trợ', unknown: 'Chưa xác minh' } satisfies Record<Capabilities['text'], string>;
const returnLabels = {requested:'Đã yêu cầu trả',approved:'Đã duyệt nhận trả',rejected:'Đã từ chối',awaiting_goods:'Chờ nhận hàng trả',received:'Đã nhận hàng trả',inspected:'Đã kiểm hàng trả',closed:'Đã kết thúc'} satisfies Record<ReturnCase['state'], string>;
const domainLabels: Record<'stock' | 'stockMovement' | 'accountingPeriod' | 'capability' | 'message' | 'return' | 'consent', Record<string, string>> = {
    stock: { in_stock: 'Còn hàng', low_stock: 'Sắp hết hàng', out_of_stock: 'Hết hàng' },
    stockMovement: movementLabels,
    accountingPeriod: periodLabels,
    capability: capabilityLabels,
    message: { delivered: 'Đã chuyển tới khách', read: 'Khách đã đọc' },
    return: returnLabels,
    consent: { granted: 'Đã đồng ý', withdrawn: 'Đã rút lại đồng ý', declined: 'Đã từ chối', pending: 'Đang chờ khách xác nhận', exchanged: 'Đang chờ khách lựa chọn', confirmed: 'Đã xác nhận', expired: 'Hết hiệu lực' },
};
export type LabelDomain = keyof typeof domainLabels;
export function label(value: string, domain?: LabelDomain) { return (domain && domainLabels[domain][value]) || labels[value] || 'Chưa xác định'; }
const capabilityNames = {
    text: 'Văn bản', streaming: 'Trả lời theo luồng', vision: 'Đọc hình ảnh', structuredOutput: 'Kết quả có cấu trúc',
    toolCalling: 'Gọi công cụ', embeddings: 'Biểu diễn ngữ nghĩa', usageReporting: 'Báo cáo sử dụng',
} satisfies Record<Exclude<keyof Pick<Capabilities, 'text' | 'streaming' | 'vision' | 'structuredOutput' | 'toolCalling' | 'embeddings' | 'usageReporting'>, 'lastVerifiedAt'>, string>;
export function capabilityName(key:string){return capabilityNames[key as keyof typeof capabilityNames]||'Khả năng chưa phân loại';}

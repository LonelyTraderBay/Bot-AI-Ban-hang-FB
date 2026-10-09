import type { ProfitLoss } from '@botsales/contracts';
import { formatMoney } from '@/shared/model/format';

export type ProfitLossQuestionId = 'summary' | 'missing-data';

export const profitLossQuestions: ReadonlyArray<{ id: ProfitLossQuestionId; label: string }> = [
    { id: 'summary', label: 'Tóm tắt các số liệu của kỳ này' },
    { id: 'missing-data', label: 'Chỉ số nào chưa có dữ liệu?' },
];

const nullableMetrics = [
    ['Giá vốn', 'cogs'],
    ['Lãi gộp', 'grossProfit'],
    ['Lợi nhuận vận hành', 'operatingProfit'],
    ['Thu phí giao', 'shippingIncome'],
    ['Chi phí giao', 'shippingExpense'],
    ['Phí nền tảng', 'platformFees'],
    ['Phí thanh toán', 'paymentFees'],
    ['Chi phí AI', 'aiExpense'],
    ['Chi phí vận hành khác', 'otherOperatingExpenses'],
] as const;

export function explainProfitLoss(report: ProfitLoss, question: ProfitLossQuestionId) {
    const missing = nullableMetrics.filter(([, key]) => report[key] === null).map(([label]) => label);
    const answer = question === 'summary'
        ? `Snapshot báo cáo ghi nhận doanh thu thuần ${formatMoney(report.netSales)}, lãi gộp ${formatMoney(report.grossProfit)} và lợi nhuận vận hành ${formatMoney(report.operatingProfit)}. Đây là các giá trị API trả về; giao diện không cộng lại giao dịch trong các trang danh sách.`
        : missing.length
            ? `Snapshot chưa có dữ liệu cho: ${missing.join(', ')}. Các trường này được giữ ở trạng thái chưa xác định, không được thay bằng số 0.`
            : 'Các chỉ số chi phí và lợi nhuận được liệt kê trong snapshot đều có dữ liệu. Hãy đối chiếu cảnh báo và mức đầy đủ trước khi sử dụng.';

    return {
        answer,
        sources: [
            { label: 'Khoảng báo cáo', value: `${report.from} – ${report.to} · ${report.timezone}` },
            { label: 'Snapshot lúc', value: report.asOf },
            { label: 'Phiên bản chính sách', value: report.policyVersion },
            { label: 'Mức đầy đủ', value: report.completeness },
            ...nullableMetrics.filter(([, key]) => report[key] !== null).map(([label, key]) => ({ label, value: formatMoney(report[key]) })),
        ],
        warnings: report.warnings,
    };
}

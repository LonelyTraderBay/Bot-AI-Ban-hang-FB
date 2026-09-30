import type { Problem } from '@botsales/contracts';
export class ApiError extends Error {
    readonly status: number;
    readonly code: string;
    readonly problem?: Problem;
    constructor(status: number, code: string, message: string, problem?: Problem) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.problem = problem;
    }
}
export class UnknownResultError extends ApiError {
    constructor(readonly intentId: string, readonly commandId?: string) {
        super(0, 'RESULT_UNKNOWN', 'Chưa xác minh được kết quả. Không gửi lại thao tác; kiểm tra trạng thái lệnh tại cảnh báo đầu trang trước.');
    }
}
export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Không thể hoàn thành yêu cầu. Hãy thử tải lại dữ liệu.';
}

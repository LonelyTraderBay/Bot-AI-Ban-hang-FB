import type { FileObject } from '@botsales/contracts';

export const PRODUCT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function productImportFileError(file: Pick<File, 'name' | 'size'> | null, maxBytes?: number, allowXlsx = false) {
    if (!file)
        return '';
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !(allowXlsx && name.endsWith('.xlsx')))
        return allowXlsx ? 'Chỉ nhận tệp có đuôi .csv hoặc .xlsx.' : 'Chỉ nhận tệp có đuôi .csv. Đổi đuôi không chuyển đổi nội dung tệp.';
    if (maxBytes !== undefined && file.size > maxBytes)
        return `Tệp vượt giới hạn ${Math.floor(maxBytes / (1024 * 1024))} MB của bản mô phỏng.`;
    return '';
}

const rejectionMessages: Record<NonNullable<FileObject['rejectionReason']>, string> = {
    invalid_format: 'Định dạng hoặc nội dung tệp không hợp lệ. Hãy xuất lại dưới dạng CSV UTF-8 hoặc XLSX và chọn tệp mới.',
    unsupported_content: 'Bảng tính có nội dung không được hỗ trợ. Hãy dán dưới dạng giá trị và lưu bản sao không có macro hoặc liên kết ngoài.',
    spreadsheet_limit: 'Bảng tính vượt giới hạn xử lý. Hãy chia nhỏ tệp, mỗi phần giữ dòng tiêu đề và tối đa 1.000 dòng dữ liệu.',
    unsafe_file: 'Tệp bị cách ly sau khi quét an toàn. Hãy chọn một bản xuất mới từ nguồn tin cậy.',
    validation_failed: 'Máy chủ chưa kiểm tra được tệp. Hãy xuất lại tệp rồi thử lại. Nếu lỗi lặp lại, liên hệ hỗ trợ.',
};

export function productImportRejectionMessage(reason: FileObject['rejectionReason']) {
    return reason ? rejectionMessages[reason] : 'Máy chủ chưa chấp nhận tệp này. Kiểm tra định dạng và chọn lại tệp.';
}

export function productImageFileError(file: Pick<File, 'type' | 'size'> | null, maxBytes?: number) {
    if (!file)
        return '';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
        return 'Chỉ nhận ảnh PNG, JPEG hoặc WebP.';
    if (maxBytes !== undefined && file.size > maxBytes)
        return `Ảnh vượt giới hạn ${Math.floor(maxBytes / (1024 * 1024))} MB của bản mô phỏng.`;
    return '';
}

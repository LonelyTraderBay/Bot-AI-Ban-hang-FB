export const PRODUCT_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export function productImportFileError(file: Pick<File, 'name' | 'size'> | null, maxBytes?: number) {
    if (!file)
        return '';
    if (!file.name.toLowerCase().endsWith('.csv'))
        return 'Chỉ nhận tệp có đuôi .csv. Đổi đuôi không chuyển đổi nội dung tệp.';
    if (maxBytes !== undefined && file.size > maxBytes)
        return `Tệp vượt giới hạn ${Math.floor(maxBytes / (1024 * 1024))} MB của bản mô phỏng.`;
    return '';
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

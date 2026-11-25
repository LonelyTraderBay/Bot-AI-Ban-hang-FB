import { UnprocessableEntityException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract } from '../../http/contracts.js';
import { validUuid } from '../../http/query.js';

type ProductTemplate = {
    kind: 'product_content'; productId: string; sourceOwner: string; features: string; sizeUse: string;
    warranty: string; alternatives: string; forbiddenPromises: string; imageFileId?: string;
};
type ScriptTemplate = {
    kind: 'sales_script'; industry: string; persona: string; needs: string; requiredFacts: string; boundaries: string;
    shippingPolicy: string; returnPolicy: string;
};
const templateSchema = validator.compile<ProductTemplate | ScriptTemplate>(schemaFromContract('KnowledgeTemplate'));

export function readKnowledgeTemplate(input: Prisma.JsonValue | undefined) {
    if (input === null || input === undefined) return undefined;
    if (!templateSchema(input)) throw new UnprocessableEntityException('Biểu mẫu kiến thức không hợp lệ.');
    return Object.fromEntries(Object.entries(input).map(([key, value]) => {
        if (value.includes(String.fromCharCode(0))) throw new UnprocessableEntityException();
        return [key, value.trim()];
    })) as ProductTemplate | ScriptTemplate;
}

async function selectedProductImage(tx: Prisma.TransactionClient, shopId: string, template: ProductTemplate) {
    if (!template.imageFileId) return null;
    const image = await tx.productImage.findFirst({
        where: { shopId, productId: template.productId, fileId: template.imageFileId, file: { purpose: 'product_image', status: 'ready' } },
        select: { fileId: true, file: { select: { sha256: true } } },
    });
    if (!image) throw new UnprocessableEntityException('Ảnh nguồn phải sẵn sàng và đang gắn với sản phẩm trong cửa hàng.');
    return { fileId: image.fileId, sha256: image.file.sha256 };
}

export async function templateContent(tx: Prisma.TransactionClient, shopId: string, template: NonNullable<ReturnType<typeof readKnowledgeTemplate>>) {
    if (template.kind === 'sales_script') {
        return [
            ['Ngành hàng', template.industry], ['Vai trò tư vấn', template.persona],
            ['Hỏi nhu cầu', template.needs], ['Thông tin cần xác nhận', template.requiredFacts],
            ['Giới hạn tư vấn', template.boundaries], ['Chính sách giao hàng', template.shippingPolicy], ['Chính sách đổi trả', template.returnPolicy],
        ].map(([label, text]) => label + ': ' + text).join('\n');
    }
    const product = validUuid(template.productId) ? await tx.product.findUnique({
        where: { shopId_id: { shopId, id: template.productId } }, select: { name: true, status: true },
    }) : undefined;
    if (!product || product.status === 'archived') throw new UnprocessableEntityException('Sản phẩm nguồn phải thuộc cửa hàng và còn sử dụng.');
    await selectedProductImage(tx, shopId, template);
    return [
        ['Sản phẩm', product.name], ['Điểm nổi bật', template.features], ['Kích cỡ và cách dùng', template.sizeUse],
        ['Bảo hành / đổi trả', template.warranty], ['Sản phẩm thay thế', template.alternatives], ['Điều không được cam kết', template.forbiddenPromises],
    ].map(([label, text]) => label + ': ' + text).join('\n');
}

export async function requireTemplateReady(tx: Prisma.TransactionClient, shopId: string, input: Prisma.JsonValue | undefined) {
    const template = readKnowledgeTemplate(input);
    if (!template) return;
    if (Object.values(template).some(value => !value)) throw new UnprocessableEntityException('Điền đầy đủ trường bắt buộc trước khi gửi duyệt hoặc xuất bản.');
    if (template.kind === 'product_content' && !await tx.product.findFirst({
        where: { shopId, id: template.productId, status: 'active' }, select: { id: true },
    })) throw new UnprocessableEntityException('Cần sản phẩm nguồn đang hoạt động trước khi gửi duyệt hoặc xuất bản.');
    return template.kind === 'product_content' ? selectedProductImage(tx, shopId, template) : null;
}

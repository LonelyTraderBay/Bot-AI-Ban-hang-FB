import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '../..', '..');
function load(path) { return JSON.parse(readFileSync(resolve(workspace, path), 'utf8')); }
function save(path, value) {
  const target = resolve(workspace, path);
  const original = readFileSync(target, 'utf8');
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  writeFileSync(target, JSON.stringify(value, null, 2).replaceAll('\n', newline) + newline);
}

const api = load('botsales-kit/contracts/openapi.json');
if (api.info.version !== '2.4.0') throw new Error(`Expected OpenAPI 2.4.0 baseline, got ${api.info.version}`);
const schemas = api.components.schemas;
const message = schemas.Message;
const messageWrite = schemas.MessageWrite;
const upload = schemas.FileUpload;
if (message.properties.attachments || messageWrite.properties.fileIds || upload.properties.purpose.enum.includes('conversation_media'))
  throw new Error('C09 media contract is already present; refusing to overwrite.');

api.info.version = '2.5.0';
schemas.MediaPolicy = {
  type: 'object',
  properties: {
    allowedMimeTypes: { type: 'array', items: { type: 'string', minLength: 3, maxLength: 128 }, minItems: 1, maxItems: 24, uniqueItems: true },
    maxAttachmentCount: { type: 'integer', minimum: 1, maximum: 5 },
    maxFileSizeBytes: { type: 'integer', minimum: 1, maximum: 10485760 }
  },
  required: ['allowedMimeTypes', 'maxAttachmentCount', 'maxFileSizeBytes'],
  additionalProperties: false,
  description: 'Channel-owned media limits. Missing policy means media is unavailable; API rechecks every limit at upload and send.'
};
schemas.MessageAttachment = {
  type: 'object',
  properties: {
    fileId: { $ref: '#/components/schemas/Id' },
    name: { type: 'string', minLength: 1, maxLength: 255 },
    mimeType: { type: 'string', minLength: 3, maxLength: 128 },
    sizeBytes: { type: 'integer', minimum: 0 }
  },
  required: ['fileId', 'name', 'mimeType', 'sizeBytes'],
  additionalProperties: false,
  description: 'Safe message metadata only; read content through the purpose-scoped getFile operation.'
};
message.properties.attachments = { type: 'array', items: { $ref: '#/components/schemas/MessageAttachment' }, maxItems: 5 };
messageWrite.properties.text.minLength = 1;
messageWrite.properties.text.maxLength = 20000;
messageWrite.properties.fileIds = { type: 'array', items: { $ref: '#/components/schemas/Id' }, minItems: 1, maxItems: 5, uniqueItems: true };
messageWrite.required = ['clientMessageId', 'expectedConversationVersion'];
messageWrite.anyOf = [{ required: ['text'] }, { required: ['fileIds'] }];
message.properties.text.description = 'Empty string is used only in a media-only Message response; writes omit text when sending media only.';
schemas.FileObject.properties.purpose.enum.push('conversation_media');
schemas.FileUpload.properties.purpose.enum.push('conversation_media');
schemas.Channel.properties.mediaPolicy = {
  anyOf: [{ $ref: '#/components/schemas/MediaPolicy' }, { type: 'null' }],
  description: 'Optional sanitized media policy for this channel; absent/null disables Inbox media.'
};
const metadataChannel = schemas.InboxMetadata.properties.channels.items;
metadataChannel.properties.mediaPolicy = { anyOf: [{ $ref: '#/components/schemas/MediaPolicy' }, { type: 'null' }] };
metadataChannel.required.push('mediaPolicy');
const send = api.paths['/shops/{shopId}/conversations/{conversationId}/messages'].post;
send.description = 'Validate current session/tenant/resource/field permissions and v2 invariants. Text-only requests remain valid; attachments are sent as file IDs and rechecked against the current channel policy, same-shop conversation scope, upload purpose, MIME/size/count, and scan status. Unknown side-effect results reconcile via command ID.';
const inboxMetadata = api.paths['/shops/{shopId}/conversations/metadata'].get;
inboxMetadata.description += ' Per-channel mediaPolicy exposes only allowed MIME types and maximum count/size; missing policy disables attachments.';
const uploadOperation = api.paths['/shops/{shopId}/uploads'].post;
uploadOperation.description = 'Validate current session/tenant/resource/field permissions and v2 invariants; unknown side-effect results reconcile via command ID. Yêu cầu quyền nguồn: product_image→catalog.write; product_import→catalog.import; knowledge_source→knowledge.write; conversation_media→conversations.reply. conversation_media bắt buộc resourceId là conversationId cùng shop và capability channel hiện hành. Kiểm file phía server; client không quyết định scan status.';
const getFile = api.paths['/shops/{shopId}/uploads/{fileId}'].get;
getFile.description = 'Validate current session/tenant/resource/field permissions and v2 invariants. Kiểm quyền theo purpose/resource gốc và shop; conversation_media yêu cầu conversations.read và đúng conversation scope. URL đọc ngắn hạn, chỉ cấp cho file ready, không bypass authorization.';

const routes = load('botsales-kit/contracts/route-manifest.json');
const r06 = routes.routes.find(route => route.id === 'R06');
if (!r06) throw new Error('R06 route missing.');
if (!r06.readOperations.includes('getFile')) r06.readOperations.push('getFile');
if (!r06.actions.some(action => action.operationId === 'uploadFile')) r06.actions.push({ label: 'Đính kèm media', operationId: 'uploadFile', permission: 'conversations.reply' });
r06.content = 'Message timeline with safe attachment metadata and scoped media readback, delivery status, capability-driven composer, sendEligibility, mode/assignee, source evidence, customer/order panel by permission.';
r06.behavior = 'Lịch sử phân trang giữ scroll; draft reply không persist; text-only vẫn tương thích; media upload theo policy MIME/size/count và conversation scope; file chỉ gửi theo ID sau synthetic scan ready; Enter/Shift+Enter giữ behavior hiện có; internal note không gửi media.';
r06.edgeCases += '; policy media thiếu/không hợp lệ thì tắt đính kèm; MIME/size/count/scope/purpose sai hoặc scan chưa ready thì không gửi; send unknown giữ bản nháp và chặn gửi trùng; object URL bị thu hồi khi bỏ tệp/đóng composer.';

const migrations = load('botsales-kit/contracts/migration-map.json');
if (migrations.additiveExtensions.some(extension => extension.to === '2.5.0')) throw new Error('2.5.0 migration entry already exists.');
migrations.additiveExtensions.push({
  from: '2.4.0', to: '2.5.0', breaking: false, approvedOn: '2026-10-09',
  operations: ['sendMessage', 'uploadFile', 'getFile', 'getInboxMetadata'], routeIds: ['R06'],
  rules: [
    'Text-only send remains valid. Message writes may add file IDs; message reads add optional safe attachment metadata.',
    'Channel media policy is optional; absence disables Inbox attachments. Upload and send recheck exact shop/conversation, purpose, MIME, size, count and ready status.',
    'conversation_media upload requires conversations.reply; readback checks the original purpose/resource permission. Content URLs are short-lived and scoped.',
    'Existing message.created envelope remains unchanged; clients invalidate the message read model and fetch attachment content through getFile.',
    'Frontend and synthetic MSW only. “ready” is a synthetic fixture; no real antivirus, Meta policy, provider, backend, or production storage is certified.'
  ]
});

const features = load('botsales-kit/contracts/feature-catalog.json');
const b08 = features.features.find(feature => feature.id === 'B08');
if (!b08) throw new Error('B08 feature missing.');
b08.approvedExtensions ??= [];
b08.approvedExtensions.push({ approvedOn: '2026-10-09', scope: 'Capability-driven Inbox media upload/send/readback with canonical file IDs, resource-scoped synthetic MSW, and local regression only.', deliveryBoundary: 'FRONTEND_CANONICAL_CONTRACT_SYNTHETIC_MSW; real scan/provider/policy remains unverified' });

const scenarios = load('botsales-kit/fixtures/acceptance-scenarios.json');
const sc2b08 = scenarios.scenarios.find(scenario => scenario.id === 'SC2-B08');
if (!sc2b08) throw new Error('SC2-B08 scenario missing.');
sc2b08.given = 'Inbox media can be composed only when the selected channel exposes a valid mediaPolicy; upload uses purpose conversation_media and the exact conversation resource; send references ready same-scope file IDs.';
sc2b08.when = 'Exercise text-only compatibility, allowed image/audio/document uploads, missing policy, MIME/size/count violations, wrong shop/conversation/purpose, non-ready scan status, read permission, and send unknown with new content added while the first command is pending.';
sc2b08.then = 'Unsupported media and any non-ready or out-of-scope file is not sent; messages expose safe file metadata and scoped readback; acknowledged success removes only the submitted snapshot; unknown keeps the draft and does not blindly resend. Provider delivery, real scanning, payment evidence, and Meta comment/private-message policy remain outside this synthetic scenario.';

const release = load('botsales-kit/release.json');
release.versions.api = '2.5.0';
release.approvedExtensions ??= [];
for (const extension of [
  { approvedOn: '2026-10-09', api: '2.3.0', scope: 'Consent challenge canonical contract + Frontend + synthetic MSW only.' },
  { approvedOn: '2026-10-09', api: '2.4.0', scope: 'Purchase delegation canonical contract + Frontend + synthetic MSW only.' },
  { approvedOn: '2026-10-09', api: '2.5.0', scope: 'Inbox media canonical contract + Frontend + synthetic MSW only; real provider/scan/storage remain outside scope.' }
]) if (!release.approvedExtensions.some(item => item.api === extension.api)) release.approvedExtensions.push(extension);

save('botsales-kit/contracts/openapi.json', api);
save('botsales-kit/contracts/route-manifest.json', routes);
save('botsales-kit/contracts/migration-map.json', migrations);
save('botsales-kit/contracts/feature-catalog.json', features);
save('botsales-kit/fixtures/acceptance-scenarios.json', scenarios);
save('botsales-kit/release.json', release);
console.log(JSON.stringify({ status: 'CANONICAL_INPUTS_UPDATED', apiVersion: api.info.version, route: r06.id, scenario: sc2b08.id, migration: '2.4.0 -> 2.5.0', releaseApi: release.versions.api }, null, 2));

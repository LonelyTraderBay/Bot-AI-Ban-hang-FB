import { MockFailure, all, find, first, insert, ensure, checkVersion, touch, command, str, num, strings, record, id, now, future, job, grantedPermissions } from './database';
import type { Input, Row } from './database';
import { hashValue } from './orders';
const capability = () => ({
    text: 'supported', streaming: 'unsupported', vision: 'unsupported', structuredOutput: 'unknown', toolCalling: 'unsupported', embeddings: 'unsupported', usageReporting: 'unsupported', lastVerifiedAt: null
});
export const providerCatalog = () => [{
        providerId: 'mock', label: 'Nhà cung cấp mô phỏng — không AI thật', adapterId: 'mock', adapterVersion: '1.0', endpointEditable: false, models: [{
                modelId: 'synthetic-model', label: 'Kịch bản cố định', capabilities: capability(), contextLimit: null, inputPricePerMillion: null, outputPricePerMillion: null, pricingAsOf: null
            }]
    }];
export async function auxiliary(op: string, input: Input): Promise<Row | Row[] | undefined> {
    const { shopId, body } = input;
    switch (op) {
        case 'getProviderCatalog': return providerCatalog();
        case 'getInboxMetadata': return { channels: all('channels', shopId).map(c => ({ id: c.id, displayName: c.name })), assignees: all('members', shopId).filter(m => m.status === 'active').map(m => ({ userId: m.userId, displayName: m.userId === 'user-demo' ? 'Chủ shop (mẫu)' : str(m.userId) })) };
        case 'updateShop': {
            const s = find('shops', shopId, shopId);
            checkVersion(s, input);
            return touch(Object.assign(s, body));
        }
        case 'inviteMember': return insert('members', 'Membership', shopId, {
            userId: id('invited'), roles: body.roles, permissions: [...new Set(strings(body.roles).flatMap(grantedPermissions))], permissionVersion: 1, status: 'invited'
        });
        case 'updateMemberRoles': {
            const m = find('members', input.id, shopId);
            ensure(!(m.userId === input.userId && !strings(body.roles).includes('owner')), 'Không tự gỡ quyền chủ shop trong phiên đang dùng.');
            m.roles = body.roles;
            m.permissions = [...new Set(strings(body.roles).flatMap(grantedPermissions))];
            m.permissionVersion = num(m.permissionVersion) + 1;
            return m;
        }
        case 'revokeMembership': {
            const m = find('members', input.id, shopId);
            ensure(m.userId !== input.userId, 'Không tự thu hồi phiên chủ shop.');
            m.status = 'revoked';
            m.permissionVersion = num(m.permissionVersion) + 1;
            return {};
        }
        case 'addInternalNote':
        case 'sendMessage': {
            const c = find('conversations', input.id, shopId);
            if (op === 'sendMessage') {
                ensure(body.expectedConversationVersion === c.version, 'Hội thoại đã đổi. Tải lại trước khi gửi.', 412, 'STALE_VERSION');
                ensure(c.mode === 'human' && c.assignedUserId === input.userId, 'Cần tiếp quản hội thoại trước khi gửi.');
                ensure(record(c.sendEligibility).state === 'allowed', 'Kênh chưa cho phép gửi tin.');
            }
            const message = insert('messages', 'Message', shopId, {
                conversationId: c.id, direction: op === 'addInternalNote' ? 'internal' : 'outbound', senderKind: 'human', text: body.text, status: 'sent', clientMessageId: body.clientMessageId ?? null, sourceEvidence: []
            });
            if (op === 'sendMessage') {
                c.lastMessagePreview = body.text;
                touch(c);
                return command(shopId, op, { type: 'message', id: message.id });
            }
            return message;
        }
        case 'takeoverConversation':
        case 'releaseConversation':
        case 'resolveConversation':
        case 'assignConversation': {
            const c = find('conversations', input.id, shopId);
            checkVersion(c, input);
            if (op === 'takeoverConversation') {
                c.mode = 'human';
                c.assignedUserId = input.userId;
            }
            if (op === 'releaseConversation') {
                ensure(c.mode === 'human', 'Hội thoại không do nhân viên tiếp quản.');
                c.mode = 'bot';
                c.assignedUserId = null;
            }
            if (op === 'resolveConversation')
                c.status = 'resolved';
            if (op === 'assignConversation') {
                ensure(all('members', shopId).some(m => m.userId === body.userId && m.status === 'active'), 'Nhân viên không hợp lệ.');
                c.assignedUserId = body.userId;
            }
            c.generation = num(c.generation) + 1;
            touch(c);
            return command(shopId, op, { type: 'conversation', id: c.id });
        }
        case 'createFeedback': return insert('feedback', 'Feedback', shopId, { ...body, status: 'pending', reviewReason: null, knowledgeDraftId: null });
        case 'reviewFeedback': {
            const f = find('feedback', input.id, shopId);
            checkVersion(f, input);
            ensure(f.status === 'pending', 'Phản hồi đã được duyệt.');
            f.status = body.decision === 'approve' ? 'approved' : 'rejected';
            f.reviewReason = body.reason;
            if (body.decision === 'approve') {
                const k = insert('knowledge', 'Knowledge', shopId, {
                    title: 'Đề xuất từ phản hồi', sourceKind: 'feedback', fileId: null, content: body.redactedCorrection, revision: 1, status: 'draft', contentHash: null, publishedAt: null, approvedBy: null, warnings: [], publishedRevisionId: null, draftRevisionId: null
                });
                f.knowledgeDraftId = k.id;
            }
            return touch(f);
        }
        case 'createKnowledge': {
            const k = insert('knowledge', 'Knowledge', shopId, {
                ...body, revision: 1, status: 'draft', contentHash: await hashValue(body.content), publishedAt: null, approvedBy: null, warnings: [], publishedRevisionId: null, draftRevisionId: null
            });
            const revision = insert('revisions', 'KnowledgeRevision', shopId, { ...k, id: id('knowledge-revision'), documentId: k.id });
            k.draftRevisionId = revision.id;
            return k;
        }
        case 'updateKnowledge': {
            const k = find('knowledge', input.id, shopId);
            checkVersion(k, input);
            Object.assign(k, body);
            k.revision = num(k.revision) + 1;
            k.status = 'draft';
            k.contentHash = await hashValue(k.content);
            touch(k);
            const revision = insert('revisions', 'KnowledgeRevision', shopId, { ...k, id: id('knowledge-revision'), documentId: k.id });
            k.draftRevisionId = revision.id;
            return k;
        }
        case 'submitKnowledgeReview': {
            const k = find('knowledge', input.id, shopId);
            checkVersion(k, input);
            ensure(k.content || k.fileId, 'Thiếu nội dung.', 422);
            k.status = 'ready_for_review';
            touch(k);
            return job(shopId, 'knowledge_index', { result: { type: 'knowledge', id: k.id } });
        }
        case 'publishKnowledge': {
            const k = find('knowledge', input.id, shopId);
            checkVersion(k, input);
            ensure(k.status === 'ready_for_review', 'Tài liệu chưa sẵn sàng duyệt.');
            ensure(k.draftRevisionId === body.revisionId, 'Phiên bản tài liệu không khớp.');
            const evaluation = find('evaluations', str(body.evaluationRunId), shopId);
            ensure(evaluation.status === 'passed' && evaluation.knowledgeRevisionId === body.revisionId, 'Chưa có đánh giá đạt đúng bản kiến thức.');
            k.status = 'published';
            k.approvedBy = input.userId;
            k.publishedAt = now();
            k.publishedRevisionId = body.revisionId;
            touch(k);
            return command(shopId, op, { type: 'knowledge', id: k.id });
        }
        case 'retireKnowledge': {
            const k = find('knowledge', input.id, shopId);
            checkVersion(k, input);
            k.status = 'retired';
            touch(k);
            return command(shopId, op, { type: 'knowledge', id: k.id });
        }
        case 'createKnowledgeRevision':
        case 'restoreKnowledgeRevision': {
            const k = find('knowledge', str(input.path.knowledgeId), shopId);
            let content = body;
            if (op === 'restoreKnowledgeRevision') {
                checkVersion(k, input);
                const old = find('revisions', str(input.path.revisionId), shopId);
                ensure(old.documentId === k.id, 'Phiên bản không thuộc tài liệu.', 404);
                content = { title: old.title, sourceKind: old.sourceKind, fileId: old.fileId, content: old.content };
            }
            Object.assign(k, content);
            k.revision = num(k.revision) + 1;
            k.status = 'draft';
            k.contentHash = await hashValue(k.content);
            touch(k);
            const revision = insert('revisions', 'KnowledgeRevision', shopId, { ...k, id: id('knowledge-revision'), documentId: k.id });
            k.draftRevisionId = revision.id;
            return revision;
        }
        case 'restoreBotRevision': {
            const b = first('bots', shopId);
            checkVersion(b, input);
            const old = all('botRevisions', shopId).find(r => str(r.id) === input.path.revisionId || String(r.revision) === input.path.revisionId);
            ensure(old, 'Không có bản cấu hình đã chọn.', 404);
            for (const key of ['connectionId', 'instructions', 'knowledgeRevisionIds', 'maxToolSteps', 'dailyBudget', 'requireHumanOrderConfirmation'])
                b[key] = structuredClone(old[key]);
            b.draftRevision = num(b.draftRevision) + 1;
            touch(b);
            return insert('botRevisions', 'BotRevision', shopId, { ...b, id: id('botrevision'), revision: b.draftRevision });
        }
        case 'beginChannelConnect':
        case 'reconnectChannel': throw new MockFailure(409, 'MOCK_ONLY', 'Frontend đã có luồng cấp quyền, nhưng chế độ mẫu không mở OAuth hoặc kết nối Page thật.');
        case 'updateBotDraft': {
            const bot = first('bots', shopId);
            checkVersion(bot, input);
            Object.assign(bot, body);
            bot.draftRevision = num(bot.draftRevision) + 1;
            touch(bot);
            insert('botRevisions', 'BotRevision', shopId, { ...bot, id: id('botrevision'), revision: bot.draftRevision });
            return bot;
        }
        case 'runPlayground': return {
            text: `[Mô phỏng, không gọi AI] Với câu hỏi “${str(body.text).slice(0, 120)}”, trợ lý sẽ tra sản phẩm và kiến thức đã duyệt. Giá và tồn cần lấy từ API nghiệp vụ; chưa gửi bất cứ tin nào cho khách.`, configRevision: body.configRevision, sources: [], warnings: ['Đây là kiểm tra giao diện, không đo chất lượng mô hình AI.'], latencyMs: 0, estimatedCost: null, inputTokens: null, outputTokens: null, externalMessageSent: false
        };
        case 'createEvaluation': return insert('evaluations', 'Evaluation', shopId, { ...body, status: 'passed', totalCases: 1, passedCases: 1, criticalFailures: 0, reportJobId: null, mockOnly: true });
        case 'publishBotConfig': {
            const bot = first('bots', shopId);
            checkVersion(bot, input);
            const e = find('evaluations', str(body.evaluationRunId), shopId);
            ensure(e.status === 'passed' && e.configRevision === body.draftRevision && bot.draftRevision === body.draftRevision, 'Đánh giá không khớp bản nháp.');
            bot.liveRevision = body.draftRevision;
            bot.publishedAt = now();
            bot.status = 'active';
            touch(bot);
            return command(shopId, op, { type: 'bot', id: bot.id });
        }
        case 'pauseBot': {
            const bot = first('bots', shopId);
            checkVersion(bot, input);
            bot.status = 'paused';
            touch(bot);
            return command(shopId, op, { type: 'bot', id: bot.id });
        }
        case 'getBotRevisions':
        case 'listBotRevisions': return all('bots', shopId).map(b => ({ ...b, revision: b.draftRevision }));
        case 'createAIConnection': {
            ensure(body.providerId === 'mock', 'Chế độ mô phỏng không nhận khóa của provider thật.', 422);
            ensure(str(body.credential).startsWith('demo-'), 'Chỉ dùng chuỗi demo-…; không nhập khóa bí mật thật.', 422);
            const { credential, ...data } = body;
            void credential;
            return insert('aiConnections', 'AIConnection', shopId, { ...data, hasCredential: false, keyLast4: null, status: 'unconfigured', capabilities: capability(), lastCheckedAt: null });
        }
        case 'updateAIConnection': {
            const c = find('aiConnections', input.id, shopId);
            checkVersion(c, input);
            const { credential, ...data } = body;
            ensure(!credential || str(credential).startsWith('demo-'), 'Không nhập secret thật trong mock.', 422);
            Object.assign(c, data);
            return touch(c);
        }
        case 'deleteAIConnection': {
            const c = find('aiConnections', input.id, shopId);
            c.status = 'disabled';
            touch(c);
            return {};
        }
        case 'testAIConnection': return job(shopId, 'connection_test', {
            status: 'failed', errorCount: 1, rowErrors: [{ row: 1, field: 'provider', code: 'MOCK_ONLY', message: 'Không kiểm thử provider thật ở chế độ mẫu.' }]
        });
        case 'disconnectChannel': {
            const c = find('channels', input.id, shopId);
            checkVersion(c, input);
            c.status = 'disabled';
            touch(c);
            return command(shopId, op, { type: 'channel', id: c.id });
        }
        case 'checkChannelHealth': return job(shopId, 'connection_test', { status: 'failed', errorCount: 1, rowErrors: [{ row: 1, field: 'channel', code: 'MOCK_ONLY', message: 'Không kết nối Meta thật.' }] });
        case 'createDevice': return insert('devices', 'DeviceSubscription', shopId, { deviceName: body.deviceName, userId: input.userId, channel: 'web_push', status: 'pending', lastVerifiedAt: null });
        case 'revokeDevice': {
            const d = find('devices', input.id, shopId);
            checkVersion(d, input);
            d.status = 'revoked';
            return touch(d);
        }
        case 'testDevice': {
            const d = find('devices', input.id, shopId);
            checkVersion(d, input);
            ensure(d.status !== 'revoked', 'Thiết bị đã thu hồi.');
            const c = command(shopId, op, { type: 'device', id: d.id });
            c.status = 'failed';
            c.problem = {
                type: 'about:blank', title: 'Không có Push thật', status: 503, code: 'MOCK_ONLY', detail: 'Chưa có backend gửi Push; không tự đánh dấu thiết bị hoạt động.', requestId: id('request')
            };
            return c;
        }
        case 'updateNotificationPolicy': {
            const policy = first('notificationPolicies', shopId);
            checkVersion(policy, input);
            const { expectedVersion, ...data } = body;
            void expectedVersion;
            Object.assign(policy, data);
            return touch(policy);
        }
        case 'beginTelegramPairing': return { pairingCode: 'DEMO-NOT-A-REAL-PAIRING', expiresAt: future(), botUsername: 'not_connected_demo' };
        case 'updateAgentRole': {
            const r = find('agentRoles', input.id, shopId);
            checkVersion(r, input);
            const { expectedVersion, ...data } = body;
            void expectedVersion;
            return touch(Object.assign(r, data));
        }
        case 'controlAutomation': {
            if (body.scope === 'conversation') {
                const c = find('conversations', str(body.resourceId), shopId);
                checkVersion(c, input);
                c.mode = body.action === 'pause' ? 'human' : 'bot';
                c.assignedUserId = body.action === 'pause' ? input.userId : null;
                c.generation = num(c.generation) + 1;
                touch(c);
                return command(shopId, op, { type: 'conversation', id: c.id });
            }
            const targets = body.scope === 'role' ? [find('agentRoles', str(body.resourceId), shopId)] : all('agentRoles', shopId);
            if (body.scope === 'role')
                checkVersion(targets[0], input);
            for (const r of targets) {
                r.status = body.action === 'pause' ? 'paused' : 'not_configured';
                r.generation = num(r.generation) + 1;
                touch(r);
            }
            const bot = first('bots', shopId);
            if (body.action === 'pause') {
                bot.status = 'paused';
                touch(bot);
            }
            return command(shopId, op, null);
        }
        case 'updateBudgetPolicy': {
            const b = find('budgets', input.id, shopId);
            checkVersion(b, input);
            const approval = find('approvals', str(body.approvalId), shopId);
            ensure(approval.status === 'approved' && record(approval.resource).id === b.id, 'Chưa có phê duyệt đúng hạn mức.');
            b.limitAmount = body.limitAmount;
            b.period = body.period;
            return touch(b);
        }
        case 'createApproval': return insert('approvals', 'Approval', shopId, {
            action: body.action, resource: body.resource, resourceVersion: body.resourceVersion, policyVersion: 'synthetic-policy-1', intentHash: body.intentHash, amount: null, status: 'pending', expiresAt: future(), requestedBy: input.userId, decidedBy: null, decisionReason: null
        });
        case 'createServiceCase': return insert('serviceCases', 'ServiceCase', shopId, { ...body, state: 'open', workItemId: null });
        case 'setServiceCaseStatus': {
            const c = find('serviceCases', input.id, shopId);
            checkVersion(c, input);
            c.state = body.state;
            return touch(c);
        }
        case 'updatePrivacyPolicy': {
            const p = first('privacyPolicies', shopId);
            checkVersion(p, input);
            Object.assign(p, body);
            p.status = 'draft';
            return touch(p);
        }
        case 'createPrivacyRequest': {
            find('customers', str(body.customerId), shopId);
            return insert('privacyRequests', 'PrivacyRequest', shopId, { ...body, status: 'pending_approval', jobId: null });
        }
        default: return undefined;
    }
}

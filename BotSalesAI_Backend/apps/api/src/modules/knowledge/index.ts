import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { AuthConfig } from '../workspace/index.js';
import type { KnowledgeWrite } from './data.js';
import { FeedbackController, FeedbackService } from './feedback.js';
import { KnowledgeService, type Publish, type VersionReason } from './service.js';

export { assignedKnowledge, publishedKnowledge } from './data.js';
export { feedbackCommands } from './feedback.js';
export { knowledgeCommands, knowledgeIndexHandler } from './service.js';

const body = (schema: string) => new SchemaPipe(validator.compile(schemaFromContract(schema)));
const trace = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/knowledge')
class KnowledgeController {
    constructor(private readonly knowledge: KnowledgeService) {}

    @Get()
    @ContractOperation('listKnowledge')
    async list(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.knowledge.list(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get(':knowledgeId')
    @ContractOperation('getKnowledge')
    async get(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.get(request.headers, shopId, id));
    }

    @Get(':knowledgeId/revisions')
    @ContractOperation('listKnowledgeRevisions')
    async revisions(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string,
        @Query() raw: Record<string, unknown>, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.knowledge.revisions(request.headers, shopId, id, raw);
        return { ...envelope(response, data), page };
    }

    @Get(':knowledgeId/revisions/:revisionId')
    @ContractOperation('getKnowledgeRevision')
    async revision(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string, @Param('revisionId', idPipe) revisionId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.revision(request.headers, shopId, id, revisionId));
    }

    @Post()
    @ContractOperation('createKnowledge')
    async create(@Param('shopId', idPipe) shopId: string, @Body(body('KnowledgeWrite')) input: KnowledgeWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.create(request.headers, shopId, input, trace(response)));
    }

    @Patch(':knowledgeId')
    @ContractOperation('updateKnowledge')
    async update(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string,
        @Body(body('KnowledgeWritePatch')) input: Partial<KnowledgeWrite>, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.update(request.headers, shopId, id, input, trace(response)));
    }

    @Post(':knowledgeId/revisions')
    @ContractOperation('createKnowledgeRevision')
    async createRevision(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string,
        @Body(body('KnowledgeWrite')) input: KnowledgeWrite, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.addRevision(request.headers, shopId, id, input, trace(response)));
    }

    @Post(':knowledgeId/revisions/:revisionId/restore')
    @ContractOperation('restoreKnowledgeRevision')
    async restore(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string, @Param('revisionId', idPipe) revisionId: string,
        @Body(body('VersionedReason')) input: VersionReason, @Req() request: IncomingMessage,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.knowledge.restore(request.headers, shopId, id, revisionId, input, trace(response)));
    }

    @Post(':knowledgeId/submit-review')
    @HttpCode(202)
    @ContractOperation('submitKnowledgeReview')
    async submit(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string, @Body(body('VersionedReason')) input: VersionReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.knowledge.submit(request.headers, shopId, id, input, trace(response)));
    }

    @Post(':knowledgeId/publish')
    @HttpCode(202)
    @ContractOperation('publishKnowledge')
    async publish(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string, @Body(body('KnowledgePublishRequest')) input: Publish,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.knowledge.publish(request.headers, shopId, id, input, trace(response)));
    }

    @Post(':knowledgeId/retire')
    @HttpCode(202)
    @ContractOperation('retireKnowledge')
    async retire(@Param('shopId', idPipe) shopId: string, @Param('knowledgeId', idPipe) id: string, @Body(body('VersionedReason')) input: VersionReason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.knowledge.retire(request.headers, shopId, id, input, trace(response)));
    }
}

@Module({})
class KnowledgeModule {}

export function knowledgeModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: KnowledgeModule, controllers: [KnowledgeController, FeedbackController],
        providers: [{ provide: KnowledgeService, useFactory: () => new KnowledgeService(db, config) },
            { provide: FeedbackService, useFactory: () => new FeedbackService(db, config) }],
    };
}

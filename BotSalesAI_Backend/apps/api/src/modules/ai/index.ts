import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { AuthConfig } from '../workspace/index.js';
import type { ApprovedEvaluationConfig } from './approved-evaluation.js';
import type { ConfigDraft } from './bot-data.js';
import { BotService, publishBotHandler, type Playground, type PublishBot, type Reason } from './bot.js';
import { AiConnectionsController } from './connections-controller.js';
import { AiConnections, aiConnectionTestHandler, type AiProbeServices } from './connections.js';
import { aiEvaluationHandler, type EvaluationInput } from './evaluation.js';

export { botCommands } from './bot.js';
export { aiConnectionCommands, aiConnectionReady } from './connections.js';
export { activePublishedBot, liveBotSnapshot } from './bot-data.js';
export { budgetHandoff, proposeSalesDraft, reserveAiUsage, runFixtureTools } from './engine.js';
export { aiFixtureEnabled } from './fixture-provider.js';
export { readOpenAiConnectionConfig, type OpenAiConnectionConfig } from './openai-connections.js';
export { readAiEvaluationApproval, type AiEvaluationApproval, type ApprovedEvaluationConfig } from './approved-evaluation.js';
export { evaluateStagingDraft, stagingDraftCase, stagingDraftIntent, StagingAiError } from './staging-evaluation.js';

const body = (schema: string) => new SchemaPipe(validator.compile(schemaFromContract(schema)));
const trace = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/bot')
class BotController {
    constructor(private readonly bot: BotService) {}

    @Get('config')
    @ContractOperation('getBotConfig')
    async configView(@Param('shopId', idPipe) shopId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.bot.configView(request.headers, shopId));
    }

    @Patch('config')
    @ContractOperation('updateBotDraft')
    async update(@Param('shopId', idPipe) shopId: string, @Body(body('BotConfigWritePatch')) input: Partial<ConfigDraft>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.bot.update(request.headers, shopId, input, trace(response)));
    }

    @Post('config/publish')
    @HttpCode(202)
    @ContractOperation('publishBotConfig')
    async publish(@Param('shopId', idPipe) shopId: string, @Body(body('BotPublishRequest')) input: PublishBot,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.bot.publish(request.headers, shopId, input, trace(response)));
    }

    @Post('playground')
    @HttpCode(200)
    @ContractOperation('runPlayground')
    async playground(@Param('shopId', idPipe) shopId: string, @Body(body('PlaygroundRequest')) input: Playground,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.bot.playground(request.headers, shopId, input, trace(response)));
    }

    @Post('pause')
    @HttpCode(202)
    @ContractOperation('pauseBot')
    async pause(@Param('shopId', idPipe) shopId: string, @Body(body('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.bot.pause(request.headers, shopId, input, trace(response)));
    }

    @Get('revisions')
    @ContractOperation('listBotRevisions')
    async revisions(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.bot.revisions(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('revisions/:revisionId')
    @ContractOperation('getBotRevision')
    async revision(@Param('shopId', idPipe) shopId: string, @Param('revisionId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.bot.revision(request.headers, shopId, id));
    }

    @Post('revisions/:revisionId/restore')
    @ContractOperation('restoreBotRevision')
    async restore(@Param('shopId', idPipe) shopId: string, @Param('revisionId', idPipe) id: string, @Body(body('VersionedReason')) input: Reason,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.bot.restore(request.headers, shopId, id, input, trace(response)));
    }

    @Get('evaluations')
    @ContractOperation('listEvaluations')
    async evaluations(@Param('shopId', idPipe) shopId: string, @Query() raw: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.bot.evaluations(request.headers, shopId, raw);
        return { ...envelope(response, data), page };
    }

    @Get('evaluations/:evaluationId')
    @ContractOperation('getEvaluation')
    async evaluation(@Param('shopId', idPipe) shopId: string, @Param('evaluationId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.bot.evaluation(request.headers, shopId, id));
    }

    @Post('evaluations')
    @HttpCode(202)
    @ContractOperation('createEvaluation')
    async evaluate(@Param('shopId', idPipe) shopId: string, @Body(body('EvaluationRequest')) input: EvaluationInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.bot.evaluate(request.headers, shopId, input, trace(response)));
    }
}

@Module({})
class AiModule {}

export function aiModule(db?: PrismaClient, config?: AuthConfig, provider?: ApprovedEvaluationConfig): DynamicModule {
    return { module: AiModule, controllers: [AiConnectionsController, BotController], providers: [
        { provide: AiConnections, useValue: new AiConnections(db, config, provider?.openAi) },
        { provide: BotService, useValue: new BotService(db, config, provider) },
    ] };
}

export function aiJobHandlers(config?: AuthConfig, services?: AiProbeServices & ApprovedEvaluationConfig) {
    return new Map([
        ['testAIConnection', aiConnectionTestHandler(config, services)],
        ['createEvaluation', aiEvaluationHandler(config, services)],
        ['publishBotConfig', publishBotHandler(config, services)],
    ]);
}

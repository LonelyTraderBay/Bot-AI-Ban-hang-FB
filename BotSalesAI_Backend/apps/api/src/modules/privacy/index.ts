import { Body, Controller, Get, HttpCode, Module, Param, Patch, Post, Query, Req, Res, type DynamicModule } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { AuthConfig } from '../workspace/index.js';
import { ConsentService, type Confirmation, type ConsentRequest } from './consent.js';
import { PrivacyService, type PolicyPatch, type PrivacyRequestInput, type ReauthApproval } from './requests.js';

export { privacyRequestHandler, runPrivacyMaintenance } from './data.js';
export { currentMarketingConsent } from './consent.js';
export { erasedIdentityKey } from './identity.js';
export { applyPrivacyRecovery, capturePrivacyRecovery } from './recovery.js';
export { privacyCommands } from './requests.js';

const policyPatch = new SchemaPipe(validator.compile(schemaFromContract('PrivacyPolicyWritePatch')));
const requestInput = new SchemaPipe(validator.compile(schemaFromContract('PrivacyRequestWrite')));
const approvalInput = new SchemaPipe(validator.compile(schemaFromContract('ReauthApproval')));
const challengeInput = new SchemaPipe(validator.compile(schemaFromContract('ConsentChallengeWrite')));
const exchangeInput = new SchemaPipe(validator.compile(schemaFromContract('ConsentChallengeExchangeRequest')));
const confirmationInput = new SchemaPipe(validator.compile(schemaFromContract('ConsentConfirmationRequest')));
const trace = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/privacy')
class PrivacyController {
    constructor(private readonly service: PrivacyService) {}

    @Get('policy')
    @ContractOperation('getPrivacyPolicy')
    async policy(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.service.readPolicy(request.headers, shopId));
    }

    @Patch('policy')
    @ContractOperation('updatePrivacyPolicy')
    async update(@Param('shopId', idPipe) shopId: string, @Body(policyPatch) body: PolicyPatch,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.service.updatePolicy(request.headers, shopId, body, trace(response)));
    }

    @Get('requests')
    @ContractOperation('listPrivacyRequests')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.service.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post('requests')
    @ContractOperation('createPrivacyRequest')
    async create(@Param('shopId', idPipe) shopId: string, @Body(requestInput) body: PrivacyRequestInput,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.service.create(request.headers, shopId, body, trace(response)));
    }

    @Post('requests/:privacyRequestId/approve')
    @HttpCode(202)
    @ContractOperation('approvePrivacyRequest')
    async approve(@Param('shopId', idPipe) shopId: string, @Param('privacyRequestId', idPipe) id: string, @Body(approvalInput) body: ReauthApproval,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.service.approve(request.headers, shopId, id, body, trace(response)));
    }
}

@Controller('shops/:shopId')
class ConsentController {
    constructor(private readonly service: ConsentService) {}

    @Get('customer-consents')
    @ContractOperation('listCustomerConsents')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.service.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('customer-consent-challenges')
    @ContractOperation('listCustomerConsentChallenges')
    async challenges(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.service.challenges(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Post('customers/:customerId/consent-challenges')
    @ContractOperation('createCustomerConsentChallenge')
    async create(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string, @Body(challengeInput) body: ConsentRequest,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.service.create(request.headers, shopId, customerId, body, trace(response)));
    }
}

@Controller('public/consent')
class PublicConsentController {
    constructor(private readonly service: ConsentService) {}

    @Post('challenges/exchange')
    @HttpCode(200)
    @ContractOperation('exchangeConsentChallenge')
    async exchange(@Body(exchangeInput) body: { token: string }, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.service.exchange(request.headers, body.token));
    }

    @Post('confirmations')
    @HttpCode(200)
    @ContractOperation('confirmConsentChallenge')
    async confirm(@Body(confirmationInput) body: Confirmation, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.service.confirm(request.headers, body, trace(response)));
    }
}

@Module({})
class PrivacyModule {}

export function privacyModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: PrivacyModule,
        controllers: [PrivacyController, ConsentController, PublicConsentController],
        providers: [
            { provide: PrivacyService, useFactory: () => new PrivacyService(db, config) },
            { provide: ConsentService, useFactory: () => new ConsentService(db, config) },
        ],
    };
}

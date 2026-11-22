import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import { AutomationService, type ControlWrite, type RoleWrite } from './automation.js';
import { BudgetService, type BudgetWrite } from './budgets.js';
import { OperationsOverview } from './overview.js';

const input = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const trace = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId')
export class GovernanceController {
    constructor(private readonly automation: AutomationService, private readonly budgets: BudgetService, private readonly overview: OperationsOverview) {}

    @Get('agent-roles')
    @ContractOperation('listAgentRoles')
    async listAgentRoles(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.automation.roles(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('agent-roles/:resourceId')
    @ContractOperation('getAgentRole')
    async getAgentRole(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.automation.role(request.headers, shopId, id));
    }

    @Put('agent-roles/:resourceId')
    @ContractOperation('updateAgentRole')
    async updateAgentRole(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(input('AgentRoleWrite')) body: RoleWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.automation.updateRole(request.headers, shopId, id, body, trace(response)));
    }

    @Get('budget-policies')
    @ContractOperation('listBudgetPolicies')
    async listBudgetPolicies(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.budgets.list(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('budget-policies/:resourceId')
    @ContractOperation('getBudgetPolicy')
    async getBudgetPolicy(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.budgets.get(request.headers, shopId, id));
    }

    @Put('budget-policies/:resourceId')
    @ContractOperation('updateBudgetPolicy')
    async updateBudgetPolicy(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(input('BudgetPolicyWrite')) body: BudgetWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.budgets.update(request.headers, shopId, id, body, trace(response)));
    }

    @Get('digests')
    @ContractOperation('listDigests')
    async listDigests(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const { data, page } = await this.overview.digests(request.headers, shopId, query);
        return { ...envelope(response, data), page };
    }

    @Get('digests/:resourceId')
    @ContractOperation('getDigest')
    async getDigest(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.overview.digest(request.headers, shopId, id));
    }

    @Get('operations-summary')
    @ContractOperation('getOperationsSummary')
    async getOperationsSummary(@Param('shopId', idPipe) shopId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.overview.summary(request.headers, shopId));
    }

    @Post('automation-control')
    @HttpCode(202)
    @ContractOperation('controlAutomation')
    async controlAutomation(@Param('shopId', idPipe) shopId: string, @Body(input('ControlRequest')) body: ControlWrite,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.automation.control(request.headers, shopId, body, trace(response)));
    }
}

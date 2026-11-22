import { Controller, Get, Param, Query, Req, Res } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ContractOperation } from '../../../http/operations.js';
import { envelope, noStore } from '../../../http/response.js';
import { idPipe } from '../../../http/query.js';
import { ActivityService } from './activity-service.js';

@Controller('shops/:shopId')
export class ActivityController {
    constructor(private readonly activity: ActivityService) {}

    @Get('commands')
    @ContractOperation('listCommands')
    async listCommands(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.activity.listCommands(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get('commands/:commandId')
    @ContractOperation('getCommand')
    async getCommand(@Param('shopId', idPipe) shopId: string, @Param('commandId', idPipe) commandId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.activity.getCommand(request.headers, shopId, commandId));
    }

    @Get('jobs')
    @ContractOperation('listJobs')
    async listJobs(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.activity.listJobs(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get('jobs/:jobId')
    @ContractOperation('getJob')
    async getJob(@Param('shopId', idPipe) shopId: string, @Param('jobId', idPipe) jobId: string,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.activity.getJob(request.headers, shopId, jobId));
    }

    @Get('audit')
    @ContractOperation('listAuditEvents')
    async listAudit(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.activity.listAudit(request.headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }
}

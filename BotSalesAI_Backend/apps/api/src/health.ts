import { Controller, Get, Inject, Query, ServiceUnavailableException } from '@nestjs/common';
import { createContractValidator, SchemaPipe } from './http/contracts.js';

export const READINESS_CHECK = Symbol('readinessCheck');
export type ReadinessCheck = () => boolean | Promise<boolean>;

const noQuery = new SchemaPipe(createContractValidator().compile({ type: 'object', additionalProperties: false }));

@Controller('health')
export class HealthController {
    constructor(@Inject(READINESS_CHECK) private readonly check: ReadinessCheck) {}

    @Get('live')
    live(@Query(noQuery) _query: unknown): { status: 'ok' } {
        return { status: 'ok' };
    }

    @Get('ready')
    async ready(@Query(noQuery) _query: unknown): Promise<{ status: 'ready' }> {
        const ready = await Promise.resolve().then(() => this.check()).catch(() => false);
        if (!ready) throw new ServiceUnavailableException();
        return { status: 'ready' };
    }
}

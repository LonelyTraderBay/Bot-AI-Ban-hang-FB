import 'reflect-metadata';
import { Module, type INestApplication } from '@nestjs/common';
import { DiscoveryModule, NestFactory } from '@nestjs/core';
import { HealthController, READINESS_CHECK, type ReadinessCheck } from './health.js';
import { API_PREFIX } from './http/operations.js';
import { ProblemFilter, requestTrace } from './http/problem.js';

export async function createApp(options: { readiness?: ReadinessCheck; quiet?: boolean } = {}): Promise<INestApplication> {
    @Module({
        imports: [DiscoveryModule],
        controllers: [HealthController],
        providers: [{ provide: READINESS_CHECK, useValue: options.readiness ?? (() => true) }],
    })
    class AppModule {}

    const app = await NestFactory.create(AppModule, { abortOnError: false, logger: options.quiet ? false : undefined });
    app.setGlobalPrefix(API_PREFIX.slice(1));
    app.use(requestTrace);
    app.useGlobalFilters(new ProblemFilter());
    return app;
}

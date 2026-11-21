import { Module, type DynamicModule } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthConfig } from '../workspace/index.js';
import { CategoryController, CategoryService } from './categories.js';
import { CatalogController } from './catalog-controller.js';
import { CatalogService } from './catalog-service.js';
import { ImportsController, ImportsService } from './imports.js';
import { PromotionsController, PromotionsService } from './promotions.js';

export { productCommands } from './catalog-service.js';
export { categoryCommands } from './categories.js';
export { catalogJobHandlers } from './imports.js';
export { sellableVariants } from './catalog-service.js';

@Module({})
class CatalogModule {}

export function catalogModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: CatalogModule, controllers: [CatalogController, CategoryController, ImportsController, PromotionsController],
        providers: [
            { provide: CatalogService, useFactory: () => new CatalogService(db, config) },
            { provide: CategoryService, useFactory: () => new CategoryService(db, config) },
            { provide: ImportsService, useFactory: () => new ImportsService(db, config) },
            { provide: PromotionsService, useFactory: () => new PromotionsService(db) },
        ],
    };
}

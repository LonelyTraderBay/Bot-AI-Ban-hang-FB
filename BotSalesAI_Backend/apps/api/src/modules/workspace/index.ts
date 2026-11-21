import { Module, type DynamicModule } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { ActivityController } from './activity/activity-controller.js';
import { ActivityService, type CommandSource } from './activity/activity-service.js';
import { EventsController } from './activity/events-controller.js';
import { AuthController } from './auth/auth-controller.js';
import { AuthService } from './auth/auth-service.js';
import type { AuthConfig } from './auth/config.js';
import { ShopsController } from './shops/shops-controller.js';
import { ShopsService } from './shops/shops-service.js';

export { readAuthConfig, type AuthConfig } from './auth/config.js';
export { readAsSession, requireShopAccess } from './policy/access.js';
export { writeShopCommand, type ShopScope } from './policy/command-scope.js';

@Module({})
class WorkspaceModule {}

export function workspaceModule(db?: PrismaClient, config?: AuthConfig, commandSources?: readonly CommandSource[]): DynamicModule {
    return {
        module: WorkspaceModule,
        controllers: [AuthController, ShopsController, ActivityController, EventsController],
        providers: [
            { provide: AuthService, useFactory: () => new AuthService(db, config) },
            { provide: ShopsService, useFactory: () => new ShopsService(db, config) },
            { provide: ActivityService, useFactory: () => new ActivityService(db, commandSources) },
        ],
    };
}

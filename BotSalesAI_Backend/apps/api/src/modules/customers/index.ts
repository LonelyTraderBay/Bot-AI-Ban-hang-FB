import { Module, type DynamicModule } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthConfig } from '../workspace/index.js';
import { AddressController, CustomersController, ServiceCaseController } from './customers-controller.js';
import { CustomersService } from './customers-service.js';

export { createServiceCaseRecord, customerCommands } from './customers-service.js';
export { addressRedactions, addressView, checkedAddress, createAddressForCustomer, customerForChannelIdentity, customerInShop, customerView, snapshotAddress, addressSnapshotView, type AddressInput } from './customer-data.js';

@Module({})
class CustomersModule {}

export function customersModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: CustomersModule, controllers: [CustomersController, AddressController, ServiceCaseController],
        providers: [{ provide: CustomersService, useFactory: () => new CustomersService(db, config) }],
    };
}

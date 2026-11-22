import { Module, type DynamicModule } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AuthConfig } from '../workspace/index.js';
import { DelegationController, DelegationService } from './delegations.js';
import { PurchaseController, PurchaseService } from './purchases.js';
import { ReceiptController, ReceiptService } from './receipts.js';
import { ReorderController, ReorderService } from './reorder.js';
import { SupplierController, SupplierService } from './suppliers.js';

export { procurementCommands } from './access.js';
export { recordManualEvidence } from './evidence.js';
export { purchaseApprovalResource } from './purchase-data.js';
export { dispatchPurchases } from './purchases.js';
export { evaluateAutomaticReorder } from './reorder.js';

@Module({})
class ProcurementModule {}

export function procurementModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: ProcurementModule,
        controllers: [SupplierController, ReorderController, PurchaseController, ReceiptController, DelegationController],
        providers: [
            { provide: SupplierService, useFactory: () => new SupplierService(db, config) },
            { provide: ReorderService, useFactory: () => new ReorderService(db, config) },
            { provide: PurchaseService, useFactory: () => new PurchaseService(db, config) },
            { provide: ReceiptService, useFactory: () => new ReceiptService(db, config) },
            { provide: DelegationService, useFactory: () => new DelegationService(db, config) },
        ],
    };
}

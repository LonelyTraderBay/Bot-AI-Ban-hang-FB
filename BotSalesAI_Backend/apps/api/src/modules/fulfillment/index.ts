import { Body, ConflictException, Controller, Get, Module, Param, Put, Req, Res, UnprocessableEntityException, type DynamicModule } from '@nestjs/common';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { validator } from '../../http/contract-source.js';
import { SchemaPipe, schemaFromContract } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { noStore, requireIfMatch, requireVersion, versionedEnvelope } from '../../http/response.js';
import { recordAudit } from '../../platform/audit/index.js';
import { ExactDecimal } from '../../platform/money/index.js';
import { readAsSession, requireShopAccess, writeShopCommand, type AuthConfig } from '../workspace/index.js';

type ShippingRule = { countryCode: string; province: string; serviceName: string; amount: string };
type ShippingPolicy = { shopId: string; version: number; rules: ShippingRule[] };
type Region = { countryCode: string | null; province: string | null };
const policyInput = new SchemaPipe(validator.compile(schemaFromContract('ShippingPolicyUpdate')));
export const shippingPolicyCommand = { operationId: 'updateShippingPolicy', resourceType: 'shipping_policy' };

const normalize = (value: string) => value.trim().normalize('NFC').replace(/\s+/g, ' ');
const regionKey = ({ countryCode, province }: Region) => countryCode + '/' + normalize(province ?? '').toLocaleLowerCase('vi-VN');

function checkedRules(rules: ShippingRule[]) {
    const regions = new Set<string>();
    return rules.map(rule => {
        const normalized = {
            ...rule, province: normalize(rule.province), serviceName: normalize(rule.serviceName), amount: new ExactDecimal(rule.amount).toFixed(),
        };
        const key = regionKey(normalized);
        if (!normalized.province || !normalized.serviceName || regions.has(key) ||
            [normalized.province, normalized.serviceName].some(text => text.includes(String.fromCharCode(0)))) {
            throw new UnprocessableEntityException();
        }
        regions.add(key);
        return normalized;
    });
}

async function policyForShop(tx: Prisma.TransactionClient, shopId: string): Promise<ShippingPolicy> {
    const stored = await tx.shippingPolicy.findUnique({ where: { shopId } });
    return { shopId, version: stored?.version ?? 1, rules: stored?.rules as ShippingRule[] | undefined ?? [] };
}

export async function estimatedShipping(tx: Prisma.TransactionClient, shopId: string, address: Region | null, currency: string) {
    const { version, rules } = await policyForShop(tx, shopId);
    const rule = address?.province && address.countryCode ? rules.find(candidate => regionKey(candidate) === regionKey(address)) : undefined;
    return {
        policyVersion: version,
        rate: rule ? {
            policyVersion: version, countryCode: rule.countryCode, province: rule.province,
            serviceName: rule.serviceName, fee: { amount: rule.amount, currency },
        } : null,
    };
}

class ShippingService {
    constructor(private readonly db?: PrismaClient, private readonly config?: AuthConfig) {}

    get(headers: IncomingHttpHeaders, shopId: string) {
        return readAsSession(this.db, headers, async (tx, userId) => {
            await requireShopAccess(tx, userId, shopId, 'shop.manage');
            return policyForShop(tx, shopId);
        });
    }

    update(headers: IncomingHttpHeaders, shopId: string, input: { rules: ShippingRule[] }, requestId: string) {
        const version = requireIfMatch(headers);
        const { operationId, resourceType } = shippingPolicyCommand;
        return writeShopCommand(this.db, this.config, {
            headers, shopId, permission: 'shop.manage', operationId, payload: { version, input },
        }, async (tx, scope) => {
            const prior = await policyForShop(tx, shopId);
            requireVersion(prior.version, version);
            const rules = checkedRules(input.rules);
            const updated = await tx.shippingPolicy.upsert({
                where: { shopId }, create: { shopId, version: prior.version + 1, rules },
                update: { version: { increment: 1 }, rules },
            });
            await recordAudit(tx, {
                shopId, actorId: scope.userId, action: operationId, requestId, resourceType, resourceId: shopId,
                metadata: { version: updated.version, ruleCount: rules.length },
            });
            return { type: resourceType, id: shopId };
        }, (tx, _scope, result) => {
            if (result.type !== resourceType || result.id !== shopId) throw new ConflictException();
            return policyForShop(tx, shopId);
        });
    }
}

@Controller('shops/:shopId/shipping-policy')
class ShippingController {
    constructor(private readonly shipping: ShippingService) {}

    @Get()
    @ContractOperation('getShippingPolicy')
    async get(@Param('shopId', idPipe) shopId: string, @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shipping.get(request.headers, shopId));
    }

    @Put()
    @ContractOperation('updateShippingPolicy')
    async put(@Param('shopId', idPipe) shopId: string, @Body(policyInput) input: { rules: ShippingRule[] },
        @Req() request: IncomingMessage, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.shipping.update(request.headers, shopId, input, String(response.getHeader('X-Request-Id'))));
    }
}

@Module({})
class FulfillmentModule {}

export function fulfillmentModule(db?: PrismaClient, config?: AuthConfig): DynamicModule {
    return {
        module: FulfillmentModule, controllers: [ShippingController],
        providers: [{ provide: ShippingService, useFactory: () => new ShippingService(db, config) }],
    };
}

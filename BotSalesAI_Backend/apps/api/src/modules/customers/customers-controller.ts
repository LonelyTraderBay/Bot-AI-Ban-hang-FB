import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { IncomingHttpHeaders, ServerResponse } from 'node:http';
import { validator } from '../../http/contract-source.js';
import { schemaFromContract, SchemaPipe } from '../../http/contracts.js';
import { ContractOperation } from '../../http/operations.js';
import { idPipe } from '../../http/query.js';
import { envelope, noStore, versionedEnvelope } from '../../http/response.js';
import type { AddressInput, CustomerInput } from './customer-data.js';
import { CustomersService, type CaseChange, type CaseInput } from './customers-service.js';

const pipe = (name: string) => new SchemaPipe(validator.compile(schemaFromContract(name)));
const customerWrite = pipe('CustomerWrite');
const customerPatch = pipe('CustomerWritePatch');
const addressWrite = pipe('CustomerAddressWrite');
const addressPatch = pipe('CustomerAddressWritePatch');
const archiveWrite = pipe('VersionedReason');
const caseWrite = pipe('ServiceCaseWrite');
const caseStatus = pipe('CaseStatusWrite');
const trace = (response: ServerResponse) => String(response.getHeader('X-Request-Id'));

@Controller('shops/:shopId/customers')
export class CustomersController {
    constructor(private readonly customers: CustomersService) {}

    @Get()
    @ContractOperation('listCustomers')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.customers.list(headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get(':customerId')
    @ContractOperation('getCustomer')
    async get(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.get(headers, shopId, customerId));
    }

    @Post()
    @ContractOperation('createCustomer')
    async create(@Param('shopId', idPipe) shopId: string, @Body(customerWrite) input: CustomerInput,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.create(headers, shopId, input, trace(response)));
    }

    @Patch(':customerId')
    @ContractOperation('updateCustomer')
    async update(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string,
        @Body(customerPatch) input: Partial<CustomerInput>, @Headers() headers: IncomingHttpHeaders,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.update(headers, shopId, customerId, input, trace(response)));
    }
}

@Controller('shops/:shopId/customers/:customerId/addresses')
export class AddressController {
    constructor(private readonly customers: CustomersService) {}

    @Get()
    @ContractOperation('listCustomerAddresses')
    async list(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string,
        @Query() query: Record<string, unknown>, @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.customers.listAddresses(headers, shopId, customerId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get(':addressId')
    @ContractOperation('getCustomerAddress')
    async get(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string, @Param('addressId', idPipe) addressId: string,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.getAddress(headers, shopId, customerId, addressId));
    }

    @Post()
    @ContractOperation('createCustomerAddress')
    async create(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string, @Body(addressWrite) input: AddressInput,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.createAddress(headers, shopId, customerId, input, trace(response)));
    }

    @Patch(':addressId')
    @ContractOperation('updateCustomerAddress')
    async update(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string, @Param('addressId', idPipe) addressId: string,
        @Body(addressPatch) input: Partial<AddressInput>, @Headers() headers: IncomingHttpHeaders,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.updateAddress(headers, shopId, customerId, addressId, input, trace(response)));
    }

    @Post(':addressId/archive')
    @HttpCode(202)
    @ContractOperation('archiveCustomerAddress')
    async archive(@Param('shopId', idPipe) shopId: string, @Param('customerId', idPipe) customerId: string, @Param('addressId', idPipe) addressId: string,
        @Body(archiveWrite) input: { expectedVersion: number; reason: string }, @Headers() headers: IncomingHttpHeaders,
        @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return envelope(response, await this.customers.archiveAddress(headers, shopId, customerId, addressId, input, trace(response)));
    }
}

@Controller('shops/:shopId/service-cases')
export class ServiceCaseController {
    constructor(private readonly customers: CustomersService) {}

    @Get()
    @ContractOperation('listServiceCases')
    async list(@Param('shopId', idPipe) shopId: string, @Query() query: Record<string, unknown>,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        const result = await this.customers.listCases(headers, shopId, query);
        return { ...envelope(response, result.data), page: result.page };
    }

    @Get(':resourceId')
    @ContractOperation('getServiceCase')
    async get(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.getCase(headers, shopId, id));
    }

    @Post()
    @ContractOperation('createServiceCase')
    async create(@Param('shopId', idPipe) shopId: string, @Body(caseWrite) input: CaseInput,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.createCase(headers, shopId, input, trace(response)));
    }

    @Post(':resourceId/status')
    @HttpCode(200)
    @ContractOperation('setServiceCaseStatus')
    async status(@Param('shopId', idPipe) shopId: string, @Param('resourceId', idPipe) id: string, @Body(caseStatus) input: CaseChange,
        @Headers() headers: IncomingHttpHeaders, @Res({ passthrough: true }) response: ServerResponse) {
        noStore(response);
        return versionedEnvelope(response, await this.customers.changeCase(headers, shopId, id, input, trace(response)));
    }
}

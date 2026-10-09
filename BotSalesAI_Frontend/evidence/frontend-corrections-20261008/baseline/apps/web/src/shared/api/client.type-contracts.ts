import type { Operations } from '@botsales/contracts';
import type { ApiArguments, ApiOptionsBase, QueryApiOptions } from './client';

type Assert<Condition extends true> = Condition;
type IsOptional<Shape, Key extends keyof Shape> = Pick<Shape, Key> extends { [Field in Key]-?: Shape[Field] } ? false : true;

export type CustomerRequestBodyIsRequired = Assert<IsOptional<ApiOptionsBase<'createCustomer'>, 'body'> extends false ? true : false>;
export type MultipartUploadRequiresForm = Assert<IsOptional<ApiOptionsBase<'uploadFile'>, 'form'> extends false ? true : false>;
export type MultipartUploadRequiresOptions = Assert<[] extends ApiArguments<'uploadFile'> ? false : true>;
export type VersionedMutationRequiresOptions = Assert<[] extends ApiArguments<'updateCustomer'> ? false : true>;
export type BodylessLogoutAllowsOptionsOmission = Assert<[] extends ApiArguments<'logout'> ? true : false>;
export type OrdersAllowCustomerFilter = Assert<'customerId' extends keyof NonNullable<QueryApiOptions<'listOrders'>['query']> ? true : false>;
export type ServiceCasesDoNotAllowCustomerFilter = Assert<'customerId' extends keyof Operations['listServiceCases']['query'] ? false : true>;
export type CashflowQueryRequiresRange = Assert<IsOptional<Operations['getCashflow']['query'], 'from' | 'to' | 'timezone'> extends false ? true : false>;

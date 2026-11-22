import { readFileSync } from 'node:fs';
import { createContractValidator } from './contracts.js';

export const contractDirectory = new URL('../../../../../botsales-kit/contracts/', import.meta.url);
export const openapi = JSON.parse(readFileSync(new URL('openapi.json', contractDirectory), 'utf8'));
export const validator = createContractValidator(openapi.components.schemas);
const verifyKey = validator.compile(openapi.components.parameters.Idempotency.schema);
export const validIdempotencyKey = (value: string | undefined): value is string => verifyKey(value);

import type { ValidateFunction } from 'ajv';

// Vite and the domain test build replace this entry with precompiled validators.
function missingValidators(): never {
    throw new Error('Compile the OpenAPI validators before loading the API client.');
}

export const componentValidators: ReadonlyMap<string, ValidateFunction> = missingValidators();
export const parameterValidators: ReadonlyMap<string, ValidateFunction> = missingValidators();

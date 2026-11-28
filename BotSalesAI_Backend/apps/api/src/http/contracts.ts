import { BadRequestException, ConflictException, UnprocessableEntityException, type PipeTransform } from '@nestjs/common';
import { Ajv2020, type AnySchema, type ValidateFunction } from 'ajv/dist/2020.js';
import formats from 'ajv-formats';

const addFormats = formats.default;
const contractUri = 'https://botsales.invalid/openapi';
export interface FieldError {
    path: string;
    code: string;
    message: string;
}

export function createContractValidator(schemas: Readonly<Record<string, unknown>> = {}): Ajv2020 {
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
    addFormats(ajv);
    ajv.addSchema({ components: { schemas } }, contractUri);
    return ajv;
}

export function schemaFromContract(name: string): AnySchema {
    return { $ref: contractUri + '#/components/schemas/' + name };
}

export class InvalidInput extends BadRequestException {
    constructor(readonly errors: FieldError[]) {
        super();
    }
}

export class FieldConflict extends ConflictException {
    constructor(readonly errors: FieldError[]) {
        super();
    }
}

export class DomainConflict extends ConflictException {
    constructor(readonly problemCode: string, readonly detail: string, readonly errors?: FieldError[]) {
        super(detail);
    }
}

export class UnprocessableInput extends UnprocessableEntityException {
    constructor(readonly errors: FieldError[]) {
        super();
    }
}

export class SchemaPipe implements PipeTransform<unknown, unknown> {
    constructor(private readonly validate: ValidateFunction) {}

    transform(value: unknown): unknown {
        if (this.validate(value)) return value;
        throw new InvalidInput((this.validate.errors ?? []).map(error => ({
            path: error.instancePath || '/',
            code: error.keyword,
            message: error.message ?? 'Invalid value',
        })));
    }
}

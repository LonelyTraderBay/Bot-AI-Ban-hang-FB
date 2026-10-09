import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { schemaCatalog } from '@botsales/contracts';
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats(ajv);
ajv.addSchema({ $id: 'botsales', ...schemaCatalog });
const parameterValidators = new Map<string, ReturnType<typeof ajv.compile>>();
export function assertSchema<T>(schema: string, value: unknown): asserts value is T {
    const validate = ajv.getSchema('botsales#/components/schemas/' + schema);
    if (!validate)
        throw new Error('Không tìm thấy schema: ' + schema);
    if (!validate(value)) {
        // Do not include the rejected payload; it may contain credentials or PII.
        const fields = (validate.errors || []).slice(0, 5).map(e => `${e.instancePath || '/'} ${e.message}`).join('; ');
        throw new Error(`Dữ liệu không đúng hợp đồng ${schema}: ${fields}`);
    }
}

export function assertParameterSchema<T>(schema: unknown, value: unknown, label: string): asserts value is T {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema))
        throw new Error(`Không tìm thấy schema của tham số ${label}.`);
    const parameterSchema = schema as Record<string, unknown>;
    if (typeof parameterSchema.$ref === 'string') {
        const match = parameterSchema.$ref.match(/^#\/components\/schemas\/([^/]+)$/);
        const name = match?.[1];
        if (!name)
            throw new Error(`Tham chiếu schema không được hỗ trợ cho tham số ${label}.`);
        assertSchema<T>(name, value);
        return;
    }
    const key = JSON.stringify(parameterSchema);
    if (!key)
        throw new Error(`Schema của tham số ${label} không hợp lệ.`);
    let validate = parameterValidators.get(key);
    if (!validate) {
        validate = ajv.compile(parameterSchema);
        parameterValidators.set(key, validate);
    }
    if (!validate(value)) {
        const fields = (validate.errors || []).slice(0, 5).map(error => `${error.instancePath || '/'} ${error.message}`).join('; ');
        throw new Error(`Tham số ${label} không đúng hợp đồng API: ${fields}`);
    }
}

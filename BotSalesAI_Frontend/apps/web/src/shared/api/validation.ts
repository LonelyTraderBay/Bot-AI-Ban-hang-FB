import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { schemaCatalog } from '@botsales/contracts';
const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats(ajv);
ajv.addSchema({ $id: 'botsales', ...schemaCatalog });
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

import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { operations, schemaCatalog } from '@botsales/contracts';
import { assertParameterSchema, assertSchema } from '../src/shared/api/validation';

const baseline = new Ajv2020({ strict: false, allErrors: true, validateFormats: true });
addFormats(baseline);
baseline.addSchema({ $id: 'botsales', ...schemaCatalog });
const samples = [null, false, 0, 1, 200, [], {}, { data: null, meta: {} }, '', 'a', '1', '2026-11-21',
    '2026-11-21T00:00:00.000Z', 'abc@example.test', 'https://example.test', '2026-02-31'];

function compare(check: (value: unknown) => void, validate: (value: unknown) => boolean, label: string) {
    for (const value of samples) {
        if (validate(value)) expect(() => check(value), label).not.toThrow();
        else expect(() => check(value), label).toThrow();
    }
}

describe('precompiled OpenAPI validators', () => {
    it('matches the previous validator across all named schemas', () => {
        for (const name of Object.keys(schemaCatalog.components.schemas)) {
            const previous = baseline.getSchema('botsales#/components/schemas/' + name);
            if (!previous) throw new Error('Baseline missing ' + name);
            compare(value => assertSchema(name, value), previous, name);
        }
    });

    it('matches the previous validator for every parameter shape used by the operation registry', () => {
        const checked = new Set<string>();
        for (const operation of Object.values(operations)) {
            for (const { schema, name } of [...operation.pathParameters, ...operation.queryParameters, ...operation.headers]) {
                const key = JSON.stringify(schema);
                if (checked.has(key)) continue;
                checked.add(key);
                const previous = '$ref' in schema ? baseline.getSchema('botsales' + schema.$ref) : baseline.compile(schema);
                if (!previous) throw new Error('Baseline missing ' + name);
                compare(value => assertParameterSchema(schema, value, name), previous, name);
            }
        }
    });
});

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
const Ajv = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats').default;
const standalone = require('ajv/dist/standalone').default;
const contracts = new URL('../packages/contracts/src/', import.meta.url);
const schemaFile = fileURLToPath(new URL('schemas.json', contracts)).replaceAll('\\', '/');
const operationFile = fileURLToPath(new URL('operations.json', contracts)).replaceAll('\\', '/');
export const contractValidatorModule = fileURLToPath(new URL('../apps/web/src/shared/api/compiled-validators.ts', import.meta.url)).replaceAll('\\', '/');

const runtimeImports = {
    length: 'ajv/dist/runtime/ucs2length',
    equal: 'ajv/dist/runtime/equal',
    formats: 'ajv-formats/dist/formats',
};
const runtimeHelpers = {
    [runtimeImports.length + '.default']: 'ucs2length',
    [runtimeImports.equal + '.default']: 'equal',
    [runtimeImports.formats + '.fullFormats']: 'fullFormats',
};
const validatorOptions = { strict: false, allErrors: true, validateFormats: true };

export function compileContractValidators({ esm = true } = {}) {
    const schemas = JSON.parse(readFileSync(schemaFile, 'utf8'));
    const operations = JSON.parse(readFileSync(operationFile, 'utf8'));
    const ajv = new Ajv({
        ...validatorOptions,
        inlineRefs: false, loopRequired: 4, loopEnum: 4,
        code: { source: true, esm, lines: true },
    });
    addFormats(ajv);
    ajv.addSchema({ $id: 'botsales', ...schemas });
    const exports = {};
    const componentEntries = Object.keys(schemas.components.schemas).map((name, index) => {
        const binding = 'componentValidator' + index;
        exports[binding] = 'botsales#/components/schemas/' + name;
        return [name, binding];
    });
    const parameterEntries = new Map();
    for (const operation of Object.values(operations)) {
        for (const { schema } of [...operation.pathParameters, ...operation.queryParameters, ...operation.headers]) {
            const key = JSON.stringify(schema);
            if (schema.$ref || parameterEntries.has(key)) continue;
            const binding = 'parameterValidator' + parameterEntries.size;
            ajv.addSchema(schema, binding);
            exports[binding] = binding;
            parameterEntries.set(key, binding);
        }
    }

    const code = standalone(ajv, exports);
    const entries = pairs => [...pairs].map(([key, binding]) => `[${JSON.stringify(key)},${esm ? binding : 'exports.' + binding}]`).join(',');
    const maps = `${esm ? 'export const ' : 'exports.'}componentValidators = new Map([${entries(componentEntries)}]);
${esm ? 'export const ' : 'exports.'}parameterValidators = new Map([${entries(parameterEntries)}]);`;
    if (!esm) return code + '\n' + maps;

    // Ajv emits ESM exports but its shared helpers still use CommonJS references.
    const browserCode = code.replace(/^const (\w+) = require\("([^"]+)"\)\.(\w+)/gm,
        (_line, name, source, property) => {
            const helper = runtimeHelpers[source + '.' + property];
            if (!helper) throw new Error('Unsupported Ajv standalone helper: ' + source + '.' + property);
            return `const ${name} = ${helper}`;
        });
    if (/^const \w+ = require\(/m.test(browserCode)) throw new Error('Unexpected CommonJS reference in Ajv standalone output');
    return `import lengthModule from '${runtimeImports.length}.js';
import equalModule from '${runtimeImports.equal}.js';
import { fullFormats } from '${runtimeImports.formats}.js';
const ucs2length = lengthModule.default ?? lengthModule;
const equal = equalModule.default ?? equalModule;
${browserCode}
${maps}
`;
}

function demoContractValidators() {
    return `import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { schemaCatalog } from '@botsales/contracts';
const ajv = new Ajv2020(${JSON.stringify(validatorOptions)});
addFormats(ajv);
ajv.addSchema({ $id: 'botsales', ...schemaCatalog });
const parameters = new Map();
export const componentValidators = {
    get: name => ajv.getSchema('botsales#/components/schemas/' + name),
};
export const parameterValidators = {
    get(key) {
        if (!parameters.has(key)) parameters.set(key, ajv.compile(JSON.parse(key)));
        return parameters.get(key);
    },
};`;
}

export function contractValidators({ demo = false } = {}) {
    return {
        name: 'botsales-contract-validators',
        config() {
            const include = demo ? ['ajv/dist/2020.js', 'ajv-formats'] : Object.values(runtimeImports).map(source => source + '.js');
            return { optimizeDeps: { include } };
        },
        load(id) {
            if (id !== contractValidatorModule) return;
            this.addWatchFile(schemaFile);
            this.addWatchFile(operationFile);
            // Only synthetic demo builds permit runtime compilation. Live CSP forbids it.
            return demo ? demoContractValidators() : compileContractValidators();
        },
        handleHotUpdate({ file, modules, server }) {
            if (file !== schemaFile && file !== operationFile) return;
            const validators = server.moduleGraph.getModuleById(contractValidatorModule);
            if (validators) return [...new Set([...modules, validators])];
        },
    };
}

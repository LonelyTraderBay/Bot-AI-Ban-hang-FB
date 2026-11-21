import { schemaFromContract, SchemaPipe } from '../../../http/contracts.js';
import { openapi, validator } from '../../../http/contract-source.js';

export const authStartPipe = new SchemaPipe(validator.compile(schemaFromContract('AuthStart')));
export const validEmail = validator.compile<string>(openapi.components.schemas.User.properties.email);

const callbackParameters = openapi.paths['/auth/callback'].get.parameters as {
    name: string; required: boolean; schema: { type: string; maxLength: number };
}[];
export const callbackPipe = new SchemaPipe(validator.compile({
    type: 'object',
    required: callbackParameters.filter(parameter => parameter.required).map(parameter => parameter.name),
    properties: Object.fromEntries(callbackParameters.map(({ name, schema }) => [name, { ...schema, minLength: 1 }])),
}));

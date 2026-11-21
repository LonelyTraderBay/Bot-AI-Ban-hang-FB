import { isIP } from 'node:net';

export function readHttpConfig(environment: NodeJS.ProcessEnv): { bind: string; port: number } {
    const bind = environment.API_BIND;
    const portText = environment.API_PORT;
    const missing = Object.entries({ API_BIND: bind, API_PORT: portText })
        .filter(([, value]) => !value?.trim()).map(([name]) => name);
    if (missing.length) throw new Error('Missing required configuration: ' + missing.join(', '));
    if (!bind || !isIP(bind)) throw new Error('API_BIND must be an IPv4 or IPv6 address');
    const port = Number(portText);
    if (!portText || !/^[0-9]+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('API_PORT must be an integer from 1 to 65535');
    }
    return { bind, port };
}

import { OidcClient, readAuthConfig, usesLocalOidcFixture } from '../apps/api/dist/modules/workspace/index.js';
import { matchesProbeScope } from './probe-target.mjs';

const fixture = process.argv[2] === '--fixture';
const scope = fixture ? 'fixture' : 'staging';

async function check() {
    const auth = readAuthConfig(process.env);
    const configured = auth && (fixture ? usesLocalOidcFixture(auth) :
        matchesProbeScope(new URL(auth.appOrigin).hostname) && matchesProbeScope(new URL(auth.issuer).hostname));
    if (!configured || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' || process.argv.length > (fixture ? 3 : 2)) {
        return { status: 'BLOCKED', failedCheck: 'OIDC_CONFIG_OR_SCOPE' };
    }
    return new OidcClient(auth).checkProvider();
}

const result = await check().catch(() => ({ status: 'BLOCKED', failedCheck: 'OIDC_CONFIG_OR_SCOPE' }));
console.log(JSON.stringify({ scope, ...result }));
if (result.status !== 'OIDC_METADATA_VERIFIED') process.exitCode = 1;

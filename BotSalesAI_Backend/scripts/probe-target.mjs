import { BlockList, isIP } from 'node:net';

const loopback = new BlockList();
loopback.addSubnet('127.0.0.0', 8);
loopback.addAddress('::1', 'ipv6');

const unspecified = new BlockList();
unspecified.addAddress('0.0.0.0');
unspecified.addAddress('::', 'ipv6');

export function matchesProbeScope(host, fixture = false) {
    const declared = isIP(host) === 6 ? '[' + host + ']' : host;
    const hostname = URL.parse('https://' + declared)?.hostname;
    if (!hostname) return false;
    if (/^(?:.+\.)?localhost\.?$/i.test(hostname)) return fixture;
    const address = hostname.replace(/^\[(.*)\]$/, '$1');
    const ipVersion = isIP(address);
    if (!ipVersion) return !fixture;
    const family = ipVersion === 6 ? 'ipv6' : 'ipv4';
    return !unspecified.check(address, family) && loopback.check(address, family) === fixture;
}

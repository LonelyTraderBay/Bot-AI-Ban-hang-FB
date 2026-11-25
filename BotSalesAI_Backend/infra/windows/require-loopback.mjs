import { isIP, Socket } from 'node:net';

// Fixture only. The Windows network remains available to other programs.
const originalConnect = Socket.prototype.connect;

Socket.prototype.connect = function requireLoopback(...args) {
    const options = Array.isArray(args[0]) ? args[0][0] : args[0];
    const host = options && typeof options === 'object' ? options.host : args[1];
    if (typeof host === 'string' && host !== 'localhost' && host !== '::1' &&
        !(isIP(host) === 4 && host.startsWith('127.'))) {
        throw Object.assign(new Error('Windows fixture allows TCP connections only to loopback'),
            { code: 'BOTSALES_LOOPBACK_ONLY' });
    }
    return originalConnect.apply(this, args);
};

import { isIP } from 'node:net';

export function readRedisConnection(env) {
    const redis = URL.parse(env.REDIS_URL ?? '');
    if (!redis || (redis.protocol !== 'redis:' && redis.protocol !== 'rediss:') || !redis.hostname || redis.hash || redis.search) {
        throw new Error('REDIS_URL must name a direct Redis endpoint');
    }
    const index = redis.pathname.slice(1);
    if ((index && !/^\d+$/.test(index)) || !Number.isSafeInteger(Number(index))) throw new Error('Invalid Redis DB index');
    const port = Number(redis.port || '6379');
    if (port < 1) throw new Error('Invalid Redis port');
    const host = redis.hostname.replace(/^\[(.*)\]$/, '$1');
    return {
        host, port, db: Number(index),
        username: redis.username ? decodeURIComponent(redis.username) : undefined,
        password: redis.password ? decodeURIComponent(redis.password) : undefined,
        ...(redis.protocol === 'rediss:' ? { tls: isIP(host) ? {} : { servername: host } } : {}),
    };
}

import { createConnection } from 'node:net';

export const maxUploadBytes = 5 * 1024 * 1024;
const maxParallelScans = 4;
const maxReplyBytes = 1024;

export type FileScannerTarget = { path: string } | { port: number; host: '127.0.0.1' };

export function readFileScannerTarget(env: NodeJS.ProcessEnv): FileScannerTarget | undefined {
    const path = env.FILE_SCAN_SOCKET?.trim();
    const port = env.FILE_SCAN_PORT?.trim();
    if (!path && !port) return undefined;
    if (path && !port && /^\/(?:[a-zA-Z0-9_-][a-zA-Z0-9._-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9._-]*\.sock$/.test(path)) return { path };
    if (!path && port && /^[0-9]{1,5}$/.test(port) && Number(port) > 0 && Number(port) <= 65535) {
        return { port: Number(port), host: '127.0.0.1' };
    }
    throw new Error('Configure one local FILE_SCAN_SOCKET or FILE_SCAN_PORT');
}

function query(target: FileScannerTarget, frames: readonly (string | Buffer)[], timeoutMs: number): Promise<string | undefined> {
    return new Promise(resolve => {
        const socket = createConnection(target);
        let reply = Buffer.alloc(0);
        const finish = (result?: string) => {
            clearTimeout(deadline);
            socket.destroy();
            resolve(result);
        };
        const deadline = setTimeout(finish, timeoutMs);
        socket.once('connect', () => {
            socket.cork();
            for (const frame of frames) socket.write(frame);
            socket.uncork();
        });
        socket.on('data', chunk => {
            if (reply.length + chunk.length > maxReplyBytes) return finish();
            reply = Buffer.concat([reply, chunk]);
            const terminator = reply.indexOf(0);
            if (terminator === -1) return;
            finish(terminator === reply.length - 1 ? reply.subarray(0, terminator).toString('utf8') : undefined);
        });
        socket.once('error', () => finish());
        socket.once('close', () => finish());
    });
}

export class UploadScanner {
    private active = 0;
    private ping?: Promise<boolean>;

    constructor(private readonly target: FileScannerTarget) {}

    ready(): Promise<boolean> {
        // Concurrent probes share one local daemon request.
        this.ping ??= query(this.target, ['zPING\0'], 750)
            .then(reply => reply === 'PONG').finally(() => { this.ping = undefined; });
        return this.ping;
    }

    async scan(bytes: Buffer): Promise<'clean' | 'blocked' | 'unavailable'> {
        if (!bytes.length || bytes.length > maxUploadBytes || this.active >= maxParallelScans) return 'unavailable';
        const length = Buffer.alloc(4);
        length.writeUInt32BE(bytes.length);
        this.active++;
        try {
            const reply = await query(this.target, ['zINSTREAM\0', length, bytes, Buffer.alloc(4)], 5000);
            if (reply === 'stream: OK') return 'clean';
            return reply && /^stream: [^\r\n]+ FOUND$/.test(reply) ? 'blocked' : 'unavailable';
        } finally {
            this.active--;
        }
    }
}

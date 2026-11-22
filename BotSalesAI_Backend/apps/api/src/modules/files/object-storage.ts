import { DeleteObjectCommand, GetBucketVersioningCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import type { FileObject } from '../../generated/prisma/client.js';
import { maxUploadBytes } from './upload-scanner.js';

const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const httpStatus = (error: unknown) => (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
type StoredObject = Pick<FileObject, 'shopId' | 'id' | 'sha256' | 'sizeBytes'>;
type Config = { endpoint: string; region: string; bucket: string; transferNewFiles: boolean;
    credentials: { accessKeyId: string; secretAccessKey: string; sessionToken?: string } };

export function readFileTransfersEnabled(env: NodeJS.ProcessEnv) {
    const transfer = env.FILE_OBJECT_STORE_TRANSFER_NEW_FILES;
    if (transfer !== undefined && transfer !== '0' && transfer !== '1') throw new Error('FILE_OBJECT_STORE_TRANSFER_NEW_FILES must be 0 or 1');
    return transfer !== '0';
}

export function readObjectStorageConfig(env: NodeJS.ProcessEnv): Config | undefined {
    const { FILE_OBJECT_STORE_ENDPOINT: endpointText, FILE_OBJECT_STORE_REGION: region, FILE_OBJECT_STORE_BUCKET: bucket,
        FILE_OBJECT_STORE_ACCESS_KEY_ID: accessKeyId, FILE_OBJECT_STORE_SECRET_ACCESS_KEY: secretAccessKey,
        FILE_OBJECT_STORE_SESSION_TOKEN: sessionToken, OBJECT_STORE_FIXTURE_ADAPTER } = env;
    const transferNewFiles = readFileTransfersEnabled(env);
    if (![endpointText, region, bucket, accessKeyId, secretAccessKey, sessionToken].some(Boolean)) return undefined;
    const endpoint = endpointText && URL.parse(endpointText);
    const local = endpoint && endpoint.hostname === '127.0.0.1' && OBJECT_STORE_FIXTURE_ADAPTER === '1';
    if (!endpoint || (endpoint.protocol !== 'https:' && !(local && endpoint.protocol === 'http:')) ||
        endpoint.username || endpoint.password || endpoint.hash || endpoint.search || endpoint.pathname !== '/' ||
        !region || !/^[a-z0-9-]{2,32}$/.test(region) || !bucket || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket) ||
        !accessKeyId?.trim() || !secretAccessKey?.trim()) throw new Error('Invalid FILE_OBJECT_STORE configuration');
    return { endpoint: endpoint.origin, region, bucket, transferNewFiles, credentials: { accessKeyId, secretAccessKey, sessionToken } };
}

export function objectKey(file: StoredObject) {
    return `botsales/files/${file.shopId}/${file.id}/${file.sha256}`;
}

export function checkFileBytes(file: StoredObject, bytes: Uint8Array): void {
    if (bytes.length !== file.sizeBytes || bytes.length === 0 || bytes.length > maxUploadBytes || hash(bytes) !== file.sha256) {
        throw new Error('File integrity check failed');
    }
}

export class FileObjectStore {
    readonly id: string;
    private readonly client: S3Client;

    constructor(private readonly config: Config) {
        const { endpoint, region, bucket, credentials } = config;
        this.id = hash(JSON.stringify([endpoint, region, bucket]));
        this.client = new S3Client({ region, endpoint, credentials, forcePathStyle: true, maxAttempts: 1,
            requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
    }

    get transferNewFiles() {
        return this.config.transferNewFiles;
    }

    async checkBucket() {
        const versioning = await this.client.send(new GetBucketVersioningCommand({ Bucket: this.config.bucket }),
            { abortSignal: AbortSignal.timeout(3000) });
        if (versioning.Status || versioning.MFADelete) throw new Error('File storage requires a dedicated unversioned bucket');
    }

    async write(file: StoredObject, bytes: Uint8Array) {
        checkFileBytes(file, bytes);
        try {
            const stored = await this.client.send(new PutObjectCommand({
                Bucket: this.config.bucket, Key: objectKey(file), ContentType: 'application/octet-stream',
                IfNoneMatch: '*', Body: bytes, ContentLength: bytes.byteLength,
            }), { abortSignal: AbortSignal.timeout(8000) });
            if (stored.VersionId) throw new Error('Unexpected object version');
        } catch (error) {
            if (httpStatus(error) !== 412) throw error;
        }
        await this.read(file);
    }

    async read(file: StoredObject): Promise<Buffer> {
        const signal = AbortSignal.timeout(2000);
        const object = await this.client.send(new GetObjectCommand({
            Bucket: this.config.bucket, Key: objectKey(file),
        }), { abortSignal: signal });
        const body = object.Body;
        if (!(body instanceof Readable)) throw new Error('Unexpected object response');
        const stop = () => body.destroy(new Error('Object read timed out'));
        try {
            if (object.VersionId || object.ContentLength !== file.sizeBytes || file.sizeBytes > maxUploadBytes) throw new Error('Unexpected object length or version');
            signal.throwIfAborted();
            signal.addEventListener('abort', stop, { once: true });
            const bytes = Buffer.alloc(file.sizeBytes);
            let offset = 0;
            for await (const part of body) {
                const chunk = Buffer.from(part as Uint8Array);
                if (offset + chunk.length > bytes.length) throw new Error('Object response too large');
                chunk.copy(bytes, offset);
                offset += chunk.length;
            }
            if (offset !== bytes.length) throw new Error('Incomplete object response');
            checkFileBytes(file, bytes);
            return bytes;
        } finally {
            signal.removeEventListener('abort', stop);
            body.destroy();
        }
    }

    async remove(file: StoredObject) {
        await this.checkBucket();
        const target = { Bucket: this.config.bucket, Key: objectKey(file) };
        const removed = await this.client.send(new DeleteObjectCommand(target), { abortSignal: AbortSignal.timeout(6000) });
        if (removed.VersionId || removed.DeleteMarker) throw new Error('Unexpected versioned delete');
        try {
            await this.client.send(new HeadObjectCommand(target), { abortSignal: AbortSignal.timeout(3000) });
        } catch (error) {
            if (httpStatus(error) === 404) return;
            throw error;
        }
        throw new Error('Object still present');
    }
}

let configuredStore: FileObjectStore | undefined;
export function configuredFileStore() {
    if (configuredStore) return configuredStore;
    const config = readObjectStorageConfig(process.env);
    if (config) configuredStore = new FileObjectStore(config);
    return configuredStore;
}

export function configuredFixtureFileStore(env: NodeJS.ProcessEnv) {
    const endpoint = URL.parse(env.FILE_OBJECT_STORE_ENDPOINT ?? '');
    if (env.OBJECT_STORE_FIXTURE_ADAPTER !== '1' || endpoint?.hostname !== '127.0.0.1' ||
        env.FILE_OBJECT_STORE_BUCKET !== 'botsales-file-fixture') {
        throw new Error('Use a dedicated loopback fixture bucket.');
    }
    return new FileObjectStore(readObjectStorageConfig(env)!);
}

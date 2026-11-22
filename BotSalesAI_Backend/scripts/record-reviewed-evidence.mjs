import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { readDatabaseUrl } from '../apps/api/dist/config.js';
import { createDatabaseClient } from '../apps/api/dist/platform/database/client.js';

const digest = value => createHash('sha256').update(value).digest('hex');

class EvidenceInputError extends Error {}

async function readBounded(path, maxBytes, message) {
    try {
        const file = await open(path, 'r');
        try {
            const info = await file.stat();
            if (!info.isFile() || info.size < 1 || info.size > maxBytes) throw new Error();
            const bytes = Buffer.alloc(info.size + 1);
            const { bytesRead } = await file.read(bytes, { length: bytes.length });
            if (bytesRead !== info.size) throw new Error();
            return bytes.subarray(0, bytesRead);
        } finally {
            await file.close();
        }
    } catch {
        throw new EvidenceInputError(message);
    }
}

export async function runReviewedEvidence(scriptName, recordEvidence) {
    try {
        const [manifestFile, approvedHash, documentFile, ...extra] = process.argv.slice(2);
        if (!manifestFile || !approvedHash || !documentFile || extra.length || !/^[a-f0-9]{64}$/.test(approvedHash)) {
            throw new EvidenceInputError('Usage: npm run ' + scriptName + ' -- <manifest.json> <approved-sha256> <document>');
        }
        const manifest = await readBounded(manifestFile, 4096, 'Attestation file is unavailable or exceeds 4 KiB');
        if (digest(manifest) !== approvedHash) throw new EvidenceInputError('Attestation checksum mismatch');
        const input = JSON.parse(manifest.toString('utf8'));
        if (input?.format !== 1 || !/^[a-f0-9]{64}$/.test(input.documentSha256 ?? '')) throw new EvidenceInputError('Invalid attestation');
        const document = await readBounded(documentFile, 25 * 1024 * 1024, 'Document is unavailable or exceeds 25 MiB');
        if (digest(document) !== input.documentSha256) throw new EvidenceInputError('Document checksum mismatch');
        const url = new URL(readDatabaseUrl(process.env));
        const target = url.hostname + ':' + (url.port || '5432') + url.pathname;
        const routeOverrides = ['host', 'port', 'user', 'password', 'database', 'dbname'];
        if (input.database !== target || url.username !== 'botsales_runtime' || routeOverrides.some(key => url.searchParams.has(key))) {
            throw new EvidenceInputError('Database target or runtime role does not match the attestation');
        }
        const db = createDatabaseClient(url.href);
        try {
            console.log(JSON.stringify({ evidenceId: await recordEvidence(db, input, approvedHash) }));
        } finally {
            await db.$disconnect();
        }
    } catch (error) {
        const status = error.getStatus?.();
        console.error(status ? 'Attestation rejected (' + status + ')' : error instanceof EvidenceInputError
            ? error.message : 'Unable to record the attestation');
        process.exitCode = 1;
    }
}

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, rmdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { readDatabaseUrl } from '../../../apps/api/dist/config.js';
import { assertFixtureDatabase } from '../workspace/session-fixture.mjs';

const run = promisify(execFile);
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export async function reviewedEvidenceFixture(kind, { cwd, env = process.env, document: content }) {
    const connection = readDatabaseUrl(env);
    assertFixtureDatabase(connection);
    const url = new URL(connection);
    const database = url.hostname + ':' + (url.port || '5432') + url.pathname;
    const dir = await mkdtemp(join(tmpdir(), 'botsales-reviewed-fixture-'));
    const manifest = join(dir, 'review.json');
    const document = join(dir, 'document.txt');
    const close = async () => {
        for (const file of [manifest, document]) await rm(file, { force: true });
        await rmdir(dir);
    };
    try {
        await writeFile(document, content);
    } catch (error) {
        await close();
        throw error;
    }
    return {
        close,
        async prepare(input) {
            const bytes = JSON.stringify({ format: 1, database, documentSha256: sha256(content), ...input });
            await writeFile(manifest, bytes);
            return sha256(bytes);
        },
        execute(approvedHash) {
            return run(process.execPath, ['scripts/record-' + kind + '-evidence.mjs', manifest, approvedHash, document], { cwd, env });
        },
    };
}

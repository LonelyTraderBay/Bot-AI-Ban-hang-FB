import type { Prisma } from '../../generated/prisma/client.js';
import { validUuid } from '../../http/query.js';
import { commandResult } from '../commands/index.js';

export const jobDetails = {
    importPreview: {
        select: {
            token: true, expiresAt: true,
            commitJob: {
                select: { status: true, updatedAt: true, completed: true, errorCount: true, rowErrors: true, result: true },
            },
        },
    },
} satisfies Prisma.JobInclude;

export function jobDto(job: Prisma.JobGetPayload<{ include: typeof jobDetails }>) {
    const preview = job.importPreview;
    const commit = preview?.commitJob;
    const result = commandResult(commit?.result ?? job.result);
    const previewErrors = Array.isArray(job.rowErrors) ? job.rowErrors : [];
    const commitErrors = Array.isArray(commit?.rowErrors) ? commit.rowErrors : [];
    return {
        id: job.id, shopId: job.shopId, kind: job.kind, status: commit?.status ?? job.status, createdAt: job.createdAt.toISOString(),
        updatedAt: (commit?.updatedAt ?? job.updatedAt).toISOString(), completed: commit?.completed ?? job.completed, total: job.total,
        errorCount: job.errorCount + (commit?.errorCount ?? 0),
        rowErrors: [...previewErrors, ...commitErrors],
        validationToken: !commit && preview && job.status === 'awaiting_confirmation' && preview.expiresAt.getTime() > Date.now()
            ? preview.token : null,
        downloadUrl: null,
        result: result && /^[a-z][a-z0-9_]{0,63}$/.test(result.type) && validUuid(result.id) ? result : null,
    };
}

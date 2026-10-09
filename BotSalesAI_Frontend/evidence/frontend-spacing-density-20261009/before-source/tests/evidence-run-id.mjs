const supplied = process.env.BOTSALES_EVIDENCE_RUN_ID;
if (supplied && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(supplied)) {
    throw new Error('BOTSALES_EVIDENCE_RUN_ID must be a 1–64 character filename-safe identifier.');
}

const now = new Date();
const localTimestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
].join('') + '-' + [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
].join('');

export const evidenceRunId = supplied || `${localTimestamp}-${process.pid}`;

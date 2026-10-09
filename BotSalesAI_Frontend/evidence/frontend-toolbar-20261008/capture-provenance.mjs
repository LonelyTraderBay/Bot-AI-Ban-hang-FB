import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const output = import.meta.dirname;
const baseline = JSON.parse(fs.readFileSync(path.join(output, 'baseline.json'), 'utf8'));
const session = 'C:/Users/Joker-PC/.codex/sessions/2026/10/07/rollout-2026-10-07T08-44-33-01a11408-a5e4-7b11-b368-7047a7ae690b.jsonl';
const entries = fs.readFileSync(session, 'utf8').split('\n').filter(Boolean);
const match = entries.map(raw => ({ raw, entry: JSON.parse(raw) })).find(({ entry }) =>
    Date.parse(entry.timestamp) > Date.parse(baseline.finishedAt)
    && entry.payload?.type === 'custom_tool_call'
    && entry.payload.name === 'exec'
    && /\*\*\* Update File: [^\n]*apps\/web\/src\/shared\/ui\/components\.tsx/.test(entry.payload.input)
    && entry.payload.input.includes('filters?: ReactNode'));
if (!match) throw new Error('Actual first Toolbar mutation was not found in the local tool-call history');
const result = {
    threadId: '01a11408-a5e4-7b11-b368-7047a7ae690b', implementationStartedAt: match.entry.timestamp,
    toolCallId: match.entry.payload.call_id, tool: 'functions.exec -> apply_patch', sourceSessionFile: session,
    sourceEntrySha256: crypto.createHash('sha256').update(match.raw).digest('hex'),
    reason: 'Timestamp from the actual first shared Toolbar source edit after the paired baseline, not file modification times.',
};
fs.writeFileSync(path.join(output, 'implementation-provenance.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));

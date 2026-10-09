import {runDesignBrowserAudit} from './browser-audit.mjs';

const report = await runDesignBrowserAudit();
process.stdout.write(`BROWSER_AUDIT_JSON ${JSON.stringify(report)}\n`);

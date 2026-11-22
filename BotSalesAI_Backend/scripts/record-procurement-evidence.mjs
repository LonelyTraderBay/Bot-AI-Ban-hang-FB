import { recordManualEvidence } from '../apps/api/dist/modules/procurement/index.js';
import { runReviewedEvidence } from './record-reviewed-evidence.mjs';

await runReviewedEvidence('record:procurement-evidence', recordManualEvidence);

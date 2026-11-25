import { recordMarketingEvidence } from '../apps/api/dist/modules/finance/index.js';
import { runReviewedEvidence } from './record-reviewed-evidence.mjs';

await runReviewedEvidence('record:marketing', recordMarketingEvidence);

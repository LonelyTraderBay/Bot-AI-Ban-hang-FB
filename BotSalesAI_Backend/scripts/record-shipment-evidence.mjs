import { recordManualShipmentEvidence } from '../apps/api/dist/modules/fulfillment/index.js';
import { runReviewedEvidence } from './record-reviewed-evidence.mjs';

await runReviewedEvidence('record:shipment-evidence', recordManualShipmentEvidence);

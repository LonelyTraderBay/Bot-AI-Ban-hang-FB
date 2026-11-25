import { parentPort, workerData } from 'node:worker_threads';
import { readSpreadsheet, SpreadsheetRejection } from './spreadsheets.js';

const { bytes, mimeType } = workerData as { bytes: Uint8Array; mimeType: string };
try {
    await readSpreadsheet(Buffer.from(bytes), mimeType);
    parentPort?.postMessage(true);
} catch (error) {
    parentPort?.postMessage(error instanceof SpreadsheetRejection ? error.reason : 'invalid_format');
}

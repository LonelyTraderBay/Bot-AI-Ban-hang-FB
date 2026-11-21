import { parentPort, workerData } from 'node:worker_threads';
import { readSpreadsheet } from './spreadsheets.js';

const { bytes, mimeType } = workerData as { bytes: Uint8Array; mimeType: string };
try {
    await readSpreadsheet(Buffer.from(bytes), mimeType);
    parentPort?.postMessage(true);
} catch {
    parentPort?.postMessage(false);
}

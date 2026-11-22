import { parentPort, workerData } from 'node:worker_threads';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const task = getDocument({ data: new Uint8Array(workerData.bytes), enableXfa: false, useSystemFonts: false,
    disableFontFace: true, useWasm: false, stopAtErrors: true, maxImageSize: 8000000, verbosity: 0 });
let result: string | null = null;
try {
    const pdf = await task.promise;
    if (pdf.numPages <= 80) {
        const segments: string[] = [];
        let size = 0;
        for (let number = 1; number <= pdf.numPages; number++) {
            const page = await pdf.getPage(number);
            const content = await page.getTextContent();
            const text = content.items.map(item => 'str' in item ? item.str : '').join(' ').trim();
            size += text.length + 1;
            if (size > 100000) throw new Error('PDF text exceeds knowledge limit');
            if (text) segments.push(text);
        }
        result = segments.join('\n') || null;
    }
} catch {
    result = null;
} finally {
    await task.destroy();
}
parentPort?.postMessage(result);

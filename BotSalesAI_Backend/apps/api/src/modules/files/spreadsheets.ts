import { CsvError, parse } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';
import yauzl, { type Entry, type ZipFile } from 'yauzl';

export const csvType = 'text/csv';
export const xlsxType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const maxRows = 1001;
const maxColumns = 64;
const maxExpanded = 16 * 1024 * 1024;
const decoder = new TextDecoder('utf-8', { fatal: true });

export type SpreadsheetRejectionReason = 'invalid_format' | 'unsupported_content' | 'spreadsheet_limit';

export class SpreadsheetRejection extends Error {
    constructor(readonly reason: SpreadsheetRejectionReason) {
        super(reason);
    }
}

async function inspectWorkbook(bytes: Buffer) {
    const zip = await new Promise<ZipFile>((resolve, reject) => {
        yauzl.fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
            (error, file) => error ? reject(error) : resolve(file));
    });
    const names = new Set<string>();
    let expanded = 0;
    try {
        if (zip.entryCount > 200) throw new SpreadsheetRejection('spreadsheet_limit');
        for await (const entry of zip.eachEntry()) {
            expanded += entry.uncompressedSize;
            const name = entry.fileName;
            if (expanded > maxExpanded) throw new SpreadsheetRejection('spreadsheet_limit');
            if (names.has(name)) throw new SpreadsheetRejection('invalid_format');
            if (/vbaProject|externalLinks|embeddings|activeX|macro/i.test(name)) throw new SpreadsheetRejection('unsupported_content');
            names.add(name);
            if (name.endsWith('/')) continue;
            const xml = await readXml(zip, entry);
            if (/<!\s*(?:DOCTYPE|ENTITY)\b|TargetMode\s*=\s*['"]External['"]/i.test(xml)) throw new SpreadsheetRejection('unsupported_content');
            if (!/^xl\/worksheets\/[^/]+\.xml$/i.test(name)) continue;
            if (/<(?:[\w.-]+:)?f(?:[\s/>])/i.test(xml)) throw new SpreadsheetRejection('unsupported_content');
            for (const match of xml.matchAll(/<(?:[\w.-]+:)?(?:c|row)\s[^>]*?\br\s*=\s*['"]([A-Z]*)(\d+)['"]/gi)) {
                const column = Array.from(match[1].toUpperCase()).reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0);
                if (Number(match[2]) > maxRows || column > maxColumns) throw new SpreadsheetRejection('spreadsheet_limit');
            }
        }
        if (!names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) throw new SpreadsheetRejection('invalid_format');
    } finally {
        zip.close();
    }
}

async function readXml(zip: ZipFile, entry: Entry): Promise<string> {
    const stream = await new Promise<NodeJS.ReadableStream>((resolve, reject) => zip.openReadStream(entry,
        (error, reader) => error ? reject(error) : resolve(reader)));
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    return decoder.decode(Buffer.concat(chunks));
}

export async function readSpreadsheet(bytes: Buffer, mimeType: string): Promise<string[][]> {
    let rows: string[][];
    if (mimeType === csvType) {
        const source = decoder.decode(bytes);
        if (source.includes(String.fromCharCode(0))) throw new SpreadsheetRejection('invalid_format');
        try {
            rows = parse(source, { bom: true, relax_column_count: true, max_record_size: 32000, to: maxRows + 1 }) as string[][];
        } catch (error) {
            if (error instanceof CsvError && error.code === 'CSV_MAX_RECORD_SIZE') throw new SpreadsheetRejection('spreadsheet_limit');
            throw error;
        }
    } else if (mimeType === xlsxType) {
        await inspectWorkbook(bytes);
        const sheet = await readSheet(bytes, 1, { parseNumber: value => value, trim: false });
        rows = sheet.map(row => row.map(value => typeof value === 'string' ? value : ''));
    } else {
        throw new SpreadsheetRejection('invalid_format');
    }
    if (!rows.length) throw new SpreadsheetRejection('invalid_format');
    if (rows.length > maxRows || rows.some(row => row.length > maxColumns)) {
        throw new SpreadsheetRejection('spreadsheet_limit');
    }
    return rows;
}

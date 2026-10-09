import type { ExportRequest } from '@botsales/contracts';
import { dateOnlyStartOfDayToISOString } from '../../shared/model/format';
export { authorizedDownloadHref } from '../../shared/model/download';

export type ReportType = ExportRequest['reportType'];

function parseDateOnly(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError('Ngày phải có định dạng YYYY-MM-DD.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    throw new RangeError('Ngày không hợp lệ.');
  return { year, month, day };
}

function zonedDateTimeToUtc(date: { year: number; month: number; day: number }, hour: number, minute: number, second: number, timezone: string) {
  const target = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second);
  let guess = target;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part => [part.type, part.value]));
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const correction = target - represented;
    if (correction === 0) break;
    guess += correction;
  }
  return guess;
}

/** Convert a date-only report filter to an inclusive local calendar-day boundary. */
export function reportDateBoundary(value: string, edge: 'start' | 'end', timezone: string) {
  if (edge === 'start') return dateOnlyStartOfDayToISOString(value, timezone);
  const date = parseDateOnly(value);
  const epoch = zonedDateTimeToUtc(date, 23, 59, 59, timezone);
  return new Date(epoch + 999).toISOString();
}

export function dateInTimezone(value: string, timezone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError('Mốc thời gian API không hợp lệ.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export function reportFilename(type: ReportType, from: string, to: string) {
  if (!/^(inventory|orders|cashflow|profit_loss)$/.test(type) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
    throw new RangeError('Không thể tạo tên tệp báo cáo an toàn.');
  return `botsales-${type}-${from}-${to}.csv`;
}

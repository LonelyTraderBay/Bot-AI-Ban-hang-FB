import { describe, expect, it } from 'vitest';
import { authorizedDownloadHref, dateInTimezone, reportDateBoundary, reportFilename } from '../src/modules/reports/report-utils';

describe('report date and download boundaries', () => {
  it('converts inclusive date-only filters using the shop timezone', () => {
    expect(reportDateBoundary('2026-09-30', 'start', 'Asia/Vientiane')).toBe('2026-09-29T17:00:00.000Z');
    expect(reportDateBoundary('2026-09-30', 'end', 'Asia/Vientiane')).toBe('2026-09-30T16:59:59.999Z');
  });

  it('preserves daylight-saving offsets across the selected local day', () => {
    expect(reportDateBoundary('2026-03-08', 'start', 'America/New_York')).toBe('2026-03-08T05:00:00.000Z');
    expect(reportDateBoundary('2026-03-08', 'end', 'America/New_York')).toBe('2026-03-09T03:59:59.999Z');
  });

  it('derives defaults from the API snapshot in the shop timezone', () => {
    expect(dateInTimezone('2026-09-29T14:00:00.000Z', 'Asia/Vientiane')).toBe('2026-09-29');
  });

  it('limits download names to report enums and date-only values', () => {
    expect(reportFilename('orders', '2026-09-01', '2026-09-30')).toBe('botsales-orders-2026-09-01-2026-09-30.csv');
    expect(() => reportFilename('../orders' as never, '2026-09-01', '2026-09-30')).toThrow();
    expect(() => reportFilename('orders', '../secret', '2026-09-30')).toThrow();
  });

  it('rejects unsafe schemes and insecure external download targets', () => {
    expect(authorizedDownloadHref('javascript:alert(1)', 'http://localhost:5173', true)).toBeNull();
    expect(authorizedDownloadHref('data:text/html,<script>alert(1)</script>', 'http://localhost:5173', true)).toBeNull();
    expect(authorizedDownloadHref('https://user:password@storage.example/signed.csv', 'http://localhost:5173', false)).toBeNull();
    expect(authorizedDownloadHref('http://evil.example/file.csv', 'http://localhost:5173', true)).toBeNull();
    expect(authorizedDownloadHref('https://storage.example/signed.csv', 'http://localhost:5173', false)).toBe('https://storage.example/signed.csv');
    expect(authorizedDownloadHref('blob:http://localhost:5173/mock-export', 'http://localhost:5173', true)).toBe('blob:http://localhost:5173/mock-export');
    expect(authorizedDownloadHref('blob:null/mock-export', 'http://localhost:5173', true)).toBe('blob:null/mock-export');
  });
});

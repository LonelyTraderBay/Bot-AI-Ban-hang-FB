import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const routes = JSON.parse(read('../botsales-kit/contracts/route-manifest.json')).routes as Array<{ id: string; path: string; module: string; readPermission: string; readOperations: string[]; actions: Array<{ operationId: string; permission: string }> }>;
const openapi = JSON.parse(read('../botsales-kit/contracts/openapi.json')) as { paths: Record<string, Record<string, { operationId?: string; 'x-permission'?: string; parameters?: Array<{ name?: string; 'in'?: string }> }>>; components: { schemas: Record<string, { properties?: Record<string, unknown> }> } };
const generatedOperations = JSON.parse(read('packages/contracts/src/operations.json')) as Record<string, { permission?: string }>;
const operationById = new Map(Object.values(openapi.paths).flatMap(path => Object.values(path)).filter(operation => operation.operationId).map(operation => [operation.operationId!, operation]));

describe('FE021 route, contract, and frontend ownership map', () => {
  it('maps dashboard, reports, and marketing to canonical route operations and capabilities', () => {
    const byId = new Map(routes.map(route => [route.id, route]));
    expect(byId.get('R04')).toMatchObject({ path: '/s/:shopId/overview', module: 'dashboard', readPermission: 'dashboard.read', readOperations: ['getDashboard', 'getShop'] });
    expect(byId.get('R31')).toMatchObject({ path: '/s/:shopId/reports', module: 'reports', readPermission: 'reports.read', readOperations: ['getReportSummary', 'listJobs'] });
    expect(byId.get('R31')?.actions).toContainEqual({ label: 'Xuất báo cáo', operationId: 'createExport', permission: 'reports.export' });
    expect(byId.get('R53')).toMatchObject({ path: '/s/:shopId/reports/marketing', module: 'reports', readPermission: 'reports.read', readOperations: ['getMarketingSummary'] });
    expect(byId.get('R04')?.actions).toContainEqual({ label: 'Tạm dừng bot', operationId: 'pauseBot', permission: 'bot.publish' });

    for (const routeId of ['R04', 'R31', 'R53']) {
      const route = byId.get(routeId)!;
      for (const operationId of [...route.readOperations, ...route.actions.map(action => action.operationId)]) {
        expect(generatedOperations[operationId], `${operationId} has generated operation metadata`).toBeTruthy();
        expect(operationById.get(operationId), `${operationId} has OpenAPI metadata`).toBeTruthy();
      }
      for (const action of route.actions) {
        expect(generatedOperations[action.operationId]?.permission).toBe(action.permission);
        expect(operationById.get(action.operationId)?.['x-permission']).toBe(action.permission);
      }
    }
  });

  it('keeps report summaries honest and exposes the approved marketing date aggregation contract', () => {
    const reportOperation = operationById.get('getReportSummary')!;
    const marketingOperation = operationById.get('getMarketingSummary')!;
    expect(reportOperation.parameters?.filter(parameter => parameter.in === 'query')).toHaveLength(0);
    expect(marketingOperation.parameters?.filter(parameter => parameter.in === 'query').map(parameter => parameter.name)).toEqual(['fromDate', 'toDate', 'bucket']);
    expect(Object.keys(openapi.components.schemas.ReportSummary.properties || {})).toEqual(expect.arrayContaining(['shopId', 'asOf', 'availableReports', 'warnings']));
    for (const missing of ['series', 'rows', 'dateRange']) expect(openapi.components.schemas.ReportSummary.properties).not.toHaveProperty(missing);
    expect(openapi.components.schemas.MarketingSummary.properties).toHaveProperty('period');
    expect(openapi.components.schemas.MarketingSummary.properties).toHaveProperty('trend');
    for (const missing of ['demandVsStock', 'contentIdeas', 'evidenceLinks']) expect(openapi.components.schemas.MarketingSummary.properties).not.toHaveProperty(missing);
  });

  it('binds screens and export rules to the mock/API owners without HTML rendering', () => {
    const dashboard = read('apps/web/src/modules/dashboard/index.tsx');
    const reports = read('apps/web/src/modules/reports/index.tsx');
    const mock = read('apps/web/src/mocks/service.ts');
    const marketingReadModel = read('apps/web/src/mocks/marketing-report.ts');
    const exports = read('apps/web/src/mocks/files.ts');
    const marketing = read('apps/web/src/mocks/marketing-fixture.ts');
    expect(dashboard).toContain("useApi('getDashboard')");
    expect(dashboard).toContain("useCommand('pauseBot'");
    expect(dashboard).toContain("useCan('finance.read')");
    expect(reports).toContain("useApi('getReportSummary')");
    expect(reports).toContain("useApi('listJobs'");
    expect(reports).toContain("useApi('getMarketingSummary',");
    expect(reports).toContain("useCommand('createExport'");
    expect(reports).toContain('reportDateBoundary');
    expect(reports).toContain('m.lostSaleReasons');
    expect(mock).toContain('marketingSummary(input)');
    expect(marketingReadModel).toContain("input.query.get('fromDate')");
    expect(marketingReadModel).toContain("input.query.get('toDate')");
    expect(reports).not.toContain('không thể lọc chuỗi này theo kỳ ở frontend');
    expect(mock).toContain('SOURCE_PERMISSION_REQUIRED');
    expect(exports).toContain('unitCostAmount');
    expect(exports).toContain("input.permissions?.includes('finance.read')");
    expect(exports).toMatch(/\^\[\\s\]\*\[=\+\\-@\\t\\r\]/);
    expect(reports).not.toContain('dangerouslySetInnerHTML');
    expect(marketing).toContain('Synthetic daily inputs');
  });
});

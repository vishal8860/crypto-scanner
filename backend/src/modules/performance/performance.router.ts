import { Router } from 'express';
import { PerformanceService } from './performance.service.js';
import { TradeHistoryCreateInput } from './trade-history.interface.js';

export const createPerformanceRouter = (): Router => {
  const router = Router();
  const service = new PerformanceService();

  router.get('/trades', async (request, response) => {
    const scannerVersion = request.query.scannerVersion;
    const version = typeof scannerVersion === 'string' ? scannerVersion : undefined;
    response.json({ data: await service.listTrades(version) });
  });

  router.post('/trades', async (request, response) => {
    const payload = request.body as TradeHistoryCreateInput;
    const created = await service.recordTrade(payload);
    response.status(201).json({ data: created });
  });

  router.get('/dashboard', async (request, response) => {
    const scannerVersion = request.query.scannerVersion;
    const version = typeof scannerVersion === 'string' ? scannerVersion : undefined;
    response.json({ data: await service.dashboard(version) });
  });

  router.get('/breakdowns', async (request, response) => {
    const scannerVersion = request.query.scannerVersion;
    const version = typeof scannerVersion === 'string' ? scannerVersion : undefined;
    response.json({ data: await service.breakdowns(version) });
  });

  router.get('/heatmap', async (request, response) => {
    const scannerVersion = request.query.scannerVersion;
    const version = typeof scannerVersion === 'string' ? scannerVersion : undefined;
    response.json({ data: await service.trendEntryHeatmap(version) });
  });

  router.get('/indicator-validation', async (request, response) => {
    const scannerVersion = request.query.scannerVersion;
    const version = typeof scannerVersion === 'string' ? scannerVersion : undefined;
    response.json({ data: await service.indicatorValidation(version) });
  });

  router.get('/version-comparison', async (_request, response) => {
    response.json({ data: await service.versionComparison() });
  });

  return router;
};
